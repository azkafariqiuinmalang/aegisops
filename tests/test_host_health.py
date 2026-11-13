import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from aegisops.host_health import collect, parse_metrics
from aegisops.main import create_app
from aegisops.store import EventStore


FIXTURE = Path(__file__).parent / 'fixtures' / 'node_exporter.prom'


class HostHealthTests(unittest.TestCase):
    def setUp(self):
        directory = self.enterContext(tempfile.TemporaryDirectory())
        database = Path(directory) / 'events.sqlite3'
        self.client = self.enterContext(TestClient(create_app(database)))
        self.store = EventStore(database)
        self.url = '/assets/lab-host/health'
        self.assertEqual(self.client.get(self.url).status_code, 404)
        response = self.client.post('/assets', json={'asset_id': 'lab-host'})
        self.assertEqual(response.status_code, 200)
        self.asset = self.store.get_asset('lab-host')

    def test_fixture_persists_and_keeps_observed_health_unknown(self):
        event, _ = self.store.save(collect(self.asset, fixture=FIXTURE), host_health=True)
        view = self.client.get(self.url, params={'simulation': 'true'}).json()
        self.assertEqual(view['asset_status'], 'up')
        self.assertEqual(view['collector']['status'], 'healthy')
        self.assertEqual(view['collector']['source']['type'], 'node_exporter')
        self.assertTrue(view['collector']['checked_at'].endswith('Z'))
        self.assertEqual(view['observation']['details']['metrics']['memory_used_percent'], 25)
        self.assertEqual(view['observation']['event_id'], str(event.event_id))
        self.assertEqual(self.client.get(f'/events/{event.event_id}').status_code, 200)
        self.assertEqual(self.client.get(self.url).json()['asset_status'], 'unknown')

    def test_timeout_and_out_of_order_results(self):
        with patch('aegisops.host_health.read_exporter', side_effect=TimeoutError):
            with self.assertLogs('aegisops.host_health', level='WARNING'):
                failed = collect(self.asset)
        self.store.save(failed, host_health=True)
        with patch('aegisops.host_health.read_exporter', return_value=FIXTURE.read_bytes()):
            older = collect(self.asset)
        older.timestamp = failed.timestamp - timedelta(seconds=10)
        self.store.save(older, host_health=True)
        view = self.client.get(self.url).json()
        self.assertEqual(view['asset_status'], 'unknown')
        self.assertEqual(view['collector']['status'], 'collector_error')

    def test_stale_observation_has_unknown_status(self):
        old = collect(self.asset, fixture=FIXTURE)
        old.timestamp -= timedelta(minutes=6)
        self.store.save(old, host_health=True)
        view = self.client.get(self.url, params={'simulation': 'true'}).json()
        self.assertEqual(view['asset_status'], 'unknown')
        self.assertEqual(view['collector']['status'], 'unknown')
        self.assertIsNotNone(view['observation'])

    def test_invalid_metric_payloads(self):
        now = datetime.now(timezone.utc)
        for payload in (b'node_load1 NaN', b'node_load1 0\nnode_load1 1',
                        b'other_metric 1', b'node_memory_MemTotal_bytes 0\nnode_memory_MemAvailable_bytes 1'):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                parse_metrics(payload, now)

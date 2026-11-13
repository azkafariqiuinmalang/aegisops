import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from aegisops.host_health import collect
from aegisops.main import create_app
from aegisops.store import EventStore


class DashboardTests(unittest.TestCase):
    def test_dashboard_serves_ui_and_reads_backend_evidence(self):
        temporary = self.enterContext(tempfile.TemporaryDirectory())
        database = Path(temporary) / 'events.sqlite3'
        client = self.enterContext(TestClient(create_app(database)))
        self.assertIn('data-mode', client.get('/').text)
        for path in ('styles.css', 'src/main.js', 'src/backend.js', 'src/data.js', 'src/engine.js'):
            self.assertEqual(client.get('/dashboard/' + path).status_code, 200)

        self.assertEqual(client.post('/assets', json={'asset_id': 'lab-host'}).status_code, 200)
        store = EventStore(database)
        fixture = Path(__file__).parent / 'fixtures' / 'node_exporter.prom'
        store.save(collect(store.get_asset('lab-host'), fixture=fixture), host_health=True)
        for index in range(4):
            record = {
                'timestamp': f'2026-11-13T10:00:0{index}Z', 'asset_id': 'lab-host',
                'src_ip': '198.51.100.25', 'source_name': 'fixture', 'record_id': str(index),
            }
            self.assertEqual(client.post('/security/ssh-failures', json=record).status_code, 200)

        demo = client.get('/api/dashboard').json()
        self.assertEqual(demo['assets'][0]['asset_status'], 'up')
        finding, = demo['findings']
        self.assertEqual(finding['rule_id'], 'DET-001')
        self.assertEqual(len(finding['source_event_ids']), 4)
        evidence = client.get('/events/' + finding['source_event_ids'][0])
        self.assertEqual(evidence.json()['event_type'], 'ssh_login_failed')

        actual = client.get('/api/dashboard?simulation=false').json()
        self.assertEqual(actual['assets'][0]['asset_status'], 'unknown')
        self.assertEqual(actual['events'], [])
        self.assertEqual(actual['findings'], [])

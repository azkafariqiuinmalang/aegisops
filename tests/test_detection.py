import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from aegisops.main import create_app


class DetectionTests(unittest.TestCase):
    def setUp(self):
        directory = self.enterContext(tempfile.TemporaryDirectory())
        self.client = self.enterContext(TestClient(create_app(Path(directory) / 'events.db')))

    def send(self, index, *, port=None, second=None, asset='lab-host', simulation=True):
        endpoint = 'ssh-failures' if port is None else 'tcp-connections'
        payload = {
            'record_id': str(index), 'source_name': 'test-feed',
            'timestamp': f'2026-11-13T17:00:{index if second is None else second:02d}+07:00',
            'asset_id': asset, 'src_ip': '198.51.100.25',
        }
        if port is not None:
            payload.update(dst_ip='192.0.2.10', dst_port=port)
        response = self.client.post(f'/security/{endpoint}', params={'simulation': simulation}, json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def evaluate(self, events, **policy):
        response = self.client.post('/security/evaluate', json={
            'event_ids': [event['event_id'] for event in events], 'policy': policy,
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_ssh_evidence_and_replay(self):
        events = [self.send(i, second=i * 8) for i in range(4)]
        self.assertEqual(events[0], self.send(0))
        self.assertEqual(events[0]['timestamp'], '2026-11-13T10:00:00Z')
        self.assertEqual(self.evaluate(events[:3] + [events[0]]), [])
        self.assertEqual(self.evaluate(events, window_seconds=23), [])
        result, = self.evaluate(events[::-1], window_seconds=24)
        self.assertEqual(result['rule_id'], 'DET-001')
        self.assertEqual(result['source_event_ids'], [event['event_id'] for event in events])
        self.assertTrue(result['simulation'])

    def test_repeated_port_vs_distinct_ports(self):
        self.assertEqual(self.evaluate([self.send(i, port=443) for i in range(5)]), [])
        result, = self.evaluate([self.send(i + 10, port=port) for i, port in enumerate([22, 80, 443, 8080, 8443])])
        self.assertEqual((result['rule_id'], result['count']), ('DET-002', 5))

    def test_separate_asset_and_simulation_groups(self):
        events = [self.send(i) for i in range(3)]
        events += [self.send(3, asset='other-host'), self.send(4, simulation=False)]
        self.assertEqual(self.evaluate(events), [])

    def test_invalid_network_record(self):
        response = self.client.post('/security/tcp-connections', json={
            'record_id': 'bad', 'source_name': 'test-feed', 'asset_id': 'lab-host',
            'src_ip': '198.51.100.25', 'dst_ip': '192.0.2.10', 'dst_port': 65536,
            'timestamp': '2026-11-13T10:00:00Z',
        })
        self.assertEqual(response.status_code, 422)

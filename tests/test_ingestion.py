import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from aegisops.main import MAX_EVENT_BYTES, create_app


class IngestionTests(unittest.TestCase):
    def setUp(self):
        directory = self.enterContext(tempfile.TemporaryDirectory())
        self.database = Path(directory) / 'events.sqlite3'
        self.client = self.enterContext(TestClient(create_app(self.database)))
        fixture = Path(__file__).parent / 'fixtures' / 'ssh_failure.json'
        self.event = json.loads(fixture.read_text(encoding='utf-8'))

    def test_event_persists_with_utc_and_simulation(self):
        self.event['status'] = 'observed'
        response = self.client.post('/events', json=self.event)
        self.assertEqual(response.status_code, 201, response.text)
        stored = response.json()
        self.assertEqual(stored['timestamp'], '2026-11-12T10:15:30Z')
        self.assertTrue(stored['ingested_at'].endswith('Z'))
        self.assertEqual(stored['status'], 'simulated')
        self.assertTrue(stored['simulation'])
        self.assertEqual(stored['source'], self.event['source'])
        with TestClient(create_app(self.database)) as restarted:
            self.assertEqual(restarted.get(f"/events/{stored['event_id']}").json(), stored)

    def test_native_id_deduplicates_concurrent_writes(self):
        with ThreadPoolExecutor(max_workers=4) as executor:
            responses = list(executor.map(lambda _: self.client.post('/events', json=self.event), range(4)))
        self.assertEqual(sorted(response.status_code for response in responses), [200, 200, 200, 201])
        self.assertEqual(len({response.json()['event_id'] for response in responses}), 1)

    def test_fingerprint_is_stable_without_native_id(self):
        del self.event['source']['event_id']
        self.event['details'] = {'b': 2, 'a': 1}
        original = self.client.post('/events', json=self.event)
        self.event['details'] = {'a': 1, 'b': 2}
        self.event['timestamp'] = '2026-11-12T10:15:30Z'
        replay = self.client.post('/events', json=self.event)
        self.assertEqual(original.status_code, 201)
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(replay.json(), original.json())

    def test_simulation_and_observed_ids_have_separate_namespaces(self):
        simulated = self.client.post('/events', json=self.event)
        self.event.update(status='observed', simulation=False)
        observed = self.client.post('/events', json=self.event)
        self.assertEqual(simulated.status_code, 201)
        self.assertEqual(observed.status_code, 201)
        self.assertNotEqual(simulated.json()['event_id'], observed.json()['event_id'])

    def test_missing_required_field_and_invalid_timestamps(self):
        event = {key: value for key, value in self.event.items() if key != 'source'}
        for payload in (event, dict(self.event, timestamp='invalid'),
                        dict(self.event, timestamp='2026-11-12T17:15:30')):
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post('/events', json=payload).status_code, 422)

    def test_invalid_ip_port_and_nonfinite_details(self):
        for network in ({'src_ip': 'invalid'}, {'dst_port': 65536}):
            with self.subTest(network=network):
                self.assertEqual(self.client.post('/events', json=dict(self.event, network=network)).status_code, 422)
        body = json.dumps(dict(self.event, details={'measurement': 'value'})).replace('"value"', '1e999')
        self.assertEqual(self.client.post('/events', content=body).status_code, 422)

    def test_oversized_request_and_unknown_id(self):
        self.assertEqual(self.client.post('/events', content=b'x' * (MAX_EVENT_BYTES + 1)).status_code, 413)
        self.assertEqual(self.client.get(f'/events/{uuid4()}').status_code, 404)


if __name__ == '__main__':
    unittest.main()

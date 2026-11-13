import hashlib
import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from .models import Asset, Event, EventInput


def deduplication_key(event: EventInput) -> str:
    if event.source.event_id is not None:
        identity = [event.simulation, event.source.type, event.source.name, event.source.event_id]
        prefix = 'native:'
    else:
        identity = event.model_dump(mode='json')
        prefix = 'fingerprint:'
    canonical = json.dumps(identity, sort_keys=True, separators=(',', ':'), allow_nan=False)
    return prefix + hashlib.sha256(canonical.encode('utf-8')).hexdigest()


class EventStore:
    def __init__(self, path: Path):
        self.path = path

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute('''
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    dedup_key TEXT NOT NULL UNIQUE,
                    payload TEXT NOT NULL
                )
            ''')
            connection.execute('''
                CREATE TABLE IF NOT EXISTS assets (
                    asset_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                )
            ''')
            connection.execute('''
                CREATE TABLE IF NOT EXISTS host_health (
                    asset_id TEXT NOT NULL REFERENCES assets(asset_id),
                    simulation INTEGER NOT NULL,
                    event_id TEXT NOT NULL REFERENCES events(event_id),
                    observed_at TEXT NOT NULL,
                    PRIMARY KEY (asset_id, simulation)
                )
            ''')

    def save(self, incoming: EventInput, *, host_health: bool = False) -> tuple[Event, bool]:
        key = deduplication_key(incoming)
        event = Event(**incoming.model_dump(), event_id=uuid4(),
                      ingested_at=datetime.now(timezone.utc))
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute('PRAGMA foreign_keys = ON')
            cursor = connection.execute('''
                INSERT INTO events (event_id, dedup_key, payload) VALUES (?, ?, ?)
                ON CONFLICT(dedup_key) DO NOTHING
            ''', (str(event.event_id), key, event.model_dump_json()))
            if cursor.rowcount == 1:
                if host_health:
                    connection.execute('''
                        INSERT INTO host_health (asset_id, simulation, event_id, observed_at)
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(asset_id, simulation) DO UPDATE SET
                            event_id = excluded.event_id, observed_at = excluded.observed_at
                        WHERE excluded.observed_at >= host_health.observed_at
                    ''', (event.asset.asset_id, event.simulation, str(event.event_id),
                          event.timestamp.isoformat(timespec='microseconds')))
                return event, True
            row = connection.execute('SELECT payload FROM events WHERE dedup_key = ?', (key,)).fetchone()
            return Event.model_validate_json(row[0]), False

    def get(self, event_id: UUID) -> Event | None:
        with closing(sqlite3.connect(self.path)) as connection:
            row = connection.execute('SELECT payload FROM events WHERE event_id = ?', (str(event_id),)).fetchone()
        return Event.model_validate_json(row[0]) if row else None

    def register_asset(self, asset: Asset) -> None:
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute('''
                INSERT INTO assets (asset_id, payload) VALUES (?, ?)
                ON CONFLICT(asset_id) DO UPDATE SET payload = excluded.payload
            ''', (asset.asset_id, asset.model_dump_json()))

    def get_asset(self, asset_id: str) -> Asset | None:
        with closing(sqlite3.connect(self.path)) as connection:
            row = connection.execute('SELECT payload FROM assets WHERE asset_id = ?', (asset_id,)).fetchone()
        return Asset.model_validate_json(row[0]) if row else None

    def latest_host_health(self, asset_id: str, simulation: bool) -> Event | None:
        with closing(sqlite3.connect(self.path)) as connection:
            row = connection.execute('''
                SELECT events.payload FROM host_health
                JOIN events USING (event_id)
                WHERE asset_id = ? AND simulation = ?
            ''', (asset_id, simulation)).fetchone()
        return Event.model_validate_json(row[0]) if row else None

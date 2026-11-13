import argparse
import http.client
import logging
import math
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from .models import Asset, CollectorStatus, Event, EventInput, EventSource, Model
from .store import EventStore


MAX_METRICS_BYTES = 2 * 1024 * 1024
METRICS = {
    'node_load1': 'load_1m',
    'node_memory_MemTotal_bytes': 'memory_total_bytes',
    'node_memory_MemAvailable_bytes': 'memory_available_bytes',
    'node_boot_time_seconds': 'boot_time_seconds',
}


class HostHealth(Model):
    asset: Asset
    simulation: bool
    asset_status: Literal['up', 'unknown'] = 'unknown'
    collector: CollectorStatus | None = None
    observation: Event | None = None


def parse_metrics(payload: bytes, checked_at: datetime) -> dict[str, float]:
    if len(payload) > MAX_METRICS_BYTES:
        raise ValueError('metrics response exceeds size limit')
    values = {}
    for line in payload.decode('utf-8').splitlines():
        fields = line.split()
        if not fields or fields[0] not in METRICS:
            continue
        name = METRICS[fields[0]]
        if len(fields) not in {2, 3} or name in values:
            raise ValueError('invalid metric sample')
        value = float(fields[1])
        if not math.isfinite(value) or value < 0:
            raise ValueError('invalid metric value')
        values[name] = value
    if not values:
        raise ValueError('no supported metrics')
    if 'boot_time_seconds' in values:
        uptime = checked_at.timestamp() - values['boot_time_seconds']
        if uptime < 0:
            raise ValueError('boot time is in the future')
        values['uptime_seconds'] = uptime
    total = values.get('memory_total_bytes')
    available = values.get('memory_available_bytes')
    if total is not None and available is not None:
        if total <= 0 or available > total:
            raise ValueError('invalid memory metrics')
        values['memory_used_percent'] = 100 * (1 - available / total)
    return values


def read_exporter(port: int) -> bytes:
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
    try:
        connection.request('GET', '/metrics', headers={'Accept': 'text/plain; version=0.0.4'})
        response = connection.getresponse()
        if response.status != 200:
            raise ValueError('exporter returned a non-200 response')
        return response.read(MAX_METRICS_BYTES + 1)
    finally:
        connection.close()


def collect(asset: Asset, *, port: int = 9100, fixture: Path | None = None) -> EventInput:
    checked_at = datetime.now(timezone.utc)
    source = EventSource(type='node_exporter', name=asset.asset_id)
    try:
        if fixture is None:
            payload = read_exporter(port)
        else:
            with fixture.open('rb') as handle:
                payload = handle.read(MAX_METRICS_BYTES + 1)
        checked_at = datetime.now(timezone.utc)
        metrics = parse_metrics(payload, checked_at)
    except (OSError, http.client.HTTPException, ValueError) as exc:
        logging.getLogger(__name__).warning('host_collection_failed error_type=%s', type(exc).__name__)
        return EventInput(
            schema_version='0.1', timestamp=datetime.now(timezone.utc), source=source, asset=asset,
            category='collector', event_type='host_collection_failed', status='collector_error',
            simulation=fixture is not None, details={'reason': 'Unable to read valid exporter metrics'},
        )
    return EventInput(
        schema_version='0.1', timestamp=checked_at, source=source, asset=asset,
        category='performance', event_type='host_metrics', status='observed',
        simulation=fixture is not None, details={'metrics': metrics},
    )


def health_view(asset: Asset, event: Event | None, simulation: bool, max_age: int) -> HostHealth:
    view = HostHealth(asset=asset, simulation=simulation, observation=event)
    if event is None:
        return view
    stale = (datetime.now(timezone.utc) - event.timestamp).total_seconds() > max_age
    failed = event.status == 'collector_error'
    collector_status = 'unknown' if stale else 'collector_error' if failed else 'healthy'
    reason = 'Latest check is stale' if stale else 'Unable to read valid exporter metrics' if failed else None
    view.collector = CollectorStatus(source=event.source, status=collector_status,
                                     checked_at=event.timestamp, reason=reason)
    if collector_status == 'healthy':
        view.asset_status = 'up'
    return view


def main() -> int:
    parser = argparse.ArgumentParser(description='Collect one Node Exporter observation')
    parser.add_argument('asset_id')
    parser.add_argument('--port', type=int, choices=range(1, 65536), metavar='PORT', default=9100)
    parser.add_argument('--fixture', type=Path, help='Read simulated metrics from a local file')
    args = parser.parse_args()
    store = EventStore(Path(os.environ.get('AEGISOPS_DB_PATH', 'var/aegisops.sqlite3')))
    try:
        store.initialize()
        asset = store.get_asset(args.asset_id)
        if asset is None:
            parser.error('register this asset before collecting metrics')
        observation = collect(asset, port=args.port, fixture=args.fixture)
        saved, _ = store.save(observation, host_health=True)
    except sqlite3.Error:
        parser.exit(1, 'Event storage unavailable\n')
    print(saved.model_dump_json())
    return int(saved.status == 'collector_error')


if __name__ == '__main__':
    raise SystemExit(main())

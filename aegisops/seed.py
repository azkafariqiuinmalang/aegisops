"""Optional demo seeding for public deployments.

Enabled only when ``AEGISOPS_SEED_DEMO=1`` and the database has no assets yet.
All generated data is marked as simulation so the dashboard keeps its
"data simulasi" labelling.
"""

import logging
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .host_health import collect
from .models import Asset, EventInput, EventSource, Network
from .store import EventStore

logger = logging.getLogger(__name__)

DEMO_ASSET = Asset(asset_id='lab-host', role='linux-server')
FIXTURE = Path(__file__).resolve().parent.parent / 'tests' / 'fixtures' / 'node_exporter.prom'


def _security_event(*, timestamp: datetime, record_id: str, event_type: str, category: str,
                    source_type: str, network: Network) -> EventInput:
    return EventInput(
        schema_version='0.1', timestamp=timestamp,
        source=EventSource(type=source_type, name='demo-feed', event_id=record_id),
        category=category, event_type=event_type, status='normalized', simulation=True,
        asset=Asset(asset_id=DEMO_ASSET.asset_id), network=network,
    )


def _metrics_fixture() -> Path | None:
    """Return a metrics fixture, generating one when the repo copy is unavailable."""
    if FIXTURE.is_file():
        return FIXTURE
    try:
        target = Path(tempfile.gettempdir()) / 'aegisops_node_exporter.prom'
        boot_time = int(datetime.now(timezone.utc).timestamp()) - 86400
        target.write_text(
            'node_load1 0.35\n'
            'node_memory_MemTotal_bytes 8589934592\n'
            'node_memory_MemAvailable_bytes 6442450944\n'
            f'node_boot_time_seconds {boot_time}\n',
            encoding='utf-8')
        return target
    except OSError:
        return None


def seed_if_empty(store: EventStore) -> bool:
    """Store the demo dataset once; returns True when seeding happened."""
    if store.list_assets():
        return False
    store.register_asset(DEMO_ASSET)
    now = datetime.now(timezone.utc)
    for index in range(4):
        store.save(_security_event(
            timestamp=now - timedelta(seconds=40 - index * 8),
            record_id=f'seed-ssh-{index}', event_type='ssh_login_failed',
            category='authentication', source_type='auth_log',
            network=Network(src_ip='198.51.100.25', protocol='tcp')))
    for port in (22, 80, 443, 8080, 8443):
        store.save(_security_event(
            timestamp=now - timedelta(seconds=30),
            record_id=f'seed-tcp-{port}', event_type='connection_observed',
            category='network', source_type='network_metadata',
            network=Network(src_ip='198.51.100.77', dst_ip='192.0.2.10',
                            dst_port=port, protocol='tcp')))
    fixture = _metrics_fixture()
    if fixture is not None:
        try:
            store.save(collect(DEMO_ASSET, fixture=fixture), host_health=True)
        except Exception:  # pragma: no cover - seeding must never block startup
            logger.warning('demo_seed_health_failed', exc_info=True)
    logger.info('demo_seed_complete')
    return True

from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Literal
from uuid import UUID

from pydantic import Field

from .models import Event, Model


class DetectionPolicy(Model):
    window_seconds: int = Field(default=60, ge=1, le=3600)
    ssh_failures: int = Field(default=4, ge=2, le=100)
    distinct_ports: int = Field(default=5, ge=2, le=100)


class Finding(Model):
    rule_id: Literal['DET-001', 'DET-002']
    rule_version: str = '1.0'
    title: str
    asset_id: str
    source_ip: str
    simulation: bool
    first_seen: datetime
    last_seen: datetime
    count: int
    threshold: int
    window_seconds: int
    source_event_ids: list[UUID]
    recommended_action: str


def evaluate(events: list[Event], policy: DetectionPolicy) -> list[Finding]:
    groups = defaultdict(list)
    for event in sorted(events, key=lambda item: (item.timestamp, item.event_id)):
        network = event.network
        if (event.asset is None or network is None or network.src_ip is None
                or event.status not in {'observed', 'normalized', 'simulated'}):
            continue
        if (event.category, event.event_type) == ('authentication', 'ssh_login_failed'):
            rule = 'DET-001'
        elif ((event.category, event.event_type) == ('network', 'connection_observed')
              and network.protocol == 'tcp' and network.dst_port is not None
              and network.dst_port > 0 and network.dst_ip is not None):
            rule = 'DET-002'
        else:
            continue
        destination = str(network.dst_ip) if rule == 'DET-002' else None
        key = (rule, event.simulation, event.asset.asset_id, str(network.src_ip), destination)
        groups[key].append(event)

    findings = []
    duration = timedelta(seconds=policy.window_seconds)
    for (rule, simulation, asset_id, source_ip, _), samples in groups.items():
        ssh = rule == 'DET-001'
        threshold = policy.ssh_failures if ssh else policy.distinct_ports
        window = deque()
        seen = set()
        for event in samples:
            if event.event_id in seen:
                continue
            seen.add(event.event_id)
            window.append(event)
            while event.timestamp - window[0].timestamp > duration:
                window.popleft()
            count = len(window) if ssh else len({item.network.dst_port for item in window})
            if count < threshold:
                continue
            findings.append(Finding(
                rule_id=rule,
                title='Kegagalan SSH berulang' if ssh else 'Indikasi koneksi ke banyak port',
                asset_id=asset_id, source_ip=source_ip, simulation=simulation,
                first_seen=window[0].timestamp, last_seen=event.timestamp,
                count=count, threshold=threshold, window_seconds=policy.window_seconds,
                source_event_ids=[item.event_id for item in window],
                recommended_action=(
                    'Periksa log autentikasi host dan sumber koneksi.'
                    if ssh else 'Periksa apakah pola koneksi berasal dari layanan atau pemantauan yang dikenal.'
                ),
            ))
            break
    return sorted(findings, key=lambda item: (item.last_seen, item.rule_id), reverse=True)

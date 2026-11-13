from pydantic import AwareDatetime

from .models import Asset, Category, EventInput, EventSource, IPAddress, Model, Network, Port, Text


class SecurityRecord(Model):
    timestamp: AwareDatetime
    record_id: Text
    source_name: Text
    asset_id: Text
    src_ip: IPAddress


class SSHFailure(SecurityRecord):
    def normalize(self, simulation: bool) -> EventInput:
        return normalize(self, simulation, 'auth_log', 'authentication', 'ssh_login_failed',
                         Network(src_ip=self.src_ip, protocol='tcp'))


class TCPConnection(SecurityRecord):
    dst_ip: IPAddress
    dst_port: Port

    def normalize(self, simulation: bool) -> EventInput:
        return normalize(self, simulation, 'network_metadata', 'network', 'connection_observed',
                         Network(src_ip=self.src_ip, dst_ip=self.dst_ip,
                                 dst_port=self.dst_port, protocol='tcp'))


def normalize(record: SecurityRecord, simulation: bool, source_type: str, category: Category,
              event_type: str, network: Network) -> EventInput:
    return EventInput(
        schema_version='0.1', timestamp=record.timestamp,
        source=EventSource(type=source_type, name=record.source_name, event_id=record.record_id),
        category=category, event_type=event_type, status='normalized', simulation=simulation,
        asset=Asset(asset_id=record.asset_id), network=network,
    )

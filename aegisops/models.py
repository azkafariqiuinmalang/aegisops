from datetime import datetime, timezone
from ipaddress import IPv4Address, IPv6Address
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, JsonValue, StringConstraints, field_validator, model_validator


Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Port = Annotated[int, Field(strict=True, ge=0, le=65535)]
IPAddress = IPv4Address | IPv6Address
Severity = Literal['info', 'low', 'medium', 'high', 'critical', 'unknown']
Category = Literal['availability', 'performance', 'network', 'authentication',
                   'system', 'configuration', 'security', 'collector']
EventStatus = Literal['observed', 'normalized', 'simulated', 'collector_error', 'unknown']


class Model(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Asset(Model):
    asset_id: Text
    hostname: Text | None = None
    ip: list[IPAddress] = Field(default_factory=list, max_length=32)
    role: Text | None = None


class EventSource(Model):
    type: Text
    name: Text
    event_id: Text | None = None


class Network(Model):
    src_ip: IPAddress | None = None
    dst_ip: IPAddress | None = None
    src_port: Port | None = None
    dst_port: Port | None = None
    protocol: Literal['tcp', 'udp', 'icmp', 'icmpv6', 'sctp'] | None = None


class EventInput(Model):
    schema_version: Literal['0.1']
    timestamp: datetime
    source: EventSource
    category: Category
    event_type: Text
    status: EventStatus
    simulation: bool = Field(strict=True)
    severity: Severity = 'unknown'
    asset: Asset | None = None
    network: Network | None = None
    details: dict[str, JsonValue] = Field(default_factory=dict)
    labels: list[Text] = Field(default_factory=list, max_length=32)
    raw_reference: Text | None = None

    @model_validator(mode='after')
    def align_simulation_status(self):
        if self.simulation and self.status in {'observed', 'normalized'}:
            self.status = 'simulated'
        elif self.status == 'simulated' and not self.simulation:
            raise ValueError('simulated status requires simulation=true')
        return self

    @field_validator('timestamp', mode='before')
    @classmethod
    def require_iso_string(cls, value: object) -> object:
        if isinstance(value, datetime):
            return value
        if not isinstance(value, str) or 'T' not in value:
            raise ValueError('timestamp must be ISO 8601 with a timezone')
        return value

    @field_validator('timestamp')
    @classmethod
    def to_utc(cls, value: datetime) -> datetime:
        if value.utcoffset() is None:
            raise ValueError('timestamp requires a timezone')
        try:
            return value.astimezone(timezone.utc)
        except OverflowError as exc:
            raise ValueError('timestamp is outside the supported UTC range') from exc


class Event(EventInput):
    event_id: UUID
    ingested_at: datetime


class CollectorStatus(Model):
    source: EventSource
    status: Literal['healthy', 'degraded', 'collector_error', 'unknown']
    checked_at: datetime
    reason: Text | None = None


class Alert(Model):
    alert_id: UUID
    rule_id: Text
    rule_version: Text
    title: Text
    severity: Severity
    first_seen: datetime
    last_seen: datetime
    created_at: datetime
    affected_assets: list[Text]
    source_event_ids: list[UUID] = Field(min_length=1)
    reason: Text
    evidence: dict[str, JsonValue] = Field(default_factory=dict)
    recommended_actions: list[Text] = Field(default_factory=list)
    status: Literal['new', 'acknowledged', 'investigating', 'resolved', 'false_positive'] = 'new'

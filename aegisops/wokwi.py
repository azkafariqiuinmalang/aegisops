import logging
import os
import sqlite3
from datetime import datetime, timezone

from pydantic import Field, ValidationError

from .models import Asset, Event, EventInput, EventSource, Model
from .store import EventStore


logger = logging.getLogger(__name__)


class WokwiReading(Model):
    temperature_c: float = Field(ge=-40, le=80, allow_inf_nan=False)
    humidity_percent: float = Field(ge=0, le=100, allow_inf_nan=False)


def save_reading(store: EventStore, reading: WokwiReading) -> Event:
    event, _ = store.save(EventInput(
        schema_version='0.1', timestamp=datetime.now(timezone.utc),
        source=EventSource(type='wokwi', name='aegisnode-wokwi'),
        category='performance', event_type='aegisnode_wokwi_reading',
        status='simulated', simulation=True,
        asset=Asset(asset_id='aegis-node-01'), details=reading.model_dump(),
    ))
    return event


def start_mqtt(store: EventStore):
    topic = os.getenv('AEGISOPS_MQTT_TOPIC', '').strip()
    if not topic:
        return None
    if any(char in topic for char in ('#', '+', '\0')):
        raise ValueError('AEGISOPS_MQTT_TOPIC must be one exact MQTT topic')

    import paho.mqtt.client as mqtt

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            logger.warning('Wokwi MQTT connection rejected: %s', reason_code)
            return
        result, _ = client.subscribe(topic, qos=0)
        if result != mqtt.MQTT_ERR_SUCCESS:
            logger.warning('Could not subscribe to Wokwi MQTT topic: %s', result)

    def on_message(client, userdata, message):
        if message.topic != topic or message.retain or len(message.payload) > 512:
            return
        try:
            reading = WokwiReading.model_validate_json(message.payload)
            save_reading(store, reading)
        except ValidationError:
            logger.warning('Rejected invalid Wokwi MQTT reading')
        except sqlite3.Error:
            logger.exception('Could not save Wokwi MQTT reading')

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=1, max_delay=30)
    client.connect_async(os.getenv('AEGISOPS_MQTT_HOST', 'broker.hivemq.com'),
                         int(os.getenv('AEGISOPS_MQTT_PORT', '1883')))
    client.loop_start()
    return client

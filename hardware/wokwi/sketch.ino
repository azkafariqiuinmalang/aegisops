#include <WiFi.h>
#include <PubSubClient.h>
#include <DHTesp.h>

constexpr int SENSOR_PIN = 15;
constexpr int HEARTBEAT_PIN = 5;
constexpr char MQTT_HOST[] = "broker.hivemq.com";
constexpr char MQTT_TOPIC[] = "REPLACE_WITH_DEMO_TOPIC";
DHTesp sensor;
WiFiClient network;
PubSubClient mqtt(network);

void setup() {
  Serial.begin(115200);
  sensor.setup(SENSOR_PIN, DHTesp::DHT22);
  pinMode(HEARTBEAT_PIN, INPUT_PULLUP);
  WiFi.mode(WIFI_STA);
  WiFi.begin("Wokwi-GUEST", "", 6);
  mqtt.setServer(MQTT_HOST, 1883);
  mqtt.setSocketTimeout(2);
}

void loop() {
  delay(5000);
  if (digitalRead(HEARTBEAT_PIN) == LOW) {
    Serial.println("Heartbeat paused");
    return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Waiting for Wokwi WiFi");
    return;
  }
  TempAndHumidity reading = sensor.getTempAndHumidity();
  if (!isfinite(reading.temperature) || !isfinite(reading.humidity)) {
    Serial.println("DHT22 reading unavailable");
    return;
  }
  String body = "{\"temperature_c\":" + String(reading.temperature, 1)
    + ",\"humidity_percent\":" + String(reading.humidity, 1) + "}";
  Serial.println(body);
  if (strcmp(MQTT_TOPIC, "REPLACE_WITH_DEMO_TOPIC") == 0) return;
  if (!mqtt.connected()) {
    String clientId = "aegisnode-" + String(esp_random(), HEX);
    if (!mqtt.connect(clientId.c_str())) {
      Serial.printf("MQTT connection failed: %d\n", mqtt.state());
      return;
    }
  }
  mqtt.loop();
  Serial.println(mqtt.publish(MQTT_TOPIC, body.c_str(), false)
    ? "MQTT sample published" : "MQTT publish failed");
}

#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ==================== 1. ตั้งค่า Wi-Fi & MQTT ====================
const char* ssid          = "ชื่อไวไฟของคุณ";
const char* password      = "รหัสผ่านไวไฟของคุณ";
const char* mqtt_server   = "broker.hivemq.com";
const int   mqtt_port     = 1883;
const char* mqtt_topic    = "petfeeder/command";

// ==================== 2. กำหนด Pin Servo ====================
#define SERVO_PIN 13

Servo myServo;
WiFiClient espClient;
PubSubClient client(espClient);

// ฟังก์ชันหมุน Servo สั่งให้อาหาร
void rotateServo() {
  Serial.println("🔄 Executing Servo Feed...");
  myServo.write(90);  // หมุนเปิดช่องอาหารไปที่ 90 องศา
  delay(500);          // เปิดไว้ 0.5 วินาที
  myServo.write(0);   // หมุนกลับมาปิดที่ 0 องศา
  Serial.println("✅ Servo Closed");
}

// ฟังก์ชันรับข้อความจาก MQTT
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("📩 Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  // ตรวจจับคำสั่งสั่งให้อาหาร
  if (message == "ON" || message == "ให้อาหาร") {
    rotateServo();
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Feeder-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected!");
      client.subscribe(mqtt_topic);
      Serial.print("Subscribed to: ");
      Serial.println(mqtt_topic);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  // ตั้งค่า Servo
  myServo.attach(SERVO_PIN);
  myServo.write(0); // เริ่มต้นปิดช่องจ่ายอาหารที่ 0 องศา

  // เชื่อมต่อ Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");

  // ตั้งค่า MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
}

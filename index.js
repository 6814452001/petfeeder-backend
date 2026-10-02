const express = require('express');
const line = require('@line/bot-sdk');
const mqtt = require('mqtt');

// ==================== 1. การตั้งค่า LINE Messaging API ====================
// นำ Channel Access Token และ Channel Secret จาก LINE Developers Console มาใส่ที่นี่
const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'YOUR_LINE_CHANNEL_ACCESS_TOKEN',
  channelSecret: process.env.CHANNEL_SECRET || 'YOUR_LINE_CHANNEL_SECRET'
};

const lineClient = new line.Client(lineConfig);

// ==================== 2. การเชื่อมต่อ MQTT Broker ====================
// ใช้ HiveMQ Broker และ Topic เดียวกับที่ตั้งไว้ใน ESP32
const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC  = 'petfeeder/command';

const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('✅ Connected to HiveMQ Broker successfully!');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT Connection Error:', err);
});

// ==================== 3. การสร้าง Express Server ====================
const app = express();
const PORT = process.env.PORT || 3000;

// Webhook Endpoint สำหรับรับ Event จาก LINE
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling event:', err);
      res.status(500).end();
    });
});

// ==================== 4. ฟังก์ชันจัดการ Message Event ====================
async function handleEvent(event) {
  // รับเฉพาะข้อความตัวอักษร (Text Message)
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // ตัดเว้นวรรค และแปลงเป็นตัวพิมพ์ใหญ่เพื่อเช็กเงื่อนไข
  const userText = event.message.text.trim();
  const uppercaseText = userText.toUpperCase();

  console.log(`📩 Received message from LINE: "${userText}"`);

  // เช็กเงื่อนไขว่าตรงกับคำว่า "ให้อาหาร" หรือ "FEED" หรือไม่
  if (userText === 'ให้อาหาร' || uppercaseText === 'FEED') {
    
    // Payload ที่จะส่งหา ESP32
    const payload = 'ให้อาหาร';

    // ส่งข้อความผ่าน MQTT ไปยัง ESP32
    mqttClient.publish(MQTT_TOPIC, payload, { qos: 0 }, (err) => {
      if (err) {
        console.error('❌ Failed to publish MQTT message:', err);
      } else {
        console.log(`🚀 MQTT Published to [${MQTT_TOPIC}]: ${payload}`);
      }
    });

    // ข้อความตอบกลับไปยัง LINE User
    const replyText = '🐾 รับทราบครับ! กำลังจ่ายอาหารให้สัตว์เลี้ยงของคุณทันที...';
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });

  } else if (userText === 'เช็คสถานะ' || uppercaseText === 'STATUS') {
    
    // ตัวอย่างคำสั่งเพิ่มเติมสำหรับเช็กสถานะ
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🤖 เครื่องให้อาหารสัตว์เลี้ยงออนไลน์พร้อมใช้งานครับ'
    });

  } else {
    
    // กรณีพิมพ์คำอื่นเข้ามา
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '❓ กรุณาพิมพ์คำว่า "ให้อาหาร" เพื่อสั่งจ่ายอาหารครับ'
    });

  }
}

// เริ่มต้นเปิด Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
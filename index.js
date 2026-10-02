const express = require('express');
const line = require('@line/bot-sdk');
const mqtt = require('mqtt');

// 1. ตั้งค่า LINE Client
const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: process.env.CHANNEL_SECRET || 'YOUR_CHANNEL_SECRET'
};

const lineClient = new line.Client(lineConfig);

// 2. เชื่อมต่อ MQTT Broker (ตรงกับ ESP32)
const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC  = 'petfeeder/command';

const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('✅ Connected to HiveMQ Broker!');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT Error:', err);
});

const app = express();
const PORT = process.env.PORT || 3000;

// 3. Webhook Endpoint
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling event:', err);
      res.status(500).end();
    });
});

// 4. ฟังก์ชันจัดการคำสั่งจาก LINE
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  console.log(`📩 Received message from LINE: "${userText}"`);

  // ตรวจสอบคำสั่ง "ให้อาหาร" หรือ "FEED"
  if (userText === 'ให้อาหาร' || userText.toUpperCase() === 'FEED') {
    
    // ส่งข้อมูลลง MQTT Topic
    mqttClient.publish(MQTT_TOPIC, 'ให้อาหาร', { qos: 0 }, (err) => {
      if (err) {
        console.error('❌ Failed to publish MQTT:', err);
      } else {
        console.log(`🚀 Published to MQTT [${MQTT_TOPIC}]: ให้อาหาร`);
      }
    });

    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🐾 จ่ายอาหารเรียบร้อยแล้วครับ!'
    });
  } else {
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: 'พิมพ์คำว่า "ให้อาหาร" เพื่อสั่งงานครับ'
    });
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
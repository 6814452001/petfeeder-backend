const express = require('express');
const line = require('@line/bot-sdk');
const mqtt = require('mqtt');
const https = require('https');

// ==================== 1. ตั้งค่า LINE Client ====================
const lineConfig = {
  channelAccessToken: 'Q6HL6BPXBNUOk0w/LJi1z5gsY8suwI6xp+eTDX1YoJGETMn4nZdU10J2osD9gngKOg1ND53ixoYcPY0dxqe8R49/eRFNYK7P1Kuvg6BoCbbjQiRf920Y667qMawKVqSe2u3VoCnjNKvS01q18Fk0cAdB04t89/10/w1cDnyi1FU=',
  channelSecret: '5b860a740ca5d2c267455fd8f198f01c'
};

const lineClient = new line.Client(lineConfig);

// ==================== 2. ตั้งค่า MQTT Broker ====================
const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC  = 'petfeeder/command';
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('✅ Connected to HiveMQ Broker!');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT Error:', err);
});

// ==================== 3. ตั้งค่า Express Web Server ====================
const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------------------------------------
// UI หน้าเว็บ Dashboard สำหรับสั่งงานผ่านเบราว์เซอร์
// ----------------------------------------------------
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Smart Pet Feeder Dashboard</title>
      <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; font-family: 'Kanit', sans-serif; }
        body { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; margin: 0; 
        }
        .container { 
          background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); 
          border-radius: 24px; padding: 35px 25px; width: 100%; max-width: 400px; 
          box-shadow: 0 20px 40px rgba(0,0,0,0.2); text-align: center; 
        }
        .icon-box { 
          width: 90px; height: 90px; background: #f0f3ff; border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; font-size: 45px; 
        }
        h1 { margin: 0; font-size: 24px; color: #2d3748; }
        p { color: #718096; font-size: 14px; margin-top: 5px; margin-bottom: 25px; }
        .feed-btn { 
          width: 100%; background: linear-gradient(135deg, #42e695 0%, #3bb2b8 100%); 
          color: white; border: none; padding: 18px; font-size: 18px; font-weight: 600; 
          border-radius: 16px; cursor: pointer; box-shadow: 0 10px 20px rgba(59,178,184,0.3); 
          transition: all 0.2s ease; 
        }
        .feed-btn:active { transform: scale(0.97); }
        .status-card { 
          margin-top: 20px; padding: 12px; border-radius: 12px; background: #f7fafc; 
          font-size: 14px; font-weight: 500; color: #4a5568; min-height: 45px; 
          display: flex; align-items: center; justify-content: center; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon-box">🐶</div>
        <h1>Smart Pet Feeder</h1>
        <p>ระบบสั่งจ่ายอาหารสัตว์เลี้ยงอัจฉริยะ</p>
        
        <button class="feed-btn" onclick="feedPet()">🍖 สั่งให้อาหารทันที</button>
        
        <div class="status-card" id="status">สถานะ: พร้อมใช้งาน</div>
      </div>

      <script>
        function feedPet() {
          const statusDiv = document.getElementById('status');
          statusDiv.style.color = '#3182ce';
          statusDiv.innerText = '⏳ กำลังส่งสัญญาณไปยัง ESP32...';
          
          fetch('/api/feed', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
              statusDiv.style.color = '#38a169';
              statusDiv.innerText = '✅ จ่ายอาหารสำเร็จเรียบร้อย!';
              setTimeout(() => { 
                statusDiv.style.color = '#4a5568';
                statusDiv.innerText = 'สถานะ: พร้อมใช้งาน'; 
              }, 4000);
            })
            .catch(err => {
              statusDiv.style.color = '#e53e3e';
              statusDiv.innerText = '❌ เกิดข้อผิดพลาด ไม่สามารถส่งคำสั่งได้';
            });
        }
      </script>
    </body>
    </html>
  `);
});

// Endpoint API สำหรับรับคำสั่งกดปุ่มจากหน้าเว็บ
app.post('/api/feed', (req, res) => {
  mqttClient.publish(MQTT_TOPIC, 'ให้อาหาร', { qos: 0 }, (err) => {
    if (err) {
      console.error('❌ Web API MQTT Error:', err);
      res.status(500).json({ success: false, error: err });
    } else {
      console.log(`🚀 Web App Published to MQTT [${MQTT_TOPIC}]: ให้อาหาร`);
      res.json({ success: true, message: 'Feeding triggered!' });
    }
  });
});

// ----------------------------------------------------
// Webhook สำหรับรองรับข้อความจาก LINE Messaging API
// ----------------------------------------------------
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling event:', err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  console.log(`📩 Received message from LINE: "${userText}"`);

  if (userText === 'ให้อาหาร' || userText.toUpperCase() === 'FEED') {
    
    // ตอบกลับข้อความหาผู้ใช้ใน LINE ทันที
    const replyPromise = lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🐾 จ่ายอาหารเรียบร้อยแล้วครับ!'
    }).catch(err => console.error('❌ LINE Reply Error:', err.originalError ? err.originalError.response.data : err));

    // ส่งคำสั่งไปยัง MQTT Broker
    mqttClient.publish(MQTT_TOPIC, 'ให้อาหาร', { qos: 0 }, (err) => {
      if (err) {
        console.error('❌ Failed to publish MQTT:', err);
      } else {
        console.log(`🚀 LINE Published to MQTT [${MQTT_TOPIC}]: ให้อาหาร`);
      }
    });

    return replyPromise;
  } else {
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: 'พิมพ์คำว่า "ให้อาหาร" เพื่อสั่งงานครับ'
    });
  }
}

// ==================== 4. รัน Server & ป้องกัน Sleep Mode ====================
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  
  // ยิง Self-Ping ทักตัวเองทุกๆ 10 นาที เพื่อไม่ให้ Render หลับ (Sleep Mode)
  setInterval(() => {
    https.get('https://petfeeder-backend-ylcj.onrender.com', (res) => {
      console.log(`⏰ Self-ping status: ${res.statusCode} (Server active)`);
    }).on('error', (err) => {
      console.log('⚠️️ Self-ping failed:', err.message);
    });
  }, 10 * 60 * 1000); // 10 นาที
});
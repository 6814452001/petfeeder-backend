const express = require('express');
const line = require('@line/bot-sdk');
const mqtt = require('mqtt');
const https = require('https');

// ==================== 1. ตั้งค่า LINE Client ====================
const lineConfig = {
  channelAccessToken: 'T2PczsnGdCNLy61ozmQfmvdCWCajw1Xske+SeH914xIeObVqoMFMhgijlDvElZ5ROglND53ixoYcPY0dxqe8R49/eRFNYK7P1Kuvg6BoCbY5MgcvtyZaV8oDxiZaKfk4k67ZexyrOAlQ7tbooE9Q4QdB04t89/1O/w1cDnyilFU=',
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

// ฟังก์ชันสั่งจ่ายอาหาร
function triggerFeeding(source = 'Unknown') {
  mqttClient.publish(MQTT_TOPIC, 'ให้อาหาร', { qos: 0 }, (err) => {
    if (err) {
      console.error(`❌ [${source}] Failed to publish MQTT:`, err);
    } else {
      console.log(`🚀 [${source}] Published to MQTT [${MQTT_TOPIC}]: ให้อาหาร`);
    }
  });
}

// ==================== 3. ระบบตั้งเวลาให้อาหาร (Scheduler) ====================
let schedules = [
  { id: 1, time: '', days: [], enabled: false },
  { id: 2, time: '', days: [], enabled: false },
  { id: 3, time: '', days: [], enabled: false },
  { id: 4, time: '', days: [], enabled: false },
  { id: 5, time: '', days: [], enabled: false }
];

setInterval(() => {
  const now = new Date();
  const options = { timeZone: 'Asia/Bangkok', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  let currentHour = '', currentMinute = '', currentSecond = '', currentDay = '';
  parts.forEach(p => {
    if (p.type === 'hour') currentHour = p.value;
    if (p.type === 'minute') currentMinute = p.value;
    if (p.type === 'second') currentSecond = p.value;
    if (p.type === 'weekday') currentDay = p.value.toLowerCase();
  });

  const currentTimeStr = `${currentHour}:${currentMinute}`;

  if (currentSecond === '00') {
    schedules.forEach(item => {
      if (item.enabled && item.time === currentTimeStr && item.days.includes(currentDay)) {
        console.log(`⏰ Schedule Triggered! ID: ${item.id} Time: ${item.time}`);
        triggerFeeding(`Schedule ID ${item.id}`);
      }
    });
  }
}, 1000);

// ==================== 4. ตั้งค่า Express Server ====================
const app = express();
const PORT = process.env.PORT || 3000;

// API สำหรับดึงและบันทึกตารางเวลา
app.get('/api/schedules', express.json(), (req, res) => res.json(schedules));
app.post('/api/schedules', express.json(), (req, res) => {
  schedules = req.body;
  console.log('📅 Schedules Updated:', JSON.stringify(schedules));
  res.json({ success: true, schedules });
});

// Endpoint API สำหรับกดปุ่มสั่งให้อาหารจากเว็บ
app.post('/api/feed', express.json(), (req, res) => {
  triggerFeeding('Web App');
  res.json({ success: true, message: 'Feeding triggered!' });
});

// UI หน้าเว็บ Dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Smart Pet Feeder Dashboard</title>
      <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; font-family: 'Kanit', sans-serif; }
        body { background: #f0f2f5; margin: 0; padding: 20px 10px; display: flex; justify-content: center; }
        .card { background: white; border-radius: 20px; padding: 25px; width: 100%; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
        h1 { text-align: center; color: #1a202c; font-size: 22px; margin-top: 0; }
        .feed-now-btn { width: 100%; background: linear-gradient(135deg, #ff7e5f, #feb47b); color: white; border: none; padding: 15px; font-size: 18px; font-weight: 600; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 15px rgba(255,126,95,0.4); margin-bottom: 25px; }
        .feed-now-btn:active { transform: scale(0.98); }
        .section-title { font-size: 16px; font-weight: 600; color: #4a5568; margin-bottom: 12px; border-bottom: 2px solid #edf2f7; padding-bottom: 5px; }
        .sched-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
        .sched-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .sched-title { font-weight: 600; color: #2d3748; }
        .time-input { padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e0; font-size: 15px; }
        .days-box { display: flex; gap: 4px; margin-top: 8px; justify-content: space-between; }
        .day-btn { flex: 1; padding: 6px 0; border: 1px solid #cbd5e0; background: white; border-radius: 6px; font-size: 12px; cursor: pointer; text-align: center; }
        .day-btn.active { background: #3182ce; color: white; border-color: #3182ce; }
        .switch { position: relative; display: inline-block; width: 44px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 22px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
        input:checked + .slider { background-color: #48bb78; }
        input:checked + .slider:before { transform: translateX(22px); }
        .save-btn { width: 100%; background: #3182ce; color: white; border: none; padding: 12px; font-size: 16px; font-weight: 600; border-radius: 10px; cursor: pointer; margin-top: 15px; }
        #status { text-align: center; margin-top: 10px; font-weight: 500; min-height: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🐾 Smart Pet Feeder</h1>
        <button class="feed-now-btn" onclick="feedNow()">🍖 สั่งให้อาหารทันที</button>
        
        <div class="section-title">⏰ ตั้งเวลาให้อาหารอัตโนมัติ (5 ช่วงเวลา)</div>
        <div id="schedules-container"></div>
        
        <button class="save-btn" onclick="saveSchedules()">💾 บันทึกการตั้งเวลา</button>
        <div id="status"></div>
      </div>

      <script>
        const dayNames = [
          { key: 'sun', label: 'อา' }, { key: 'mon', label: 'จ' }, { key: 'tue', label: 'อ' },
          { key: 'wed', label: 'พ' }, { key: 'thu', label: 'พฤ' }, { key: 'fri', label: 'ศ' }, { key: 'sat', label: 'ส' }
        ];

        let currentSchedules = [];

        async function loadSchedules() {
          const res = await fetch('/api/schedules');
          currentSchedules = await res.json();
          renderSchedules();
        }

        function renderSchedules() {
          const container = document.getElementById('schedules-container');
          container.innerHTML = '';

          currentSchedules.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'sched-card';
            
            let daysHtml = dayNames.map(d => {
              const active = item.days.includes(d.key) ? 'active' : '';
              return \`<button class="day-btn \${active}" onclick="toggleDay(\${index}, '\${d.key}')">\${d.label}</button>\`;
            }).join('');

            card.innerHTML = \`
              <div class="sched-header">
                <span class="sched-title">ช่วงเวลาที่ \${item.id}</span>
                <input type="time" class="time-input" value="\${item.time}" onchange="updateTime(\${index}, this.value)">
                <label class="switch">
                  <input type="checkbox" \${item.enabled ? 'checked' : ''} onchange="toggleEnable(\${index}, this.checked)">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="days-box">\${daysHtml}</div>
            \`;
            container.appendChild(card);
          });
        }

        function updateTime(index, val) { currentSchedules[index].time = val; }
        function toggleEnable(index, val) { currentSchedules[index].enabled = val; }
        function toggleDay(index, dayKey) {
          const days = currentSchedules[index].days;
          const dIdx = days.indexOf(dayKey);
          if (dIdx > -1) days.splice(dIdx, 1);
          else days.push(dayKey);
          renderSchedules();
        }

        async function saveSchedules() {
          const statusDiv = document.getElementById('status');
          statusDiv.style.color = '#3182ce';
          statusDiv.innerText = '⏳ กำลังบันทึกข้อมูล...';
          
          await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentSchedules)
          });

          statusDiv.style.color = '#38a169';
          statusDiv.innerText = '✅ บันทึกตารางเวลาเรียบร้อยแล้ว!';
          setTimeout(() => { statusDiv.innerText = ''; }, 3000);
        }

        async function feedNow() {
          const statusDiv = document.getElementById('status');
          statusDiv.style.color = '#ff7e5f';
          statusDiv.innerText = '⏳ กำลังส่งสัญญาณให้อาหาร...';
          
          await fetch('/api/feed', { method: 'POST' });
          statusDiv.style.color = '#38a169';
          statusDiv.innerText = '✅ สั่งให้อาหารเรียบร้อย!';
          setTimeout(() => { statusDiv.innerText = ''; }, 3000);
        }

        loadSchedules();
      </script>
    </body>
    </html>
  `);
});

// ==================== 5. Webhook สำหรับ LINE OA (ปรับปรุงรองรับ Test Verify) ====================
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  // ตรวจสอบว่าเป็น Test Event จากปุ่ม Verify ใน LINE Console หรือไม่
  if (req.body.events && req.body.events.length === 0) {
    console.log('✅ LINE Verification Test Event Received!');
    return res.status(200).json({ status: 'ok' });
  }

  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling event:', err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  // รองรับกรณีเป็น Test Event ของ LINE ที่มี replyToken เป็น 00000000000000000000000000000000
  if (event.replyToken === '00000000000000000000000000000000' || event.replyToken === 'ffffffffffffffffffffffffffffffff') {
    return Promise.resolve(null);
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  console.log(`📩 Received message from LINE: "${userText}"`);

  if (userText === 'ให้อาหาร' || userText.toUpperCase() === 'FEED') {
    triggerFeeding('LINE OA');
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

// ==================== 6. รัน Server & Self-Ping ====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  setInterval(() => {
    https.get('https://petfeeder-backend-ylcj.onrender.com', (res) => {
      console.log(`⏰ Self-ping status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.log('⚠ Self-ping failed:', err.message);
    });
  }, 10 * 60 * 1000);
});

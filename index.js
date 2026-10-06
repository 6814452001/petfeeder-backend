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

// ปรับระยะเวลาสั่งหมุนให้เร็วขึ้น เหลือเพียง 200 มิลลิวินาที (0.2 วินาที)
const FEEDING_DURATION_MS = 200; 

mqttClient.on('connect', () => {
  console.log('✅ Connected to HiveMQ Broker!');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT Error:', err);
});

let feedHistory = [];

function triggerFeeding(source = 'Unknown') {
  mqttClient.publish(MQTT_TOPIC, 'ON', { qos: 0 });
  mqttClient.publish(MQTT_TOPIC, 'ให้อาหาร', { qos: 0 }, (err) => {
    if (err) {
      console.error(`❌ [${source}] Failed to publish MQTT:`, err);
    } else {
      console.log(`🚀 [${source}] Fast Feed Triggered!`);
      
      setTimeout(() => {
        mqttClient.publish(MQTT_TOPIC, 'OFF', { qos: 0 });
        console.log(`🛑 [${source}] Motor OFF published (Duration: ${FEEDING_DURATION_MS}ms)`);
      }, FEEDING_DURATION_MS);

      const now = new Date();
      const timeStr = now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      
      feedHistory.unshift({
        time: timeStr,
        source: source
      });

      if (feedHistory.length > 20) feedHistory.pop();
    }
  });
}

// ==================== 3. ระบบตารางเวลา (5 ช่วงเวลา) ====================
let schedules = [
  { id: 1, time: '', days: [], enabled: false },
  { id: 2, time: '', days: [], enabled: false },
  { id: 3, time: '', days: [], enabled: false },
  { id: 4, time: '', days: [], enabled: false },
  { id: 5, time: '', days: [], enabled: false }
];

const dayThaiName = {
  'sun': 'อา', 'mon': 'จ', 'tue': 'อ', 'wed': 'พ', 'thu': 'พฤ', 'fri': 'ศ', 'sat': 'ส'
};

setInterval(() => {
  const now = new Date();
  const options = { timeZone: 'Asia/Bangkok', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);

  let currentHour = '', currentMinute = '', currentSecond = '', currentDay = '';
  for (const part of parts) {
    if (part.type === 'hour') currentHour = part.value;
    if (part.type === 'minute') currentMinute = part.value;
    if (part.type === 'second') currentSecond = part.value;
    if (part.type === 'weekday') currentDay = part.value.toLowerCase();
  }

  if (currentSecond === '00') {
    const currentTimeStr = `${currentHour}:${currentMinute}`;
    schedules.forEach((sch) => {
      if (sch.enabled && sch.time === currentTimeStr && sch.days.includes(currentDay)) {
        triggerFeeding(`Schedule #${sch.id}`);
      }
    });
  }
}, 1000);

// ==================== 4. Express Web Server & UI ====================
const app = express();

app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/schedules', (req, res) => res.json(schedules));
app.post('/api/schedules', (req, res) => {
  if (Array.isArray(req.body)) schedules = req.body;
  res.json({ status: 'ok', schedules });
});

app.get('/api/history', (req, res) => res.json(feedHistory));
app.post('/api/feed', (req, res) => {
  triggerFeeding('Web App');
  res.json({ status: 'ok', message: 'Feeding triggered!' });
});

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Pet Feeder Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; font-family: 'Prompt', sans-serif; }
    body {
      margin: 0;
      padding: 40px 15px;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .card-main {
      background: #ffffff;
      border-radius: 24px;
      padding: 35px 30px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      text-align: center;
      margin-bottom: 25px;
    }
    .pet-avatar {
      width: 65px;
      height: 65px;
      background: #fdf2f2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: 0 auto 15px auto;
    }
    .title { font-size: 22px; font-weight: 600; color: #2d3748; margin: 0 0 5px 0; }
    .subtitle { font-size: 13px; color: #718096; margin: 0 0 25px 0; }
    .btn-feed {
      width: 100%;
      background: linear-gradient(135deg, #2af598 0%, #009efd 100%);
      color: white;
      border: none;
      padding: 16px;
      font-size: 17px;
      font-weight: 600;
      border-radius: 14px;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(42, 245, 152, 0.35);
      transition: all 0.2s ease;
    }
    .btn-feed:active { transform: scale(0.97); }
    .status-msg {
      margin-top: 20px;
      font-size: 14px;
      color: #38a169;
      font-weight: 500;
      min-height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .section-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 25px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .sec-title {
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .save-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 500;
    }
    .sched-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .sched-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .time-input { border: 1px solid #cbd5e0; border-radius: 6px; padding: 4px 8px; font-size: 14px; }
    .day-btns { display: flex; gap: 3px; justify-content: space-between; }
    .day-b { flex: 1; border: 1px solid #cbd5e0; background: white; border-radius: 6px; padding: 4px 0; font-size: 11px; cursor: pointer; text-align: center; }
    .day-b.active { background: #667eea; color: white; border-color: #667eea; }
    .switch { position: relative; display: inline-block; width: 38px; height: 20px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 20px; }
    .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: #38a169; }
    input:checked + .slider:before { transform: translateX(18px); }
    .hist-list { list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto; }
    .hist-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; color: #4a5568; }
    .hist-badge { background: #e2e8f0; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 600; color: #4a5568; }
  </style>
</head>
<body>
  <div class="card-main">
    <div class="pet-avatar">🐶</div>
    <h1 class="title">Smart Pet Feeder</h1>
    <p class="subtitle">ระบบสั่งจ่ายอาหารสัตว์เลี้ยงอัจฉริยะ</p>
    <button class="btn-feed" onclick="feedNow()">🍖 สั่งให้อาหารทันที</button>
    <div class="status-msg" id="statusMsg"></div>
  </div>

  <div class="section-card">
    <div class="sec-title">
      <span>⏰ ตั้งเวลาให้อาหาร (5 ช่วงเวลา)</span>
      <button class="save-btn" onclick="saveSchedules()">💾 บันทึก</button>
    </div>
    <div id="scheduleContainer"></div>
  </div>

  <div class="section-card">
    <div class="sec-title">
      <span>📜 ประวัติการให้อาหารล่าสุด</span>
      <span style="font-size: 12px; color: #718096; cursor: pointer;" onclick="loadHistory()">🔄 รีเฟรช</span>
    </div>
    <ul class="hist-list" id="historyList">
      <li style="text-align:center; color:#a0aec0; padding:10px;">กำลังโหลด...</li>
    </ul>
  </div>

  <script>
    const daysArr = [
      { key: 'sun', label: 'อา' }, { key: 'mon', label: 'จ' }, { key: 'tue', label: 'อ' },
      { key: 'wed', label: 'พ' }, { key: 'thu', label: 'พฤ' }, { key: 'fri', label: 'ศ' }, { key: 'sat', label: 'ส' }
    ];
    let currentSchedules = [];

    async function feedNow() {
      const msg = document.getElementById('statusMsg');
      msg.style.color = '#3182ce';
      msg.innerHTML = '⏳ กำลังส่งสัญญาณ...';
      await fetch('/api/feed', { method: 'POST' });
      msg.style.color = '#38a169';
      msg.innerHTML = '✅ จ่ายอาหารสำเร็จเรียบร้อย!';
      loadHistory();
      setTimeout(() => { msg.innerHTML = ''; }, 4000);
    }

    async function loadSchedules() {
      const res = await fetch('/api/schedules');
      currentSchedules = await res.json();
      renderSchedules();
    }

    function renderSchedules() {
      const container = document.getElementById('scheduleContainer');
      container.innerHTML = '';
      currentSchedules.forEach((sch, idx) => {
        let daysHtml = daysArr.map(d => {
          const active = sch.days.includes(d.key) ? 'active' : '';
          return \`<button class="day-b \${active}" onclick="toggleDay(\${idx}, '\${d.key}')">\${d.label}</button>\`;
        }).join('');

        container.innerHTML += \`
          <div class="sched-item">
            <div class="sched-row">
              <span style="font-weight: 500; font-size: 13px;">ช่วงที่ \${sch.id}</span>
              <input type="time" class="time-input" value="\${sch.time}" onchange="updateTime(\${idx}, this.value)">
              <label class="switch">
                <input type="checkbox" \${sch.enabled ? 'checked' : ''} onchange="toggleEnable(\${idx}, this.checked)">
                <span class="slider"></span>
              </label>
            </div>
            <div class="day-btns">\${daysHtml}</div>
          </div>
        \`;
      });
    }

    function updateTime(idx, val) { currentSchedules[idx].time = val; }
    function toggleEnable(idx, val) { currentSchedules[idx].enabled = val; }
    function toggleDay(idx, dayKey) {
      const days = currentSchedules[idx].days;
      const dIdx = days.indexOf(dayKey);
      if (dIdx > -1) days.splice(dIdx, 1);
      else days.push(dayKey);
      renderSchedules();
    }

    async function saveSchedules() {
      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSchedules)
      });
      alert('💾 บันทึกตารางเวลาเรียบร้อยแล้ว!');
    }

    async function loadHistory() {
      const res = await fetch('/api/history');
      const data = await res.json();
      const list = document.getElementById('historyList');
      if (data.length === 0) {
        list.innerHTML = '<li style="text-align:center; color:#a0aec0; padding:10px;">ยังไม่มีประวัติ</li>';
        return;
      }
      list.innerHTML = data.map(item => \`
        <li class="hist-item">
          <span><span class="hist-badge">\${item.source}</span> \${item.time}</span>
          <span style="color:#38a169;">✓</span>
        </li>
      \`).join('');
    }

    loadSchedules();
    loadHistory();
    setInterval(loadHistory, 10000);
  </script>
</body>
</html>
  `);
});

// ==================== 5. LINE Webhook Handler ====================
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  const lowerText = userText.toLowerCase();

  if (['ให้อาหาร', 'ให้', 'ปล่อย', 'feed', 'อาหาร'].includes(lowerText)) {
    triggerFeeding('LINE Bot');
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🐾 จ่ายอาหารเรียบร้อยแล้วครับ!'
    });
  }

  if (['ดูตาราง', 'เช็คเวลา', 'ตารางเวลา'].includes(lowerText)) {
    let replyMsg = '⏰ ตารางเวลาให้อาหารปัจจุบัน:\n';
    schedules.forEach(s => {
      const statusStr = s.enabled ? '🟢 เปิด' : '🔴 ปิด';
      const daysStr = s.days.length > 0 ? s.days.map(d => dayThaiName[d]).join(',') : 'ไม่ได้เลือกวัน';
      replyMsg += `\nช่วงที่ ${s.id}: ${s.time || '--:--'} น. [${statusStr}]\nวัน: ${daysStr}\n`;
    });
    return lineClient.replyMessage(event.replyToken, { type: 'text', text: replyMsg.trim() });
  }

  if (['ประวัติ', 'ดูประวัติ'].includes(lowerText)) {
    if (feedHistory.length === 0) {
      return lineClient.replyMessage(event.replyToken, { type: 'text', text: '📜 ยังไม่มีประวัติการให้อาหารครับ' });
    }
    let replyMsg = '📜 ประวัติการให้อาหารย้อนหลัง:\n\n';
    feedHistory.slice(0, 10).forEach((item, idx) => {
      replyMsg += `${idx + 1}. [${item.source}] ${item.time}\n`;
    });
    return lineClient.replyMessage(event.replyToken, { type: 'text', text: replyMsg.trim() });
  }

  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: '📌 คำสั่งที่ใช้นี้ได้:\n- พิมพ์ "ให้", "ปล่อย", "ให้อาหาร"\n- พิมพ์ "ดูตาราง"\n- พิมพ์ "ประวัติ"'
  });
}

// ==================== 6. Start Server & Self-Ping ====================
const PORT = process.env.PORT || 3000;
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

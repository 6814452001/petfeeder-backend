const express = require('express');
const line = require('@line/bot-sdk');
const mqtt = require('mqtt');

// ==================== 1. ตั้งค่า LINE Client ====================
const lineConfig = {
  channelAccessToken: 'วาง_TOKEN_ใหม่ที่เพิ่ง_ISSUE_จาก_LINE_CONSOLE_ตรงนี้',
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

// Array สำหรับเก็บประวัติการให้อาหาร (เก็บสูงสุด 20 รายการล่าสุด)
let feedHistory = [];

// ฟังก์ชันสั่งจ่ายอาหาร พร้อมบันทึกประวัติ
function triggerFeeding(source = 'Unknown') {
  mqttClient.publish(MQTT_TOPIC, 'ให้อาหาร', { qos: 0 }, (err) => {
    if (err) {
      console.error(`❌ [${source}] Failed to publish MQTT:`, err);
    } else {
      console.log(`🚀 [${source}] Published to MQTT [${MQTT_TOPIC}]: ให้อาหาร`);
      
      // บันทึกเวลาไทยลงประวัติ
      const now = new Date();
      const timeStr = now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      
      feedHistory.unshift({
        time: timeStr,
        source: source
      });

      // เก็บไว้ไม่เกิน 20 รายการล่าสุด
      if (feedHistory.length > 20) {
        feedHistory.pop();
      }
    }
  });
}

// ==================== 3. ระบบตารางเวลา (Scheduler 5 ช่วงเวลา) ====================
let schedules = [
  { id: 1, time: '', days: [], enabled: false },
  { id: 2, time: '', days: [], enabled: false },
  { id: 3, time: '', days: [], enabled: false },
  { id: 4, time: '', days: [], enabled: false },
  { id: 5, time: '', days: [], enabled: false }
];

const dayMap = {
  'อา': 'sun', 'จ': 'mon', 'อ': 'tue', 'พ': 'wed', 'พฤ': 'thu', 'ศ': 'fri', 'ส': 'sat',
  'อาทิตย์': 'sun', 'จันทร์': 'mon', 'อังคาร': 'tue', 'พุธ': 'wed', 'พฤหัส': 'thu', 'ศุกร์': 'fri', 'เสาร์': 'sat',
  'sun': 'sun', 'mon': 'mon', 'tue': 'tue', 'wed': 'wed', 'thu': 'thu', 'fri': 'fri', 'sat': 'sat'
};

const dayThaiName = {
  'sun': 'อา', 'mon': 'จ', 'tue': 'อ', 'wed': 'พ', 'thu': 'พฤ', 'fri': 'ศ', 'sat': 'ส'
};

// ตรวจสอบตารางเวลาทุกๆ 1 วินาที
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

  // ทำงานเมื่อวินาทีที่ 00 เพื่อป้องกันการสั่งซ้ำหลายครั้งในวินาทีเดียวกัน
  if (currentSecond === '00') {
    const currentTimeStr = `${currentHour}:${currentMinute}`;
    schedules.forEach((sch) => {
      if (sch.enabled && sch.time === currentTimeStr && sch.days.includes(currentDay)) {
        triggerFeeding(`Schedule #${sch.id}`);
      }
    });
  }
}, 1000);

// ==================== 4. Express Web Server ====================
const app = express();

// Router สำหรับ Webhook ของ LINE
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

// API endpoints สำหรับรับ-ส่งข้อมูลตารางเวลาและประวัติ
app.get('/api/schedules', (req, res) => {
  res.json(schedules);
});

app.post('/api/schedules', (req, res) => {
  if (Array.isArray(req.body)) {
    schedules = req.body;
  }
  res.json({ status: 'ok', schedules });
});

app.get('/api/history', (req, res) => {
  res.json(feedHistory);
});

app.post('/api/feed', (req, res) => {
  triggerFeeding('Web App');
  res.json({ status: 'ok', message: 'Triggered feeding from Web App' });
});

// หน้า Web UI หลัก
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pet Feeder Control Panel</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .card { border-radius: 15px; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .btn-feed { font-size: 1.5rem; font-weight: bold; padding: 15px 30px; border-radius: 50px; }
    .day-checkbox { display: inline-block; margin-right: 5px; }
    .day-checkbox input { display: none; }
    .day-checkbox label { padding: 5px 10px; border: 1px solid #ddd; border-radius: 20px; cursor: pointer; font-size: 0.85rem; }
    .day-checkbox input:checked + label { background-color: #0d6efd; color: white; border-color: #0d6efd; }
  </style>
</head>
<body>
  <div class="container py-4">
    <h2 class="text-center mb-4 font-weight-bold">🐱 Pet Feeder Control Panel 🐶</h2>

    <!-- ปุ่มให้อาหารทันที -->
    <div class="row justify-content-center mb-4">
      <div class="col-md-6 text-center">
        <div class="card p-4">
          <h4 class="mb-3">สั่งให้อาหารทันที</h4>
          <button class="btn btn-warning text-white btn-feed w-100" onclick="feedNow()">🍖 ให้อาหารเลย!</button>
        </div>
      </div>
    </div>

    <div class="row">
      <!-- ตารางเวลา -->
      <div class="col-lg-7 mb-4">
        <div class="card p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="m-0">⏰ ตารางเวลาตั้งสาย (5 ช่วงเวลา)</h4>
            <button class="btn btn-primary btn-sm" onclick="saveSchedules()">💾 บันทึกตารางเวลา</button>
          </div>
          <div id="scheduleContainer"></div>
        </div>
      </div>

      <!-- ประวัติการให้อาหาร -->
      <div class="col-lg-5 mb-4">
        <div class="card p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="m-0">📜 ประวัติการให้อาหาร</h4>
            <button class="btn btn-outline-secondary btn-sm" onclick="loadHistory()">🔄 รีเฟรช</button>
          </div>
          <ul class="list-group list-group-flush" id="historyList">
            <li class="list-group-item text-muted text-center">กำลังโหลดข้อมูล...</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <script>
    const daysArr = [
      { key: 'sun', label: 'อา' },
      { key: 'mon', label: 'จ' },
      { key: 'tue', label: 'อ' },
      { key: 'wed', label: 'พ' },
      { key: 'thu', label: 'พฤ' },
      { key: 'fri', label: 'ศ' },
      { key: 'sat', label: 'ส' }
    ];

    async function loadSchedules() {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      renderSchedules(data);
    }

    function renderSchedules(schedules) {
      const container = document.getElementById('scheduleContainer');
      container.innerHTML = '';

      schedules.forEach((sch, index) => {
        let daysHtml = daysArr.map(d => {
          const checked = sch.days.includes(d.key) ? 'checked' : '';
          return \`
            <div class="day-checkbox">
              <input type="checkbox" id="sch_\${sch.id}_\${d.key}" value="\${d.key}" \${checked}>
              <label for="sch_\${sch.id}_\${d.key}">\${d.label}</label>
            </div>
          \`;
        }).join('');

        const html = \`
          <div class="border-bottom py-3">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="fw-bold">ช่วงเวลาที่ \${sch.id}</span>
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="enable_\${sch.id}" \${sch.enabled ? 'checked' : ''}>
                <label class="form-check-label" for="enable_\${sch.id}">เปิดใช้งาน</label>
              </div>
            </div>
            <div class="row align-items-center">
              <div class="col-md-4 mb-2 mb-md-0">
                <input type="time" class="form-control" id="time_\${sch.id}" value="\${sch.time}">
              </div>
              <div class="col-md-8">
                \${daysHtml}
              </div>
            </div>
          </div>
        \`;
        container.innerHTML += html;
      });
    }

    async function saveSchedules() {
      let updatedSchedules = [];
      for (let i = 1; i <= 5; i++) {
        const time = document.getElementById(\`time_\${i}\`).value;
        const enabled = document.getElementById(\`enable_\${i}\`).checked;
        let selectedDays = [];
        daysArr.forEach(d => {
          if (document.getElementById(\`sch_\${i}_\${d.key}\`).checked) {
            selectedDays.push(d.key);
          }
        });

        updatedSchedules.push({
          id: i,
          time: time,
          days: selectedDays,
          enabled: enabled
        });
      }

      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSchedules)
      });

      alert('✅ บันทึกตารางเวลาเรียบร้อยแล้ว!');
    }

    async function feedNow() {
      if (confirm('ยืนยันการให้อาหารทันที?')) {
        await fetch('/api/feed', { method: 'POST' });
        alert('🚀 ส่งคำสั่งให้อาหารเรียบร้อยแล้ว!');
        loadHistory();
      }
    }

    async function loadHistory() {
      const res = await fetch('/api/history');
      const data = await res.json();
      const list = document.getElementById('historyList');
      
      if (data.length === 0) {
        list.innerHTML = '<li class="list-group-item text-muted text-center">ยังไม่มีประวัติการให้อาหาร</li>';
        return;
      }

      list.innerHTML = data.map(item => \`
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <span class="badge bg-info text-dark me-2">\${item.source}</span>
            <span>\${item.time}</span>
          </div>
          <span class="text-success">✓ สำเร็จ</span>
        </li>
      \`).join('');
    }

    // โหลดข้อมูลเมื่อเปิดหน้าเว็บ
    loadSchedules();
    loadHistory();

    // อัปเดตประวัติทุกๆ 10 วินาที
    setInterval(loadHistory, 10000);
  </script>
</body>
</html>
  `);
});

// ==================== 5. จัดการ Event จาก LINE ====================
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();

  // 1. คำสั่งให้อาหารทันที
  if (userText === 'ให้อาหาร' || userText === 'Feed' || userText === 'feed') {
    triggerFeeding('LINE Bot');
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🚀 ส่งคำสั่งให้อาหารไปยังเครื่องจ่ายอาหารเรียบร้อยแล้วครับ!'
    });
  }

  // 2. คำสั่งดูตารางเวลา
  if (userText === 'ดูตารางเวลา' || userText === 'ตารางเวลา') {
    let replyMsg = '⏰ ตารางเวลาการให้อาหารทั้งหมด:\n\n';
    schedules.forEach(s => {
      const status = s.enabled ? '🟢 เปิด' : '🔴 ปิด';
      const daysStr = s.days.map(d => dayThaiName[d]).join(', ') || 'ไม่ได้เลือกวัน';
      replyMsg += `ช่วงที่ ${s.id}: ${s.time || '--:--'} [${daysStr}] (${status})\n`;
    });
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: replyMsg
    });
  }

  // 3. คำสั่งดูประวัติการให้อาหาร
  if (userText === 'ประวัติ' || userText === 'ดูประวัติ') {
    if (feedHistory.length === 0) {
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '📜 ยังไม่มีประวัติการให้อาหารในระบบครับ'
      });
    }

    let replyMsg = '📜 ประวัติการให้อาหารย้อนหลัง:\n\n';
    feedHistory.slice(0, 10).forEach((item, idx) => {
      replyMsg += `${idx + 1}. [${item.source}] ${item.time}\n`;
    });

    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: replyMsg
    });
  }

  // 4. คำสั่งตั้งเวลาผ่าน LINE
  // รูปแบบ: ตั้งเวลา [ลำดับ 1-5] [HH:mm] [วัน เช่น จ,พ,ศ หรือ ทุกวัน]
  if (userText.startsWith('ตั้งเวลา')) {
    const parts = userText.split(' ');
    if (parts.length >= 3) {
      const id = parseInt(parts[1]);
      const time = parts[2];
      const daysInput = parts[3] || 'ทุกวัน';

      if (id >= 1 && id <= 5 && /^\d{2}:\d{2}$/.test(time)) {
        let selectedDays = [];
        if (daysInput === 'ทุกวัน') {
          selectedDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        } else {
          const splitDays = daysInput.split(',');
          splitDays.forEach(d => {
            const mapped = dayMap[d.trim()];
            if (mapped) selectedDays.push(mapped);
          });
        }

        schedules[id - 1] = {
          id: id,
          time: time,
          days: selectedDays,
          enabled: true
        };

        const daysStr = selectedDays.map(d => dayThaiName[d]).join(', ');
        return lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: `✅ ตั้งเวลาช่วงที่ ${id} เรียบร้อยแล้ว!\n⏰ เวลา: ${time}\n📅 วัน: ${daysStr}`
        });
      }
    }

    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ รูปแบบคำสั่งไม่ถูกต้อง!\nตัวอย่าง: ตั้งเวลา 1 08:00 จ,พ,ศ หรือ ตั้งเวลา 2 18:30 ทุกวัน'
    });
  }

  // 5. คำสั่งปิดตารางเวลาผ่าน LINE
  if (userText.startsWith('ปิดเวลา')) {
    const parts = userText.split(' ');
    const id = parseInt(parts[1]);
    if (id >= 1 && id <= 5) {
      schedules[id - 1].enabled = false;
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: `🔴 ปิดใช้งานตารางเวลาช่วงที่ ${id} เรียบร้อยแล้ว`
      });
    }
  }

  // ข้อความช่วยเหลือทั่วไป
  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: '🤖 คำสั่งที่สามารถใช้ได้:\n- "ให้อาหาร" : สั่งจ่ายอาหารทันที\n- "ตารางเวลา" : ดูตารางเวลาตั้งไว้\n- "ประวัติ" : ดูประวัติการให้อาหาร\n- "ตั้งเวลา [1-5] [เวลา] [วัน]" : ตั้งเวลาจ่ายอาหาร\n  (เช่น ตั้งเวลา 1 07:30 ทุกวัน)\n- "ปิดเวลา [1-5]" : ปิดตารางเวลา'
  });
}

// ==================== 6. เริ่มทำงาน Server ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

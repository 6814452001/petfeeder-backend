const express = require('express');
const line = require('@line/bot-sdk');
const mqtt = require('mqtt');
const https = require('https');

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

// ==================== 3. ระบบตารางเวลา (Scheduler 5 ช่วงเวลา) ====================
let schedules = [
  { id: 1, time: '', days: [], enabled: false },
  { id: 2, time: '', days: [], enabled: false },
  { id: 3, time: '', days: [], enabled: false },
  { id: 4, time: '', days: [], enabled: false },
  { id: 5, time: '', days: [], enabled: false }
];

// ตารางแปลงวันภาษาไทย เป็น รหัสวันในระบบ
const dayMap = {
  'อา': 'sun', 'จ': 'mon', 'อ': 'tue', 'พ': 'wed', 'พฤ': 'thu', 'ศ': 'fri', 'ส': 'sat',
  'อาทิตย์': 'sun', 'จันทร์': 'mon', 'อังคาร': 'tue', 'พุธ': 'wed', 'พฤหัส': 'thu', 'ศุกร์': 'fri', 'เสาร์': 'sat',
  'sun': 'sun', 'mon': 'mon', 'tue': 'tue', 'wed': 'wed', 'thu': 'thu', 'fri': 'fri', 'sat': 'sat'
};

const dayThaiName = {
  'sun': 'อา', 'mon': 'จ', 'tue': 'อ', 'wed': 'พ', 'thu': 'พฤ', 'fri': 'ศ', 'sat': 'ส'
};

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

// ==================== 4. ตั้งค่า Express Server & Web Dashboard ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/schedules', express.json(), (req, res) => res.json(schedules));
app.post('/api/schedules', express.json(), (req, res) => {
  schedules = req.body;
  console.log('📅 Schedules Updated:', JSON.stringify(schedules));
  res.json({ success: true, schedules });
});

app.post('/api/feed', express.json(), (req, res) => {
  triggerFeeding('Web App');
  res.json({ success: true, message: 'Feeding triggered!' });
});

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

// ==================== 5. Webhook สำหรับ LINE OA ====================
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  if (req.body.events && req.body.events.length === 0) {
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
  if (event.replyToken === '00000000000000000000000000000000' || event.replyToken === 'ffffffffffffffffffffffffffffffff') {
    return Promise.resolve(null);
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  const lowerText = userText.toLowerCase();
  console.log(`📩 Received message from LINE: "${userText}"`);

  // 1. สั่งให้อาหารทันที (เพิ่มคำว่า ให้, ปล่อย, อาหาร)
  if (['ให้อาหาร', 'ให้', 'ปล่อย', 'feed', 'อาหาร'].includes(lowerText)) {
    triggerFeeding('LINE OA');
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🐾 จ่ายอาหารเรียบร้อยแล้วครับ!'
    });
  }

  // 2. คำสั่งดูตารางเวลาปัจจุบัน
  if (['ดูตาราง', 'เช็คเวลา', 'ตารางเวลา'].includes(lowerText)) {
    let replyMsg = '⏰ ตารางเวลาให้อาหารปัจจุบัน:\n';
    schedules.forEach(s => {
      const statusStr = s.enabled ? '🟢 เปิด' : '🔴 ปิด';
      const timeStr = s.time || '--:--';
      const daysStr = s.days.length > 0 ? s.days.map(d => dayThaiName[d]).join(',') : 'ไม่ได้เลือกวัน';
      replyMsg += `\nช่วงที่ ${s.id}: ${timeStr} น. [${statusStr}]\nวัน: ${daysStr}\n`;
    });
    return lineClient.replyMessage(event.replyToken, { type: 'text', text: replyMsg.trim() });
  }

  // 3. คำสั่งตั้งเวลาผ่าน LINE (เช่น "ตั้งเวลา 1 08:30" หรือ "ตั้งเวลา 2 18:00")
  if (userText.startsWith('ตั้งเวลา')) {
    const parts = userText.split(/\s+/);
    if (parts.length >= 3) {
      const slotIndex = parseInt(parts[1]) - 1;
      const timeVal = parts[2];
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;

      if (slotIndex >= 0 && slotIndex < 5 && timeRegex.test(timeVal)) {
        schedules[slotIndex].time = timeVal;
        schedules[slotIndex].enabled = true;
        
        // ถ้ายังไม่มีวัน ให้เปิดใช้ทุกวันเป็นค่าเริ่มต้น
        if (schedules[slotIndex].days.length === 0) {
          schedules[slotIndex].days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        }

        return lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: `✅ ตั้งเวลาช่วงที่ ${slotIndex + 1} เป็น ${timeVal} น. เรียบร้อยแล้วครับ!`
        });
      }
    }
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ รูปแบบไม่ถูกต้อง!\nกรุณาพิมพ์เช่น: ตั้งเวลา 1 08:30 (ตั้งเวลา ช่วงที่1 เวลา 08:30)'
    });
  }

  // 4. คำสั่งตั้งวันผ่าน LINE (เช่น "ตั้งวัน 1 จ,พ,ศ" หรือ "ตั้งวัน 1 ทุกวัน")
  if (userText.startsWith('ตั้งวัน')) {
    const parts = userText.split(/\s+/);
    if (parts.length >= 3) {
      const slotIndex = parseInt(parts[1]) - 1;
      const daysInput = parts[2];

      if (slotIndex >= 0 && slotIndex < 5) {
        if (daysInput === 'ทุกวัน') {
          schedules[slotIndex].days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        } else {
          const rawDays = daysInput.split(/[,,\s]+/);
          const selectedDays = [];
          
          rawDays.forEach(d => {
            if (dayMap[d]) selectedDays.push(dayMap[d]);
          });

          if (selectedDays.length > 0) {
            schedules[slotIndex].days = [...new Set(selectedDays)];
          } else {
            return lineClient.replyMessage(event.replyToken, {
              type: 'text',
              text: '⚠️ ไม่พบชื่อวัน กรุณาพิมพ์ เช่น: จ,พ,ศ หรือ ทุกวัน'
            });
          }
        }

        const daysDisplay = schedules[slotIndex].days.map(d => dayThaiName[d]).join(',');
        return lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: `✅ ตั้งวันสำหรับช่วงที่ ${slotIndex + 1} เป็น [ ${daysDisplay} ] เรียบร้อยแล้วครับ!`
        });
      }
    }
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ รูปแบบไม่ถูกต้อง!\nกรุณาพิมพ์เช่น: ตั้งวัน 1 จ,พ,ศ หรือ ตั้งวัน 1 ทุกวัน'
    });
  }

  // คำแนะนำเมื่อพิมพ์คำสั่งที่ไม่รู้จัก
  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: '📌 คู่มือคำสั่งที่ใช้งานได้:\n\n1️⃣ สั่งจ่ายอาหารทันที:\n- พิมพ์ "ให้", "ปล่อย", "ให้อาหาร" หรือ "FEED"\n\n2️⃣ ดูตารางเวลา:\n- พิมพ์ "ดูตาราง"\n\n3️⃣ ตั้งเวลา (ช่วงที่ 1-5):\n- พิมพ์ "ตั้งเวลา 1 08:30"\n\n4️⃣ ตั้งวัน (ช่วงที่ 1-5):\n- พิมพ์ "ตั้งวัน 1 จ,พ,ศ" หรือ "ตั้งวัน 1 ทุกวัน"'
  });
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

<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Pet Feeder Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; font-family: 'Prompt', sans-serif; }
    body {
      margin: 0;
      padding: 30px 15px;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .card-main {
      background: #ffffff;
      border-radius: 24px;
      padding: 25px 20px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      text-align: center;
      margin-bottom: 20px;
    }
    .clock-box {
      background: #f0f4ff;
      border: 1px solid #d0dcf9;
      border-radius: 16px;
      padding: 10px;
      margin-bottom: 15px;
    }
    .clock-date { font-size: 13px; font-weight: 500; color: #4a5568; }
    .clock-time { font-size: 26px; font-weight: 700; color: #2b6cb0; letter-spacing: 1px; }
    .pet-avatar {
      width: 60px; height: 60px; background: #fdf2f2; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 10px auto;
    }
    .title { font-size: 20px; font-weight: 600; color: #2d3748; margin: 0 0 5px 0; }
    .subtitle { font-size: 12px; color: #718096; margin: 0 0 18px 0; }
    .btn-feed {
      width: 100%; background: linear-gradient(135deg, #2af598 0%, #009efd 100%);
      color: white; border: none; padding: 14px; font-size: 16px; font-weight: 600;
      border-radius: 14px; cursor: pointer; box-shadow: 0 8px 20px rgba(42, 245, 152, 0.35);
    }
    .status-msg { margin-top: 12px; font-size: 13px; color: #38a169; font-weight: 500; min-height: 20px; display: flex; align-items: center; justify-content: center; }
    .section-card {
      background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
      border-radius: 20px; padding: 20px; width: 100%; max-width: 420px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 20px;
    }
    .sec-title { font-size: 15px; font-weight: 600; color: #2d3748; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .save-btn { background: #667eea; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 500; }
    .sched-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; margin-bottom: 8px; }
    .sched-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .time-input { border: 1px solid #cbd5e0; border-radius: 6px; padding: 3px 6px; font-size: 13px; }
    .day-btns { display: flex; gap: 3px; justify-content: space-between; }
    .day-b { flex: 1; border: 1px solid #cbd5e0; background: white; border-radius: 6px; padding: 4px 0; font-size: 11px; cursor: pointer; text-align: center; }
    .day-b.active { background: #667eea; color: white; border-color: #667eea; }
    .switch { position: relative; display: inline-block; width: 36px; height: 18px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 20px; }
    .slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: #38a169; }
    input:checked + .slider:before { transform: translateX(18px); }
    .hist-list { list-style: none; padding: 0; margin: 0; max-height: 180px; overflow-y: auto; }
    .hist-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px; color: #4a5568; }
    .hist-badge { background: #e2e8f0; border-radius: 4px; padding: 2px 5px; font-size: 10px; font-weight: 600; color: #4a5568; }
  </style>
</head>
<body>
  <div class="card-main">
    <div class="clock-box">
      <div class="clock-date" id="currentDate">วันกำลังโหลด...</div>
      <div class="clock-time" id="currentTime">00:00:00</div>
    </div>
    <div class="pet-avatar">🐶</div>
    <h1 class="title">Smart Pet Feeder</h1>
    <p class="subtitle">ระบบสั่งจ่ายอาหารสัตว์เลี้ยงอัจฉริยะ</p>
    <button class="btn-feed" id="feedBtn" onclick="feedNow()">🍖 สั่งให้อาหารทันที</button>
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
    // สคริปต์นาฬิกา แยกทำงานทันที ไม่รอ API
    (function runClock() {
      const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      
      function update() {
        const d = new Date();
        const dateStr = 'วัน' + thaiDays[d.getDay()] + 'ที่ ' + d.getDate() + ' ' + thaiMonths[d.getMonth()] + ' ' + (d.getFullYear() + 543);
        const timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0') + ' น.';
        
        const dateEl = document.getElementById('currentDate');
        const timeEl = document.getElementById('currentTime');
        if (dateEl) dateEl.innerText = dateStr;
        if (timeEl) timeEl.innerText = timeStr;
      }
      update();
      setInterval(update, 1000);
    })();

    const daysArr = [
      { key: 'sun', label: 'อา' }, { key: 'mon', label: 'จ' }, { key: 'tue', label: 'อ' },
      { key: 'wed', label: 'พ' }, { key: 'thu', label: 'พฤ' }, { key: 'fri', label: 'ศ' }, { key: 'sat', label: 'ส' }
    ];
    let currentSchedules = [];

    async function feedNow() {
      const btn = document.getElementById('feedBtn');
      const msg = document.getElementById('statusMsg');
      btn.disabled = true;
      msg.style.color = '#3182ce';
      msg.innerText = '⏳ กำลังส่งสัญญาณ...';
      try {
        await fetch('/api/feed', { method: 'POST' });
        msg.style.color = '#38a169';
        msg.innerText = '✅ จ่ายอาหารสำเร็จเรียบร้อย!';
        loadHistory();
      } catch (e) {
        msg.style.color = '#e53e3e';
        msg.innerText = '❌ เกิดข้อผิดพลาด';
      } finally {
        btn.disabled = false;
        setTimeout(() => { msg.innerText = ''; }, 4000);
      }
    }

    async function loadSchedules() {
      try {
        const res = await fetch('/api/schedules');
        if (res.ok) {
          currentSchedules = await res.json();
          renderSchedules();
        }
      } catch (e) { console.error('Schedule Error:', e); }
    }

    function renderSchedules() {
      const container = document.getElementById('scheduleContainer');
      if (!container) return;
      let html = '';
      currentSchedules.forEach((sch, idx) => {
        let daysHtml = daysArr.map(d => {
          const active = sch.days.includes(d.key) ? 'active' : '';
          return '<button class="day-b ' + active + '" onclick="toggleDay(' + idx + ', \'' + d.key + '\')">' + d.label + '</button>';
        }).join('');

        html += '<div class="sched-item">' +
            '<div class="sched-row">' +
              '<span style="font-weight: 500; font-size: 13px;">ช่วงที่ ' + sch.id + '</span>' +
              '<input type="time" class="time-input" value="' + sch.time + '" onchange="updateTime(' + idx + ', this.value)">' +
              '<label class="switch">' +
                '<input type="checkbox" ' + (sch.enabled ? 'checked' : '') + ' onchange="toggleEnable(' + idx + ', this.checked)">' +
                '<span class="slider"></span>' +
              '</label>' +
            '</div>' +
            '<div class="day-btns">' + daysHtml + '</div>' +
          '</div>';
      });
      container.innerHTML = html;
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
      try {
        await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentSchedules)
        });
        alert('💾 บันทึกตารางเวลาเรียบร้อยแล้ว!');
      } catch (e) { alert('❌ บันทึกไม่สำเร็จ'); }
    }

    async function loadHistory() {
      try {
        const res = await fetch('/api/history');
        if (res.ok) {
          const data = await res.json();
          const list = document.getElementById('historyList');
          if (!list) return;
          if (data.length === 0) {
            list.innerHTML = '<li style="text-align:center; color:#a0aec0; padding:10px;">ยังไม่มีประวัติ</li>';
            return;
          }
          list.innerHTML = data.map(item => 
            '<li class="hist-item">' +
              '<span><span class="hist-badge">' + item.source + '</span> ' + item.time + '</span>' +
              '<span style="color:#38a169;">✓</span>' +
            '</li>'
          ).join('');
        }
      } catch (e) { console.error('History Error:', e); }
    }

    loadSchedules();
    loadHistory();
  </script>
</body>
</html>

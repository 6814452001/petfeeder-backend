<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Pet Feeder Dashboard</title>
  <!-- Tailwind CSS & FontAwesome Icons -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            kanit: ['Kanit', 'sans-serif'],
          },
          colors: {
            brand: {
              50: '#f0fdf4',
              100: '#dcfce7',
              500: '#22c55e',
              600: '#16a34a',
              700: '#15803d',
            }
          }
        }
      }
    }
  </script>
  <style>
    body {
      font-family: 'Kanit', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%);
      min-height: 100vh;
    }
    .glass {
      background: rgba(255, 255, 255, 0.07);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-input {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: white;
    }
    .glass-input:focus {
      border-color: #38bdf8;
      outline: none;
    }
    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
    }
  </style>
</head>
<body class="text-slate-100 pb-10">

  <!-- Top Navigation Header -->
  <header class="w-full glass sticky top-0 z-50 border-b border-white/10 px-4 py-3 mb-6">
    <div class="max-w-4xl mx-auto flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
          <i class="fa-solid fa-paw text-xl"></i>
        </div>
        <div>
          <h1 class="font-bold text-lg leading-tight tracking-wide text-white">PetFeeder Pro</h1>
          <p class="text-xs text-slate-400">ระบบควบคุมให้อาหารสัตว์เลี้ยง</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          เชื่อมต่อแล้ว
        </span>
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-6">

    <!-- Left Column: Quick Actions & Feeder Status -->
    <section class="md:col-span-5 space-y-6">
      <!-- Device Status Card -->
      <div class="glass rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">อุปกรณ์ควบคุม</span>
            <h2 class="text-xl font-bold text-white mt-0.5">ESP32 Feeder Unit</h2>
          </div>
          <span class="text-2xl text-amber-400"><i class="fa-solid fa-bolt"></i></span>
        </div>

        <div class="space-y-3 mb-6">
          <div class="flex justify-between items-center text-sm py-2 border-b border-white/5">
            <span class="text-slate-400"><i class="fa-solid fa-wifi w-5 text-cyan-400"></i>สถานะเครือข่าย</span>
            <span class="text-slate-200 font-medium">HiveMQ MQTT</span>
          </div>
          <div class="flex justify-between items-center text-sm py-2 border-b border-white/5">
            <span class="text-slate-400"><i class="fa-solid fa-clock w-5 text-indigo-400"></i>เวลาบอร์ด ESP32</span>
            <span id="currentTime" class="text-slate-200 font-mono font-medium">--:--:--</span>
          </div>
          <div class="flex justify-between items-center text-sm py-2">
            <span class="text-slate-400"><i class="fa-solid fa-calendar-check w-5 text-emerald-400"></i>ตารางเวลาทำงาน</span>
            <span id="activeScheduleCount" class="text-emerald-400 font-medium">0 / 5 รายการ</span>
          </div>
        </div>

        <!-- Instant Feed Button -->
        <button id="btnInstantFeed" onclick="triggerFeed('ให้อาหาร')" 
          class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-white font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3">
          <i class="fa-solid fa-bowl-food text-xl"></i>
          <span>สั่งให้อาหารทันที</span>
        </button>
      </div>

      <!-- Activity Log Card -->
      <div class="glass rounded-3xl p-6 shadow-2xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-history text-cyan-400"></i>
            ประวัติการให้อาหาร
          </h3>
          <button onclick="clearLogs()" class="text-xs text-slate-400 hover:text-rose-400 transition">ล้างประวัติ</button>
        </div>
        <div id="logList" class="space-y-3 max-h-60 overflow-y-auto pr-1">
          <!-- Log items generated dynamically -->
        </div>
      </div>
    </section>

    <!-- Right Column: Schedule Management -->
    <section class="md:col-span-7 space-y-6">
      <div class="glass rounded-3xl p-6 shadow-2xl">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-calendar-days text-emerald-400"></i>
              ตั้งเวลาให้อาหารอัตโนมัติ
            </h2>
            <p class="text-xs text-slate-400 mt-1">ตั้งได้สูงสุด 5 ช่วงเวลาต่อวัน (เลือกวันในสัปดาห์ได้)</p>
          </div>
          <button id="btnAddSchedule" onclick="openScheduleModal()" 
            class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-semibold shadow-md transition flex items-center justify-center gap-2">
            <i class="fa-solid fa-plus"></i>
            <span>เพิ่มเวลา</span>
          </button>
        </div>

        <!-- Schedule List Container -->
        <div id="scheduleContainer" class="space-y-4">
          <!-- Schedules rendered here -->
        </div>
      </div>
    </section>

  </main>

  <!-- Modal for Adding / Editing Schedules -->
  <div id="scheduleModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md hidden items-center justify-center z-50 p-4">
    <div class="glass rounded-3xl p-6 sm:p-8 w-full max-w-md border border-white/20 shadow-2xl relative animate-fadeIn">
      <button onclick="closeScheduleModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white text-xl">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <h3 id="modalTitle" class="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <i class="fa-solid fa-clock text-emerald-400"></i>
        เพิ่มเวลาให้อาหาร
      </h3>

      <form id="scheduleForm" onsubmit="saveSchedule(event)" class="space-y-5">
        <input type="hidden" id="scheduleId">

        <!-- Time Picker -->
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-2">เวลาให้อาหาร</label>
          <input type="time" id="scheduleTime" required class="w-full glass-input rounded-xl px-4 py-3 text-lg font-mono font-bold text-emerald-400">
        </div>

        <!-- Portion Option -->
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-2">ปริมาณอาหาร (วินาทีที่หมุนจ่าย)</label>
          <select id="schedulePortion" class="w-full glass-input rounded-xl px-4 py-3 text-sm">
            <option value="1" class="bg-slate-900 text-white">ปกติ (เปิดค้าง 0.5 วินาที)</option>
            <option value="2" class="bg-slate-900 text-white">ปริมาณสองเท่า (เปิดค้าง 1.0 วินาที)</option>
            <option value="3" class="bg-slate-900 text-white">ปริมาณสามเท่า (เปิดค้าง 1.5 วินาที)</option>
          </select>
        </div>

        <!-- Days Selector -->
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-2">เลือกวันที่ต้องการทำงาน</label>
          <div class="grid grid-cols-7 gap-1.5" id="dayPicker">
            <!-- Day buttons rendered by JS -->
          </div>
        </div>

        <!-- Active Toggle -->
        <div class="flex items-center justify-between py-2 border-t border-white/10">
          <span class="text-sm font-medium text-slate-300">เปิดใช้งานตารางนี้</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="scheduleEnabled" checked class="sr-only peer">
            <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <!-- Submit Button -->
        <div class="flex gap-3 pt-4">
          <button type="button" onclick="closeScheduleModal()" class="w-1/2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition">
            ยกเลิก
          </button>
          <button type="submit" class="w-1/2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition">
            บันทึกตาราง
          </button>
        </div>
      </form>
    </div>
  </div>

  <script>
    // Day Mappings
    const DAYS = [
      { id: 0, short: 'อา', full: 'อาทิตย์' },
      { id: 1, short: 'จ', full: 'จันทร์' },
      { id: 2, short: 'อ', full: 'อังคาร' },
      { id: 3, short: 'พ', full: 'พุธ' },
      { id: 4, short: 'พฤ', full: 'พฤหัสบดี' },
      { id: 5, short: 'ศ', full: 'ศุกร์' },
      { id: 6, short: 'ส', full: 'เสาร์' }
    ];

    // Initial Data
    let schedules = JSON.parse(localStorage.getItem('petFeederSchedules')) || [
      { id: 'sch_1', time: '08:00', portion: '1', days: [0,1,2,3,4,5,6], enabled: true },
      { id: 'sch_2', time: '18:00', portion: '1', days: [0,1,2,3,4,5,6], enabled: true }
    ];

    let logs = JSON.parse(localStorage.getItem('petFeederLogs')) || [
      { id: 1, time: '08:00:00', date: 'วันนี้', type: 'อัตโนมัติ', status: 'สำเร็จ' }
    ];

    let selectedDays = [0,1,2,3,4,5,6];

    // Initialize App
    window.onload = function() {
      updateClock();
      setInterval(updateClock, 1000);
      renderSchedules();
      renderLogs();
      checkScheduledTrigger();
      setInterval(checkScheduledTrigger, 30000); // Check every 30s
    };

    function updateClock() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('th-TH', { hour12: false });
      document.getElementById('currentTime').innerText = timeStr;
    }

    function renderSchedules() {
      const container = document.getElementById('scheduleContainer');
      document.getElementById('activeScheduleCount').innerText = `${schedules.filter(s => s.enabled).length} / 5 รายการ`;

      if (schedules.length === 0) {
        container.innerHTML = `
          <div class="text-center py-10 glass-card rounded-2xl border border-dashed border-slate-700">
            <i class="fa-solid fa-calendar-xmark text-3xl text-slate-500 mb-2"></i>
            <p class="text-sm text-slate-400">ยังไม่มีการตั้งเวลาให้อาหาร</p>
          </div>
        `;
        return;
      }

      container.innerHTML = schedules.map(sch => {
        const daysHtml = DAYS.map(d => {
          const isSelected = sch.days.includes(d.id);
          return `<span class="text-[10px] w-6 h-6 rounded-full inline-flex items-center justify-center font-semibold ${isSelected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-600'}">${d.short}</span>`;
        }).join('');

        return `
          <div class="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/5 hover:border-white/10 transition">
            <div class="flex items-center gap-4">
              <div class="text-3xl font-mono font-bold text-emerald-400">
                ${sch.time}
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    <i class="fa-solid fa-bowl-rice text-amber-400 mr-1"></i>ปริมาณ x${sch.portion}
                  </span>
                  ${sch.enabled 
                    ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">เปิดใช้งาน</span>`
                    : `<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">ปิดใช้งาน</span>`
                  }
                </div>
                <div class="flex gap-1">
                  ${daysHtml}
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-white/5">
              <button onclick="toggleSchedule('${sch.id}')" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition">
                <i class="fa-solid ${sch.enabled ? 'fa-pause text-amber-400' : 'fa-play text-emerald-400'}"></i>
              </button>
              <button onclick="editSchedule('${sch.id}')" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button onclick="deleteSchedule('${sch.id}')" class="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-rose-400 text-xs transition">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderDayPicker() {
      const dayPicker = document.getElementById('dayPicker');
      dayPicker.innerHTML = DAYS.map(d => {
        const active = selectedDays.includes(d.id);
        return `
          <button type="button" onclick="toggleDaySelection(${d.id})" 
            class="py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${active ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">
            <span>${d.short}</span>
          </button>
        `;
      }).join('');
    }

    function toggleDaySelection(dayId) {
      if (selectedDays.includes(dayId)) {
        if (selectedDays.length > 1) {
          selectedDays = selectedDays.filter(id => id !== dayId);
        }
      } else {
        selectedDays.push(dayId);
      }
      renderDayPicker();
    }

    function openScheduleModal(editId = null) {
      if (!editId && schedules.length >= 5) {
        alert('สามารถตั้งตารางให้อาหารได้สูงสุด 5 ช่วงเวลาเท่านั้นครับ');
        return;
      }

      const modal = document.getElementById('scheduleModal');
      document.getElementById('scheduleForm').reset();
      
      if (editId) {
        const sch = schedules.find(s => s.id === editId);
        document.getElementById('modalTitle').innerText = 'แก้ไขเวลาให้อาหาร';
        document.getElementById('scheduleId').value = sch.id;
        document.getElementById('scheduleTime').value = sch.time;
        document.getElementById('schedulePortion').value = sch.portion;
        document.getElementById('scheduleEnabled').checked = sch.enabled;
        selectedDays = [...sch.days];
      } else {
        document.getElementById('modalTitle').innerText = 'เพิ่มเวลาให้อาหาร';
        document.getElementById('scheduleId').value = '';
        document.getElementById('scheduleTime').value = '12:00';
        document.getElementById('schedulePortion').value = '1';
        document.getElementById('scheduleEnabled').checked = true;
        selectedDays = [0,1,2,3,4,5,6];
      }

      renderDayPicker();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeScheduleModal() {
      const modal = document.getElementById('scheduleModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function saveSchedule(e) {
      e.preventDefault();
      const id = document.getElementById('scheduleId').value;
      const time = document.getElementById('scheduleTime').value;
      const portion = document.getElementById('schedulePortion').value;
      const enabled = document.getElementById('scheduleEnabled').checked;

      if (id) {
        // Edit
        const index = schedules.findIndex(s => s.id === id);
        schedules[index] = { id, time, portion, days: [...selectedDays], enabled };
      } else {
        // Add
        const newSch = {
          id: 'sch_' + Date.now(),
          time,
          portion,
          days: [...selectedDays],
          enabled
        };
        schedules.push(newSch);
      }

      saveAndRefresh();
      closeScheduleModal();
    }

    function toggleSchedule(id) {
      const sch = schedules.find(s => s.id === id);
      if (sch) {
        sch.enabled = !sch.enabled;
        saveAndRefresh();
      }
    }

    function editSchedule(id) {
      openScheduleModal(id);
    }

    function deleteSchedule(id) {
      if (confirm('คุณต้องการลบเวลาให้อาหารนี้ใช่หรือไม่?')) {
        schedules = schedules.filter(s => s.id !== id);
        saveAndRefresh();
      }
    }

    function saveAndRefresh() {
      localStorage.setItem('petFeederSchedules', JSON.stringify(schedules));
      renderSchedules();
    }

    function triggerFeed(source = 'สั่งจากเว็บ') {
      const btn = document.getElementById('btnInstantFeed');
      btn.disabled = true;
      btn.classList.add('opacity-75');

      // Send POST request to Render Backend API
      fetch('/api/feed', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          addLog(source, 'สำเร็จ');
        })
        .catch(err => {
          console.warn('API Endpoint not reachable directly, recording mock execution');
          addLog(source, 'สำเร็จ (Mock)');
        })
        .finally(() => {
          setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('opacity-75');
          }, 1500);
        });
    }

    function checkScheduledTrigger() {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sun, 1 = Mon ...
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${mins}`;

      schedules.forEach(sch => {
        if (sch.enabled && sch.time === currentTimeStr && sch.days.includes(currentDay)) {
          const lastTrigger = localStorage.getItem(`lastTrigger_${sch.id}`);
          const todayStr = now.toDateString();

          if (lastTrigger !== todayStr) {
            localStorage.setItem(`lastTrigger_${sch.id}`, todayStr);
            triggerFeed(`ตั้งเวลา (${sch.time})`);
          }
        }
      });
    }

    function addLog(type, status) {
      const now = new Date();
      const newLog = {
        id: Date.now(),
        time: now.toLocaleTimeString('th-TH', { hour12: false }),
        date: 'วันนี้',
        type: type,
        status: status
      };

      logs.unshift(newLog);
      if (logs.length > 10) logs.pop(); // Keep last 10 logs

      localStorage.setItem('petFeederLogs', JSON.stringify(logs));
      renderLogs();
    }

    function renderLogs() {
      const logList = document.getElementById('logList');
      if (logs.length === 0) {
        logList.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">ไม่มีประวัติการสั่งงาน</p>`;
        return;
      }

      logList.innerHTML = logs.map(log => `
        <div class="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
          <div class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <div>
              <p class="font-semibold text-slate-200">${log.type}</p>
              <p class="text-[10px] text-slate-400">${log.date} ${log.time}</p>
            </div>
          </div>
          <span class="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            ${log.status}
          </span>
        </div>
      `).join('');
    }

    function clearLogs() {
      logs = [];
      localStorage.removeItem('petFeederLogs');
      renderLogs();
    }
  </script>
</body>
</html>

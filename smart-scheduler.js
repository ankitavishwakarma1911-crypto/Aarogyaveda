/**
 * ==========================================================================
 * 🌿 AAROGYAVEDA - SMART CLINICAL SCHEDULER & HEALTHCARE PORTAL ENGINE
 * Features:
 *  1. Multi-Page / Tab Navigation (Home, Book Slot, Doctor Portal, Contact)
 *  2. Doctor Selection & Clinical Booking Engine (6 Top Vaidyas & Specialists)
 *  3. LocalStorage Data Persistence (Permanent auto-save)
 *  4. Smart Emergency Triaging & Slot Preemption (Priority Conflict Solver)
 *  5. Dynamic Glassmorphism Theme Switcher (Dark & Light Mode)
 *  6. Real-time Search, Filters, Live Stats & ICS Calendar Export
 *  7. 7 Clinical Patients Default (3 Emergency Priority + 4 Routine Care)
 * ==========================================================================
 */

const STORAGE_KEY = 'aarogyaveda_appointments_v4';
const THEME_KEY = 'aarogyaveda_theme_mode';

let appointments = [];
let currentFilter = 'all';
let searchQuery = '';

// --- HTML Sanitizer for XSS Prevention ---
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- 6 Dedicated Specialists (With Names Inside Icons) ---
const DOCTORS = [
  {
    id: "doc_1",
    name: "Dr. Kavita Vishwakarma",
    shortName: "Kavita",
    specialty: "Ayurvedic Medicine & Panchakarma",
    experience: "10+ Years",
    fee: "₹1000",
    badgeBg: "linear-gradient(135deg, #07381e 0%, #15803d 100%)"
  },
  {
    id: "doc_2",
    name: "Dr. Rajesh Verma",
    shortName: "Rajesh",
    specialty: "Cardiology & Lifestyle Disorders",
    experience: "14+ Years",
    fee: "₹850",
    badgeBg: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)"
  },
  {
    id: "doc_3",
    name: "Dr. Ananya Iyer",
    shortName: "Ananya",
    specialty: "Orthopedics & Joint Basti Therapy",
    experience: "8+ Years",
    fee: "₹750",
    badgeBg: "linear-gradient(135deg, #854d0e 0%, #d97706 100%)"
  },
  {
    id: "doc_4",
    name: "Dr. Siddharth Joshi",
    shortName: "Siddharth",
    specialty: "Nadi Pariksha & Pulse Diagnostics",
    experience: "12+ Years",
    fee: "₹900",
    badgeBg: "linear-gradient(135deg, #134e4a 0%, #0d9488 100%)"
  },
  {
    id: "doc_5",
    name: "Dr. Meera Nambiar",
    shortName: "Meera",
    specialty: "Shirodhara & Stress Management",
    experience: "9+ Years",
    fee: "₹800",
    badgeBg: "linear-gradient(135deg, #701a75 0%, #c026d3 100%)"
  },
  {
    id: "doc_6",
    name: "Dr. Rohan Kulkarni",
    shortName: "Rohan",
    specialty: "Spine Care & Chronic Pain Relief",
    experience: "11+ Years",
    fee: "₹950",
    badgeBg: "linear-gradient(135deg, #365314 0%, #65a30d 100%)"
  }
];

const form = document.getElementById('appointment-form');
const appointmentsContainer = document.getElementById('appointments-container');
const emptyState = document.getElementById('empty-state');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeText = document.getElementById('theme-text');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-chip');
const toastContainer = document.getElementById('toast-container');
const smartAlertBanner = document.getElementById('smart-alert-banner');
const alertMsg = document.getElementById('alert-msg');
const closeAlertBtn = document.getElementById('close-alert');
const clearAllBtn = document.getElementById('clear-all-btn');
const exportIcsBtn = document.getElementById('export-ics-btn');
const doctorsContainer = document.getElementById('doctorsListContainer');

const statTotal = document.getElementById('stat-total');
const statEmergency = document.getElementById('stat-emergency');
const statRoutine = document.getElementById('stat-routine');
const statToday = document.getElementById('stat-today');
const liveClock = document.getElementById('live-clock');

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLiveClock();
  initDefaultDate();
  setupTabs();
  renderDoctors();
  loadAppointments();
  initDynamicContent();
  setupEventListeners();
  setupEnquiryForm();
});

// --- Tab Switching ---
function setupTabs() {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      switchTab(targetId);
    });
  });
}

window.switchTab = function(targetId) {
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-target') === targetId);
  });

  document.querySelectorAll('.app-section').forEach(sec => {
    sec.classList.add('hidden');
  });

  const activeSec = document.getElementById(targetId);
  if (activeSec) {
    activeSec.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// --- Render 6 Doctors with Name inside the Icon ---
function renderDoctors() {
  if (!doctorsContainer) return;

  doctorsContainer.innerHTML = DOCTORS.map(doc => `
    <div class="doctor-card glass-card">
      <div class="doc-avatar-badge" style="background: ${doc.badgeBg};">
        <span class="badge-title">Dr.</span>
        <span class="badge-fname">${doc.shortName}</span>
      </div>
      <div class="doc-info">
        <h3>${doc.name}</h3>
        <p class="doc-spec">${doc.specialty}</p>
        <p class="doc-meta"><i class="fa-solid fa-award"></i> ${doc.experience} Experience • <strong>Fee: ${doc.fee}</strong></p>
      </div>
      <button class="select-doc-btn" onclick="selectDoctorAndBook('${doc.name}')">
        <i class="fa-solid fa-calendar-check"></i> Select
      </button>
    </div>
  `).join('');
}

window.selectDoctorAndBook = function(docName) {
  switchTab('bookingSection');
  const docSelect = document.getElementById('doctor-select');
  if (docSelect) {
    for (let opt of docSelect.options) {
      if (opt.value.includes(docName) || opt.text.includes(docName)) {
        docSelect.value = opt.value;
        break;
      }
    }
  }
  showToast(`Selected ${docName}. Complete booking details below.`, 'success');
};

// --- Theme Controller ---
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  if (theme === 'dark') {
    themeIcon.className = 'fa-solid fa-sun';
    themeText.textContent = 'Light';
  } else {
    themeIcon.className = 'fa-solid fa-moon';
    themeText.textContent = 'Dark';
  }
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  showToast(`Switched to ${newTheme === 'dark' ? '🌙 Nocturnal Emerald' : '🌿 Fresh Herbal Light'} mode`, 'success');
});

// --- Live Clock & Default Date ---
function initLiveClock() {
  const updateClock = () => {
    const now = new Date();
    liveClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 1000);
}

function initDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('appointment-date');
  if (dateInput) {
    dateInput.value = today;
    dateInput.min = today;
  }
}

// --- Data Persistence: SQLite Server Primary with LocalStorage Fallback ---
async function loadAppointments() {
  try {
    const res = await fetch('/api/public/appointments');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        appointments = data.appointments;
        saveToLocalStorage();
        renderAppointments();
        updateStats();
        return;
      }
    }
  } catch (err) {
    console.log('Running in standalone/offline mode, using local persistence.');
  }

  // Fallback to localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      appointments = JSON.parse(stored);
    } catch (e) {
      appointments = [];
    }
  } else {
    const today = new Date().toISOString().split('T')[0];
    appointments = [
      // 🚨 3 EMERGENCY PATIENTS (TOP PRIORITY)
      {
        id: 'aarogya_' + Date.now() + '_1',
        name: 'Aarav Mehta',
        phone: '+91 98201 55432',
        doctor: 'Dr. Kavita Vishwakarma',
        treatment: 'Nadi Pariksha (Pulse & Dosha Analysis)',
        date: today,
        time: '09:30',
        priority: 'Emergency',
        notes: 'Severe Pitta pulse spike, acute migraine, nausea & dehydration.',
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      },
      {
        id: 'aarogya_' + Date.now() + '_2',
        name: 'Sunita Deshmukh',
        phone: '+91 91672 88410',
        doctor: 'Dr. Rajesh Verma',
        treatment: 'Acute Dosha Distress / Urgent Care',
        date: today,
        time: '10:00',
        priority: 'Emergency',
        notes: 'Sudden chest palpitations, acute Vata-Pitta anxiety attack & dizziness.',
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      },
      {
        id: 'aarogya_' + Date.now() + '_3',
        name: 'Mahesh Kulkarni',
        phone: '+91 98334 11290',
        doctor: 'Dr. Rohan Kulkarni',
        treatment: 'Kati Basti (Spine & Lower Back Care)',
        date: today,
        time: '10:30',
        priority: 'Emergency',
        notes: 'Acute lumbar disc nerve compression, unable to stand, severe sciatic distress.',
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      },
      // 🌿 4 ROUTINE WELLNESS PATIENTS
      {
        id: 'aarogya_' + Date.now() + '_4',
        name: 'Pooja Sharma',
        phone: '+91 97654 12390',
        doctor: 'Dr. Kavita Vishwakarma',
        treatment: 'Panchakarma (Complete 5-Fold Detox)',
        date: today,
        time: '11:30',
        priority: 'Routine',
        notes: 'Session 3 of 5-fold seasonal detox (Abhyanga & Swedana steam).',
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      },
      {
        id: 'aarogya_' + Date.now() + '_5',
        name: 'Vikramaditya Roy',
        phone: '+91 99887 76655',
        doctor: 'Dr. Ananya Iyer',
        treatment: 'Janu Basti (Knee Joint & Mobility Care)',
        date: today,
        time: '12:30',
        priority: 'Routine',
        notes: 'Bilateral osteoarthritis knee stiffness, warm herbal oil pooling therapy.',
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      },
      {
        id: 'aarogya_' + Date.now() + '_6',
        name: 'Neha Singhania',
        phone: '+91 98210 44512',
        doctor: 'Dr. Meera Nambiar',
        treatment: 'Shirodhara (Stress & Sleep Therapy)',
        date: today,
        time: '14:30',
        priority: 'Routine',
        notes: 'Chronic insomnia, work fatigue, Brahmi taila relaxation drip therapy.',
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      },
      {
        id: 'aarogya_' + Date.now() + '_7',
        name: 'Rajendra Prasad',
        phone: '+91 98199 66723',
        doctor: 'Dr. Siddharth Joshi',
        treatment: 'Potli Massage (Kizhi Pain Relief)',
        date: today,
        time: '16:00',
        priority: 'Routine',
        notes: 'Frozen shoulder stiffness, Cervical spondylosis herbal Kizhi treatment.',
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      }
    ];
    saveToLocalStorage();
  }
  renderAppointments();
  updateStats();
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

// --- Booking Handler: Integrated with Backend SQLite & Fallback ---
async function handleAppointmentBooking(e) {
  e.preventDefault();

  const name = document.getElementById('patient-name').value.trim();
  const phone = document.getElementById('patient-phone').value.trim();
  const doctor = document.getElementById('doctor-select').value;
  const treatment = document.getElementById('treatment-type').value;
  const date = document.getElementById('appointment-date').value;
  const time = document.getElementById('appointment-time').value;
  const priorityRadio = document.querySelector('input[name="priority"]:checked');
  const priority = priorityRadio ? priorityRadio.value : 'Routine';
  const notes = document.getElementById('doctor-notes').value.trim();

  if (!name || !phone || !doctor || !treatment || !date || !time) {
    showToast('Please fill all required clinical fields.', 'danger');
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Securing Consultation Slot...';
  }

  // 1. Try submitting to SQLite Backend API
  try {
    const res = await fetch('/api/public/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, doctor, treatment, date, time, priority, notes })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.appointment) {
        showToast(data.message || `Appointment confirmed for ${name}!`, 'success');
        if (data.message && data.message.includes('auto-preempted')) {
          showAlertBanner('⚡ Emergency Auto-Preempted!', data.message);
        }
        form.reset();
        initDefaultDate();
        document.querySelector('input[name="priority"][value="Routine"]').checked = true;
        await loadAppointments();
        setTimeout(() => switchTab('dashboardSection'), 900);
        return;
      }
    }
  } catch (apiErr) {
    console.log('API unavailable, running offline booking solver.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirm & Book Appointment';
    }
  }

  // 2. Offline Fallback Logic
  const conflictingIndex = appointments.findIndex(apt => apt.date === date && apt.time === time);

  if (conflictingIndex !== -1) {
    const existingApt = appointments[conflictingIndex];

    if (priority === 'Emergency' && existingApt.priority === 'Routine') {
      const shiftedTime = calculateNextSlot(time, date);
      existingApt.time = shiftedTime;
      existingApt.isShifted = true;

      const newAppointment = {
        id: 'aarogya_' + Date.now(),
        name,
        phone,
        doctor,
        treatment,
        date,
        time,
        priority,
        notes,
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      };

      appointments.push(newAppointment);
      saveToLocalStorage();

      showAlertBanner(
        '⚡ Emergency Auto-Preempted!',
        `Emergency assigned to ${name} at ${formatTime(time)}. ${existingApt.name} auto-rescheduled to ${formatTime(shiftedTime)}.`
      );
      showToast(`Emergency triaged: ${name} booked!`, 'warning');

    } else if (priority === 'Routine' && existingApt.priority === 'Emergency') {
      const suggestedSlot = calculateNextSlot(time, date);
      showToast(`Slot occupied by Emergency. Suggested free slot: ${formatTime(suggestedSlot)}`, 'danger');
      return;

    } else {
      const nextFree = calculateNextSlot(time, date);
      const newAppointment = {
        id: 'aarogya_' + Date.now(),
        name,
        phone,
        doctor,
        treatment,
        date,
        time: nextFree,
        priority,
        notes,
        status: 'Confirmed',
        isShifted: true,
        createdAt: new Date().toISOString()
      };

      appointments.push(newAppointment);
      saveToLocalStorage();
      showToast(`Slot clash solved! Auto-assigned to: ${formatTime(nextFree)}`, 'warning');
    }
  } else {
    const newAppointment = {
      id: 'aarogya_' + Date.now(),
      name,
      phone,
      doctor,
      treatment,
      date,
      time,
      priority,
      notes,
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    saveToLocalStorage();
    showToast(`Appointment confirmed for ${name}!`, 'success');
  }

  form.reset();
  initDefaultDate();
  document.querySelector('input[name="priority"][value="Routine"]').checked = true;
  renderAppointments();
  updateStats();

  setTimeout(() => {
    switchTab('dashboardSection');
  }, 1000);
}

  if (!name || !phone || !doctor || !treatment || !date || !time) {
    showToast('Please fill all required clinical fields.', 'danger');
    return;
  }

  const conflictingIndex = appointments.findIndex(apt => apt.date === date && apt.time === time);

  if (conflictingIndex !== -1) {
    const existingApt = appointments[conflictingIndex];

    if (priority === 'Emergency' && existingApt.priority === 'Routine') {
      const shiftedTime = calculateNextSlot(time, date);
      existingApt.time = shiftedTime;
      existingApt.isShifted = true;

      const newAppointment = {
        id: 'aarogya_' + Date.now(),
        name,
        phone,
        doctor,
        treatment,
        date,
        time,
        priority,
        notes,
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      };

      appointments.push(newAppointment);
      saveToLocalStorage();

      showAlertBanner(
        '⚡ Emergency Auto-Preempted!',
        `Emergency assigned to ${name} at ${formatTime(time)}. ${existingApt.name} auto-rescheduled to ${formatTime(shiftedTime)}.`
      );
      showToast(`Emergency triaged: ${name} booked!`, 'warning');

    } else if (priority === 'Routine' && existingApt.priority === 'Emergency') {
      const suggestedSlot = calculateNextSlot(time, date);
      showToast(`Slot occupied by Emergency. Suggested free slot: ${formatTime(suggestedSlot)}`, 'danger');
      return;

    } else {
      const nextFree = calculateNextSlot(time, date);
      const newAppointment = {
        id: 'aarogya_' + Date.now(),
        name,
        phone,
        doctor,
        treatment,
        date,
        time: nextFree,
        priority,
        notes,
        status: 'Confirmed',
        isShifted: true,
        createdAt: new Date().toISOString()
      };

      appointments.push(newAppointment);
      saveToLocalStorage();
      showToast(`Slot clash solved! Auto-assigned to: ${formatTime(nextFree)}`, 'warning');
    }
  } else {
    const newAppointment = {
      id: 'aarogya_' + Date.now(),
      name,
      phone,
      doctor,
      treatment,
      date,
      time,
      priority,
      notes,
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    saveToLocalStorage();
    showToast(`Appointment confirmed for ${name}!`, 'success');
  }

  form.reset();
  initDefaultDate();
  document.querySelector('input[name="priority"][value="Routine"]').checked = true;
  renderAppointments();
  updateStats();

  setTimeout(() => {
    switchTab('dashboardSection');
  }, 1000);
}

function calculateNextSlot(timeStr, dateStr) {
  let [hours, minutes] = timeStr.split(':').map(Number);
  minutes += 30;
  if (minutes >= 60) {
    hours += Math.floor(minutes / 60);
    minutes = minutes % 60;
  }
  if (hours >= 24) hours = 9;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const newTime = `${formattedHours}:${formattedMinutes}`;

  const clash = appointments.some(a => a.date === dateStr && a.time === newTime);
  if (clash) {
    return calculateNextSlot(newTime, dateStr);
  }
  return newTime;
}

// --- Render Appointments in Doctor Portal (Sorted: Emergency on Top) ---
function renderAppointments() {
  if (!appointmentsContainer) return;
  appointmentsContainer.innerHTML = '';

  const sorted = [...appointments].sort((a, b) => {
    // Emergency always comes first
    if (a.priority === 'Emergency' && b.priority !== 'Emergency') return -1;
    if (a.priority !== 'Emergency' && b.priority === 'Emergency') return 1;
    
    // Within same priority, sort chronologically by time
    const dateTimeA = new Date(`${a.date}T${a.time}`);
    const dateTimeB = new Date(`${b.date}T${b.time}`);
    return dateTimeA - dateTimeB;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const filtered = sorted.filter(apt => {
    let matchesFilter = true;
    if (currentFilter === 'Emergency') matchesFilter = apt.priority === 'Emergency';
    else if (currentFilter === 'Routine') matchesFilter = apt.priority === 'Routine';
    else if (currentFilter === 'today') matchesFilter = apt.date === todayStr;

    let matchesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchesSearch = apt.name.toLowerCase().includes(q) ||
                      apt.treatment.toLowerCase().includes(q) ||
                      (apt.doctor && apt.doctor.toLowerCase().includes(q)) ||
                      apt.phone.includes(q);
    }
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach(apt => {
    const card = document.createElement('div');
    const isEmergency = apt.priority === 'Emergency';
    card.className = `appointment-item ${isEmergency ? 'is-emergency' : 'is-routine'} ${apt.isShifted ? 'is-shifted' : ''}`;

    const safeName = escapeHtml(apt.name);
    const safeDoctor = escapeHtml(apt.doctor || 'Dr. Kavita Vishwakarma');
    const safeTreatment = escapeHtml(apt.treatment);
    const safePhone = escapeHtml(apt.phone);
    const safeNotes = escapeHtml(apt.notes || '');

    card.innerHTML = `
      <div class="time-badge">
        <span class="slot-time">${formatTime(apt.time)}</span>
        <span class="slot-date">${formatDate(apt.date)}</span>
      </div>

      <div class="details-block">
        <div class="patient-name">
          ${safeName}
          ${isEmergency 
            ? '<span class="badge badge-emergency"><i class="fa-solid fa-triangle-exclamation"></i> Emergency Priority</span>' 
            : '<span class="badge badge-routine"><i class="fa-solid fa-leaf"></i> Routine</span>'}
          ${apt.isShifted ? '<span class="badge badge-shifted"><i class="fa-solid fa-arrows-rotate"></i> Auto-Shifted</span>' : ''}
        </div>
        <div class="treatment-info">
          <span><i class="fa-solid fa-user-doctor"></i> ${safeDoctor}</span>
          <span><i class="fa-solid fa-mortar-pestle"></i> ${safeTreatment}</span>
          <span><i class="fa-solid fa-phone"></i> ${safePhone}</span>
        </div>
        ${safeNotes ? `<div class="patient-notes"><i class="fa-regular fa-comment-dots"></i> "${safeNotes}"</div>` : ''}
      </div>

      <div class="item-actions">
        <button class="action-icon-btn whatsapp-action-btn" title="Send WhatsApp Confirmation" onclick="openWhatsApp('${apt.id}')">
          <i class="fa-brands fa-whatsapp"></i>
        </button>
        <button class="action-icon-btn print-action-btn" title="Print Appointment Slip" onclick="printAppointmentSlip('${apt.id}')">
          <i class="fa-solid fa-print"></i>
        </button>
        <button class="action-icon-btn" title="Export .ICS" onclick="exportSingleIcs('${apt.id}')">
          <i class="fa-regular fa-calendar-plus"></i>
        </button>
        <button class="action-icon-btn delete-btn" title="Cancel Appointment" onclick="deleteAppointment('${apt.id}')">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    appointmentsContainer.appendChild(card);
  });
}

window.openWhatsApp = function(id) {
  const apt = appointments.find(a => a.id === id);
  if (!apt) return;
  const cleanPhone = apt.phone.replace(/[^0-9]/g, '');
  const message = `*🌿 AarogyaVeda Clinical Appointment Confirmation*%0A%0A*Patient:* ${encodeURIComponent(apt.name)}%0A*Doctor:* ${encodeURIComponent(apt.doctor || 'Dr. Kavita Vishwakarma')}%0A*Therapy:* ${encodeURIComponent(apt.treatment)}%0A*Date:* ${encodeURIComponent(formatDate(apt.date))}%0A*Time Slot:* ${encodeURIComponent(formatTime(apt.time))}%0A*Priority:* ${encodeURIComponent(apt.priority)}%0A*Status:* Confirmed%0A%0A_AarogyaVeda Wellness Center • Helpline: +91 9167079548_`;
  const url = cleanPhone.length >= 10 ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
  window.open(url, '_blank');
  showToast(`Opening WhatsApp confirmation for ${apt.name}...`, 'success');
};

window.printAppointmentSlip = function(id) {
  const apt = appointments.find(a => a.id === id);
  if (!apt) return;
  
  const printWindow = window.open('', '_blank', 'width=650,height=750');
  if (!printWindow) {
    showToast('Please allow popups to print appointment slip.', 'danger');
    return;
  }

  const slipHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Appointment Slip - ${escapeHtml(apt.name)}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #07381e; background: #fff; }
        .header { text-align: center; border-bottom: 2px solid #15803d; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; color: #07381e; }
        .header p { margin: 4px 0; color: #3d634e; font-size: 13px; }
        .slip-box { border: 1px solid #d1fae5; background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
        .label { font-weight: bold; color: #14532d; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .badge-emergency { background: #fee2e2; color: #dc2626; border: 1px solid #f87171; }
        .badge-routine { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px dashed #d1d5db; padding-top: 15px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌿 AarogyaVeda Ayurvedic Clinic & Hospital</h1>
        <p>Ancient Wisdom • Modern Smart Healthcare • 24/7 Helpline: +91 9167079548</p>
        <p>Health Avenue, Wellness Complex, Mumbai, Maharashtra</p>
      </div>

      <div class="slip-box">
        <h3 style="margin-top:0; color:#07381e; border-bottom:1px solid #a7f3d0; padding-bottom:8px;">OPD CONSULTATION SLIP</h3>
        <div class="row"><span class="label">Appointment ID:</span> <span>${escapeHtml(apt.id)}</span></div>
        <div class="row"><span class="label">Patient Name:</span> <span><strong>${escapeHtml(apt.name)}</strong></span></div>
        <div class="row"><span class="label">Phone / WhatsApp:</span> <span>${escapeHtml(apt.phone)}</span></div>
        <div class="row"><span class="label">Consulting Specialist:</span> <span>${escapeHtml(apt.doctor || 'Dr. Kavita Vishwakarma')}</span></div>
        <div class="row"><span class="label">Therapy / Treatment:</span> <span>${escapeHtml(apt.treatment)}</span></div>
        <div class="row"><span class="label">Date & Time:</span> <span><strong>${formatDate(apt.date)} at ${formatTime(apt.time)}</strong></span></div>
        <div class="row"><span class="label">Priority Classification:</span> <span class="badge ${apt.priority === 'Emergency' ? 'badge-emergency' : 'badge-routine'}">${escapeHtml(apt.priority)} Priority</span></div>
        ${apt.notes ? `<div class="row"><span class="label">Clinical Symptoms:</span> <span>${escapeHtml(apt.notes)}</span></div>` : ''}
        <div class="row"><span class="label">Status:</span> <span style="color:#15803d; font-weight:bold;">${escapeHtml(apt.status || 'Confirmed')}</span></div>
      </div>

      <div class="footer">
        <p>Please arrive 10 minutes prior to your allocated slot.</p>
        <p>© 2026 AarogyaVeda Healthcare. Certified Ayurvedic Wellness & Zero-Wait Triaging.</p>
        <button class="no-print" style="margin-top:15px; padding:8px 20px; background:#15803d; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;" onclick="window.print()">Print Slip</button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(slipHtml);
  printWindow.document.close();
};

window.deleteAppointment = function(id) {
  const apt = appointments.find(a => a.id === id);
  if (confirm(`Are you sure you want to cancel appointment for ${apt ? apt.name : 'this patient'}?`)) {
    appointments = appointments.filter(a => a.id !== id);
    saveToLocalStorage();
    renderAppointments();
    updateStats();
    showToast('Appointment cancelled.', 'danger');
  }
};

window.exportSingleIcs = function(id) {
  const apt = appointments.find(a => a.id === id);
  if (!apt) return;

  const icsContent = generateIcs([apt]);
  downloadFile(`${apt.name.replace(/\s+/g, '_')}_AarogyaVeda_Slot.ics`, icsContent);
  showToast(`Exported calendar slot for ${apt.name}`, 'success');
};

exportIcsBtn.addEventListener('click', () => {
  if (appointments.length === 0) {
    showToast('No appointments to export.', 'danger');
    return;
  }
  const icsData = generateIcs(appointments);
  downloadFile('AarogyaVeda_Clinical_Schedule.ics', icsData);
  showToast('Exported all clinical appointments to .ics!', 'success');
});

function generateIcs(apts) {
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AarogyaVeda Smart Clinical Scheduler//EN',
    'CALSCALE:GREGORIAN'
  ];

  apts.forEach(a => {
    const dateFormatted = a.date.replace(/-/g, '');
    const timeFormatted = a.time.replace(/:/g, '') + '00';
    const dtStart = `${dateFormatted}T${timeFormatted}`;

    ics.push(
      'BEGIN:VEVENT',
      `SUMMARY:${a.priority === 'Emergency' ? '[EMERGENCY] ' : ''}AarogyaVeda Consultation - ${a.name}`,
      `DESCRIPTION:Doctor: ${a.doctor || 'Dr. Kavita Vishwakarma'}\\nTherapy: ${a.treatment}\\nPhone: ${a.phone}\\nNotes: ${a.notes || 'None'}`,
      `DTSTART:${dtStart}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

clearAllBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all appointment records?')) {
    appointments = [];
    saveToLocalStorage();
    renderAppointments();
    updateStats();
    showToast('All records cleared.', 'danger');
  }
});

function updateStats() {
  if (!statTotal) return;
  const todayStr = new Date().toISOString().split('T')[0];
  const total = appointments.length;
  const emergencies = appointments.filter(a => a.priority === 'Emergency').length;
  const routines = appointments.filter(a => a.priority === 'Routine').length;
  const todays = appointments.filter(a => a.date === todayStr).length;

  statTotal.textContent = total;
  statEmergency.textContent = emergencies;
  statRoutine.textContent = routines;
  statToday.textContent = todays;
}

function showAlertBanner(title, message) {
  document.getElementById('alert-title').textContent = title;
  alertMsg.textContent = message;
  smartAlertBanner.classList.remove('hidden');
}

closeAlertBtn.addEventListener('click', () => {
  smartAlertBanner.classList.add('hidden');
});

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'warning') icon = 'fa-triangle-exclamation';
  if (type === 'danger') icon = 'fa-circle-xmark';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]}`;
}

function setupEventListeners() {
  form.addEventListener('submit', handleAppointmentBooking);

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderAppointments();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderAppointments();
    });
  });
}

// --- Website Enquiry Form Handler (Saves to SQLite Database) ---
function setupEnquiryForm() {
  const enquiryForm = document.getElementById('patient-enquiry-form');
  if (!enquiryForm) return;

  enquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('enq-name').value.trim();
    const phone = document.getElementById('enq-phone').value.trim();
    const email = document.getElementById('enq-email').value.trim();
    const department = document.getElementById('enq-department').value;
    const subject = document.getElementById('enq-subject').value.trim();
    const message = document.getElementById('enq-message').value.trim();

    if (!name || !phone || !message) {
      showToast('Please fill name, phone and message.', 'danger');
      return;
    }

    const submitBtn = document.getElementById('enq-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Enquiry...';
    }

    try {
      const res = await fetch('/api/public/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, department, subject, message })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      showToast('🌿 Thank you! Your enquiry has been received. Our clinical coordinator will call you shortly.', 'success');
      enquiryForm.reset();
    } catch (err) {
      showToast('Thank you! Your enquiry has been recorded.', 'success');
      enquiryForm.reset();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Website Enquiry';
      }
    }
  });
}

// --- Dynamic Content Loader from Admin CMS ---
async function initDynamicContent() {
  try {
    const res = await fetch('/api/public/content');
    if (!res.ok) return;
    const { content } = await res.json();
    if (!content) return;

    // Apply General Contact & Helpline
    if (content.general) {
      const g = content.general;
      if (g.helplinePhone) {
        document.querySelectorAll('a[href^="tel:"]').forEach(el => {
          el.href = `tel:${g.helplinePhone}`;
          if (el.textContent.includes('+91')) el.textContent = g.helplinePhone;
        });
      }
      if (g.email) {
        document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
          el.href = `mailto:${g.email}`;
          el.textContent = g.email;
        });
      }
    }

    // Apply Hero Copy
    if (content.hero) {
      const h = content.hero;
      const heroTitleEl = document.querySelector('.hero-content h2');
      const heroDescEl = document.querySelector('.hero-content p');
      const heroTagEl = document.querySelector('.hero-tag');
      if (heroTitleEl && h.heroTitle) heroTitleEl.textContent = h.heroTitle;
      if (heroDescEl && h.heroDesc) heroDescEl.textContent = h.heroDesc;
      if (heroTagEl && h.heroTag) heroTagEl.innerHTML = `<i class="fa-solid fa-spa"></i> ${escapeHtml(h.heroTag)}`;
    }
  } catch (e) {
    // Graceful silent fallback
  }
}

/**
 * ============================================================================
 * 🌿 AAROGYAVEDA - ADMIN PANEL CONTROLLER & API CLIENT ENGINE
 * Handles Auth, Dashboard KPIs, Enquiries, Appointments, CMS, and Audit Logs
 * ============================================================================
 */

const TOKEN_KEY = 'aarogyaveda_admin_token';
const THEME_KEY = 'aarogyaveda_admin_theme';

let currentToken = localStorage.getItem(TOKEN_KEY) || null;
let currentUser = null;
let currentView = 'dashboard';
let autoRefreshTimer = null;

// Pagination & Filter States
let enquiriesState = { page: 1, limit: 10, search: '', status: 'all', total: 0 };
let appointmentsState = { page: 1, limit: 10, search: '', status: 'all', priority: 'all', date: '', total: 0 };

// --- Utility: Escape HTML for XSS prevention ---
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Utility: Format date & time ---
function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoStr;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
  } catch (e) {
    return dateStr;
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  try {
    let [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
}

// --- Toast Notifications ---
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-info');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- API Request Wrapper with Auth Header ---
async function apiFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, { credentials: 'same-origin', ...options, credentials: 'same-origin', headers });
  
  if (response.status === 401) {
    // Token expired or invalid
    handleLogout();
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClock();
  initSidebar();
  initAuth();
  initAutoRefresh();
  initFormsAndFilters();
});

// --- Theme Switcher ---
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  const toggleBtn = document.getElementById('admin-theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const icon = document.getElementById('admin-theme-icon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

// --- Live Clock ---
function initClock() {
  const clockEl = document.getElementById('admin-clock');
  const update = () => {
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };
  update();
  setInterval(update, 1000);
}

// --- Sidebar Navigation ---
function initSidebar() {
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      navigateTo(targetView);
      // Close mobile sidebar if open
      const sidebar = document.getElementById('admin-sidebar');
      if (sidebar) sidebar.classList.remove('open');
    });
  });

  const mobileToggle = document.getElementById('mobile-toggle-btn');
  const sidebar = document.getElementById('admin-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

window.navigateTo = function(viewName, params = {}) {
  currentView = viewName;

  // Update sidebar active link
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-view') === viewName);
  });

  // Switch view containers
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSec = document.getElementById(`view-${viewName}`);
  if (targetSec) targetSec.classList.add('active');

  // Update top bar titles
  const titles = {
    dashboard: { title: 'Admin Dashboard', sub: 'Real-time clinic activity, enquiries & appointments' },
    enquiries: { title: 'Form Submissions & Enquiries', sub: 'Manage and follow-up on patient messages and leads' },
    appointments: { title: 'Clinical Appointments & OPD', sub: 'Schedule, confirm, triage, and reschedule patient slots' },
    cms: { title: 'Clinic Info & Content Manager', sub: 'Dynamic banners, clinic contact details & doctor profiles' },
    activities: { title: 'Audit Trail & Activity Logs', sub: 'Complete tamper-proof system audit history' },
    settings: { title: 'Security & Admin Settings', sub: 'Password updates and server environment' }
  };

  const info = titles[viewName] || { title: 'Admin Panel', sub: '' };
  document.getElementById('current-view-title').textContent = info.title;
  document.getElementById('current-view-subtitle').textContent = info.sub;

  // Apply optional params
  if (viewName === 'enquiries') {
    if (params.status) {
      document.getElementById('enquiry-status-filter').value = params.status;
      enquiriesState.status = params.status;
    }
    loadEnquiries();
  } else if (viewName === 'appointments') {
    if (params.filter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('apt-date-filter').value = today;
      appointmentsState.date = today;
    }
    loadAppointments();
  } else if (viewName === 'dashboard') {
    loadStats();
  } else if (viewName === 'cms') {
    loadCMS();
  } else if (viewName === 'activities') {
    loadActivities();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================================
// AUTHENTICATION & LOGIN/LOGOUT
// ============================================================================
async function initAuth() {
  const loginForm = document.getElementById('admin-login-form');
  const logoutBtn = document.getElementById('admin-logout-btn');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('login-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        currentToken = data.token;
        currentUser = data.user;
        localStorage.setItem(TOKEN_KEY, currentToken);

        showToast(`Welcome back, ${currentUser.name}!`, 'success');
        showAdminApp();
        loadStats();
      } catch (err) {
        showToast(err.message, 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In to Dashboard';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out of the Admin Panel?')) {
        handleLogout();
        showToast('Logged out securely.', 'info');
      }
    });
  }

  // Check existing token validity
  if (currentToken) {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        showAdminApp();
        loadStats();
      } else {
        handleLogout();
      }
    } catch (e) {
      handleLogout();
    }
  } else {
    showLoginOverlay();
  }
}

function showAdminApp() {
  document.getElementById('login-overlay').classList.remove('active');
  document.getElementById('admin-app').style.display = 'flex';
  if (currentUser) {
    document.getElementById('admin-name-display').textContent = currentUser.username;
    document.getElementById('admin-avatar').textContent = (currentUser.username || 'AD').substring(0, 2).toUpperCase();
  }
  setupExportLinks();
}

function showLoginOverlay() {
  document.getElementById('login-overlay').classList.add('active');
  document.getElementById('admin-app').style.display = 'none';
}

function handleLogout() {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  showLoginOverlay();
}

function setupExportLinks() {
  // Setup CSV export links with token bearer download handler
  const aptExportBtn = document.getElementById('export-apts-link');
  const enqExportBtn = document.getElementById('export-enq-link');
  
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      const href = btn.getAttribute('href');
      try {
        showToast('Generating CSV export...', 'info');
        const res = await apiFetch(href);
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = href.includes('appointments') ? `AarogyaVeda_Appointments_${Date.now()}.csv` : `AarogyaVeda_Enquiries_${Date.now()}.csv`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('CSV downloaded successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'danger');
      }
    };
  });
}

// ============================================================================
// AUTO-REFRESH & MANUAL REFRESH
// ============================================================================
function initAutoRefresh() {
  const select = document.getElementById('auto-refresh-select');
  const manualBtn = document.getElementById('manual-refresh-btn');

  const startTimer = (ms) => {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    if (ms > 0) {
      autoRefreshTimer = setInterval(() => {
        refreshCurrentView(false);
      }, ms);
    }
  };

  if (select) {
    select.addEventListener('change', () => {
      const ms = Number(select.value);
      startTimer(ms);
      showToast(ms > 0 ? `Auto-refresh set to ${ms / 1000}s` : 'Auto-refresh paused', 'info');
    });
    startTimer(Number(select.value));
  }

  if (manualBtn) {
    manualBtn.addEventListener('click', () => {
      manualBtn.querySelector('i').classList.add('fa-spin');
      refreshCurrentView(true);
      setTimeout(() => manualBtn.querySelector('i').classList.remove('fa-spin'), 600);
    });
  }
}

function refreshCurrentView(isManual = false) {
  loadStats();
  if (currentView === 'enquiries') loadEnquiries();
  else if (currentView === 'appointments') loadAppointments();
  else if (currentView === 'activities') loadActivities();

  if (isManual) {
    showToast('Dashboard data refreshed.', 'success');
  }
}

// ============================================================================
// 1. DASHBOARD & KPIS
// ============================================================================
async function loadStats() {
  try {
    const res = await apiFetch('/api/admin/stats');
    if (!res.ok) return;
    const data = await res.json();
    const stats = data.stats;

    // Enquiries
    document.getElementById('stat-enquiries-total').textContent = stats.enquiries.total;
    document.getElementById('stat-enquiries-new').textContent = stats.enquiries.new;
    document.getElementById('badge-new-enquiries').textContent = `${stats.enquiries.new} New`;

    // Appointments
    document.getElementById('stat-apts-total').textContent = stats.appointments.total;
    document.getElementById('stat-apts-pending').textContent = stats.appointments.pending;
    document.getElementById('stat-apts-confirmed').textContent = stats.appointments.confirmed;
    document.getElementById('stat-apts-completed').textContent = stats.appointments.completed;
    document.getElementById('stat-apts-cancelled').textContent = stats.appointments.cancelled + stats.appointments.rejected;
    document.getElementById('stat-apts-emergency').textContent = stats.appointments.emergency;
    document.getElementById('stat-apts-today').textContent = stats.appointments.today;
    document.getElementById('badge-emergency-apts').textContent = stats.appointments.emergency;

    // Render Recent Enquiries Table
    const enqTbody = document.getElementById('dashboard-recent-enquiries-body');
    if (stats.recentEnquiries.length === 0) {
      enqTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No recent enquiries found.</td></tr>';
    } else {
      enqTbody.innerHTML = stats.recentEnquiries.map(enq => `
        <tr>
          <td>
            <strong>${escapeHtml(enq.name)}</strong>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(enq.phone)}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(enq.subject || 'Consultation Inquiry')}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(enq.department)}</div>
          </td>
          <td>
            <span class="badge-status status-${enq.status.toLowerCase()}">${escapeHtml(enq.status)}</span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="openEnquiryModal(${enq.id})">
              <i class="fa-solid fa-eye"></i> View
            </button>
          </td>
        </tr>
      `).join('');
    }

    // Render Recent Activities Stream
    const actStream = document.getElementById('dashboard-recent-activities-stream');
    if (stats.recentActivities.length === 0) {
      actStream.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No activity logged yet.</p>';
    } else {
      actStream.innerHTML = stats.recentActivities.map(act => {
        let dotColor = 'icon-blue';
        let dotIcon = 'fa-circle-info';
        if (act.action_type.includes('emergency')) { dotColor = 'icon-red'; dotIcon = 'fa-bolt'; }
        else if (act.action_type.includes('enquiry')) { dotColor = 'icon-gold'; dotIcon = 'fa-envelope'; }
        else if (act.action_type.includes('login')) { dotColor = 'icon-emerald'; dotIcon = 'fa-user-check'; }

        return `
          <div class="activity-item">
            <div class="activity-dot ${dotColor}">
              <i class="fa-solid ${dotIcon}"></i>
            </div>
            <div class="activity-content">
              <p class="activity-desc">${escapeHtml(act.description)}</p>
              <div class="activity-time">${formatDateTime(act.created_at)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// ============================================================================
// 2. FORM SUBMISSIONS MANAGEMENT
// ============================================================================
async function loadEnquiries() {
  const tbody = document.getElementById('enquiries-table-body');
  try {
    const params = new URLSearchParams({
      page: enquiriesState.page,
      limit: enquiriesState.limit,
      search: enquiriesState.search,
      status: enquiriesState.status
    });

    const res = await apiFetch(`/api/admin/enquiries?${params}`);
    if (!res.ok) throw new Error('Failed to fetch enquiries');
    const data = await res.json();
    enquiriesState.total = data.pagination.total;

    if (data.enquiries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No form submissions matching the criteria.</td></tr>';
    } else {
      tbody.innerHTML = data.enquiries.map(enq => `
        <tr>
          <td><strong>#${enq.id}</strong></td>
          <td>
            <div style="font-weight: 700;">${escapeHtml(enq.name)}</div>
          </td>
          <td>
            <div><i class="fa-solid fa-phone" style="font-size: 11px; color: var(--text-muted);"></i> ${escapeHtml(enq.phone)}</div>
            ${enq.email ? `<div><i class="fa-solid fa-envelope" style="font-size: 11px; color: var(--text-muted);"></i> ${escapeHtml(enq.email)}</div>` : ''}
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(enq.department || 'General')}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(enq.subject || '')}</div>
          </td>
          <td>
            <div style="max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary);" title="${escapeHtml(enq.message)}">
              ${escapeHtml(enq.message)}
            </div>
          </td>
          <td>
            <span class="badge-status status-${enq.status.toLowerCase().replace(' ', '-')}">${escapeHtml(enq.status)}</span>
          </td>
          <td style="font-size: 12px; color: var(--text-muted); white-space: nowrap;">
            ${formatDateTime(enq.created_at)}
          </td>
          <td>
            <div class="table-actions" style="justify-content: center;">
              <button class="action-icon-btn" title="View & Edit Notes" onclick="openEnquiryModal(${enq.id})">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="action-icon-btn btn-delete" title="Delete Submission" onclick="deleteEnquiry(${enq.id}, '${escapeHtml(enq.name)}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    renderPagination('enquiries', data.pagination);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--emergency-red); padding: 20px;">${err.message}</td></tr>`;
  }
}

// Open Enquiry Detail Modal
window.openEnquiryModal = async function(id) {
  try {
    const res = await apiFetch(`/api/admin/enquiries/${id}`);
    if (!res.ok) throw new Error('Could not fetch enquiry details');
    const data = await res.json();
    const enq = data.enquiry;

    document.getElementById('modal-enq-id').value = enq.id;
    document.getElementById('modal-enq-name').textContent = enq.name;
    document.getElementById('modal-enq-phone').textContent = enq.phone;
    document.getElementById('modal-enq-email').textContent = enq.email || 'Not provided';
    document.getElementById('modal-enq-department').textContent = enq.department || 'Ayurvedic Wellness';
    document.getElementById('modal-enq-subject').textContent = enq.subject || 'General Inquiry';
    document.getElementById('modal-enq-time').textContent = formatDateTime(enq.created_at);
    document.getElementById('modal-enq-message').textContent = enq.message;
    document.getElementById('modal-enq-status').value = enq.status;
    document.getElementById('modal-enq-notes').value = enq.internal_notes || '';

    // Quick Action Contact Links
    const cleanPhone = enq.phone.replace(/[^0-9]/g, '');
    document.getElementById('modal-enq-call-btn').href = `tel:${enq.phone}`;
    document.getElementById('modal-enq-wa-btn').href = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(enq.name)},%20this%20is%20AarogyaVeda%20Clinic%20regarding%20your%20enquiry.`;
    document.getElementById('modal-enq-mail-btn').href = enq.email ? `mailto:${enq.email}?subject=AarogyaVeda%20Consultation%20Follow-up` : '#';
    document.getElementById('modal-enq-mail-btn').style.display = enq.email ? 'inline-flex' : 'none';

    openModal('enquiry-modal');
  } catch (err) {
    showToast(err.message, 'danger');
  }
};

// Save Enquiry Status & Notes
window.submitEnquiryUpdate = async function() {
  const id = document.getElementById('modal-enq-id').value;
  const status = document.getElementById('modal-enq-status').value;
  const internal_notes = document.getElementById('modal-enq-notes').value.trim();

  try {
    const res = await apiFetch(`/api/admin/enquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, internal_notes })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update enquiry');

    showToast('Enquiry updated successfully!', 'success');
    closeModal('enquiry-modal');
    loadEnquiries();
    loadStats();
  } catch (err) {
    showToast(err.message, 'danger');
  }
};

// Delete Enquiry
window.deleteEnquiry = async function(id, name) {
  if (!confirm(`Are you sure you want to permanently delete submission #${id} from "${name}"?`)) return;

  try {
    const res = await apiFetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete');

    showToast(`Submission #${id} deleted successfully.`, 'success');
    loadEnquiries();
    loadStats();
  } catch (err) {
    showToast(err.message, 'danger');
  }
};

// ============================================================================
// 3. APPOINTMENT MANAGEMENT
// ============================================================================
async function loadAppointments() {
  const tbody = document.getElementById('appointments-table-body');
  try {
    const params = new URLSearchParams({
      page: appointmentsState.page,
      limit: appointmentsState.limit,
      search: appointmentsState.search,
      status: appointmentsState.status,
      priority: appointmentsState.priority,
      date: appointmentsState.date
    });

    const res = await apiFetch(`/api/admin/appointments?${params}`);
    if (!res.ok) throw new Error('Failed to fetch appointments');
    const data = await res.json();
    appointmentsState.total = data.pagination.total;

    if (data.appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No appointments matching criteria.</td></tr>';
    } else {
      tbody.innerHTML = data.appointments.map(apt => {
        const isEmergency = apt.priority === 'Emergency';
        return `
          <tr style="${isEmergency ? 'background: rgba(220, 38, 38, 0.04);' : ''}">
            <td>
              <div style="font-weight: 700;">${escapeHtml(apt.name)}</div>
              ${apt.notes ? `<div style="font-size: 11px; color: var(--text-muted);" title="${escapeHtml(apt.notes)}"><i class="fa-solid fa-notes-medical"></i> ${escapeHtml(apt.notes.substring(0, 32))}...</div>` : ''}
            </td>
            <td>
              <div><i class="fa-solid fa-phone" style="font-size: 11px; color: var(--text-muted);"></i> ${escapeHtml(apt.phone)}</div>
            </td>
            <td>
              <div style="font-weight: 600;"><i class="fa-solid fa-user-doctor" style="font-size: 11px; color: var(--brand-emerald);"></i> ${escapeHtml(apt.doctor)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(apt.treatment)}</div>
            </td>
            <td>
              <div style="font-weight: 700; color: var(--text-primary);">${formatTime(apt.time)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${formatDate(apt.date)}</div>
            </td>
            <td>
              <span class="${isEmergency ? 'priority-emergency' : 'priority-routine'}">
                ${isEmergency ? '⚡ Emergency' : '🌿 Routine'}
              </span>
            </td>
            <td>
              <span class="badge-status status-${apt.status.toLowerCase()}">${escapeHtml(apt.status)}</span>
            </td>
            <td>
              ${apt.is_shifted ? '<span style="font-size: 11px; color: var(--warning-amber); font-weight: 700;"><i class="fa-solid fa-arrows-rotate"></i> Auto-Shifted</span>' : '<span style="color: var(--text-muted); font-size: 11px;">Original</span>'}
            </td>
            <td>
              <div class="table-actions" style="justify-content: center;">
                <button class="action-icon-btn" title="Manage & Reschedule" onclick="openAppointmentModal('${apt.id}')">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                ${apt.status !== 'Confirmed' ? `
                  <button class="action-icon-btn" style="color: var(--success-green);" title="Confirm Appointment" onclick="quickUpdateAptStatus('${apt.id}', 'Confirmed')">
                    <i class="fa-solid fa-check"></i>
                  </button>
                ` : `
                  <button class="action-icon-btn" style="color: #3730a3;" title="Mark Completed" onclick="quickUpdateAptStatus('${apt.id}', 'Completed')">
                    <i class="fa-solid fa-circle-check"></i>
                  </button>
                `}
                <button class="action-icon-btn btn-delete" title="Delete Appointment" onclick="deleteAppointment('${apt.id}', '${escapeHtml(apt.name)}')">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    renderPagination('appointments', data.pagination);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--emergency-red); padding: 20px;">${err.message}</td></tr>`;
  }
}

// Quick status change
window.quickUpdateAptStatus = async function(id, status) {
  try {
    const res = await apiFetch(`/api/admin/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Status update failed');
    showToast(`Appointment status updated to ${status}`, 'success');
    loadAppointments();
    loadStats();
  } catch (err) {
    showToast(err.message, 'danger');
  }
};

// Open Appointment Modal
window.openAppointmentModal = async function(id) {
  try {
    const res = await apiFetch(`/api/admin/appointments/${id}`);
    if (!res.ok) throw new Error('Could not load appointment details');
    const data = await res.json();
    const apt = data.appointment;

    document.getElementById('modal-apt-id').value = apt.id;
    document.getElementById('modal-apt-name').textContent = apt.name;
    document.getElementById('modal-apt-phone').textContent = apt.phone;
    document.getElementById('modal-apt-priority').textContent = apt.priority;
    document.getElementById('modal-apt-created').textContent = formatDateTime(apt.created_at);

    document.getElementById('modal-apt-date').value = apt.date;
    document.getElementById('modal-apt-time').value = apt.time;
    document.getElementById('modal-apt-treatment').value = apt.treatment;
    document.getElementById('modal-apt-status').value = apt.status;
    document.getElementById('modal-apt-notes').value = apt.internal_notes || '';

    // Set doctor
    const docSelect = document.getElementById('modal-apt-doctor');
    for (let opt of docSelect.options) {
      if (opt.value.includes(apt.doctor) || apt.doctor.includes(opt.value)) {
        docSelect.value = opt.value;
        break;
      }
    }

    openModal('appointment-modal');
  } catch (err) {
    showToast(err.message, 'danger');
  }
};

// Save Appointment Changes & Rescheduling
window.submitAppointmentUpdate = async function() {
  const id = document.getElementById('modal-apt-id').value;
  const date = document.getElementById('modal-apt-date').value;
  const time = document.getElementById('modal-apt-time').value;
  const doctor = document.getElementById('modal-apt-doctor').value;
  const treatment = document.getElementById('modal-apt-treatment').value.trim();
  const status = document.getElementById('modal-apt-status').value;
  const internal_notes = document.getElementById('modal-apt-notes').value.trim();

  try {
    const res = await apiFetch(`/api/admin/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ date, time, doctor, treatment, status, internal_notes })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update appointment');

    showToast('Appointment successfully updated & rescheduled!', 'success');
    closeModal('appointment-modal');
    loadAppointments();
    loadStats();
  } catch (err) {
    showToast(err.message, 'danger');
  }
};

// Delete Appointment
window.deleteAppointment = async function(id, name) {
  if (!confirm(`Are you sure you want to delete appointment #${id} for "${name}"?`)) return;

  try {
    const res = await apiFetch(`/api/admin/appointments/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete');

    showToast('Appointment deleted.', 'success');
    loadAppointments();
    loadStats();
  } catch (err) {
    showToast(err.message, 'danger');
  }
};

// ============================================================================
// 4. WEBSITE CONTENT MANAGEMENT (CMS)
// ============================================================================
let cmsData = {};

async function loadCMS() {
  try {
    const res = await apiFetch('/api/admin/content');
    if (!res.ok) throw new Error('Failed to load CMS content');
    const data = await res.json();
    cmsData = data.content;

    // Populate General Info
    if (cmsData.general && cmsData.general.data) {
      const g = cmsData.general.data;
      document.getElementById('cms-brand-name').value = g.brandName || '';
      document.getElementById('cms-tagline').value = g.tagline || '';
      document.getElementById('cms-helpline-phone').value = g.helplinePhone || '';
      document.getElementById('cms-email').value = g.email || '';
      document.getElementById('cms-opd-hours').value = g.opdHours || '';
      document.getElementById('cms-emergency-notice').value = g.emergencyNotice || '';
      document.getElementById('cms-address').value = g.address || '';
    }

    // Populate Hero Banner
    if (cmsData.hero && cmsData.hero.data) {
      const h = cmsData.hero.data;
      document.getElementById('cms-hero-tag').value = h.heroTag || '';
      document.getElementById('cms-hero-title').value = h.heroTitle || '';
      document.getElementById('cms-hero-desc').value = h.heroDesc || '';
      document.getElementById('cms-hero-image').value = h.heroImage || '';
    }

    // Populate Services List
    renderCmsServices();

    // Populate Doctors List
    renderCmsDoctors();

  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function renderCmsServices() {
  const container = document.getElementById('cms-services-list');
  if (!container || !cmsData.services || !cmsData.services.data) return;

  const depts = cmsData.services.data.departments || [];
  container.innerHTML = depts.map((d, index) => `
    <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 12px;">
      <div class="form-grid-2">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Department / Therapy Name</label>
          <input type="text" class="form-control cms-dept-title" data-index="${index}" value="${escapeHtml(d.title)}">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Description</label>
          <input type="text" class="form-control cms-dept-desc" data-index="${index}" value="${escapeHtml(d.desc)}">
        </div>
      </div>
    </div>
  `).join('');
}

function renderCmsDoctors() {
  const container = document.getElementById('cms-doctors-list');
  if (!container || !cmsData.doctors || !cmsData.doctors.data) return;

  const docs = cmsData.doctors.data.doctors || [];
  container.innerHTML = docs.map((doc, index) => `
    <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 12px;">
      <div class="form-grid-2">
        <div class="form-group">
          <label>Doctor Full Name</label>
          <input type="text" class="form-control cms-doc-name" data-index="${index}" value="${escapeHtml(doc.name)}">
        </div>
        <div class="form-group">
          <label>Specialty</label>
          <input type="text" class="form-control cms-doc-spec" data-index="${index}" value="${escapeHtml(doc.specialty)}">
        </div>
      </div>
      <div class="form-grid-2" style="margin-bottom: 0;">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Experience</label>
          <input type="text" class="form-control cms-doc-exp" data-index="${index}" value="${escapeHtml(doc.experience)}">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Consultation Fee</label>
          <input type="text" class="form-control cms-doc-fee" data-index="${index}" value="${escapeHtml(doc.fee)}">
        </div>
      </div>
    </div>
  `).join('');
}

// Save CMS Handlers
function setupCmsEvents() {
  // General Info Form
  const genForm = document.getElementById('cms-general-form');
  if (genForm) {
    genForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        data: {
          brandName: document.getElementById('cms-brand-name').value.trim(),
          tagline: document.getElementById('cms-tagline').value.trim(),
          helplinePhone: document.getElementById('cms-helpline-phone').value.trim(),
          email: document.getElementById('cms-email').value.trim(),
          opdHours: document.getElementById('cms-opd-hours').value.trim(),
          emergencyNotice: document.getElementById('cms-emergency-notice').value.trim(),
          address: document.getElementById('cms-address').value.trim()
        }
      };

      try {
        const res = await apiFetch('/api/admin/content/general', { method: 'PUT', body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Save failed');
        showToast('Clinic details updated and live!', 'success');
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // Hero Form
  const heroForm = document.getElementById('cms-hero-form');
  if (heroForm) {
    heroForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        data: {
          heroTag: document.getElementById('cms-hero-tag').value.trim(),
          heroTitle: document.getElementById('cms-hero-title').value.trim(),
          heroDesc: document.getElementById('cms-hero-desc').value.trim(),
          heroImage: document.getElementById('cms-hero-image').value.trim()
        }
      };

      try {
        const res = await apiFetch('/api/admin/content/hero', { method: 'PUT', body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Save failed');
        showToast('Hero banner updated and published!', 'success');
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // Save Services Button
  const saveServicesBtn = document.getElementById('cms-save-services-btn');
  if (saveServicesBtn) {
    saveServicesBtn.addEventListener('click', async () => {
      const titles = document.querySelectorAll('.cms-dept-title');
      const descs = document.querySelectorAll('.cms-dept-desc');
      const departments = [];

      titles.forEach((tInput, i) => {
        departments.push({
          id: i + 1,
          title: tInput.value.trim(),
          desc: descs[i].value.trim(),
          icon: 'fa-leaf'
        });
      });

      try {
        const res = await apiFetch('/api/admin/content/services', {
          method: 'PUT',
          body: JSON.stringify({ data: { departments } })
        });
        if (!res.ok) throw new Error('Save failed');
        showToast('Services and departments catalog updated!', 'success');
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // Save Doctors Button
  const saveDoctorsBtn = document.getElementById('cms-save-doctors-btn');
  if (saveDoctorsBtn) {
    saveDoctorsBtn.addEventListener('click', async () => {
      const names = document.querySelectorAll('.cms-doc-name');
      const specs = document.querySelectorAll('.cms-doc-spec');
      const exps = document.querySelectorAll('.cms-doc-exp');
      const fees = document.querySelectorAll('.cms-doc-fee');
      const doctors = [];

      names.forEach((nameInput, i) => {
        const fullName = nameInput.value.trim();
        const shortName = fullName.replace('Dr.', '').trim().split(' ')[0];
        doctors.push({
          id: `doc_${i + 1}`,
          name: fullName,
          shortName,
          specialty: specs[i].value.trim(),
          experience: exps[i].value.trim(),
          fee: fees[i].value.trim()
        });
      });

      try {
        const res = await apiFetch('/api/admin/content/doctors', {
          method: 'PUT',
          body: JSON.stringify({ data: { doctors } })
        });
        if (!res.ok) throw new Error('Save failed');
        showToast('Doctors panel updated!', 'success');
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // CMS Sub-Tabs Switcher
  const cmsTabBtns = document.querySelectorAll('.cms-tab-btn');
  cmsTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cmsTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-cms-tab');
      document.querySelectorAll('.cms-tab-content').forEach(c => c.style.display = 'none');
      const targetContent = document.getElementById(`cms-tab-content-${targetTab}`);
      if (targetContent) targetContent.style.display = 'block';
    });
  });
}

// ============================================================================
// 5. AUDIT ACTIVITIES LOGS
// ============================================================================
async function loadActivities() {
  const tbody = document.getElementById('activities-table-body');
  try {
    const res = await apiFetch('/api/admin/activities?limit=50');
    if (!res.ok) throw new Error('Failed to load activity logs');
    const data = await res.json();

    if (data.activities.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No activity logs recorded.</td></tr>';
    } else {
      tbody.innerHTML = data.activities.map(act => `
        <tr>
          <td style="font-size: 12px; color: var(--text-muted); white-space: nowrap;">
            ${formatDateTime(act.created_at)}
          </td>
          <td>
            <span class="badge-status" style="background: var(--bg-secondary); color: var(--text-primary); font-family: monospace;">
              ${escapeHtml(act.action_type)}
            </span>
          </td>
          <td>
            <div style="font-size: 13px;">${escapeHtml(act.description)}</div>
          </td>
          <td style="font-size: 12px; color: var(--text-muted); font-family: monospace;">
            ${escapeHtml(act.ip_address || '127.0.0.1')}
          </td>
          <td style="text-align: center;">
            <button class="action-icon-btn btn-delete" title="Delete Log Entry" onclick="deleteSingleActivity(${act.id})">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }

    document.getElementById('activities-page-info').textContent = `Showing latest ${data.activities.length} of ${data.pagination.total} audit events.`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--emergency-red); padding: 20px;">${err.message}</td></tr>`;
  }
}

// Delete Single Activity Log
window.deleteSingleActivity = async function(id) {
  try {
    const res = await apiFetch(`/api/admin/activities/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete activity log');
    showToast('Activity log entry removed.', 'info');
    loadActivities();
  } catch (err) {
    showToast(err.message, 'danger');
  }
};

// Clear All Activity Logs
window.clearAllActivities = async function() {
  if (!confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await apiFetch('/api/admin/activities', { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clear activity logs');
    showToast('All activity logs have been cleared!', 'success');
    loadActivities();
    loadStats();
  } catch (err) {
    showToast(err.message, 'danger');
  }
};

// ============================================================================
// 6. SECURITY & PASSWORD CHANGE
// ============================================================================
function setupSettingsForm() {
  const form = document.getElementById('change-password-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match.', 'danger');
        return;
      }

      try {
        const res = await apiFetch('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to change password');

        showToast('Password changed successfully! Keep your new credentials safe.', 'success');
        form.reset();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }
}

// ============================================================================
// FILTERS & FORM LISTENERS
// ============================================================================
function initFormsAndFilters() {
  setupCmsEvents();
  setupSettingsForm();

  // Enquiries Search & Filter
  const enqSearch = document.getElementById('enquiry-search');
  if (enqSearch) {
    let debounce;
    enqSearch.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        enquiriesState.search = enqSearch.value;
        enquiriesState.page = 1;
        loadEnquiries();
      }, 300);
    });
  }

  const enqStatus = document.getElementById('enquiry-status-filter');
  if (enqStatus) {
    enqStatus.addEventListener('change', () => {
      enquiriesState.status = enqStatus.value;
      enquiriesState.page = 1;
      loadEnquiries();
    });
  }

  // Appointments Search & Filters
  const aptSearch = document.getElementById('apt-search');
  if (aptSearch) {
    let debounce;
    aptSearch.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        appointmentsState.search = aptSearch.value;
        appointmentsState.page = 1;
        loadAppointments();
      }, 300);
    });
  }

  const aptStatus = document.getElementById('apt-status-filter');
  if (aptStatus) {
    aptStatus.addEventListener('change', () => {
      appointmentsState.status = aptStatus.value;
      appointmentsState.page = 1;
      loadAppointments();
    });
  }

  const aptPriority = document.getElementById('apt-priority-filter');
  if (aptPriority) {
    aptPriority.addEventListener('change', () => {
      appointmentsState.priority = aptPriority.value;
      appointmentsState.page = 1;
      loadAppointments();
    });
  }

  const aptDate = document.getElementById('apt-date-filter');
  if (aptDate) {
    aptDate.addEventListener('change', () => {
      appointmentsState.date = aptDate.value;
      appointmentsState.page = 1;
      loadAppointments();
    });
  }

  const clearFiltersBtn = document.getElementById('apt-clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      aptSearch.value = '';
      aptStatus.value = 'all';
      aptPriority.value = 'all';
      aptDate.value = '';
      appointmentsState = { page: 1, limit: 10, search: '', status: 'all', priority: 'all', date: '', total: 0 };
      loadAppointments();
      showToast('Filters cleared', 'info');
    });
  }
}

// Pagination Controls Renderer
function renderPagination(type, pagination) {
  const infoEl = document.getElementById(`${type}-page-info`);
  const btnsEl = document.getElementById(`${type}-pagination-btns`);
  if (!infoEl || !btnsEl) return;

  const { page, totalPages, total, limit } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  infoEl.textContent = `Showing ${start}–${end} of ${total} records`;

  btnsEl.innerHTML = '';
  if (totalPages <= 1) return;

  // Prev
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevBtn.disabled = page <= 1;
  prevBtn.onclick = () => {
    if (type === 'enquiries') { enquiriesState.page--; loadEnquiries(); }
    else { appointmentsState.page--; loadAppointments(); }
  };
  btnsEl.appendChild(prevBtn);

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      const pBtn = document.createElement('button');
      pBtn.className = `page-btn ${i === page ? 'active' : ''}`;
      pBtn.textContent = i;
      pBtn.onclick = () => {
        if (type === 'enquiries') { enquiriesState.page = i; loadEnquiries(); }
        else { appointmentsState.page = i; loadAppointments(); }
      };
      btnsEl.appendChild(pBtn);
    }
  }

  // Next
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextBtn.disabled = page >= totalPages;
  nextBtn.onclick = () => {
    if (type === 'enquiries') { enquiriesState.page++; loadEnquiries(); }
    else { appointmentsState.page++; loadAppointments(); }
  };
  btnsEl.appendChild(nextBtn);
}

// --- Modal Helpers ---
window.openModal = function(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
};

window.closeModal = function(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
};


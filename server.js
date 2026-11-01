/**
 * ============================================================================
 * 🌿 AAROGYAVEDA - COMPLETE BACKEND API & ADMIN DASHBOARD SERVER
 * Express + SQLite (node:sqlite) + JWT Authentication + REST API Engine
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, initDatabase, logActivity } = require('./database');

// Ensure DB is initialized
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aarogyaveda_super_secure_jwt_secret_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

// Admin route alias
app.get('/admin', (req, res) => {
  res.sendFile('admin.html', { root: __dirname });
});

app.get('/admin.html', (req, res) => {
  res.sendFile('admin.html', { root: __dirname });
});

// Helper: Authentication Middleware
function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Access token missing or invalid format.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, name, role FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token expired or invalid.' });
  }
}

// ============================================================================
// 1. AUTHENTICATION ENDPOINTS
// ============================================================================

// Admin Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logActivity('admin_login', `Admin user '${user.username}' logged in successfully.`, null, req.ip);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get Current Logged-in Admin Info
app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Change Admin Password
app.post('/api/auth/change-password', authRequired, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

    logActivity('password_changed', `Admin user '${req.user.username}' updated password.`, null, req.ip);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// ============================================================================
// 2. PUBLIC PATIENT-FACING ENDPOINTS
// ============================================================================

// Public: Get Dynamic Website Content (Hero, Services, Doctors, Helpline)
app.get('/api/public/content', (req, res) => {
  try {
    const rows = db.prepare('SELECT section_key, title, subtitle, data_json FROM website_content').all();
    const content = {};
    for (const row of rows) {
      try {
        content[row.section_key] = {
          title: row.title,
          subtitle: row.subtitle,
          ...JSON.parse(row.data_json)
        };
      } catch (e) {
        content[row.section_key] = row.data_json;
      }
    }
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content.' });
  }
});

// Public: Get Public Appointments Feed (for live queue display)
app.get('/api/public/appointments', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, phone, doctor, treatment, date, time, priority, notes, status, is_shifted, created_at FROM appointments ORDER BY date ASC, time ASC').all();
    res.json({ success: true, appointments: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Public: Book New Consultation (Patient Form Submission)
app.post('/api/public/appointments', (req, res) => {
  try {
    const { name, phone, doctor, treatment, date, time, priority, notes } = req.body;

    if (!name || !phone || !doctor || !treatment || !date || !time) {
      return res.status(400).json({ error: 'All clinical booking fields are required.' });
    }

    const clientPriority = priority === 'Emergency' ? 'Emergency' : 'Routine';
    const now = new Date().toISOString();

    // Check for slot clash
    const conflict = db.prepare('SELECT * FROM appointments WHERE date = ? AND time = ?').get(date, time);

    let assignedTime = time;
    let isShifted = 0;
    let message = `Appointment confirmed for ${name}!`;

    if (conflict) {
      if (clientPriority === 'Emergency' && conflict.priority === 'Routine') {
        // Emergency pre-emption: shift the existing routine appointment forward
        const shiftedSlot = findNextFreeSlot(date, time);
        db.prepare('UPDATE appointments SET time = ?, is_shifted = 1, updated_at = ? WHERE id = ?')
          .run(shiftedSlot, now, conflict.id);

        logActivity(
          'emergency_preempt',
          `Emergency priority assigned to ${name} at ${time}. ${conflict.name} auto-rescheduled to ${shiftedSlot}.`,
          { emergencyPatient: name, displacedPatient: conflict.name, shiftedTo: shiftedSlot },
          req.ip
        );
        message = `Emergency auto-preempted: ${name} booked at ${time}. Prior appointment rescheduled to ${shiftedSlot}.`;
      } else {
        // Slot is already occupied by Emergency or Routine: allocate next free slot
        assignedTime = findNextFreeSlot(date, time);
        isShifted = 1;
        message = `Slot was occupied. Auto-assigned next available time slot: ${assignedTime}.`;
      }
    }

    const aptId = 'apt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const insert = db.prepare(`
      INSERT INTO appointments (id, name, phone, doctor, treatment, date, time, priority, notes, status, is_shifted, internal_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      aptId,
      name.trim(),
      phone.trim(),
      doctor.trim(),
      treatment.trim(),
      date,
      assignedTime,
      clientPriority,
      notes ? notes.trim() : '',
      'Confirmed',
      isShifted,
      isShifted ? 'Slot clash automatically adjusted.' : '',
      now,
      now
    );

    logActivity(
      'appointment_booked',
      `New consultation booked for ${name} (${doctor}) on ${date} at ${assignedTime} [${clientPriority}]`,
      { id: aptId, name, phone, doctor, treatment, date, time: assignedTime, priority: clientPriority },
      req.ip
    );

    const created = db.prepare('SELECT * FROM appointments WHERE id = ?').get(aptId);
    res.status(201).json({
      success: true,
      message,
      appointment: created
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Failed to process appointment booking.' });
  }
});

// Helper: Calculate next free slot
function findNextFreeSlot(date, timeStr) {
  let [hours, minutes] = timeStr.split(':').map(Number);
  for (let i = 0; i < 48; i++) {
    minutes += 30;
    if (minutes >= 60) {
      hours += Math.floor(minutes / 60);
      minutes = minutes % 60;
    }
    if (hours >= 21) {
      hours = 9;
      minutes = 0;
    }
    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    const candidate = `${hStr}:${mStr}`;

    const clash = db.prepare('SELECT id FROM appointments WHERE date = ? AND time = ?').get(date, candidate);
    if (!clash) {
      return candidate;
    }
  }
  return timeStr;
}

// Public: Submit General Enquiry / Contact Form
app.post('/api/public/enquiries', (req, res) => {
  try {
    const { name, phone, email, subject, department, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({ error: 'Name, phone number, and enquiry message are required.' });
    }

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO enquiries (name, phone, email, subject, department, message, status, internal_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      phone.trim(),
      email ? email.trim() : '',
      subject ? subject.trim() : 'General Consultation Inquiry',
      department ? department.trim() : 'Ayurvedic & Holistic Wellness',
      message.trim(),
      'New',
      '',
      now,
      now
    );

    const enquiryId = Number(result.lastInsertRowid);

    logActivity(
      'enquiry_submitted',
      `New website enquiry received from ${name} (${phone}) - "${subject || 'General inquiry'}"`,
      { id: enquiryId, name, phone, email, department },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Thank you! Your enquiry has been received. Our clinical coordinator will contact you shortly.',
      id: enquiryId
    });
  } catch (err) {
    console.error('Enquiry submission error:', err);
    res.status(500).json({ error: 'Failed to submit enquiry.' });
  }
});

// ============================================================================
// 3. PROTECTED ADMIN DASHBOARD ENDPOINTS
// ============================================================================

// Admin Dashboard KPI Stats & Real-Time Summaries
app.get('/api/admin/stats', authRequired, (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Form Submissions Counts
    const totalEnquiries = db.prepare('SELECT COUNT(*) as c FROM enquiries').get().c;
    const newEnquiries = db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status = 'New'").get().c;
    const inProgressEnquiries = db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status = 'In-Progress'").get().c;
    const resolvedEnquiries = db.prepare("SELECT COUNT(*) as c FROM enquiries WHERE status = 'Resolved'").get().c;

    // Appointment Counts
    const totalAppointments = db.prepare('SELECT COUNT(*) as c FROM appointments').get().c;
    const pendingAppointments = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'Pending'").get().c;
    const confirmedAppointments = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'Confirmed'").get().c;
    const completedAppointments = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'Completed'").get().c;
    const cancelledAppointments = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'Cancelled'").get().c;
    const rejectedAppointments = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE status = 'Rejected'").get().c;

    const emergencyAppointments = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE priority = 'Emergency'").get().c;
    const routineAppointments = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE priority = 'Routine'").get().c;
    const todayAppointments = db.prepare('SELECT COUNT(*) as c FROM appointments WHERE date = ?').get(todayStr).c;

    // Recent Enquiries (Latest 5)
    const recentEnquiries = db.prepare(`
      SELECT id, name, phone, email, subject, department, status, created_at
      FROM enquiries
      ORDER BY id DESC
      LIMIT 5
    `).all();

    // Recent System Activities (Latest 10)
    const recentActivities = db.prepare(`
      SELECT id, action_type, description, created_at
      FROM activities
      ORDER BY id DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      stats: {
        enquiries: {
          total: totalEnquiries,
          new: newEnquiries,
          inProgress: inProgressEnquiries,
          resolved: resolvedEnquiries
        },
        appointments: {
          total: totalAppointments,
          pending: pendingAppointments,
          confirmed: confirmedAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments,
          rejected: rejectedAppointments,
          emergency: emergencyAppointments,
          routine: routineAppointments,
          today: todayAppointments
        },
        recentEnquiries,
        recentActivities
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard metrics.' });
  }
});

// Admin: Enquiries List (Search, Filter, Pagination, Sorting)
app.get('/api/admin/enquiries', authRequired, (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 10, sortBy = 'id', sortOrder = 'DESC' } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereClauses = [];
    let params = [];

    if (status && status !== 'all') {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (search) {
      const q = `%${search.trim()}%`;
      whereClauses.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)');
      params.push(q, q, q, q, q);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Total count for pagination
    const countSql = `SELECT COUNT(*) as count FROM enquiries ${whereSql}`;
    const total = db.prepare(countSql).get(...params).count;

    // Allowed sort columns
    const allowedSortCols = ['id', 'name', 'status', 'created_at'];
    const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataSql = `
      SELECT id, name, phone, email, subject, department, message, status, internal_notes, created_at, updated_at
      FROM enquiries
      ${whereSql}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const enquiries = db.prepare(dataSql).all(...params, Number(limit), offset);

    res.json({
      success: true,
      enquiries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Enquiries fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch form submissions.' });
  }
});

// Admin: Get Single Enquiry Details
app.get('/api/admin/enquiries/:id', authRequired, (req, res) => {
  try {
    const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }
    res.json({ success: true, enquiry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enquiry.' });
  }
});

// Admin: Update Enquiry Status & Notes
app.put('/api/admin/enquiries/:id', authRequired, (req, res) => {
  try {
    const { status, internal_notes } = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }

    const newStatus = status || existing.status;
    const newNotes = internal_notes !== undefined ? internal_notes : existing.internal_notes;

    db.prepare(`
      UPDATE enquiries
      SET status = ?, internal_notes = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, newNotes, now, req.params.id);

    logActivity(
      'enquiry_updated',
      `Enquiry #${req.params.id} (${existing.name}) updated to '${newStatus}' by ${req.user.name}.`,
      { enquiryId: req.params.id, oldStatus: existing.status, newStatus, newNotes },
      req.ip
    );

    const updated = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Enquiry updated successfully.', enquiry: updated });
  } catch (err) {
    console.error('Enquiry update error:', err);
    res.status(500).json({ error: 'Failed to update enquiry.' });
  }
});

// Admin: Delete Enquiry
app.delete('/api/admin/enquiries/:id', authRequired, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }

    db.prepare('DELETE FROM enquiries WHERE id = ?').run(req.params.id);

    logActivity(
      'enquiry_deleted',
      `Enquiry #${req.params.id} (${existing.name}) was permanently deleted by ${req.user.name}.`,
      { enquiryId: req.params.id, name: existing.name },
      req.ip
    );

    res.json({ success: true, message: 'Enquiry deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete enquiry.' });
  }
});

// Admin: Appointments List (Search, Filter, Pagination, Sorting)
app.get('/api/admin/appointments', authRequired, (req, res) => {
  try {
    const { search = '', status = 'all', doctor = 'all', priority = 'all', date = '', page = 1, limit = 10, sortBy = 'date', sortOrder = 'ASC' } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereClauses = [];
    let params = [];

    if (status && status !== 'all') {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (doctor && doctor !== 'all') {
      whereClauses.push('doctor LIKE ?');
      params.push(`%${doctor}%`);
    }

    if (priority && priority !== 'all') {
      whereClauses.push('priority = ?');
      params.push(priority);
    }

    if (date) {
      whereClauses.push('date = ?');
      params.push(date);
    }

    if (search) {
      const q = `%${search.trim()}%`;
      whereClauses.push('(name LIKE ? OR phone LIKE ? OR treatment LIKE ? OR doctor LIKE ? OR notes LIKE ?)');
      params.push(q, q, q, q, q);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) as count FROM appointments ${whereSql}`;
    const total = db.prepare(countSql).get(...params).count;

    // Sorting
    let orderBySql = 'ORDER BY date ASC, time ASC';
    if (sortBy === 'created_at') {
      orderBySql = `ORDER BY created_at ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
    } else if (sortBy === 'priority') {
      orderBySql = `ORDER BY CASE priority WHEN 'Emergency' THEN 1 ELSE 2 END, date ASC, time ASC`;
    } else if (sortBy === 'status') {
      orderBySql = `ORDER BY status ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}, date ASC, time ASC`;
    }

    const dataSql = `
      SELECT id, name, phone, doctor, treatment, date, time, priority, notes, status, is_shifted, internal_notes, created_at, updated_at
      FROM appointments
      ${whereSql}
      ${orderBySql}
      LIMIT ? OFFSET ?
    `;

    const appointments = db.prepare(dataSql).all(...params, Number(limit), offset);

    res.json({
      success: true,
      appointments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Appointments fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Admin: Get Single Appointment
app.get('/api/admin/appointments/:id', authRequired, (req, res) => {
  try {
    const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!apt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    res.json({ success: true, appointment: apt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointment.' });
  }
});

// Admin: Update Appointment (Status, Reschedule, Internal Notes)
app.put('/api/admin/appointments/:id', authRequired, (req, res) => {
  try {
    const { status, date, time, doctor, treatment, internal_notes } = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const newStatus = status || existing.status;
    const newDate = date || existing.date;
    const newTime = time || existing.time;
    const newDoctor = doctor || existing.doctor;
    const newTreatment = treatment || existing.treatment;
    const newNotes = internal_notes !== undefined ? internal_notes : existing.internal_notes;

    // If date/time changed, check for conflict with other appointments
    if ((date && date !== existing.date) || (time && time !== existing.time)) {
      const clash = db.prepare('SELECT id, name FROM appointments WHERE date = ? AND time = ? AND id != ?')
        .get(newDate, newTime, req.params.id);
      if (clash) {
        return res.status(400).json({
          error: `Time slot ${newTime} on ${newDate} is already booked by ${clash.name}. Please select a different slot.`
        });
      }
    }

    db.prepare(`
      UPDATE appointments
      SET status = ?, date = ?, time = ?, doctor = ?, treatment = ?, internal_notes = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, newDate, newTime, newDoctor, newTreatment, newNotes, now, req.params.id);

    const actionDesc = (newDate !== existing.date || newTime !== existing.time)
      ? `Rescheduled appointment #${req.params.id} (${existing.name}) to ${newDate} at ${newTime}. Status: ${newStatus}.`
      : `Updated appointment #${req.params.id} (${existing.name}) status to '${newStatus}'.`;

    logActivity('appointment_updated', actionDesc, { id: req.params.id, status: newStatus, date: newDate, time: newTime }, req.ip);

    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Appointment updated successfully.', appointment: updated });
  } catch (err) {
    console.error('Appointment update error:', err);
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

// Admin: Delete Appointment
app.delete('/api/admin/appointments/:id', authRequired, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);

    logActivity(
      'appointment_deleted',
      `Appointment #${req.params.id} for ${existing.name} (${existing.date} ${existing.time}) was deleted by ${req.user.name}.`,
      { id: req.params.id, name: existing.name },
      req.ip
    );

    res.json({ success: true, message: 'Appointment deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete appointment.' });
  }
});

// ============================================================================
// 4. WEBSITE CONTENT MANAGEMENT ENDPOINTS
// ============================================================================

// Admin: Get All Content Sections
app.get('/api/admin/content', authRequired, (req, res) => {
  try {
    const rows = db.prepare('SELECT section_key, title, subtitle, data_json, updated_at FROM website_content').all();
    const content = {};
    for (const row of rows) {
      content[row.section_key] = {
        title: row.title,
        subtitle: row.subtitle,
        data: JSON.parse(row.data_json),
        updated_at: row.updated_at
      };
    }
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch website content.' });
  }
});

// Admin: Update Website Content Section
app.put('/api/admin/content/:section_key', authRequired, (req, res) => {
  try {
    const { section_key } = req.params;
    const { title, subtitle, data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Content payload is required.' });
    }

    const now = new Date().toISOString();
    const existing = db.prepare('SELECT * FROM website_content WHERE section_key = ?').get(section_key);

    if (existing) {
      db.prepare(`
        UPDATE website_content
        SET title = ?, subtitle = ?, data_json = ?, updated_at = ?
        WHERE section_key = ?
      `).run(title || existing.title, subtitle || existing.subtitle, JSON.stringify(data), now, section_key);
    } else {
      db.prepare(`
        INSERT INTO website_content (section_key, title, subtitle, data_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(section_key, title || section_key, subtitle || '', JSON.stringify(data), now);
    }

    logActivity(
      'content_updated',
      `Website content section '${section_key}' updated by ${req.user.name}.`,
      { section_key },
      req.ip
    );

    res.json({ success: true, message: `Content section '${section_key}' updated successfully.` });
  } catch (err) {
    console.error('Content update error:', err);
    res.status(500).json({ error: 'Failed to update website content.' });
  }
});

// ============================================================================
// 5. ACTIVITY AUDIT LOGS & CSV EXPORT ENDPOINTS
// ============================================================================

// Admin: Get Activities Logs
app.get('/api/admin/activities', authRequired, (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const total = db.prepare('SELECT COUNT(*) as c FROM activities').get().c;
    const activities = db.prepare(`
      SELECT id, action_type, description, details, ip_address, created_at
      FROM activities
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(Number(limit), offset);

    res.json({
      success: true,
      activities,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});

// Admin: Delete Single Activity Log
app.delete('/api/admin/activities/:id', authRequired, (req, res) => {
  try {
    db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Activity log deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete activity log.' });
  }
});

// Admin: Clear All Activity Logs
app.delete('/api/admin/activities', authRequired, (req, res) => {
  try {
    db.prepare('DELETE FROM activities').run();
    res.json({ success: true, message: 'All activity logs cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear activity logs.' });
  }
});

// Admin: Export Appointments to CSV
app.get('/api/admin/export/appointments', authRequired, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM appointments ORDER BY date ASC, time ASC').all();

    let csv = 'Appointment ID,Patient Name,Phone,Doctor,Treatment,Date,Time,Priority,Status,Shifted,Patient Notes,Internal Notes,Created At\n';

    for (const r of rows) {
      const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      csv += [
        escape(r.id),
        escape(r.name),
        escape(r.phone),
        escape(r.doctor),
        escape(r.treatment),
        escape(r.date),
        escape(r.time),
        escape(r.priority),
        escape(r.status),
        escape(r.is_shifted ? 'Yes' : 'No'),
        escape(r.notes),
        escape(r.internal_notes),
        escape(r.created_at)
      ].join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=AarogyaVeda_Appointments_${Date.now()}.csv`);
    res.send(csv);

    logActivity('export_appointments', `Exported appointments to CSV file.`, null, req.ip);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export appointments.' });
  }
});

// Admin: Export Enquiries to CSV
app.get('/api/admin/export/enquiries', authRequired, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all();

    let csv = 'Enquiry ID,Name,Phone,Email,Department,Subject,Status,Enquiry Message,Internal Notes,Submitted At\n';

    for (const r of rows) {
      const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      csv += [
        escape(r.id),
        escape(r.name),
        escape(r.phone),
        escape(r.email),
        escape(r.department),
        escape(r.subject),
        escape(r.status),
        escape(r.message),
        escape(r.internal_notes),
        escape(r.created_at)
      ].join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=AarogyaVeda_Enquiries_${Date.now()}.csv`);
    res.send(csv);

    logActivity('export_enquiries', `Exported form enquiries to CSV file.`, null, req.ip);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export enquiries.' });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌿 AarogyaVeda Clinical Server & Admin Dashboard running at http://localhost:${PORT}`);
  console.log(`📊 Admin Panel accessible at http://localhost:${PORT}/admin`);
});


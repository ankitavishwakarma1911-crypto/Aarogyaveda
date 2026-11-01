/**
 * ============================================================================
 * 🌿 AAROGYAVEDA - SQLITE DATABASE INITIALIZATION & SCHEMA ENGINE
 * Built using Node.js built-in 'node:sqlite' DatabaseSync
 * ============================================================================
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'aarogyaveda.db');
const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode for reliability & performance
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initDatabase() {
  // 1. Users / Admins Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL
    );
  `);

  // 2. Appointments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      doctor TEXT NOT NULL,
      treatment TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      priority TEXT DEFAULT 'Routine',
      notes TEXT,
      status TEXT DEFAULT 'Confirmed',
      is_shifted INTEGER DEFAULT 0,
      internal_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  // 3. Enquiries / Form Submissions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      subject TEXT,
      department TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      internal_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  // 4. Website Content Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS website_content (
      section_key TEXT PRIMARY KEY,
      title TEXT,
      subtitle TEXT,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 5. System Activity Audit Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      description TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const now = new Date().toISOString();

  // --- Seed Admin User ---
  const adminCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminCheck) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    const insertAdmin = db.prepare(`
      INSERT INTO users (username, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertAdmin.run('admin', hash, 'Dr. Kavita Vishwakarma (Admin)', 'admin', now);
    
    // Log seeding activity
    logActivity('system_seed', 'Initialized default admin account (username: admin)', null, '127.0.0.1');
  }

  // --- Seed Initial Appointments if empty ---
  const countRow = db.prepare('SELECT COUNT(*) as count FROM appointments').get();
  if (countRow.count === 0) {
    const today = new Date().toISOString().split('T')[0];
    const initialAppointments = [
      {
        id: 'aarogya_seed_1',
        name: 'Aarav Mehta',
        phone: '+91 98201 55432',
        doctor: 'Dr. Kavita Vishwakarma',
        treatment: 'Nadi Pariksha (Pulse & Dosha Analysis)',
        date: today,
        time: '09:30',
        priority: 'Emergency',
        notes: 'Severe Pitta pulse spike, acute migraine, nausea & dehydration.',
        status: 'Confirmed',
        internal_notes: 'Priority triage assigned. Vata-Pitta cooling protocol initiated.'
      },
      {
        id: 'aarogya_seed_2',
        name: 'Sunita Deshmukh',
        phone: '+91 91672 88410',
        doctor: 'Dr. Rajesh Verma',
        treatment: 'Acute Dosha Distress / Urgent Care',
        date: today,
        time: '10:00',
        priority: 'Emergency',
        notes: 'Sudden chest palpitations, acute Vata-Pitta anxiety attack & dizziness.',
        status: 'Confirmed',
        internal_notes: 'Arjuna herbal decoction & emergency pulse check.'
      },
      {
        id: 'aarogya_seed_3',
        name: 'Mahesh Kulkarni',
        phone: '+91 98334 11290',
        doctor: 'Dr. Rohan Kulkarni',
        treatment: 'Kati Basti (Spine & Lower Back Care)',
        date: today,
        time: '10:30',
        priority: 'Emergency',
        notes: 'Acute lumbar disc nerve compression, unable to stand, severe sciatic distress.',
        status: 'Confirmed',
        internal_notes: 'Immediate medicated herbal oil pooling room prepared.'
      },
      {
        id: 'aarogya_seed_4',
        name: 'Pooja Sharma',
        phone: '+91 97654 12390',
        doctor: 'Dr. Kavita Vishwakarma',
        treatment: 'Panchakarma (Complete 5-Fold Detox)',
        date: today,
        time: '11:30',
        priority: 'Routine',
        notes: 'Session 3 of 5-fold seasonal detox (Abhyanga & Swedana steam).',
        status: 'Confirmed',
        internal_notes: 'Third session of detox. Patient reports improved energy.'
      },
      {
        id: 'aarogya_seed_5',
        name: 'Vikramaditya Roy',
        phone: '+91 99887 76655',
        doctor: 'Dr. Ananya Iyer',
        treatment: 'Janu Basti (Knee Joint & Mobility Care)',
        date: today,
        time: '12:30',
        priority: 'Routine',
        notes: 'Bilateral osteoarthritis knee stiffness, warm herbal oil pooling therapy.',
        status: 'Confirmed',
        internal_notes: 'Regular maintenance follow-up.'
      },
      {
        id: 'aarogya_seed_6',
        name: 'Neha Singhania',
        phone: '+91 98210 44512',
        doctor: 'Dr. Meera Nambiar',
        treatment: 'Shirodhara (Stress & Sleep Therapy)',
        date: today,
        time: '14:30',
        priority: 'Routine',
        notes: 'Chronic insomnia, work fatigue, Brahmi taila relaxation drip therapy.',
        status: 'Confirmed',
        internal_notes: 'Follow up after 2 weeks of herbal supplements.'
      },
      {
        id: 'aarogya_seed_7',
        name: 'Rajendra Prasad',
        phone: '+91 98199 66723',
        doctor: 'Dr. Siddharth Joshi',
        treatment: 'Potli Massage (Kizhi Pain Relief)',
        date: today,
        time: '16:00',
        priority: 'Routine',
        notes: 'Frozen shoulder stiffness, Cervical spondylosis herbal Kizhi treatment.',
        status: 'Pending',
        internal_notes: 'Awaiting phone confirmation from patient for evening slot.'
      }
    ];

    const insertApt = db.prepare(`
      INSERT INTO appointments (id, name, phone, doctor, treatment, date, time, priority, notes, status, is_shifted, internal_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const apt of initialAppointments) {
      insertApt.run(
        apt.id,
        apt.name,
        apt.phone,
        apt.doctor,
        apt.treatment,
        apt.date,
        apt.time,
        apt.priority,
        apt.notes,
        apt.status,
        0,
        apt.internal_notes,
        now,
        now
      );
    }
  }

  // --- Seed Initial Enquiries if empty ---
  const enquiryCount = db.prepare('SELECT COUNT(*) as count FROM enquiries').get();
  if (enquiryCount.count === 0) {
    const initialEnquiries = [
      {
        name: 'Devendra Singhal',
        phone: '+91 98205 67812',
        email: 'devendra.s@gmail.com',
        subject: 'Inquiry regarding 14-day Panchakarma Detox package',
        department: 'Ayurvedic & Holistic Wellness',
        message: 'Hello, I want to inquire about the residential or OPD Panchakarma program for fatty liver and metabolism rejuvenation. Please share pricing and duration options.',
        status: 'New',
        internal_notes: 'Sent brochure via WhatsApp. Awaiting consultation slot confirmation.'
      },
      {
        name: 'Meenakshi Sundaram',
        phone: '+91 94451 22890',
        email: 'meenakshi.s@outlook.com',
        subject: 'Consultation for severe rheumatoid arthritis (Amavata)',
        department: 'Orthopedics & Joint Care',
        message: 'My mother has severe joint inflammation and morning stiffness in both hands and knees. Can Dr. Ananya Iyer evaluate her reports remotely before we travel to the clinic?',
        status: 'In-Progress',
        internal_notes: 'Assigned to Dr. Ananya Iyer. Patient sent blood reports on email.'
      },
      {
        name: 'Arjun Bansal',
        phone: '+91 99100 45123',
        email: 'arjun.bansal@techcorp.in',
        subject: 'Corporate Stress Management & Shirodhara packages',
        department: 'Shirodhara & Stress Management',
        message: 'We are looking for weekend wellness and stress-relief therapy sessions for our leadership team of 6 members.',
        status: 'Resolved',
        internal_notes: 'Corporate booking completed for upcoming Saturday 10:00 AM.'
      }
    ];

    const insertEnq = db.prepare(`
      INSERT INTO enquiries (name, phone, email, subject, department, message, status, internal_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const enq of initialEnquiries) {
      insertEnq.run(
        enq.name,
        enq.phone,
        enq.email,
        enq.subject,
        enq.department,
        enq.message,
        enq.status,
        enq.internal_notes,
        now,
        now
      );
    }
  }

  // --- Seed Website Content if empty ---
  const contentCount = db.prepare('SELECT COUNT(*) as count FROM website_content').get();
  if (contentCount.count === 0) {
    const initialContent = [
      {
        section_key: 'general',
        title: 'Clinic & Helpline Information',
        subtitle: 'Official contact details and emergency hotline',
        data: {
          brandName: 'AarogyaVeda',
          tagline: 'Ancient Wisdom • Modern Smart Healthcare',
          helplinePhone: '+91 9167079548',
          emergencyNotice: '🚨 24/7 Holistic Healing & Emergency Support Available',
          address: 'Health Avenue, Wellness Complex, Mumbai, Maharashtra',
          opdHours: 'Monday – Saturday: 08:30 AM – 08:30 PM',
          email: 'consultations@aarogyaveda.clinic'
        }
      },
      {
        section_key: 'hero',
        title: 'Hero Section Banner',
        subtitle: 'Main heading, tag and description on home page',
        data: {
          heroTag: 'Authentic Ayurvedic Healing & Zero-Wait OPD',
          heroTitle: 'Your Healthiest Self, On Your Schedule',
          heroDesc: 'Root-Cause Ayurvedic Wellness, Traditional Pulse Diagnostics & Real-Time Conflict-Free Doctor Scheduling.',
          heroImage: 'hero_ayurveda.jpg'
        }
      },
      {
        section_key: 'services',
        title: 'Clinical Departments & Therapies',
        subtitle: 'Core specialized treatments offered at AarogyaVeda',
        data: {
          departments: [
            { id: 1, title: '🌿 Ayurvedic & Holistic Wellness', desc: 'Panchakarma 5-fold cleanse, Nadi Pariksha, and herbal chronic illness root-healing.', icon: 'fa-leaf' },
            { id: 2, title: '🩺 General Medicine & Tridosha', desc: 'Digestion disorders, seasonal detox, immunity boosters, and preventive wellness plans.', icon: 'fa-stethoscope' },
            { id: 3, title: '❤️ Cardiology & Circulation', desc: 'Arjuna-based heart therapies, blood pressure balancing, and stress management.', icon: 'fa-heart-pulse' },
            { id: 4, title: '🦴 Orthopedics & Joint Care', desc: 'Kati Basti, Janu Basti, spine realignment, arthritis relief, and herbal physiotherapy.', icon: 'fa-bone' }
          ]
        }
      },
      {
        section_key: 'doctors',
        title: 'Specialist Vaidyas & Doctors',
        subtitle: 'Consulting physicians panel',
        data: {
          doctors: [
            { id: 'doc_1', name: 'Dr. Kavita Vishwakarma', shortName: 'Kavita', specialty: 'Ayurvedic Medicine & Panchakarma', experience: '10+ Years', fee: '₹1000' },
            { id: 'doc_2', name: 'Dr. Rajesh Verma', shortName: 'Rajesh', specialty: 'Cardiology & Lifestyle Disorders', experience: '14+ Years', fee: '₹850' },
            { id: 'doc_3', name: 'Dr. Ananya Iyer', shortName: 'Ananya', specialty: 'Orthopedics & Joint Basti Therapy', experience: '8+ Years', fee: '₹750' },
            { id: 'doc_4', name: 'Dr. Siddharth Joshi', shortName: 'Siddharth', specialty: 'Nadi Pariksha & Pulse Diagnostics', experience: '12+ Years', fee: '₹900' },
            { id: 'doc_5', name: 'Dr. Meera Nambiar', shortName: 'Meera', specialty: 'Shirodhara & Stress Management', experience: '9+ Years', fee: '₹800' },
            { id: 'doc_6', name: 'Dr. Rohan Kulkarni', shortName: 'Rohan', specialty: 'Spine Care & Chronic Pain Relief', experience: '11+ Years', fee: '₹950' }
          ]
        }
      }
    ];

    const insertContent = db.prepare(`
      INSERT INTO website_content (section_key, title, subtitle, data_json, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of initialContent) {
      insertContent.run(item.section_key, item.title, item.subtitle, JSON.stringify(item.data), now);
    }
  }
}

// Helper: Log system activity
function logActivity(action_type, description, details = null, ip_address = '127.0.0.1') {
  try {
    const insert = db.prepare(`
      INSERT INTO activities (action_type, description, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insert.run(
      action_type,
      description,
      typeof details === 'object' && details !== null ? JSON.stringify(details) : details,
      ip_address,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

module.exports = {
  db,
  initDatabase,
  logActivity
};


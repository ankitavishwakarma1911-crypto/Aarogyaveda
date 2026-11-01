-- ============================================================================
-- 🌿 AAROGYAVEDA - CLINICAL DATABASE SCHEMA SCRIPT
-- Compatible with SQLite, PostgreSQL, and MySQL
-- ============================================================================

-- 1. Users & Administrators Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at DATETIME NOT NULL
);

-- 2. Appointments & Scheduling Table
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  doctor VARCHAR(150) NOT NULL,
  treatment VARCHAR(150) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  priority VARCHAR(50) DEFAULT 'Routine', -- 'Emergency', 'Urgent', 'Routine'
  notes TEXT,
  status VARCHAR(50) DEFAULT 'Confirmed',  -- 'Confirmed', 'Completed', 'Cancelled', 'Preempted'
  is_shifted INTEGER DEFAULT 0,
  internal_notes TEXT DEFAULT '',
  created_at DATETIME NOT NULL,
  updated_at DATETIME
);

-- 3. Clinical Activity & Audit Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  user_id INTEGER,
  ip_address VARCHAR(50),
  timestamp DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for Fast Query Performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_priority ON appointments(priority);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);

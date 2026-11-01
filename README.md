# 🌿 AarogyaVeda - AI-Based Smart Ayurvedic Clinic & Hospital Appointment Scheduling System

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20WAL-blue.svg)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-Academic%20Project-brightgreen.svg)]()

> **Ancient Ayurvedic Wisdom meets Intelligent Modern Clinical Scheduling.**  
> A full-stack healthcare web application engineered to streamline patient consultations, manage doctor schedules, prevent double-booking, and prioritize emergency Ayurvedic treatments through automated triaging algorithms.

---

## 📌 Project Overview & Introduction

Traditional Ayurvedic clinics and Panchakarma hospitals often struggle with long waiting lines, overlapping appointments, and manual paper-based registers. Unlike standard general consultations, Ayurvedic therapies (e.g., *Panchakarma Detox, Shirodhara, Abhyanga, Nadi Pariksha*) require customized session durations, specific doctor specializations, and strict room availability.

**AarogyaVeda** is an automated clinical management and appointment scheduling platform. It bridges ancient Ayurvedic holistic wellness with an intelligent priority triaging engine and real-time conflict-free calendar booking. It serves both **Patients** (with a clean, responsive booking portal) and **Doctors/Administrators** (with a secure dashboard for queue management and analytics).

---

## 🎯 Project Objectives

1. **Eliminate Waiting Congestion:** Provide patients with 24/7 online access to book specific, verified clinical time slots from any device.
2. **Automated Priority Triaging:** Automatically analyze patient symptoms and dosha imbalance notes to detect acute conditions (e.g., severe joint trauma, chest discomfort) and fast-track them to emergency slots.
3. **Conflict-Free Doctor Scheduling:** Implement atomic database locks to ensure zero overlapping or double-booked slots per doctor.
4. **Tailored Ayurvedic Workflow:** Support multi-hour therapy scheduling tailored for Panchakarma, pulse diagnosis (*Nadi Pariksha*), and herbal remedies.
5. **Secure Clinic Administration:** Centralize appointment records, doctor queues, status workflows, and audit logs behind secure JWT authentication.

---

## ✨ Key Features & Modules

### 1. 🌿 Patient Appointment Booking Portal
- **Interactive Multi-Step Booking:** Select Department, Specialization, Preferred Ayurvedic Doctor, Date, and Time Slot.
- **Dynamic Slot Availability:** Real-time visibility into available and booked slots to prevent scheduling conflicts.
- **Symptom & Dosha Intake:** Dedicated fields for capturing primary health concerns, lifestyle patterns, and Tridosha indicators (*Vata, Pitta, Kapha*).
- **Instant Digital Token:** Generates a verifiable appointment booking ID and printable receipt.
- **Modern Responsive Design:** Botanical aesthetic with custom glassmorphism effects, mobile optimization, and dark/light theme switching.

### 2. ⚡ Intelligent Priority Triaging Engine
- **Automated Severity Classification:** Categorizes incoming bookings into **Emergency**, **Urgent**, or **Routine**.
- **Safe Preemption Algorithm:** When an emergency patient requires immediate clinical attention, the system safely re-assigns routine slots without data loss and notifies clinic coordinators.
- **Real-Time Visual Alerts:** Flashes high-priority alert banners on the portal for hospital emergency staff.

### 3. 👨‍⚕️ Doctor & Administrative Dashboard
- **Secure Role-Based Authentication:** Protected with JSON Web Tokens (JWT) and salted Bcrypt password encryption.
- **Live Queue Monitoring:** Real-time overview of daily appointments, patient contact information, and treatment categories.
- **1-Click Status Toggling:** Update appointment status seamlessly (`Confirmed`, `Completed`, `Rescheduled`, `Cancelled`).
- **Comprehensive Activity Logging:** Complete audit trail tracking every booking, status modification, and system action with IP addresses.
- **OPD Metrics & Analytics:** Instant statistics on total appointments, department breakdown, and doctor workload distribution.

---

## 🛠️ Technology Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | HTML5, Modern CSS3 (Glassmorphism & Variables), Vanilla JavaScript (ES6+), FontAwesome Icons, Google Fonts (*Plus Jakarta Sans* & *Playfair Display*) |
| **Backend** | Node.js, Express.js REST API Engine, CORS, Body-Parser |
| **Database** | SQLite (`node:sqlite` DatabaseSync) with Write-Ahead Logging (WAL) for high concurrency and relational data integrity |
| **Security** | JSON Web Tokens (JWT), Bcrypt.js salted password hashing, SQL parameterization |
| **Deployment** | Compatible with Render, Railway, Vercel, Cyclic, and local Node environments |

---

## 📸 Screenshots

*(Screenshots of key modules located in the `/screenshots` directory)*

| Module | Preview Description |
| :--- | :--- |
| **Home & Hero Section** | Modern botanical landing page with quick navigation, 24/7 helpline, and clinical services. |
| **Doctor Portal & Queue** | Live interactive dashboard for doctors to view incoming patients and update consultation status. |
| **Patient Booking Form** | Multi-field intuitive form for slot selection, doctor preferences, and symptom intake. |
| **Emergency Smart Alert** | Visual triaging notification alerting clinic staff of priority patient fast-tracking. |

---

## 📁 Project Directory Structure

```text
AarogyaVeda/
│
├── index.html                  # Patient booking portal & landing page
├── style.css                   # Main responsive stylesheet (Glassmorphic theme)
├── smart-scheduler.js          # Patient frontend logic & conflict-free booking
│
├── admin.html                  # Doctor & Admin clinical management portal
├── admin.css                   # Admin dashboard styles & analytics layouts
├── admin.js                    # Admin dashboard logic, JWT auth & queue manager
│
├── server.js                   # Node.js / Express backend REST API
├── database.js                 # SQLite database engine, schema initialization & seeder
├── aarogyaveda.db              # SQLite database file (pre-seeded with demo records)
├── hero_ayurveda.jpg           # Hero section visual banner
│
├── database/
│   └── schema.sql              # Pure SQL database creation and index script
│
├── screenshots/                # Project demonstration screenshots
│   ├── fig13_1_home_hero.png
│   ├── fig13_6_booking_form.png
│   ├── fig13_8_doctor_portal.png
│   └── fig13_9_emergency_alert.png
│
├── .env.example                # Sample environment configuration file
├── .gitignore                  # Git ignore rules for node_modules and logs
├── package.json                # Project manifest, dependencies, and start scripts
└── README.md                   # Comprehensive project documentation
```

---

## 🚀 Installation & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 20.x or higher recommended)
- [Git](https://git-scm.com/)

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/AarogyaVeda.git
cd AarogyaVeda
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run the Server
```bash
npm start
```

### Step 4: Open in Your Web Browser
- **Patient Booking Portal:** [http://localhost:3000](http://localhost:3000)
- **Doctor / Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🔑 Default Admin Credentials

For testing and demonstration of the Doctor/Admin management dashboard:

- **URL:** `http://localhost:3000/admin`
- **Username:** `admin`
- **Password:** `admin123`

---

## ☁️ Deployment Instructions (Render.com / Railway)

1. Push this repository to your GitHub account.
2. Sign in to **[Render.com](https://render.com)** and create a new **Web Service**.
3. Link your `AarogyaVeda` repository.
4. Set the following build settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click **Deploy Web Service**. Render will assign an instant live HTTPS link!

---

## 👥 Authors & Academic Credits

- **Project Lead & Developer:** **Kavita Vishwakarma**
- **Project Guide:** **Prof. Pritam Karanjkar**
- **Submission:** Final Year Engineering / IT Project (2026)

---

## 📄 License
This project is developed for academic evaluation, healthcare innovation, and open learning purposes.

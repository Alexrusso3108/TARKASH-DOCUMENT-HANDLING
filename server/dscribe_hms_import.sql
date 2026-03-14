-- =============================================================
-- dScribe HMS — Complete PostgreSQL Schema
-- This file gets executed automatically on Docker DB Init
-- =============================================================

-- ─── HOSPITALS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitals (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  address      TEXT,
  city         VARCHAR(100),
  phone        VARCHAR(20),
  email        VARCHAR(100),
  license_no   VARCHAR(100) UNIQUE,
  bed_count    INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS (admin + staff) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150),
  login_id      VARCHAR(60) UNIQUE NOT NULL,   -- e.g. "admin.sunrise" or "DR.001.sunrise"
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30) NOT NULL DEFAULT 'staff',
  -- role values: admin | doctor | nurse | receptionist | lab_tech | pharmacist
  department    VARCHAR(100),
  phone         VARCHAR(20),
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    INTEGER REFERENCES users(id),  -- which admin created this user
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_login     ON users(login_id);
CREATE INDEX IF NOT EXISTS idx_users_hospital  ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users(role);

-- ─── DOCTORS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id            VARCHAR(20) PRIMARY KEY,
  hospital_id   INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  department    VARCHAR(100) NOT NULL,
  qualification VARCHAR(200),
  experience    INTEGER DEFAULT 0,
  rating        NUMERIC(3,1) DEFAULT 5.0,
  status        VARCHAR(30) DEFAULT 'available', -- available | in-consultation | on-leave
  schedule      VARCHAR(100),
  phone         VARCHAR(20),
  email         VARCHAR(100),
  patient_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PATIENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id            VARCHAR(20) PRIMARY KEY,
  hospital_id   INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  age           INTEGER,
  gender        VARCHAR(10),
  blood_group   VARCHAR(5),
  department    VARCHAR(100),
  doctor_id     VARCHAR(20) REFERENCES doctors(id),
  phone         VARCHAR(20),
  status        VARCHAR(30) DEFAULT 'Stable', -- Stable | Critical | Recovering | Under Obs
  admission_type VARCHAR(20) DEFAULT 'OPD',   -- IPD | OPD | Emergency
  admitted_at   TIMESTAMPTZ DEFAULT NOW(),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BEDS (IPD) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beds (
  id            VARCHAR(20) PRIMARY KEY,
  hospital_id   INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
  ward          VARCHAR(50) NOT NULL,
  bed_type      VARCHAR(30),
  status        VARCHAR(20) DEFAULT 'available', -- occupied | available | maintenance | reserved
  patient_id    VARCHAR(20) REFERENCES patients(id),
  doctor_id     VARCHAR(20) REFERENCES doctors(id),
  diagnosis     TEXT,
  admitted_at   DATE,
  has_alert     BOOLEAN DEFAULT FALSE
);

-- ─── OPD VISITS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opd_visits (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id    VARCHAR(20) REFERENCES patients(id),
  doctor_id     VARCHAR(20) REFERENCES doctors(id),
  token         VARCHAR(20),
  department    VARCHAR(100),
  visit_type    VARCHAR(50),  -- New Visit | Follow-up | Emergency
  symptoms      TEXT,
  diagnosis     TEXT,
  prescription  TEXT,
  status        VARCHAR(30) DEFAULT 'Waiting', -- Waiting | In Progress | Completed | Cancelled
  fee           NUMERIC(10,2),
  visit_date    DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLINICAL NOTES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinical_notes (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id    VARCHAR(20) REFERENCES patients(id),
  doctor_id     VARCHAR(20) REFERENCES doctors(id),
  note_type     VARCHAR(100),
  content       TEXT,
  priority      VARCHAR(20) DEFAULT 'low',  -- high | medium | low
  status        VARCHAR(30) DEFAULT 'pending', -- pending | completed
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LAB TESTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_tests (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id    VARCHAR(20) REFERENCES patients(id),
  test_name     VARCHAR(100) NOT NULL,
  category      VARCHAR(100),
  requested_by  VARCHAR(100),
  status        VARCHAR(30) DEFAULT 'Pending', -- Pending | In Progress | Completed
  priority      VARCHAR(20) DEFAULT 'Routine',  -- Urgent | Routine | STAT
  result_notes  TEXT,
  ordered_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- ─── PHARMACY INVENTORY ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id            SERIAL PRIMARY KEY,
  hospital_id   INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
  name          VARCHAR(150) NOT NULL,
  category      VARCHAR(100),
  stock         INTEGER DEFAULT 0,
  unit          VARCHAR(30),
  price         NUMERIC(10,2),
  expiry        DATE,
  manufacturer  VARCHAR(150),
  status        VARCHAR(30) DEFAULT 'In Stock' -- In Stock | Low Stock | Out of Stock
);

-- ─── BILLING ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing (
  id            VARCHAR(20) PRIMARY KEY,
  hospital_id   INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id    VARCHAR(20) REFERENCES patients(id),
  total_amount  NUMERIC(12,2),
  paid_amount   NUMERIC(12,2) DEFAULT 0,
  status        VARCHAR(30) DEFAULT 'Pending',   -- Paid | Pending | Partial | Overdue
  payment_method VARCHAR(50),
  type          VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_status   ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_type     ON patients(admission_type);
CREATE INDEX IF NOT EXISTS idx_beds_status       ON beds(status);
CREATE INDEX IF NOT EXISTS idx_beds_ward         ON beds(ward);
CREATE INDEX IF NOT EXISTS idx_opd_date          ON opd_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_notes_status      ON clinical_notes(status);
CREATE INDEX IF NOT EXISTS idx_lab_status        ON lab_tests(status);

-- =============================================================
-- dScribe HMS — PostgreSQL Import File (Schema + Seed Data)
-- Run this file once to set up all tables and dummy data
-- =============================================================

-- Drop tables if re-running (safe to re-run)
DROP TABLE IF EXISTS clinical_notes CASCADE;
DROP TABLE IF EXISTS opd_visits CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS pharmacy_inventory CASCADE;
DROP TABLE IF EXISTS lab_tests CASCADE;
DROP TABLE IF EXISTS billing CASCADE;

-- ─── DOCTORS ────────────────────────────────────────────────
CREATE TABLE doctors (
  id            VARCHAR(20) PRIMARY KEY,
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
CREATE TABLE patients (
  id            VARCHAR(20) PRIMARY KEY,
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
CREATE TABLE beds (
  id            VARCHAR(20) PRIMARY KEY,
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
CREATE TABLE opd_visits (
  id            SERIAL PRIMARY KEY,
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
CREATE TABLE clinical_notes (
  id            SERIAL PRIMARY KEY,
  patient_id    VARCHAR(20) REFERENCES patients(id),
  doctor_id     VARCHAR(20) REFERENCES doctors(id),
  note_type     VARCHAR(100),
  content       TEXT,
  priority      VARCHAR(20) DEFAULT 'low',  -- high | medium | low
  status        VARCHAR(30) DEFAULT 'pending', -- pending | completed
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LAB TESTS ──────────────────────────────────────────────
CREATE TABLE lab_tests (
  id            SERIAL PRIMARY KEY,
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
CREATE TABLE pharmacy_inventory (
  id            SERIAL PRIMARY KEY,
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
CREATE TABLE billing (
  id            VARCHAR(20) PRIMARY KEY,
  patient_id    VARCHAR(20) REFERENCES patients(id),
  total_amount  NUMERIC(12,2),
  paid_amount   NUMERIC(12,2) DEFAULT 0,
  status        VARCHAR(30) DEFAULT 'Pending',   -- Paid | Pending | Partial | Overdue
  payment_method VARCHAR(50),
  type          VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_patients_status   ON patients(status);
CREATE INDEX idx_patients_type     ON patients(admission_type);
CREATE INDEX idx_beds_status       ON beds(status);
CREATE INDEX idx_beds_ward         ON beds(ward);
CREATE INDEX idx_opd_date          ON opd_visits(visit_date);
CREATE INDEX idx_notes_status      ON clinical_notes(status);
CREATE INDEX idx_lab_status        ON lab_tests(status);

-- =============================================================
-- ─── SEED DATA / DUMMY DATA FOR IMPORT ───────────────────────
-- =============================================================

INSERT INTO doctors (id, name, department, qualification, experience, rating, status, phone, email) VALUES
('DOC-001', 'Dr. Alice Smith', 'Cardiology', 'MD, FACC', 15, 4.8, 'available', '123-456-7890', 'alice.smith@hospital.com'),
('DOC-002', 'Dr. Bob Jones', 'Neurology', 'MD, PhD', 10, 4.9, 'in-consultation', '123-456-7891', 'bob.jones@hospital.com'),
('DOC-003', 'Dr. Carol White', 'Orthopedics', 'MS', 8, 4.5, 'available', '123-456-7892', 'carol.white@hospital.com'),
('DOC-004', 'Dr. David Brown', 'Pediatrics', 'MD', 12, 4.7, 'on-leave', '123-456-7893', 'david.brown@hospital.com');

INSERT INTO patients (id, name, age, gender, blood_group, department, doctor_id, phone, status, admission_type) VALUES
('PAT-001', 'John Doe', 45, 'Male', 'O+', 'Cardiology', 'DOC-001', '555-0101', 'Stable', 'OPD'),
('PAT-002', 'Jane Roe', 32, 'Female', 'A-', 'Neurology', 'DOC-002', '555-0102', 'Critical', 'IPD'),
('PAT-003', 'Sam Brown', 28, 'Male', 'B+', 'Orthopedics', 'DOC-003', '555-0103', 'Recovering', 'Emergency'),
('PAT-004', 'Emily Davis', 8, 'Female', 'O-', 'Pediatrics', 'DOC-004', '555-0104', 'Stable', 'OPD');

INSERT INTO beds (id, ward, bed_type, status, patient_id, doctor_id, diagnosis, admitted_at, has_alert) VALUES
('BED-101', 'ICU', 'ICU', 'occupied', 'PAT-002', 'DOC-002', 'Severe Migraine/Neurological check', '2023-10-01', TRUE),
('BED-102', 'ICU', 'ICU', 'available', NULL, NULL, NULL, NULL, FALSE),
('BED-201', 'General', 'Normal', 'available', NULL, NULL, NULL, NULL, FALSE),
('BED-202', 'Emergency', 'Normal', 'occupied', 'PAT-003', 'DOC-003', 'Fractured arm', '2023-10-02', FALSE);

INSERT INTO opd_visits (patient_id, doctor_id, token, department, visit_type, symptoms, diagnosis, prescription, status, fee) VALUES
('PAT-001', 'DOC-001', 'TKN-001', 'Cardiology', 'New Visit', 'Chest pain', 'Angina', 'Aspirin, rest', 'Completed', 500.00),
('PAT-003', 'DOC-003', 'TKN-002', 'Orthopedics', 'Emergency', 'Severe arm pain', 'Radius fracture', 'Cast, Painkillers', 'In Progress', 1000.00),
('PAT-004', 'DOC-004', 'TKN-003', 'Pediatrics', 'Follow-up', 'Mild fever', 'Viral fever', 'Paracetamol', 'Waiting', 300.00);

INSERT INTO clinical_notes (patient_id, doctor_id, note_type, content, priority, status) VALUES
('PAT-002', 'DOC-002', 'Daily Round', 'Patient is stable but requires continuous monitoring. Pain is managed.', 'high', 'completed'),
('PAT-001', 'DOC-001', 'Follow-up', 'Patient reported reduced chest pain. Continue current medication.', 'medium', 'pending'),
('PAT-003', 'DOC-003', 'Surgical Consult', 'Patient fracture requires minor surgery setup. Prep for tomorrow.', 'high', 'pending');

INSERT INTO lab_tests (patient_id, test_name, category, requested_by, status, priority, result_notes) VALUES
('PAT-001', 'ECG', 'Cardiology', 'Dr. Alice Smith', 'Completed', 'Routine', 'Normal sinus rhythm'),
('PAT-002', 'MRI Brain', 'Imaging', 'Dr. Bob Jones', 'Pending', 'Urgent', NULL),
('PAT-003', 'X-Ray Right Arm', 'Imaging', 'Dr. Carol White', 'Completed', 'STAT', 'Clear fracture on distal radius');

INSERT INTO pharmacy_inventory (name, category, stock, unit, price, expiry, manufacturer, status) VALUES
('Paracetamol 500mg', 'Painkillers', 1000, 'Tablet', 2.00, '2025-12-31', 'PharmaCorp', 'In Stock'),
('Aspirin', 'Cardiology', 500, 'Tablet', 5.00, '2026-06-30', 'HealthMeds', 'In Stock'),
('Amoxicillin', 'Antibiotic', 50, 'Capsule', 15.00, '2024-10-15', 'CureAll', 'Low Stock'),
('Ibuprofen', 'Painkillers', 0, 'Tablet', 4.00, '2025-01-01', 'PainAway', 'Out of Stock');

INSERT INTO billing (id, patient_id, total_amount, paid_amount, status, payment_method, type) VALUES
('INV-001', 'PAT-001', 505.00, 505.00, 'Paid', 'Credit Card', 'OPD'),
('INV-002', 'PAT-002', 2500.00, 500.00, 'Partial', 'Cash', 'IPD'),
('INV-003', 'PAT-003', 1000.00, 0.00, 'Pending', NULL, 'Emergency');

// seed.js — populates PostgreSQL with the same mock data currently shown in the UI
import 'dotenv/config'
import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'dscribe_hms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // ── DOCTORS ──────────────────────────────
    const doctors = [
      { id: 'D-001', name: 'Dr. Rajiv Mehta', dept: 'Internal Medicine', qual: 'MBBS, MD (Internal Medicine)', exp: 18, patients: 142, rating: 4.9, status: 'available', schedule: 'Mon–Fri, 9AM–5PM', phone: '98765 10001', email: 'r.mehta@dscribe.in' },
      { id: 'D-002', name: 'Dr. Priya Sharma', dept: 'Cardiology', qual: 'MBBS, DM (Cardiology)', exp: 14, patients: 118, rating: 4.8, status: 'in-consultation', schedule: 'Mon–Sat, 10AM–6PM', phone: '98765 10002', email: 'p.sharma@dscribe.in' },
      { id: 'D-003', name: 'Dr. Meena Kapoor', dept: 'Obs & Gyn', qual: 'MBBS, MS (OBG)', exp: 21, patients: 203, rating: 4.9, status: 'available', schedule: 'Tue–Sat, 8AM–4PM', phone: '98765 10003', email: 'm.kapoor@dscribe.in' },
      { id: 'D-004', name: 'Dr. Suresh Pillai', dept: 'Orthopaedics', qual: 'MBBS, MS (Ortho)', exp: 16, patients: 95, rating: 4.7, status: 'on-leave', schedule: 'Mon–Fri, 11AM–7PM', phone: '98765 10004', email: 's.pillai@dscribe.in' },
      { id: 'D-005', name: 'Dr. Anirban Bose', dept: 'Neurology', qual: 'MBBS, DM (Neurology)', exp: 12, patients: 87, rating: 4.8, status: 'available', schedule: 'Mon–Thu, 9AM–5PM', phone: '98765 10005', email: 'a.bose@dscribe.in' },
      { id: 'D-006', name: 'Dr. Krishnan Reddy', dept: 'General Medicine', qual: 'MBBS, MD', exp: 9, patients: 176, rating: 4.6, status: 'in-consultation', schedule: 'Mon–Sat, 9AM–6PM', phone: '98765 10006', email: 'k.reddy@dscribe.in' },
      { id: 'D-007', name: 'Dr. Nidhi Singh', dept: 'Endocrinology', qual: 'MBBS, DM (Endo)', exp: 10, patients: 64, rating: 4.7, status: 'available', schedule: 'Wed–Sun, 10AM–5PM', phone: '98765 10007', email: 'n.singh@dscribe.in' },
      { id: 'D-008', name: 'Dr. Subhash Ghosh', dept: 'Nephrology', qual: 'MBBS, DM (Nephrology)', exp: 15, patients: 79, rating: 4.8, status: 'available', schedule: 'Mon–Fri, 8AM–4PM', phone: '98765 10008', email: 's.ghosh@dscribe.in' },
      { id: 'D-009', name: 'Dr. Ramesh Gupta', dept: 'Oncology', qual: 'MBBS, MD (Oncology)', exp: 20, patients: 58, rating: 4.9, status: 'in-consultation', schedule: 'Mon–Fri, 10AM–6PM', phone: '98765 10009', email: 'r.gupta@dscribe.in' },
    ]
    for (const d of doctors) {
      await client.query(
        `INSERT INTO doctors (id,name,department,qualification,experience,patient_count,rating,status,schedule,phone,email)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [d.id, d.name, d.dept, d.qual, d.exp, d.patients, d.rating, d.status, d.schedule, d.phone, d.email]
      )
    }

    // ── PATIENTS ──────────────────────────────
    const patients = [
      { id: 'P-4821', name: 'Priya Kapoor', age: 42, gender: 'Female', blood: 'O+', dept: 'ICU', doctorId: 'D-001', phone: '98120 44312', status: 'Critical', type: 'IPD', notes: 'Septic Shock' },
      { id: 'P-4820', name: 'Rahul Verma', age: 67, gender: 'Male', blood: 'A+', dept: 'Cardiology', doctorId: 'D-002', phone: '97340 11823', status: 'Stable', type: 'IPD', notes: 'Acute MI' },
      { id: 'P-4819', name: 'Sunita Singh', age: 34, gender: 'Female', blood: 'B+', dept: 'Obs & Gyn', doctorId: 'D-003', phone: '99001 77234', status: 'Recovering', type: 'IPD', notes: 'High Risk Pregnancy' },
      { id: 'P-4818', name: 'Arun Nair', age: 58, gender: 'Male', blood: 'AB-', dept: 'Orthopaedics', doctorId: 'D-004', phone: '98765 43210', status: 'Stable', type: 'IPD', notes: 'Fracture post-op' },
      { id: 'P-4817', name: 'Meera Joshi', age: 29, gender: 'Female', blood: 'O-', dept: 'Neurology', doctorId: 'D-005', phone: '91234 56789', status: 'Under Obs', type: 'IPD', notes: 'Seizure Disorder' },
      { id: 'P-4816', name: 'Suresh Rao', age: 71, gender: 'Male', blood: 'A-', dept: 'General Ward', doctorId: 'D-006', phone: '97890 12345', status: 'Stable', type: 'IPD', notes: 'Pneumonia' },
      { id: 'P-4815', name: 'Anita Patel', age: 45, gender: 'Female', blood: 'B-', dept: 'Oncology', doctorId: 'D-009', phone: '96321 54789', status: 'Critical', type: 'IPD', notes: 'Stage 3 Breast Cancer' },
      { id: 'P-4814', name: 'Vikram Kumar', age: 39, gender: 'Male', blood: 'O+', dept: 'General Ward', doctorId: 'D-006', phone: '94567 23890', status: 'Recovering', type: 'OPD', notes: 'Typhoid' },
      { id: 'P-4813', name: 'Kavita Sharma', age: 52, gender: 'Female', blood: 'AB+', dept: 'Endocrinology', doctorId: 'D-007', phone: '99234 78012', status: 'Stable', type: 'OPD', notes: 'Diabetes follow-up' },
      { id: 'P-4812', name: 'Ranjit Das', age: 63, gender: 'Male', blood: 'B+', dept: 'Nephrology', doctorId: 'D-008', phone: '97123 45678', status: 'Under Obs', type: 'OPD', notes: 'CKD stage 3' },
    ]
    for (const p of patients) {
      await client.query(
        `INSERT INTO patients (id,name,age,gender,blood_group,department,doctor_id,phone,status,admission_type,admitted_at,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.age, p.gender, p.blood, p.dept, p.doctorId, p.phone, p.status, p.type, p.notes]
      )
    }

    // ── BEDS ──────────────────────────────────
    const beds = [
      { id: 'ICU-01', ward: 'ICU', type: 'ICU', status: 'occupied', patientId: 'P-4821', doctorId: 'D-001', diagnosis: 'Septic Shock', alert: true },
      { id: 'ICU-02', ward: 'ICU', type: 'ICU', status: 'occupied', patientId: null, doctorId: 'D-001', diagnosis: 'Respiratory Failure', alert: false },
      { id: 'ICU-03', ward: 'ICU', type: 'ICU', status: 'available', patientId: null, doctorId: null, diagnosis: null, alert: false },
      { id: 'ICU-04', ward: 'ICU', type: 'ICU', status: 'maintenance', patientId: null, doctorId: null, diagnosis: null, alert: false },
      { id: 'GW-01', ward: 'General', type: 'General', status: 'occupied', patientId: 'P-4816', doctorId: 'D-006', diagnosis: 'Pneumonia', alert: false },
      { id: 'GW-02', ward: 'General', type: 'General', status: 'occupied', patientId: 'P-4814', doctorId: 'D-006', diagnosis: 'Typhoid', alert: false },
      { id: 'GW-03', ward: 'General', type: 'General', status: 'available', patientId: null, doctorId: null, diagnosis: null, alert: false },
      { id: 'GW-04', ward: 'General', type: 'General', status: 'available', patientId: null, doctorId: null, diagnosis: null, alert: false },
      { id: 'GW-05', ward: 'General', type: 'General', status: 'occupied', patientId: null, doctorId: 'D-006', diagnosis: 'Appendicitis (Post-op)', alert: false },
      { id: 'CARD-01', ward: 'Cardiology', type: 'Speciality', status: 'occupied', patientId: 'P-4820', doctorId: 'D-002', diagnosis: 'Acute MI', alert: false },
      { id: 'CARD-02', ward: 'Cardiology', type: 'Speciality', status: 'available', patientId: null, doctorId: null, diagnosis: null, alert: false },
      { id: 'OBS-01', ward: 'Obs & Gyn', type: 'Speciality', status: 'occupied', patientId: 'P-4819', doctorId: 'D-003', diagnosis: 'High Risk Pregnancy', alert: false },
      { id: 'OBS-02', ward: 'Obs & Gyn', type: 'Speciality', status: 'available', patientId: null, doctorId: null, diagnosis: null, alert: false },
      { id: 'NEURO-01', ward: 'Neurology', type: 'Speciality', status: 'occupied', patientId: 'P-4817', doctorId: 'D-005', diagnosis: 'Seizure Disorder', alert: false },
      { id: 'NEURO-02', ward: 'Neurology', type: 'Speciality', status: 'reserved', patientId: null, doctorId: null, diagnosis: null, alert: false },
    ]
    for (const b of beds) {
      await client.query(
        `INSERT INTO beds (id,ward,bed_type,status,patient_id,doctor_id,diagnosis,has_alert)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [b.id, b.ward, b.type, b.status, b.patientId, b.doctorId, b.diagnosis, b.alert]
      )
    }

    // ── OPD VISITS ────────────────────────────
    const opd = [
      { pid: 'P-4821', did: 'D-001', token: 'T-001', dept: 'ICU', vtype: 'Emergency', symptoms: 'High fever, low BP', status: 'In Progress', fee: 500 },
      { pid: 'P-4820', did: 'D-002', token: 'T-002', dept: 'Cardiology', vtype: 'Follow-up', symptoms: 'Chest pain', status: 'Waiting', fee: 800 },
      { pid: 'P-4819', did: 'D-003', token: 'T-003', dept: 'Obs & Gyn', vtype: 'New Visit', symptoms: 'Nausea, vomiting', status: 'Completed', fee: 600 },
      { pid: 'P-4818', did: 'D-004', token: 'T-004', dept: 'Orthopaedics', vtype: 'Follow-up', symptoms: 'Joint pain', status: 'Waiting', fee: 700 },
      { pid: 'P-4813', did: 'D-007', token: 'T-005', dept: 'Endocrinology', vtype: 'Follow-up', symptoms: 'Blood sugar high', status: 'Completed', fee: 450 },
      { pid: 'P-4812', did: 'D-008', token: 'T-006', dept: 'Nephrology', vtype: 'Follow-up', symptoms: 'Swollen legs', status: 'In Progress', fee: 900 },
    ]
    for (const o of opd) {
      await client.query(
        `INSERT INTO opd_visits (patient_id,doctor_id,token,department,visit_type,symptoms,status,fee)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [o.pid, o.did, o.token, o.dept, o.vtype, o.symptoms, o.status, o.fee]
      )
    }

    // ── CLINICAL NOTES ────────────────────────
    const notes = [
      { pid: 'P-4821', did: 'D-001', type: 'ICU Progress Note', content: 'Patient deteriorating. Adjusting vasopressors.', priority: 'high', status: 'pending' },
      { pid: 'P-4818', did: 'D-004', type: 'Post-Op Assessment', content: 'ROM improving. Pain managed with NSAIDs.', priority: 'medium', status: 'pending' },
      { pid: 'P-4820', did: 'D-002', type: 'Cardiology Review', content: 'ECG shows sinus rhythm. Continue statins.', priority: 'low', status: 'pending' },
      { pid: 'P-4819', did: 'D-003', type: 'Obs Progress Note', content: 'BP 130/85. Foetal heartbeat normal.', priority: 'low', status: 'completed' },
    ]
    for (const n of notes) {
      await client.query(
        `INSERT INTO clinical_notes (patient_id,doctor_id,note_type,content,priority,status)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [n.pid, n.did, n.type, n.content, n.priority, n.status]
      )
    }

    // ── LAB TESTS ─────────────────────────────
    const labs = [
      { pid: 'P-4821', test: 'Complete Blood Count', cat: 'Haematology', req: 'Dr. Mehta', status: 'In Progress', priority: 'Urgent' },
      { pid: 'P-4820', test: 'Troponin I', cat: 'Biochemistry', req: 'Dr. Sharma', status: 'Completed', priority: 'STAT' },
      { pid: 'P-4819', test: 'ANC Count', cat: 'Haematology', req: 'Dr. Kapoor', status: 'Pending', priority: 'Routine' },
      { pid: 'P-4817', test: 'EEG Report', cat: 'Neurology', req: 'Dr. Bose', status: 'Pending', priority: 'Urgent' },
      { pid: 'P-4812', test: 'Serum Creatinine', cat: 'Biochemistry', req: 'Dr. Ghosh', status: 'Completed', priority: 'Routine' },
    ]
    for (const l of labs) {
      await client.query(
        `INSERT INTO lab_tests (patient_id,test_name,category,requested_by,status,priority)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [l.pid, l.test, l.cat, l.req, l.status, l.priority]
      )
    }

    // ── PHARMACY ──────────────────────────────
    const meds = [
      { name: 'Paracetamol 500mg', cat: 'Analgesic', stock: 1200, unit: 'Tablet', price: 1.50, expiry: '2026-12-01', mfr: 'Sun Pharma', status: 'In Stock' },
      { name: 'Amoxicillin 250mg', cat: 'Antibiotic', stock: 45, unit: 'Capsule', price: 8.00, expiry: '2026-08-01', mfr: 'Cipla', status: 'Low Stock' },
      { name: 'Metformin 500mg', cat: 'Antidiabetic', stock: 600, unit: 'Tablet', price: 3.20, expiry: '2027-03-01', mfr: 'Dr. Reddys', status: 'In Stock' },
      { name: 'Atorvastatin 10mg', cat: 'Statin', stock: 0, unit: 'Tablet', price: 12.50, expiry: '2025-11-01', mfr: 'Lupin', status: 'Out of Stock' },
      { name: 'IV Normal Saline', cat: 'IV Fluid', stock: 220, unit: 'Bag', price: 45.00, expiry: '2026-06-01', mfr: 'Baxter', status: 'In Stock' },
      { name: 'Insulin Glargine', cat: 'Antidiabetic', stock: 18, unit: 'Vial', price: 320.00, expiry: '2026-04-01', mfr: 'Sanofi', status: 'Low Stock' },
    ]
    for (const m of meds) {
      await client.query(
        `INSERT INTO pharmacy_inventory (name,category,stock,unit,price,expiry,manufacturer,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [m.name, m.cat, m.stock, m.unit, m.price, m.expiry, m.mfr, m.status]
      )
    }

    // ── BILLING ───────────────────────────────
    const bills = [
      { id: 'INV-4821', pid: 'P-4821', total: 28500, paid: 0, status: 'Pending', method: null, type: 'IPD Admission' },
      { id: 'INV-4820', pid: 'P-4820', total: 15200, paid: 15200, status: 'Paid', method: 'Card', type: 'IPD Admission' },
      { id: 'INV-4819', pid: 'P-4819', total: 22000, paid: 10000, status: 'Partial', method: 'UPI', type: 'IPD Admission' },
      { id: 'INV-4813', pid: 'P-4813', total: 1800, paid: 1800, status: 'Paid', method: 'Cash', type: 'OPD Consultation' },
      { id: 'INV-4812', pid: 'P-4812', total: 4500, paid: 0, status: 'Overdue', method: null, type: 'OPD + Labs' },
    ]
    for (const b of bills) {
      await client.query(
        `INSERT INTO billing (id,patient_id,total_amount,paid_amount,status,payment_method,type)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [b.id, b.pid, b.total, b.paid, b.status, b.method, b.type]
      )
    }

    await client.query('COMMIT')
    console.log('✅  Seed data inserted successfully!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌  Seed failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()

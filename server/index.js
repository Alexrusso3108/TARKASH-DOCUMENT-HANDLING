// index.js — dScribe HMS Express API Server
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pkg from 'pg'
const { Pool } = pkg
import authRouter, { setPool as setAuthPool, requireAuth } from './auth.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
// Built-in lightweight PDF text extractor (no npm package needed)
function extractTextFromPdf(buffer) {
  const str = buffer.toString('latin1')
  const lines = []
  // Extract strings from BT...ET blocks (text object markers)
  const btEt = /BT[\s\S]*?ET/g
  let match
  while ((match = btEt.exec(str)) !== null) {
    // Pull parenthesis-delimited strings: (hello world)
    const paren = /\(([^)]{1,300})\)/g
    let m2
    while ((m2 = paren.exec(match[0])) !== null) {
      const t = m2[1].replace(/\\n/g,'\n').replace(/\\r/g,'').replace(/\\t/g,' ').replace(/\\\\/g,'\\').trim()
      if (t.length > 1) lines.push(t)
    }
    // Also pull hex strings: <48656c6c6f>
    const hex = /<([0-9a-fA-F]{4,})>/g
    while ((m2 = hex.exec(match[0])) !== null) {
      const h = m2[1]
      let t2 = ''
      for (let i = 0; i < h.length - 1; i += 2) t2 += String.fromCharCode(parseInt(h.slice(i,i+2),16))
      t2 = t2.replace(/[\x00-\x1f\x7f]/g,'').trim()
      if (t2.length > 1) lines.push(t2)
    }
  }
  return lines.join('\n')
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'forms')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  },
})
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed'))
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
})

// ─── DB ──────────────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'dscribe_hms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

async function initDB() {
  let retries = 10
  let c
  while (retries > 0) {
    try {
      c = await pool.connect()
      console.log('✅  PostgreSQL connected')
      break
    } catch (e) {
      console.error(`❌  DB connection failed: ${e.message}, retrying in 3 seconds...`)
      retries--
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  if (!c) {
    console.error('💥 FATAL: Could not connect to DB.')
    return
  }

  try {
    // 1. Run the main schema creation file safely
    const importSql = fs.readFileSync(path.join(__dirname, 'dscribe_hms_import.sql'), 'utf-8')
    await c.query(importSql)

    // 2. Run forms / alterations
    const safeMigrations = [
      `DO $m$ BEGIN ALTER TABLE patients ADD COLUMN hospital_id INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `DO $m$ BEGIN ALTER TABLE doctors ADD COLUMN hospital_id INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `DO $m$ BEGIN ALTER TABLE doctors ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `DO $m$ BEGIN ALTER TABLE beds ADD COLUMN hospital_id INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `DO $m$ BEGIN ALTER TABLE opd_visits ADD COLUMN hospital_id INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `DO $m$ BEGIN ALTER TABLE clinical_notes ADD COLUMN hospital_id INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `DO $m$ BEGIN ALTER TABLE lab_tests ADD COLUMN hospital_id INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `DO $m$ BEGIN ALTER TABLE pharmacy_inventory ADD COLUMN hospital_id INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `DO $m$ BEGIN ALTER TABLE billing ADD COLUMN hospital_id INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `CREATE TABLE IF NOT EXISTS form_templates (
        id          SERIAL PRIMARY KEY,
        hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
        name        VARCHAR(200) NOT NULL,
        description TEXT,
        category    VARCHAR(100) DEFAULT 'General',
        file_path   VARCHAR(500) NOT NULL,
        file_name   VARCHAR(300) NOT NULL,
        file_size   INTEGER,
        page_count  INTEGER DEFAULT 1,
        is_active   BOOLEAN DEFAULT TRUE,
        created_by  VARCHAR(100),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )`,
      `DO $m$ BEGIN ALTER TABLE form_templates ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN NULL; END $m$`,
      `CREATE TABLE IF NOT EXISTS patient_forms (
        id              SERIAL PRIMARY KEY,
        template_id     INTEGER REFERENCES form_templates(id) ON DELETE CASCADE,
        patient_id      VARCHAR(20) REFERENCES patients(id) ON DELETE CASCADE,
        annotations     JSONB DEFAULT '[]',
        status          VARCHAR(30) DEFAULT 'blank',
        filled_by       VARCHAR(100),
        notes           TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_patient_forms_patient ON patient_forms(patient_id)`,
      `CREATE INDEX IF NOT EXISTS idx_patient_forms_template ON patient_forms(template_id)`,
      `CREATE INDEX IF NOT EXISTS idx_form_templates_hospital ON form_templates(hospital_id)`,

      // Result PDF column for lab tests
      `ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS result_pdf_path TEXT`,

      // Radiology orders table
      `CREATE TABLE IF NOT EXISTS radiology_orders (
        id                SERIAL PRIMARY KEY,
        hospital_id       INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
        patient_id        VARCHAR(20) REFERENCES patients(id),
        study_type        VARCHAR(100) NOT NULL,
        modality          VARCHAR(50),
        body_part         VARCHAR(100),
        requested_by      VARCHAR(100),
        clinical_indication TEXT,
        priority          VARCHAR(20) DEFAULT 'Routine',
        status            VARCHAR(30) DEFAULT 'Scheduled',
        radiologist_notes TEXT,
        result_pdf_path   TEXT,
        ordered_at        TIMESTAMPTZ DEFAULT NOW(),
        completed_at      TIMESTAMPTZ
      )`,
      `CREATE INDEX IF NOT EXISTS idx_radiology_hospital ON radiology_orders(hospital_id)`,
      `CREATE INDEX IF NOT EXISTS idx_radiology_status   ON radiology_orders(status)`,

      // Discharge Summary Templates (rich-text, hospital-scoped)
      `CREATE TABLE IF NOT EXISTS discharge_summary_templates (
        id          SERIAL PRIMARY KEY,
        hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
        name        VARCHAR(200) NOT NULL,
        type        VARCHAR(100) DEFAULT 'General',
        description TEXT,
        content     TEXT NOT NULL DEFAULT '',
        is_active   BOOLEAN DEFAULT TRUE,
        created_by  INTEGER REFERENCES users(id),
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )`,
      `ALTER TABLE discharge_summary_templates ADD COLUMN IF NOT EXISTS file_name  TEXT`,
      `ALTER TABLE discharge_summary_templates ADD COLUMN IF NOT EXISTS file_size  INTEGER`,
      `ALTER TABLE discharge_summary_templates ADD COLUMN IF NOT EXISTS file_path  TEXT`,

      `CREATE TABLE IF NOT EXISTS patient_discharge_summaries (
        id              SERIAL PRIMARY KEY,
        template_id     INTEGER REFERENCES discharge_summary_templates(id) ON DELETE CASCADE,
        patient_id      VARCHAR(20) REFERENCES patients(id) ON DELETE CASCADE,
        annotations     JSONB DEFAULT '[]',
        status          VARCHAR(30) DEFAULT 'blank',
        filled_by       VARCHAR(100),
        notes           TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_patient_ds_patient ON patient_discharge_summaries(patient_id)`,
      `CREATE INDEX IF NOT EXISTS idx_patient_ds_template ON patient_discharge_summaries(template_id)`,
    ]
    for (const sql of safeMigrations) {
      await c.query(sql)
    }
    console.log('✅  All tables ready with hospital scoping')
  } catch (e) {
    console.error('❌  DB Init failed:', e.message)
  } finally {
    c.release()
  }
}

initDB()

// Share pool with auth module
setAuthPool(pool)

// ─── APP ─────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// ─────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)

// ─────────────────────────────────────────────────────────────
// HOSPITAL PROFILE
// ─────────────────────────────────────────────────────────────

app.get('/api/hospital', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM hospitals WHERE id = $1', [req.user.hospitalId])
    if (!rows.length) return res.status(404).json({ error: 'Hospital not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/hospital', requireAuth, async (req, res) => {
  try {
    const allowed = ['name', 'address', 'city', 'phone', 'email', 'license_no', 'bed_count']
    const fields = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    if (!Object.keys(fields).length) return res.status(400).json({ error: 'Nothing to update' })
    const keys = Object.keys(fields)
    const clause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const vals = [req.user.hospitalId, ...keys.map(k => fields[k])]
    const { rows } = await pool.query(
      `UPDATE hospitals SET ${clause} WHERE id = $1 RETURNING *`, vals
    )
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────

// GET /api/patients
app.get('/api/patients', requireAuth, async (req, res) => {
  try {
    const { search = '', filter = 'All' } = req.query
    const hid = req.user.hospitalId
    let query = `
      SELECT p.*, d.name AS doctor_name
      FROM patients p
      LEFT JOIN doctors d ON p.doctor_id = d.id
      WHERE p.hospital_id = $1`
    const params = [hid]

    if (search) {
      params.push(`%${search}%`)
      query += ` AND (p.name ILIKE $${params.length} OR p.id ILIKE $${params.length} OR p.department ILIKE $${params.length})`
    }
    if (filter !== 'All') {
      params.push(filter)
      query += ` AND (p.status = $${params.length} OR p.admission_type = $${params.length})`
    }
    query += ' ORDER BY p.admitted_at DESC'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/patients/:id
app.get('/api/patients/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, d.name AS doctor_name, d.department AS doctor_dept
       FROM patients p LEFT JOIN doctors d ON p.doctor_id = d.id
       WHERE p.id = $1 AND p.hospital_id = $2`,
      [req.params.id, req.user.hospitalId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/patients
app.post('/api/patients', requireAuth, async (req, res) => {
  try {
    const { name, age, gender, blood_group, department, doctor_id, phone, status, admission_type, notes } = req.body
    const hid = req.user.hospitalId
    const { rows: last } = await pool.query(`SELECT id FROM patients ORDER BY created_at DESC LIMIT 1`)
    const lastNum = last.length ? parseInt(last[0].id.replace('P-', '')) : 4800
    const newId = `P-${lastNum + 1}`
    const { rows } = await pool.query(
      `INSERT INTO patients (id,hospital_id,name,age,gender,blood_group,department,doctor_id,phone,status,admission_type,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [newId, hid, name, age, gender, blood_group, department, doctor_id || null, phone, status || 'Stable', admission_type || 'OPD', notes]
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH /api/patients/:id
app.patch('/api/patients/:id', requireAuth, async (req, res) => {
  try {
    const fields = req.body
    const keys = Object.keys(fields)
    if (!keys.length) return res.status(400).json({ error: 'No fields to update' })
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const vals = [req.params.id, ...keys.map(k => fields[k])]
    const { rows } = await pool.query(`UPDATE patients SET ${setClause} WHERE id = $1 AND hospital_id = ${req.user.hospitalId} RETURNING *`, vals)
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/patients/:id
app.delete('/api/patients/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM patients WHERE id = $1 AND hospital_id = $2', [req.params.id, req.user.hospitalId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// DOCTORS
// ─────────────────────────────────────────────────────────────

app.get('/api/doctors', requireAuth, async (req, res) => {
  try {
    const { search = '', status = 'All', dept = 'All' } = req.query
    const hid = req.user.hospitalId
    let query = 'SELECT * FROM doctors WHERE hospital_id = $1'
    const params = [hid]
    if (search) { params.push(`%${search}%`); query += ` AND (name ILIKE $${params.length} OR department ILIKE $${params.length})` }
    if (status !== 'All') { params.push(status); query += ` AND status = $${params.length}` }
    if (dept !== 'All') { params.push(dept); query += ` AND department = $${params.length}` }
    query += ' ORDER BY name'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/doctors/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM doctors WHERE id = $1 AND hospital_id = $2', [req.params.id, req.user.hospitalId])
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/doctors', requireAuth, async (req, res) => {
  try {
    const { name, department, qualification, experience, rating, status, schedule, phone, email } = req.body
    const hid = req.user.hospitalId
    const { rows: last } = await pool.query(`SELECT id FROM doctors ORDER BY id DESC LIMIT 1`)
    const lastNum = last.length ? parseInt(last[0].id.replace('D-', '')) : 0
    const newId = `D-${String(lastNum + 1).padStart(3, '0')}`
    const { rows } = await pool.query(
      `INSERT INTO doctors (id,hospital_id,name,department,qualification,experience,rating,status,schedule,phone,email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [newId, hid, name, department, qualification, experience || 0, rating || 5.0, status || 'available', schedule, phone, email]
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/doctors/:id', requireAuth, async (req, res) => {
  try {
    const fields = req.body
    const keys = Object.keys(fields)
    if (!keys.length) return res.status(400).json({ error: 'No fields to update' })
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const vals = [req.params.id, ...keys.map(k => fields[k])]
    const { rows } = await pool.query(`UPDATE doctors SET ${setClause} WHERE id = $1 AND hospital_id = ${req.user.hospitalId} RETURNING *`, vals)
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/doctors/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM doctors WHERE id = $1 AND hospital_id = $2', [req.params.id, req.user.hospitalId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// BEDS / IPD
// ─────────────────────────────────────────────────────────────

app.get('/api/beds', requireAuth, async (req, res) => {
  try {
    const { ward = 'All', search = '' } = req.query
    const hid = req.user.hospitalId
    let query = `
      SELECT b.*, p.name AS patient_name, p.age, d.name AS doctor_name
      FROM beds b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN doctors  d ON b.doctor_id  = d.id
      WHERE b.hospital_id = $1`
    const params = [hid]
    if (ward !== 'All') { params.push(ward); query += ` AND b.ward = $${params.length}` }
    if (search) { params.push(`%${search}%`); query += ` AND (p.name ILIKE $${params.length} OR b.id ILIKE $${params.length})` }
    query += ' ORDER BY b.id'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/beds/:id', requireAuth, async (req, res) => {
  try {
    const { status, patient_id, doctor_id, diagnosis, has_alert } = req.body
    const { rows } = await pool.query(
      `UPDATE beds SET status=$2, patient_id=$3, doctor_id=$4, diagnosis=$5, has_alert=$6
       WHERE id = $1 AND hospital_id = $7 RETURNING *`,
      [req.params.id, status, patient_id || null, doctor_id || null, diagnosis, has_alert || false, req.user.hospitalId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/beds', requireAuth, async (req, res) => {
  try {
    const { id, ward, bed_type, status } = req.body
    if (!id || !ward) return res.status(400).json({ error: 'Bed ID and Ward are required' })
    const hid = req.user.hospitalId
    // Check duplicate ID within this hospital
    const { rows: existing } = await pool.query('SELECT id FROM beds WHERE id = $1 AND hospital_id = $2', [id, hid])
    if (existing.length) return res.status(409).json({ error: `Bed ID "${id}" already exists` })
    const { rows } = await pool.query(
      `INSERT INTO beds (id, hospital_id, ward, bed_type, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, hid, ward, bed_type || 'General', status || 'available']
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/beds/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT status FROM beds WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.user.hospitalId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    if (rows[0].status === 'occupied') return res.status(400).json({ error: 'Cannot delete an occupied bed. Please discharge the patient first.' })
    await pool.query('DELETE FROM beds WHERE id = $1 AND hospital_id = $2', [req.params.id, req.user.hospitalId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// OPD VISITS
// ─────────────────────────────────────────────────────────────

app.get('/api/opd', requireAuth, async (req, res) => {
  try {
    const { date, status = 'All', search = '' } = req.query
    const hid = req.user.hospitalId
    let query = `
      SELECT o.*, p.name AS patient_name, p.age, p.gender, p.phone, p.blood_group, d.name AS doctor_name
      FROM opd_visits o
      LEFT JOIN patients p ON o.patient_id = p.id
      LEFT JOIN doctors  d ON o.doctor_id  = d.id
      WHERE o.hospital_id = $1`
    const params = [hid]
    if (date) { params.push(date); query += ` AND o.visit_date = $${params.length}` }
    if (status !== 'All') { params.push(status); query += ` AND o.status = $${params.length}` }
    if (search) { params.push(`%${search}%`); query += ` AND (p.name ILIKE $${params.length} OR o.token ILIKE $${params.length})` }
    query += ' ORDER BY o.created_at DESC'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/opd', requireAuth, async (req, res) => {
  try {
    const { patient_id, doctor_id, department, visit_type, symptoms, fee } = req.body
    const hid = req.user.hospitalId
    const { rows: count } = await pool.query(`SELECT COUNT(*) FROM opd_visits WHERE visit_date = CURRENT_DATE AND hospital_id = $1`, [hid])
    const token = `T-${String(parseInt(count[0].count) + 1).padStart(3, '0')}`
    const { rows } = await pool.query(
      `INSERT INTO opd_visits (hospital_id,patient_id,doctor_id,token,department,visit_type,symptoms,fee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [hid, patient_id, doctor_id, token, department, visit_type, symptoms, fee || 0]
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/opd/:id', requireAuth, async (req, res) => {
  try {
    const fields = req.body
    const keys = Object.keys(fields)
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const vals = [req.params.id, ...keys.map(k => fields[k])]
    const { rows } = await pool.query(`UPDATE opd_visits SET ${setClause} WHERE id = $1 AND hospital_id = ${req.user.hospitalId} RETURNING *`, vals)
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// CLINICAL NOTES
// ─────────────────────────────────────────────────────────────

app.get('/api/notes', requireAuth, async (req, res) => {
  try {
    const { status = 'All', priority = 'All', search = '' } = req.query
    const hid = req.user.hospitalId
    let query = `
      SELECT n.*, p.name AS patient_name, d.name AS doctor_name
      FROM clinical_notes n
      LEFT JOIN patients p ON n.patient_id = p.id
      LEFT JOIN doctors  d ON n.doctor_id  = d.id
      WHERE n.hospital_id = $1`
    const params = [hid]
    if (status !== 'All') { params.push(status); query += ` AND n.status = $${params.length}` }
    if (priority !== 'All') { params.push(priority); query += ` AND n.priority = $${params.length}` }
    if (search) { params.push(`%${search}%`); query += ` AND (p.name ILIKE $${params.length} OR n.note_type ILIKE $${params.length})` }
    query += ' ORDER BY n.created_at DESC'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/notes', requireAuth, async (req, res) => {
  try {
    const { patient_id, doctor_id, note_type, content, priority } = req.body
    if (!patient_id || !content) return res.status(400).json({ error: 'Patient and content are required' })
    const { rows } = await pool.query(
      `INSERT INTO clinical_notes (hospital_id, patient_id, doctor_id, note_type, content, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.hospitalId,
        patient_id,
        doctor_id || null,      // empty string → null to avoid FK violation
        note_type || 'Progress Note',
        content,
        priority || 'medium',
      ]
    )
    res.status(201).json(rows[0])
  } catch (e) {
    console.error('POST /api/notes error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/notes/:id', requireAuth, async (req, res) => {
  try {
    const fields = req.body
    const keys = Object.keys(fields)
    if (!keys.length) return res.status(400).json({ error: 'No fields to update' })
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const vals = [req.params.id, ...keys.map(k => fields[k]), req.user.hospitalId]
    const { rows } = await pool.query(
      `UPDATE clinical_notes SET ${setClause} WHERE id = $1 AND hospital_id = $${vals.length} RETURNING *`,
      vals
    )
    if (!rows.length) return res.status(404).json({ error: 'Note not found' })
    res.json(rows[0])
  } catch (e) {
    console.error('PATCH /api/notes error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────
// LABORATORY
// ─────────────────────────────────────────────────────────────

app.get('/api/lab', requireAuth, async (req, res) => {
  try {
    const { status = 'All', priority = 'All', search = '' } = req.query
    const hid = req.user.hospitalId
    let query = `
      SELECT l.*, p.name AS patient_name, p.id AS patient_code
      FROM lab_tests l
      LEFT JOIN patients p ON l.patient_id = p.id
      WHERE l.hospital_id = $1`
    const params = [hid]
    if (status !== 'All') { params.push(status); query += ` AND l.status = $${params.length}` }
    if (priority !== 'All') { params.push(priority); query += ` AND l.priority = $${params.length}` }
    if (search) { params.push(`%${search}%`); query += ` AND (p.name ILIKE $${params.length} OR l.test_name ILIKE $${params.length})` }
    query += ' ORDER BY l.ordered_at DESC'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/lab', requireAuth, async (req, res) => {
  try {
    const { patient_id, test_name, category, requested_by, priority } = req.body
    const { rows } = await pool.query(
      `INSERT INTO lab_tests (hospital_id,patient_id,test_name,category,requested_by,priority)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.hospitalId, patient_id, test_name, category, requested_by, priority || 'Routine']
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/lab/:id', requireAuth, async (req, res) => {
  try {
    const { status, result_notes } = req.body
    const completed = status === 'Completed' ? 'NOW()' : 'NULL'
    const { rows } = await pool.query(
      `UPDATE lab_tests SET status=$2, result_notes=$3, completed_at=${completed} WHERE id=$1 AND hospital_id=${req.user.hospitalId} RETURNING *`,
      [req.params.id, status, result_notes]
    )
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Upload result PDF for a lab test
app.post('/api/lab/:id/upload-result', requireAuth, upload.single('result_pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' })
    const filePath = `/uploads/forms/${req.file.filename}`
    const { rows } = await pool.query(
      `UPDATE lab_tests SET result_pdf_path=$2, status='Completed', completed_at=NOW()
       WHERE id=$1 AND hospital_id=$3 RETURNING *`,
      [req.params.id, filePath, req.user.hospitalId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Lab order not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// RADIOLOGY
// ─────────────────────────────────────────────────────────────

app.get('/api/radiology', requireAuth, async (req, res) => {
  try {
    const { status = 'All', search = '' } = req.query
    const hid = req.user.hospitalId
    let query = `
      SELECT r.*, p.name AS patient_name, p.id AS patient_code
      FROM radiology_orders r
      LEFT JOIN patients p ON r.patient_id = p.id
      WHERE r.hospital_id = $1`
    const params = [hid]
    if (status !== 'All') { params.push(status); query += ` AND r.status = $${params.length}` }
    if (search) { params.push(`%${search}%`); query += ` AND (p.name ILIKE $${params.length} OR r.study_type ILIKE $${params.length})` }
    query += ' ORDER BY r.ordered_at DESC'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/radiology', requireAuth, async (req, res) => {
  try {
    const { patient_id, study_type, modality, body_part, requested_by, priority, clinical_indication } = req.body
    if (!patient_id || !study_type) return res.status(400).json({ error: 'Patient and study type are required' })
    const { rows } = await pool.query(
      `INSERT INTO radiology_orders (hospital_id, patient_id, study_type, modality, body_part, requested_by, priority, clinical_indication)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.hospitalId, patient_id, study_type, modality || '', body_part || '', requested_by || '', priority || 'Routine', clinical_indication || '']
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/radiology/:id', requireAuth, async (req, res) => {
  try {
    const { status, radiologist_notes } = req.body
    const completed = status === 'Reported' ? 'NOW()' : 'NULL'
    const { rows } = await pool.query(
      `UPDATE radiology_orders SET status=$2, radiologist_notes=$3, completed_at=${completed}
       WHERE id=$1 AND hospital_id=${req.user.hospitalId} RETURNING *`,
      [req.params.id, status, radiologist_notes || null]
    )
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Upload result PDF for a radiology order
app.post('/api/radiology/:id/upload-result', requireAuth, upload.single('result_pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' })
    const filePath = `/uploads/forms/${req.file.filename}`
    const { rows } = await pool.query(
      `UPDATE radiology_orders SET result_pdf_path=$2, status='Reported', completed_at=NOW()
       WHERE id=$1 AND hospital_id=$3 RETURNING *`,
      [req.params.id, filePath, req.user.hospitalId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Radiology order not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// DISCHARGE SUMMARY TEMPLATES (admin only, hospital-scoped)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// DISCHARGE SUMMARY TEMPLATES  (hospital-scoped, PDF-based)
// ─────────────────────────────────────────────────────────────

// GET  — list this hospital's discharge templates
app.get('/api/discharge-templates', requireAuth, async (req, res) => {
  try {
    const { category, search } = req.query
    let q = `SELECT * FROM discharge_summary_templates
              WHERE is_active = TRUE AND hospital_id = $1`
    const params = [req.user.hospitalId]
    if (category) { params.push(category); q += ` AND type = $${params.length}` }
    if (search)   { params.push(`%${search}%`); q += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})` }
    q += ' ORDER BY created_at DESC'
    const { rows } = await pool.query(q, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST — upload a PDF discharge template (admin only)
app.post('/api/discharge-templates', requireAuth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' })
    const { name, description, category } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Template name is required' })
    const filePath = `/uploads/forms/${req.file.filename}`
    const { rows } = await pool.query(
      `INSERT INTO discharge_summary_templates
         (hospital_id, name, description, type, file_path, file_name, file_size, content, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'',$8) RETURNING *`,
      [req.user.hospitalId, name.trim(), description || '', category || 'General',
       filePath, req.file.originalname, req.file.size, req.user.userId]
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE — remove a discharge template
app.delete('/api/discharge-templates/:id', requireAuth, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId
    const { rows } = await pool.query(
      'SELECT file_path FROM discharge_summary_templates WHERE id=$1 AND hospital_id=$2',
      [req.params.id, hospitalId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Template not found' })
    // Delete physical file
    const absPath = path.join(__dirname, rows[0].file_path)
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath)
    await pool.query('DELETE FROM discharge_summary_templates WHERE id=$1 AND hospital_id=$2',
      [req.params.id, hospitalId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── INSTANCES (Filled summaries for patients) ───

// GET — get summaries for a patient
app.get('/api/discharge-summaries/patient/:patientId', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ps.*, dt.name AS template_name, dt.type AS category, dt.file_path, dt.file_name, dt.file_size
       FROM patient_discharge_summaries ps
       JOIN discharge_summary_templates dt ON ps.template_id = dt.id
       WHERE ps.patient_id = $1 ORDER BY ps.created_at DESC`,
      [req.params.patientId]
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST — create/assign a summary instance
app.post('/api/discharge-summaries', requireAuth, async (req, res) => {
  try {
    const { template_id, patient_id, filled_by } = req.body
    if (!template_id || !patient_id) return res.status(400).json({ error: 'Missing IDs' })
    const { rows } = await pool.query(
      `INSERT INTO patient_discharge_summaries (template_id, patient_id, filled_by)
       VALUES ($1,$2,$3) RETURNING *`,
      [template_id, patient_id, filled_by || '']
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH — save annotations
app.patch('/api/discharge-summaries/:id', requireAuth, async (req, res) => {
  try {
    const { annotations, status, filled_by, notes } = req.body
    const { rows } = await pool.query(
      `UPDATE patient_discharge_summaries
       SET annotations=$2, status=$3, filled_by=$4, notes=$5, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, JSON.stringify(annotations || []), status || 'blank', filled_by || '', notes || '']
    )
    if (!rows.length) return res.status(404).json({ error: 'Summary instance not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET — get single instance
app.get('/api/discharge-summaries/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ps.*, dt.name AS template_name, dt.type AS category, dt.file_path, dt.file_name, dt.file_size
       FROM patient_discharge_summaries ps
       JOIN discharge_summary_templates dt ON ps.template_id = dt.id
       WHERE ps.id = $1`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Summary not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// PHARMACY
// ─────────────────────────────────────────────────────────────

app.get('/api/pharmacy', requireAuth, async (req, res) => {
  try {
    const { status = 'All', search = '' } = req.query
    const hid = req.user.hospitalId
    let query = 'SELECT * FROM pharmacy_inventory WHERE hospital_id = $1'
    const params = [hid]
    if (status !== 'All') { params.push(status); query += ` AND status = $${params.length}` }
    if (search) { params.push(`%${search}%`); query += ` AND (name ILIKE $${params.length} OR category ILIKE $${params.length})` }
    query += ' ORDER BY name'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/pharmacy', requireAuth, async (req, res) => {
  try {
    const { name, category, stock, unit, price, expiry, manufacturer } = req.body
    const status = stock === 0 ? 'Out of Stock' : stock < 50 ? 'Low Stock' : 'In Stock'
    const { rows } = await pool.query(
      `INSERT INTO pharmacy_inventory (hospital_id,name,category,stock,unit,price,expiry,manufacturer,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.hospitalId, name, category, stock, unit, price, expiry, manufacturer, status]
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/pharmacy/:id', requireAuth, async (req, res) => {
  try {
    const { stock, ...rest } = req.body
    const status = stock !== undefined
      ? (stock === 0 ? 'Out of Stock' : stock < 50 ? 'Low Stock' : 'In Stock')
      : rest.status
    const fields = { ...(stock !== undefined && { stock }), ...rest, status }
    const keys = Object.keys(fields)
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const vals = [req.params.id, ...keys.map(k => fields[k])]
    const { rows } = await pool.query(`UPDATE pharmacy_inventory SET ${setClause} WHERE id = $1 AND hospital_id = ${req.user.hospitalId} RETURNING *`, vals)
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// BILLING
// ─────────────────────────────────────────────────────────────

app.get('/api/billing', requireAuth, async (req, res) => {
  try {
    const { status = 'All', search = '' } = req.query
    const hid = req.user.hospitalId
    let query = `
      SELECT b.*, p.name AS patient_name
      FROM billing b
      LEFT JOIN patients p ON b.patient_id = p.id
      WHERE b.hospital_id = $1`
    const params = [hid]
    if (status !== 'All') { params.push(status); query += ` AND b.status = $${params.length}` }
    if (search) { params.push(`%${search}%`); query += ` AND (p.name ILIKE $${params.length} OR b.id ILIKE $${params.length})` }
    query += ' ORDER BY b.created_at DESC'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/billing', requireAuth, async (req, res) => {
  try {
    const { patient_id, total_amount, paid_amount, payment_method, type } = req.body
    const hid = req.user.hospitalId
    const { rows: last } = await pool.query(`SELECT id FROM billing ORDER BY created_at DESC LIMIT 1`)
    const p = last.length ? parseInt(last[0].id.replace('INV-', '')) : 4800
    const newId = `INV-${p + 1}`
    const status = paid_amount >= total_amount ? 'Paid' : paid_amount > 0 ? 'Partial' : 'Pending'
    const { rows } = await pool.query(
      `INSERT INTO billing (id,hospital_id,patient_id,total_amount,paid_amount,status,payment_method,type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [newId, hid, patient_id, total_amount, paid_amount || 0, status, payment_method, type]
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/billing/:id', requireAuth, async (req, res) => {
  try {
    const fields = req.body
    const keys = Object.keys(fields)
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const vals = [req.params.id, ...keys.map(k => fields[k])]
    const { rows } = await pool.query(`UPDATE billing SET ${setClause} WHERE id = $1 AND hospital_id = ${req.user.hospitalId} RETURNING *`, vals)
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────

app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const hid = req.user.hospitalId
    const [patients, beds, notes, discharges, recent, pendingNotes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM patients WHERE hospital_id=$1`, [hid]),
      pool.query(`SELECT
        COUNT(*) FILTER (WHERE status='occupied')  AS occupied,
        COUNT(*) FILTER (WHERE status='available') AS available,
        COUNT(*)                                    AS total
        FROM beds WHERE hospital_id=$1`, [hid]),
      pool.query(`SELECT COUNT(*) AS pending FROM clinical_notes WHERE status='pending' AND hospital_id=$1`, [hid]),
      pool.query(`SELECT COUNT(*) AS discharged FROM patients WHERE admitted_at::date = CURRENT_DATE AND hospital_id=$1`, [hid]),
      pool.query(`
        SELECT p.id, p.name, p.age, p.department AS dept, d.name AS doctor, p.status, p.admitted_at
        FROM patients p LEFT JOIN doctors d ON p.doctor_id = d.id
        WHERE p.hospital_id=$1 ORDER BY p.admitted_at DESC LIMIT 5`, [hid]),
      pool.query(`
        SELECT n.*, p.name AS patient_name, d.name AS doctor_name
        FROM clinical_notes n
        LEFT JOIN patients p ON n.patient_id = p.id
        LEFT JOIN doctors  d ON n.doctor_id  = d.id
        WHERE n.status = 'pending' AND n.hospital_id=$1 ORDER BY n.created_at LIMIT 5`, [hid]),
    ])
    const bedRow = beds.rows[0]
    const occupancy = bedRow.total > 0 ? Math.round((bedRow.occupied / bedRow.total) * 100) : 0
    res.json({
      totalPatients: parseInt(patients.rows[0].total),
      bedOccupancy: `${occupancy}%`,
      bedDetail: `${bedRow.occupied}/${bedRow.total} beds occupied`,
      pendingNotes: parseInt(notes.rows[0].pending),
      dischargesToday: parseInt(discharges.rows[0].discharged),
      recentPatients: recent.rows,
      pendingNotesList: pendingNotes.rows,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────

app.get('/api/reports', requireAuth, async (req, res) => {
  try {
    const hid = req.user.hospitalId
    const [
      patients, beds, doctors, notes, labOrders, opdToday,
      monthly, departments, billing
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM patients WHERE hospital_id=$1`, [hid]),
      pool.query(`SELECT COUNT(*) FILTER (WHERE status='occupied') AS occupied, COUNT(*) AS total FROM beds WHERE hospital_id=$1`, [hid]),
      pool.query(`SELECT COUNT(*) AS total FROM doctors WHERE hospital_id=$1`, [hid]),
      pool.query(`SELECT COUNT(*) AS pending FROM clinical_notes WHERE status='pending' AND hospital_id=$1`, [hid]),
      pool.query(`SELECT COUNT(*) AS total FROM lab_tests WHERE hospital_id=$1`, [hid]),
      pool.query(`SELECT COUNT(*) AS total FROM opd_visits WHERE visit_date = CURRENT_DATE AND hospital_id=$1`, [hid]),
      pool.query(`
        SELECT TO_CHAR(admitted_at, 'Mon YYYY') AS month, COUNT(*) AS admissions
        FROM patients
        WHERE admitted_at >= NOW() - INTERVAL '6 months' AND hospital_id=$1
        GROUP BY TO_CHAR(admitted_at, 'Mon YYYY'), DATE_TRUNC('month', admitted_at)
        ORDER BY DATE_TRUNC('month', admitted_at)`, [hid]),
      pool.query(`
        SELECT department AS dept, COUNT(*) AS patient_count
        FROM patients WHERE hospital_id=$1
        GROUP BY department ORDER BY patient_count DESC`, [hid]),
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount), 0) AS total,
          COALESCE(SUM(paid_amount), 0) AS paid,
          COALESCE(SUM(total_amount - paid_amount), 0) AS pending
        FROM billing WHERE hospital_id=$1`, [hid]),
    ])
    res.json({
      kpis: {
        totalPatients: parseInt(patients.rows[0].total),
        totalBeds: parseInt(beds.rows[0].total),
        occupiedBeds: parseInt(beds.rows[0].occupied),
        totalDoctors: parseInt(doctors.rows[0].total),
        pendingNotes: parseInt(notes.rows[0].pending),
        labOrders: parseInt(labOrders.rows[0].total),
        opdToday: parseInt(opdToday.rows[0].total),
      },
      monthly: monthly.rows,
      departments: departments.rows,
      billing: billing.rows[0],
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// HOSPITAL FORMS — TEMPLATES
// ─────────────────────────────────────────────────────────────

// Serve uploaded PDFs statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// GET /api/forms/templates — list templates for the logged-in hospital only
app.get('/api/forms/templates', requireAuth, async (req, res) => {
  try {
    const { category = 'All', search = '' } = req.query
    const hospitalId = req.user.hospitalId
    let q = 'SELECT * FROM form_templates WHERE is_active = TRUE AND hospital_id = $1'
    const params = [hospitalId]
    if (category !== 'All') { params.push(category); q += ` AND category = $${params.length}` }
    if (search) { params.push(`%${search}%`); q += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})` }
    q += ' ORDER BY created_at DESC'
    const { rows } = await pool.query(q, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/forms/templates — upload a new form PDF (admin only, tied to their hospital)
app.post('/api/forms/templates', requireAuth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' })
    const { name, description, category } = req.body
    const hospitalId = req.user.hospitalId
    const createdBy = req.user.name
    const filePath = `/uploads/forms/${req.file.filename}`
    const { rows } = await pool.query(
      `INSERT INTO form_templates (hospital_id, name, description, category, file_path, file_name, file_size, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [hospitalId, name || req.file.originalname, description, category || 'General', filePath, req.file.originalname, req.file.size, createdBy]
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/forms/templates/:id — only the owning hospital can delete
app.delete('/api/forms/templates/:id', requireAuth, async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId
    const { rows } = await pool.query(
      'SELECT file_path FROM form_templates WHERE id=$1 AND hospital_id=$2',
      [req.params.id, hospitalId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Template not found or access denied' })
    const fp = path.join(__dirname, rows[0].file_path)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
    await pool.query('DELETE FROM form_templates WHERE id=$1 AND hospital_id=$2', [req.params.id, hospitalId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// HOSPITAL FORMS — PATIENT INSTANCES
// ─────────────────────────────────────────────────────────────

// GET /api/forms/patient/:patientId — get all form instances for a patient
app.get('/api/forms/patient/:patientId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pf.*, ft.name AS template_name, ft.category, ft.file_path, ft.file_name, ft.page_count
       FROM patient_forms pf
       JOIN form_templates ft ON pf.template_id = ft.id
       WHERE pf.patient_id = $1
       ORDER BY pf.created_at DESC`,
      [req.params.patientId]
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/forms/patient — create a form instance for a patient
// Duplicates are allowed: the same template can be assigned multiple times
app.post('/api/forms/patient', async (req, res) => {
  try {
    const { template_id, patient_id, filled_by } = req.body
    const { rows } = await pool.query(
      `INSERT INTO patient_forms (template_id, patient_id, filled_by) VALUES ($1,$2,$3) RETURNING *`,
      [template_id, patient_id, filled_by || '']
    )
    res.status(201).json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PATCH /api/forms/patient/:id — save annotations
app.patch('/api/forms/patient/:id', async (req, res) => {
  try {
    const { annotations, status, notes, filled_by } = req.body
    const { rows } = await pool.query(
      `UPDATE patient_forms
       SET annotations = $2, status = $3, notes = $4, filled_by = $5, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, JSON.stringify(annotations || []), status || 'in-progress', notes, filled_by]
    )
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/forms/patient-instance/:id — get single instance with annotations
app.get('/api/forms/patient-instance/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pf.*, ft.name AS template_name, ft.file_path, ft.page_count
       FROM patient_forms pf JOIN form_templates ft ON pf.template_id = ft.id
       WHERE pf.id = $1`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }))

// ─────────────────────────────────────────────────────────────
// SERVE FRONTEND (PRODUCTION)
// ─────────────────────────────────────────────────────────────
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀  dScribe API running on http://localhost:${PORT}`))

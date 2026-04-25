// auth.js — Authentication routes (register hospital, login, staff management)
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pkg from 'pg'
const { Pool } = pkg

const router = express.Router()

// Pool is passed in from index.js
let pool

export function setPool(p) { pool = p }

// ─── HELPERS ──────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '7d' })
}

/** Generate a login_id like "DR.doctorname.hospitalslug" */
function makeLoginId(role, name, hospitalName) {
  const slug = hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
  const namePart = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  const prefix = { admin: 'ADM', doctor: 'DR', nurse: 'NR', receptionist: 'REC', lab_tech: 'LAB', pharmacist: 'PHR' }[role] || 'STF'
  return `${prefix}.${namePart}.${slug}`
}

// ─── MIDDLEWARE ────────────────────────────────────────────────

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' })
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    next()
  })
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register  — Admin registers a new hospital
// ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { hospitalName, city, address, phone, email, licenseNo, bedCount, adminName, adminEmail, adminPhone, password, logo } = req.body

  if (!hospitalName || !adminName || !password) {
    return res.status(400).json({ error: 'Hospital name, admin name and password are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check duplicate hospital license
    if (licenseNo) {
      const dup = await client.query('SELECT id FROM hospitals WHERE license_no=$1', [licenseNo])
      if (dup.rows.length) return res.status(409).json({ error: 'A hospital with this license number already exists' })
    }

    // Create hospital
    const { rows: [hospital] } = await client.query(
      `INSERT INTO hospitals (name, city, address, phone, email, license_no, bed_count, logo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [hospitalName, city, address, phone, email, licenseNo || null, bedCount || 0, logo || null]
    )

    // Hash password
    const hash = await bcrypt.hash(password, 12)
    let loginId = makeLoginId('admin', adminName, hospitalName)

    // Make unique if clash
    const { rows: clash } = await client.query('SELECT id FROM users WHERE login_id=$1', [loginId])
    if (clash.length) loginId = loginId + Math.floor(Math.random() * 900 + 100)

    // Create admin user
    const { rows: [user] } = await client.query(
      `INSERT INTO users (hospital_id, name, email, login_id, password_hash, role, phone, is_active)
       VALUES ($1,$2,$3,$4,$5,'admin',$6,true) RETURNING id, name, login_id, role, hospital_id`,
      [hospital.id, adminName, adminEmail || null, loginId, hash, adminPhone || null]
    )

    // Update created_by to self
    await client.query('UPDATE users SET created_by=$1 WHERE id=$1', [user.id])

    await client.query('COMMIT')

    const token = signToken({ id: user.id, role: 'admin', hospitalId: hospital.id, name: user.name, loginId: user.login_id })

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, role: 'admin', loginId: user.login_id, hospitalId: hospital.id, hospitalName: hospital.name, hospitalLogo: hospital.logo },
    })
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e)
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { loginId, password } = req.body
  if (!loginId || !password) return res.status(400).json({ error: 'Login ID and password are required' })

  try {
    const { rows } = await pool.query(
      `SELECT u.*, h.name AS hospital_name, h.logo AS hospital_logo
       FROM users u JOIN hospitals h ON u.hospital_id = h.id
       WHERE u.login_id = $1`,
      [loginId.trim()]
    )
    if (!rows.length) return res.status(401).json({ error: 'Invalid login ID or password' })

    const user = rows[0]
    if (!user.is_active) return res.status(403).json({ error: 'This account has been deactivated' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Invalid login ID or password' })

    const token = signToken({ id: user.id, role: user.role, hospitalId: user.hospital_id, name: user.name, loginId: user.login_id })

    res.json({
      token,
      user: {
        id: user.id, name: user.name, role: user.role,
        loginId: user.login_id, department: user.department,
        hospitalId: user.hospital_id, hospitalName: user.hospital_name,
        hospitalLogo: user.hospital_logo
      },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me  — Verify token & return current user
// ─────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.login_id, u.role, u.department, u.phone, u.is_active,
              u.hospital_id, h.name AS hospital_name, h.city, h.logo AS hospital_logo
       FROM users u JOIN hospitals h ON u.hospital_id = h.id
       WHERE u.id = $1`,
      [req.user.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'User not found' })
    const u = rows[0]
    res.json({
      id: u.id, name: u.name, email: u.email, loginId: u.login_id, role: u.role,
      department: u.department, phone: u.phone, isActive: u.is_active,
      hospitalId: u.hospital_id, hospitalName: u.hospital_name, city: u.city,
      hospitalLogo: u.hospital_logo
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────
// GET /api/auth/staff  — Admin: list all staff in their hospital
// ─────────────────────────────────────────────────────────────
router.get('/staff', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, login_id, role, department, phone, is_active, created_at
       FROM users
       WHERE hospital_id = $1 AND role != 'admin'
       ORDER BY created_at DESC`,
      [req.user.hospitalId]
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/auth/staff  — Admin: create a staff login
// ─────────────────────────────────────────────────────────────
router.post('/staff', requireAdmin, async (req, res) => {
  const { name, role, department, phone, email, password, qualification, experience, schedule } = req.body
  if (!name || !role || !password) return res.status(400).json({ error: 'Name, role and password are required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Get hospital name for the login_id slug
    const { rows: [hosp] } = await client.query('SELECT name FROM hospitals WHERE id=$1', [req.user.hospitalId])
    let loginId = makeLoginId(role, name, hosp.name)

    // Make unique if clash
    const { rows: clash } = await client.query('SELECT id FROM users WHERE login_id=$1', [loginId])
    if (clash.length) loginId = loginId + Math.floor(Math.random() * 900 + 100)

    const hash = await bcrypt.hash(password, 12)

    const { rows: [user] } = await client.query(
      `INSERT INTO users (hospital_id, name, email, login_id, password_hash, role, department, phone, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, name, login_id, role, department, phone, email, is_active, created_at`,
      [req.user.hospitalId, name, email || null, loginId, hash, role, department || null, phone || null, req.user.id]
    )

    // If role is doctor, also create a record in the doctors table
    if (role === 'doctor') {
      // Generate a new doctor ID
      const { rows: lastDoc } = await client.query(`SELECT id FROM doctors ORDER BY id DESC LIMIT 1`)
      const lastNum = lastDoc.length ? parseInt(lastDoc[0].id.replace('D-', '')) : 0
      const newDocId = `D-${String(lastNum + 1).padStart(3, '0')}`

      await client.query(
        `INSERT INTO doctors (id, hospital_id, name, department, qualification, experience, status, schedule, phone, email, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,'available',$7,$8,$9,$10)`,
        [newDocId, req.user.hospitalId, name, department || 'General', qualification || '', experience || 0, schedule || '', phone || null, email || null, user.id]
      )
    }

    await client.query('COMMIT')
    res.status(201).json(user)
  } catch (e) {
    await client.query('ROLLBACK')
    if (e.code === '23505') return res.status(409).json({ error: 'A user with this login ID already exists' })
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

// ─────────────────────────────────────────────────────────────
// PATCH /api/auth/staff/:id  — Admin: toggle active / update
// ─────────────────────────────────────────────────────────────
router.patch('/staff/:id', requireAdmin, async (req, res) => {
  const { is_active, password, name, department, phone } = req.body
  const userId = req.params.id

  try {
    // Verify the staff belongs to the same hospital
    const { rows } = await pool.query(
      'SELECT id, role FROM users WHERE id=$1 AND hospital_id=$2', [userId, req.user.hospitalId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Staff member not found' })
    const staffRole = rows[0].role

    const updates = {}
    if (is_active !== undefined) updates.is_active = is_active
    if (name) updates.name = name
    if (department) updates.department = department
    if (phone) updates.phone = phone
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
      updates.password_hash = await bcrypt.hash(password, 12)
    }

    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' })

    const keys = Object.keys(updates)
    const clause = keys.map((k, i) => `${k}=$${i + 2}`).join(',')
    const vals = [userId, ...keys.map(k => updates[k])]

    const { rows: [updated] } = await pool.query(
      `UPDATE users SET ${clause} WHERE id=$1 RETURNING id, name, login_id, role, department, phone, is_active`, vals
    )

    // Sync changes to the doctors table if the staff is a doctor
    if (staffRole === 'doctor') {
      const docUpdates = {}
      if (name) docUpdates.name = name
      if (department) docUpdates.department = department
      if (phone) docUpdates.phone = phone
      if (is_active !== undefined) docUpdates.status = is_active ? 'available' : 'on-leave'

      const docKeys = Object.keys(docUpdates)
      if (docKeys.length) {
        const docClause = docKeys.map((k, i) => `${k}=$${i + 2}`).join(',')
        const docVals = [userId, ...docKeys.map(k => docUpdates[k])]
        await pool.query(`UPDATE doctors SET ${docClause} WHERE user_id=$1`, docVals)
      }
    }

    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/auth/staff/:id  — Admin: permanently remove
// ─────────────────────────────────────────────────────────────
router.delete('/staff/:id', requireAdmin, async (req, res) => {
  try {
    // Also delete the linked doctor record if exists
    await pool.query('DELETE FROM doctors WHERE user_id=$1 AND hospital_id=$2',
      [req.params.id, req.user.hospitalId])
    await pool.query('DELETE FROM users WHERE id=$1 AND hospital_id=$2 AND role!=\'admin\'',
      [req.params.id, req.user.hospitalId])
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router

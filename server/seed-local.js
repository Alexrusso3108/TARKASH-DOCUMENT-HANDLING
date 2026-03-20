// seed-local.js — Creates the deployed hospital + admin user in the LOCAL database
// Run with: node seed-local.js
// This lets you log in locally with the same credentials as the deployed app.
import 'dotenv/config'
import pkg from 'pg'
const { Pool } = pkg
import bcrypt from 'bcryptjs'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'dscribe_hms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

// ── EDIT THESE TO MATCH YOUR DEPLOYED CREDENTIALS ─────────────────────────
const HOSPITAL_NAME = 'Cura Hospital'   // must produce slug "curahospit" (first 10 chars of lowercase, alphanumeric)
const ADMIN_NAME    = 'kishan'          // must produce name part "kishan"
const ADMIN_EMAIL   = 'kishan@curahospital.com'
const PASSWORD      = '123456'
// Generated login_id will be: ADM.kishan.curahospit  ← must match what you're typing
// ──────────────────────────────────────────────────────────────────────────

function makeLoginId(role, name, hospitalName) {
  const slug     = hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
  const namePart = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  const prefix   = { admin: 'ADM', doctor: 'DR', nurse: 'NR', receptionist: 'REC', lab_tech: 'LAB', pharmacist: 'PHR' }[role] || 'STF'
  return `${prefix}.${namePart}.${slug}`
}

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Create hospital (skip if already exists by name)
    let { rows: [hospital] } = await client.query(
      `SELECT * FROM hospitals WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [HOSPITAL_NAME]
    )

    if (!hospital) {
      const ins = await client.query(
        `INSERT INTO hospitals (name, city, address, phone, email, license_no, bed_count)
         VALUES ($1, 'Local', 'Local Dev', '0000000000', $2, NULL, 100) RETURNING *`,
        [HOSPITAL_NAME, ADMIN_EMAIL]
      )
      hospital = ins.rows[0]
      console.log(`✅  Hospital created: "${hospital.name}" (id=${hospital.id})`)
    } else {
      console.log(`ℹ️   Hospital already exists: "${hospital.name}" (id=${hospital.id})`)
    }

    // 2. Hash password
    const hash = await bcrypt.hash(PASSWORD, 12)

    // 3. Generate login_id (must match deployed formula)
    const loginId = makeLoginId('admin', ADMIN_NAME, HOSPITAL_NAME)
    console.log(`🔑  Login ID will be: ${loginId}`)

    // 4. Upsert admin user
    const { rows: [user] } = await client.query(
      `INSERT INTO users (hospital_id, login_id, name, email, role, password_hash)
       VALUES ($1, $2, $3, $4, 'admin', $5)
       ON CONFLICT (login_id) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             hospital_id   = EXCLUDED.hospital_id
       RETURNING id, login_id, role`,
      [hospital.id, loginId, ADMIN_NAME, ADMIN_EMAIL, hash]
    )
    console.log(`✅  Admin user ready: login_id="${user.login_id}", role="${user.role}"`)

    await client.query('COMMIT')
    console.log('\n🎉  Done! You can now log in locally with:')
    console.log(`   Login ID : ${loginId}`)
    console.log(`   Password : ${PASSWORD}`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌  Failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()

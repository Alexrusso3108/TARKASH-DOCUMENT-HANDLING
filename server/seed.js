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

    // ── CREATE DEFAULT HOSPITAL & ADMIN (Required for backend to work) ──

    // 1. We MUST have a hospital because all application tables (patients, beds) rely on `hospital_id`
    const { rows: hospResult } = await client.query(
      `INSERT INTO hospitals (name, city, address, phone, email, bed_count)
       VALUES ('City General Hospital', 'Metropolis', '123 Main St', '800-123-4567', 'contact@citygen.com', 200)
       ON CONFLICT DO NOTHING
       RETURNING id`
    )
    
    let hospId = 1
    if (hospResult.length > 0) {
      hospId = hospResult[0].id
    } else {
      const { rows: getHosp } = await client.query(`SELECT id FROM hospitals LIMIT 1`)
      if (getHosp.length) hospId = getHosp[0].id
    }

    // 2. We MUST have a user account so you can log into the frontend. 
    // Login ID: "admin.citygen", Password: "password123"
    await client.query(
      `INSERT INTO users (hospital_id, name, login_id, password_hash, role)
       VALUES ($1, 'Admin User', 'admin.citygen', '$2b$12$9eXUWzUUQW0N.d41FgOinO.7e2AV5EZ40udKkD6e5qgImIyroHa.', 'admin')
       ON CONFLICT (login_id) DO NOTHING`,
       [hospId]
    )

    await client.query('COMMIT')
    console.log('✅ Base infrastructure (Hospital & Admin User) initialized successfully!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Base init failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()

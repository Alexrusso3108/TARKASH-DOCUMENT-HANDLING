const { Pool } = require('pg')
const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'dscribe_hms',
  password: 'admin123',
  port: 5433,
})

async function run() {
  const client = await pool.connect()
  try {
    const { rows } = await client.query(`SELECT id FROM patients ORDER BY created_at DESC LIMIT 5`)
    console.log("Latest Patient IDs:", rows.map(r => r.id))
  } catch (e) {
    console.error("DB Error:", e)
  } finally {
    client.release()
    pool.end()
  }
}
run()

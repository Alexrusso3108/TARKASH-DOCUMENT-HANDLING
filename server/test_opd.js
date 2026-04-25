const { Pool } = require('pg')
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dscribe_hms',
  password: 'admin',
  port: 5432,
})

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const hid = 1 // Assuming 1 exists
    const { rows: last } = await client.query(`SELECT id FROM patients ORDER BY created_at DESC LIMIT 1`)
    const lastNum = last.length ? parseInt(last[0].id.replace('P-', '')) : 4800
    const newId = `P-${lastNum + 1}`
    console.log("newId:", newId)
    
    // Attempt patient insertion
    const pRes = await client.query(
      `INSERT INTO patients (id,hospital_id,name,age,gender,department,doctor_id,phone,status,admission_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'OPD','Walk-In') RETURNING id`,
      [newId, hid, 'Test Patient', 90, 'Male', 'Rheumatology', null, '1234567890']
    )
    console.log("Inserted patient", pRes.rows[0].id)
    
    // opd_visits insertion
    const { rows: count } = await client.query(`SELECT COUNT(*) FROM opd_visits WHERE visit_date = CURRENT_DATE AND hospital_id = $1`, [hid])
    const token = `T-${String(parseInt(count[0].count) + 1).padStart(3, '0')}`
    
    const oRes = await client.query(
      `INSERT INTO opd_visits (hospital_id,patient_id,doctor_id,token,department,visit_type,symptoms,fee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [hid, pRes.rows[0].id, null, token, 'Rheumatology', 'Emergency', 'Pain', 0]
    )
    console.log("Inserted opd_visits", oRes.rows[0].id)
    
    await client.query('ROLLBACK')
    console.log("Success")
  } catch (e) {
    console.error("DB Error:", e)
    await client.query('ROLLBACK')
  } finally {
    client.release()
    pool.end()
  }
}
run()

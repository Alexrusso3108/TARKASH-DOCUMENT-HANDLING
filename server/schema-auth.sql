-- =============================================================
-- dScribe HMS — Auth Schema (run AFTER schema.sql)
-- =============================================================

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;

-- ─── HOSPITALS ──────────────────────────────────────────────
CREATE TABLE hospitals (
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
CREATE TABLE users (
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

CREATE INDEX idx_users_login     ON users(login_id);
CREATE INDEX idx_users_hospital  ON users(hospital_id);
CREATE INDEX idx_users_role      ON users(role);

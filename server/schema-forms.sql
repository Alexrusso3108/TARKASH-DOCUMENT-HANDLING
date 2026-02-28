-- =============================================================
-- dScribe HMS — Hospital Forms Schema
-- Run this ONCE to add form management tables
-- =============================================================

-- Form Templates (PDFs uploaded by admin)
CREATE TABLE IF NOT EXISTS form_templates (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  category    VARCHAR(100) DEFAULT 'General', -- Consent | Assessment | Discharge | Nursing | General
  file_path   VARCHAR(500) NOT NULL,           -- path on server fs
  file_name   VARCHAR(300) NOT NULL,
  file_size   INTEGER,
  page_count  INTEGER DEFAULT 1,
  is_active   BOOLEAN DEFAULT TRUE,
  created_by  VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Form Instances (one per patient per template)
CREATE TABLE IF NOT EXISTS patient_forms (
  id              SERIAL PRIMARY KEY,
  template_id     INTEGER REFERENCES form_templates(id) ON DELETE CASCADE,
  patient_id      VARCHAR(20) REFERENCES patients(id) ON DELETE CASCADE,
  annotations     JSONB DEFAULT '[]',   -- array of stroke/annotation objects
  status          VARCHAR(30) DEFAULT 'blank',  -- blank | in-progress | completed
  filled_by       VARCHAR(100),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_forms_patient ON patient_forms(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_forms_template ON patient_forms(template_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_active ON form_templates(is_active);

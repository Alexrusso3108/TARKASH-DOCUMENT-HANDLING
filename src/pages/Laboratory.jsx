import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plus, FlaskConical, X, CheckCircle, Loader, UploadCloud, FileText, ExternalLink, Download, Mail } from 'lucide-react'
import { api, SERVER_URL } from '../api'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'

const LAB_TEST_CATALOG = {
  'CBC (Complete Blood Count)': { category: 'Haematology', parameters: [
    { id: 'hb', name: 'Haemoglobin', unit: 'g/dL', range: '13-17', min: 13, max: 17 },
    { id: 'tlc', name: 'Total Leukocyte Count', unit: 'cells/cumm', range: '4000-11000', min: 4000, max: 11000 },
    { id: 'plt', name: 'Platelet Count', unit: 'lakhs/cumm', range: '1.5-4.5', min: 1.5, max: 4.5 },
    { id: 'rbc', name: 'RBC Count', unit: 'millions/cumm', range: '4.5-5.5', min: 4.5, max: 5.5 },
    { id: 'hct', name: 'Hematocrit', unit: '%', range: '40-50', min: 40, max: 50 },
    { id: 'mcv', name: 'MCV', unit: 'fL', range: '83-101', min: 83, max: 101 },
    { id: 'mch', name: 'MCH', unit: 'pg', range: '27-32', min: 27, max: 32 },
    { id: 'mchc', name: 'MCHC', unit: 'g/dL', range: '32-36', min: 32, max: 36 }
  ]},
  'Liver Function Test (LFT)': { category: 'Biochemistry', parameters: [
    { id: 'bil_t', name: 'Bilirubin Total', unit: 'mg/dL', range: '0.3-1.2', min: 0.3, max: 1.2 },
    { id: 'bil_d', name: 'Bilirubin Direct', unit: 'mg/dL', range: '0.1-0.4', min: 0.1, max: 0.4 },
    { id: 'sgpt', name: 'SGPT (ALT)', unit: 'U/L', range: '5-40', min: 5, max: 40 },
    { id: 'sgot', name: 'SGOT (AST)', unit: 'U/L', range: '8-40', min: 8, max: 40 },
    { id: 'alp', name: 'Alkaline Phosphatase', unit: 'U/L', range: '40-129', min: 40, max: 129 },
    { id: 'tp', name: 'Total Protein', unit: 'g/dL', range: '6.0-8.3', min: 6.0, max: 8.3 },
    { id: 'alb', name: 'Albumin', unit: 'g/dL', range: '3.5-5.5', min: 3.5, max: 5.5 },
    { id: 'glob', name: 'Globulin', unit: 'g/dL', range: '2.0-3.5', min: 2.0, max: 3.5 }
  ]},
  'Kidney Function Test (KFT)': { category: 'Biochemistry', parameters: [
    { id: 'urea', name: 'Blood Urea', unit: 'mg/dL', range: '15-40', min: 15, max: 40 },
    { id: 'creat', name: 'Serum Creatinine', unit: 'mg/dL', range: '0.6-1.2', min: 0.6, max: 1.2 },
    { id: 'uric', name: 'Uric Acid', unit: 'mg/dL', range: '3.5-7.2', min: 3.5, max: 7.2 },
    { id: 'sodium', name: 'Sodium', unit: 'mEq/L', range: '135-145', min: 135, max: 145 },
    { id: 'potassium', name: 'Potassium', unit: 'mEq/L', range: '3.5-5.0', min: 3.5, max: 5.0 },
    { id: 'chloride', name: 'Chloride', unit: 'mEq/L', range: '96-106', min: 96, max: 106 },
    { id: 'calcium', name: 'Calcium', unit: 'mg/dL', range: '8.5-10.5', min: 8.5, max: 10.5 }
  ]},
  'Lipid Profile': { category: 'Biochemistry', parameters: [
    { id: 'chol', name: 'Total Cholesterol', unit: 'mg/dL', range: '<200', min: 0, max: 200 },
    { id: 'trig', name: 'Triglycerides', unit: 'mg/dL', range: '<150', min: 0, max: 150 },
    { id: 'hdl', name: 'HDL Cholesterol', unit: 'mg/dL', range: '>40', min: 40, max: 60 },
    { id: 'ldl', name: 'LDL Cholesterol', unit: 'mg/dL', range: '<100', min: 0, max: 100 },
    { id: 'vldl', name: 'VLDL Cholesterol', unit: 'mg/dL', range: '5-40', min: 5, max: 40 }
  ]},
  'Thyroid Profile (T3, T4, TSH)': { category: 'Pathology', parameters: [
    { id: 't3', name: 'Total T3', unit: 'ng/dL', range: '80-200', min: 80, max: 200 },
    { id: 't4', name: 'Total T4', unit: 'ug/dL', range: '4.5-12.0', min: 4.5, max: 12.0 },
    { id: 'tsh', name: 'TSH', unit: 'uIU/mL', range: '0.4-4.0', min: 0.4, max: 4.0 },
    { id: 'ft3', name: 'Free T3', unit: 'pg/mL', range: '2.0-4.4', min: 2.0, max: 4.4 },
    { id: 'ft4', name: 'Free T4', unit: 'ng/dL', range: '0.8-1.8', min: 0.8, max: 1.8 }
  ]},
  'HbA1c (Glycosylated Hemoglobin)': { category: 'Pathology', parameters: [
    { id: 'hba1c', name: 'HbA1c', unit: '%', range: '<5.7', min: 0, max: 5.7 },
    { id: 'eag', name: 'Estimated Avg Glucose', unit: 'mg/dL', range: '<117', min: 0, max: 117 }
  ]},
  'Blood Sugar (Fasting)': { category: 'Biochemistry', parameters: [{ id: 'fbs', name: 'Fasting Blood Sugar', unit: 'mg/dL', range: '70-100', min: 70, max: 100 }]},
  'Blood Sugar (PP)': { category: 'Biochemistry', parameters: [{ id: 'ppbs', name: 'Post Prandial Blood Sugar', unit: 'mg/dL', range: '<140', min: 0, max: 140 }]},
  'Blood Sugar (Random)': { category: 'Biochemistry', parameters: [{ id: 'rbs', name: 'Random Blood Sugar', unit: 'mg/dL', range: '70-140', min: 70, max: 140 }]},
  'Urine Routine & Microscopy': { category: 'Pathology', parameters: [
    { id: 'u_color', name: 'Color', unit: '', range: 'Pale Yellow', min: 0, max: 1 },
    { id: 'u_appear', name: 'Appearance', unit: '', range: 'Clear', min: 0, max: 1 },
    { id: 'u_ph', name: 'pH', unit: '', range: '5.0-7.0', min: 5.0, max: 7.0 },
    { id: 'u_sg', name: 'Specific Gravity', unit: '', range: '1.010-1.025', min: 1.010, max: 1.025 },
    { id: 'u_prot', name: 'Protein', unit: '', range: 'Nil', min: 0, max: 0 },
    { id: 'u_gluc', name: 'Glucose', unit: '', range: 'Nil', min: 0, max: 0 }
  ]},
  'ESR (Erythrocyte Sedimentation Rate)': { category: 'Haematology', parameters: [{ id: 'esr', name: 'ESR', unit: 'mm/hr', range: '0-20', min: 0, max: 20 }]},
  'Serum Electrolytes': { category: 'Biochemistry', parameters: [
    { id: 'na', name: 'Sodium (Na+)', unit: 'mEq/L', range: '135-145', min: 135, max: 145 },
    { id: 'k', name: 'Potassium (K+)', unit: 'mEq/L', range: '3.5-5.0', min: 3.5, max: 5.0 },
    { id: 'cl', name: 'Chloride (Cl-)', unit: 'mEq/L', range: '96-106', min: 96, max: 106 },
    { id: 'bicarb', name: 'Bicarbonate', unit: 'mEq/L', range: '22-28', min: 22, max: 28 }
  ]},
  'Cardiac Enzymes': { category: 'Cardiology', parameters: [
    { id: 'trop_i', name: 'Troponin I', unit: 'ng/mL', range: '<0.04', min: 0, max: 0.04 },
    { id: 'trop_t', name: 'Troponin T', unit: 'ng/mL', range: '<0.01', min: 0, max: 0.01 },
    { id: 'cpk', name: 'CPK Total', unit: 'U/L', range: '30-200', min: 30, max: 200 },
    { id: 'cpk_mb', name: 'CPK-MB', unit: 'U/L', range: '<25', min: 0, max: 25 },
    { id: 'ldh', name: 'LDH', unit: 'U/L', range: '140-280', min: 140, max: 280 }
  ]},
  'Vitamin D (25-OH)': { category: 'Pathology', parameters: [{ id: 'vit_d', name: 'Vitamin D', unit: 'ng/mL', range: '30-100', min: 30, max: 100 }]},
  'Vitamin B12': { category: 'Pathology', parameters: [{ id: 'vit_b12', name: 'Vitamin B12', unit: 'pg/mL', range: '200-900', min: 200, max: 900 }]},
  'Serum Iron Studies': { category: 'Biochemistry', parameters: [
    { id: 'iron', name: 'Serum Iron', unit: 'ug/dL', range: '60-170', min: 60, max: 170 },
    { id: 'tibc', name: 'TIBC', unit: 'ug/dL', range: '250-450', min: 250, max: 450 },
    { id: 'ferritin', name: 'Ferritin', unit: 'ng/mL', range: '30-400', min: 30, max: 400 }
  ]},
  'Serum Calcium': { category: 'Biochemistry', parameters: [{ id: 'ca', name: 'Calcium', unit: 'mg/dL', range: '8.5-10.5', min: 8.5, max: 10.5 }]},
  'Serum Magnesium': { category: 'Biochemistry', parameters: [{ id: 'mg', name: 'Magnesium', unit: 'mg/dL', range: '1.7-2.2', min: 1.7, max: 2.2 }]},
  'Serum Phosphorus': { category: 'Biochemistry', parameters: [{ id: 'phos', name: 'Phosphorus', unit: 'mg/dL', range: '2.5-4.5', min: 2.5, max: 4.5 }]},
  'C-Reactive Protein (CRP)': { category: 'Immunology', parameters: [{ id: 'crp', name: 'CRP', unit: 'mg/L', range: '<6', min: 0, max: 6 }]},
  'RA Factor (Rheumatoid Arthritis)': { category: 'Immunology', parameters: [{ id: 'ra', name: 'RA Factor', unit: 'IU/mL', range: '<20', min: 0, max: 20 }]},
  'ASO Titre': { category: 'Immunology', parameters: [{ id: 'aso', name: 'ASO Titre', unit: 'IU/mL', range: '<200', min: 0, max: 200 }]},
  'Widal Test': { category: 'Microbiology', parameters: [
    { id: 'to', name: 'Typhi O', unit: '', range: '<1:80', min: 0, max: 80 },
    { id: 'th', name: 'Typhi H', unit: '', range: '<1:80', min: 0, max: 80 }
  ]},
  'Dengue NS1 Antigen': { category: 'Microbiology', parameters: [{ id: 'ns1', name: 'NS1 Antigen', unit: '', range: 'Negative', min: 0, max: 0 }]},
  'Dengue IgG/IgM': { category: 'Microbiology', parameters: [
    { id: 'den_igg', name: 'Dengue IgG', unit: '', range: 'Negative', min: 0, max: 0 },
    { id: 'den_igm', name: 'Dengue IgM', unit: '', range: 'Negative', min: 0, max: 0 }
  ]},
  'Malaria Antigen (Pf/Pv)': { category: 'Microbiology', parameters: [
    { id: 'mal_pf', name: 'P. falciparum', unit: '', range: 'Negative', min: 0, max: 0 },
    { id: 'mal_pv', name: 'P. vivax', unit: '', range: 'Negative', min: 0, max: 0 }
  ]},
  'HIV 1 & 2 (ELISA)': { category: 'Microbiology', parameters: [{ id: 'hiv', name: 'HIV 1 & 2', unit: '', range: 'Non-Reactive', min: 0, max: 0 }]},
  'HBsAg (Hepatitis B Surface Antigen)': { category: 'Microbiology', parameters: [{ id: 'hbsag', name: 'HBsAg', unit: '', range: 'Non-Reactive', min: 0, max: 0 }]},
  'Anti HCV (Hepatitis C)': { category: 'Microbiology', parameters: [{ id: 'hcv', name: 'Anti HCV', unit: '', range: 'Non-Reactive', min: 0, max: 0 }]},
  'VDRL (Syphilis)': { category: 'Microbiology', parameters: [{ id: 'vdrl', name: 'VDRL', unit: '', range: 'Non-Reactive', min: 0, max: 0 }]},
  'Prothrombin Time (PT/INR)': { category: 'Haematology', parameters: [
    { id: 'pt', name: 'PT', unit: 'sec', range: '11-13.5', min: 11, max: 13.5 },
    { id: 'inr', name: 'INR', unit: '', range: '0.8-1.2', min: 0.8, max: 1.2 }
  ]},
  'APTT (Activated Partial Thromboplastin Time)': { category: 'Haematology', parameters: [{ id: 'aptt', name: 'APTT', unit: 'sec', range: '25-35', min: 25, max: 35 }]},
  'D-Dimer': { category: 'Haematology', parameters: [{ id: 'ddimer', name: 'D-Dimer', unit: 'ng/mL', range: '<500', min: 0, max: 500 }]},
  'Serum Amylase': { category: 'Biochemistry', parameters: [{ id: 'amylase', name: 'Amylase', unit: 'U/L', range: '30-110', min: 30, max: 110 }]},
  'Serum Lipase': { category: 'Biochemistry', parameters: [{ id: 'lipase', name: 'Lipase', unit: 'U/L', range: '13-60', min: 13, max: 60 }]},
  'Stool Routine & Microscopy': { category: 'Pathology', parameters: [
    { id: 's_color', name: 'Color', unit: '', range: 'Brown', min: 0, max: 1 },
    { id: 's_consist', name: 'Consistency', unit: '', range: 'Formed', min: 0, max: 1 },
    { id: 's_blood', name: 'Blood', unit: '', range: 'Absent', min: 0, max: 0 },
    { id: 's_mucus', name: 'Mucus', unit: '', range: 'Absent', min: 0, max: 0 }
  ]},
  'Semen Analysis': { category: 'Pathology', parameters: [
    { id: 'sem_vol', name: 'Volume', unit: 'mL', range: '1.5-5.0', min: 1.5, max: 5.0 },
    { id: 'sem_count', name: 'Sperm Count', unit: 'million/mL', range: '>15', min: 15, max: 200 },
    { id: 'sem_motil', name: 'Motility', unit: '%', range: '>40', min: 40, max: 100 }
  ]},
  'PSA (Prostate Specific Antigen)': { category: 'Pathology', parameters: [{ id: 'psa', name: 'PSA Total', unit: 'ng/mL', range: '<4.0', min: 0, max: 4.0 }]},
  'CEA (Carcinoembryonic Antigen)': { category: 'Pathology', parameters: [{ id: 'cea', name: 'CEA', unit: 'ng/mL', range: '<3.0', min: 0, max: 3.0 }]},
  'CA 125 (Cancer Antigen)': { category: 'Pathology', parameters: [{ id: 'ca125', name: 'CA 125', unit: 'U/mL', range: '<35', min: 0, max: 35 }]},
  'CA 19-9': { category: 'Pathology', parameters: [{ id: 'ca199', name: 'CA 19-9', unit: 'U/mL', range: '<37', min: 0, max: 37 }]},
  'AFP (Alpha Fetoprotein)': { category: 'Pathology', parameters: [{ id: 'afp', name: 'AFP', unit: 'ng/mL', range: '<10', min: 0, max: 10 }]},
  'Beta HCG (Pregnancy Test)': { category: 'Pathology', parameters: [{ id: 'bhcg', name: 'Beta HCG', unit: 'mIU/mL', range: '<5', min: 0, max: 5 }]},
  'Serum Cortisol': { category: 'Pathology', parameters: [{ id: 'cortisol', name: 'Cortisol', unit: 'ug/dL', range: '5-25', min: 5, max: 25 }]},
  'Serum Testosterone': { category: 'Pathology', parameters: [{ id: 'testo', name: 'Testosterone', unit: 'ng/dL', range: '300-1000', min: 300, max: 1000 }]},
  'Serum Prolactin': { category: 'Pathology', parameters: [{ id: 'prolactin', name: 'Prolactin', unit: 'ng/mL', range: '4-15', min: 4, max: 15 }]},
  'LH (Luteinizing Hormone)': { category: 'Pathology', parameters: [{ id: 'lh', name: 'LH', unit: 'mIU/mL', range: '1.5-9.0', min: 1.5, max: 9.0 }]},
  'FSH (Follicle Stimulating Hormone)': { category: 'Pathology', parameters: [{ id: 'fsh', name: 'FSH', unit: 'mIU/mL', range: '1.5-12.0', min: 1.5, max: 12.0 }]},
  'G6PD (Glucose-6-Phosphate Dehydrogenase)': { category: 'Haematology', parameters: [{ id: 'g6pd', name: 'G6PD', unit: 'U/g Hb', range: '7-20', min: 7, max: 20 }]},
  'Serum Ammonia': { category: 'Biochemistry', parameters: [{ id: 'ammonia', name: 'Ammonia', unit: 'umol/L', range: '15-45', min: 15, max: 45 }]},
  'Blood Culture & Sensitivity': { category: 'Microbiology', parameters: [{ id: 'bc_growth', name: 'Growth', unit: '', range: 'No Growth', min: 0, max: 0 }]},
  'Urine Culture & Sensitivity': { category: 'Microbiology', parameters: [{ id: 'uc_growth', name: 'Growth', unit: '', range: 'No Growth', min: 0, max: 0 }]},
  'Mantoux Test (TB Skin Test)': { category: 'Microbiology', parameters: [{ id: 'mantoux', name: 'Induration', unit: 'mm', range: '<10', min: 0, max: 10 }]},
  'Arterial Blood Gas (ABG)': { category: 'Biochemistry', parameters: [
    { id: 'ph', name: 'pH', unit: '', range: '7.35-7.45', min: 7.35, max: 7.45 },
    { id: 'pco2', name: 'pCO2', unit: 'mmHg', range: '35-45', min: 35, max: 45 },
    { id: 'po2', name: 'pO2', unit: 'mmHg', range: '80-100', min: 80, max: 100 },
    { id: 'hco3', name: 'HCO3', unit: 'mEq/L', range: '22-26', min: 22, max: 26 }
  ]}
}

const STATUS_STYLES = {
  'Pending':     { bg: 'var(--gray-100)',            color: 'var(--gray-600)',  label: 'Pending Collection' },
  'In Progress': { bg: 'rgba(99,102,241,0.1)',        color: '#4338ca',         label: 'Processing' },
  'Completed':   { bg: 'rgba(16,185,129,0.1)',        color: '#059669',         label: 'Results Ready' },
}

const PRIORITY_STYLES = {
  'Stat':    { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'STAT' },
  'Urgent':  { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Urgent' },
  'Routine': { bg: 'var(--gray-100)',       color: 'var(--gray-600)', label: 'Routine' },
}

// ─── PDF Upload Button ────────────────────────────────────────────────────────
function PdfUploadBtn({ orderId, existingPath, onUploaded, uploadFn }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const inputRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Only PDF files allowed'); return }
    setUploading(true); setError(null)
    try {
      const updated = await uploadFn(orderId, file)
      onUploaded(updated)
    } catch (err) { setError(err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
      {existingPath ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a
            href={`${SERVER_URL}${existingPath}`} target="_blank" rel="noopener noreferrer"
            className="btn btn-sm btn-teal" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
          >
            <ExternalLink size={13} /> View PDF
          </a>
          <button
            className="btn btn-sm btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
            onClick={() => inputRef.current.click()} disabled={uploading}
          >
            {uploading ? <Loader size={12} className="spin" /> : <UploadCloud size={12} />}
            {uploading ? 'Uploading…' : 'Replace PDF'}
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => inputRef.current.click()} disabled={uploading}
        >
          {uploading ? <Loader size={14} className="spin" /> : <UploadCloud size={14} />}
          {uploading ? 'Uploading…' : 'Upload Result PDF'}
        </button>
      )}
      {error && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem' }}>⚠ {error}</div>}
    </div>
  )
}

// ─── New Lab Order Modal ──────────────────────────────────────────────────────
function NewLabModal({ onClose, onSave, patients, doctors }) {
  const [form, setForm] = useState({ patient_id: '', test_name: '', category: '', requested_by: '', priority: 'Routine' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.patient_id || !form.test_name) { setError('Patient and test name are required.'); return }
    setSaving(true); setError(null)
    try { const lab = await api.createLab(form); onSave(lab); onClose() }
    catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const handleTestChange = (e) => {
    const t = e.target.value
    h('test_name', t)
    if (LAB_TEST_CATALOG[t]) h('category', LAB_TEST_CATALOG[t].category)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>New Lab Order</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Order a lab test for a patient</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Patient*</label>
              <select className="form-input form-select" value={form.patient_id} onChange={e => h('patient_id', e.target.value)}>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Requested By</label>
              <select className="form-input form-select" value={form.requested_by} onChange={e => h('requested_by', e.target.value)}>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Test Name*</label>
              <select className="form-input form-select" value={form.test_name} onChange={handleTestChange}>
                <option value="">Select Indian lab test...</option>
                {Object.keys(LAB_TEST_CATALOG).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input form-select" value={form.category} onChange={e => h('category', e.target.value)}>
                <option value="">Select category</option>
                {['Haematology', 'Biochemistry', 'Microbiology', 'Immunology', 'Cardiology', 'Pathology'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={e => h('priority', e.target.value)}>
                <option>Routine</option><option>Urgent</option><option>Stat</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <Plus size={14} />} Order Test
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Result Side Panel ────────────────────────────────────────────────────────
function ResultPanel({ order, onClose, onUpdated }) {
  const { isAdmin } = useAuth()
  const [results, setResults] = useState({})
  const [saving, setSaving] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [hospitalInfo, setHospitalInfo] = useState(null)
  const [logoBase64, setLogoBase64] = useState(null)
  const [headerBase64, setHeaderBase64] = useState(null)
  const [footerBase64, setFooterBase64] = useState(null)
  const isCompleted = order.status === 'Completed'
  const isEditable = !isCompleted || isAdmin
  const testConfig = LAB_TEST_CATALOG[order.test_name] || null

  useEffect(() => {
    if (order.result_notes && isCompleted) {
       try { setResults(JSON.parse(order.result_notes)) } catch(e) { /* fallback if strict text */ }
    }
  }, [order, isCompleted])

  // Fetch hospital branding on mount
  useEffect(() => {
    const loadImg = (url, setter) => {
      if (!url) return
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          setter(canvas.toDataURL('image/png'))
        } catch (e) { console.warn('Base64 conversion failed:', e) }
      }
      img.onerror = () => console.warn('Could not load image for PDF', url)
      img.src = `${SERVER_URL}${url}?t=${Date.now()}` // Cache buster
    }

    api.getHospital().then(h => {
      setHospitalInfo(h)
      // Pre-load images as base64 for PDF embedding
      loadImg(h.report_logo, setLogoBase64)
      loadImg(h.report_header_image, setHeaderBase64)
      loadImg(h.report_footer_image, setFooterBase64)
    }).catch(() => {})
  }, [])

  const generatePDF = (orderData, resObj, download = true) => {
    try {
      if (!testConfig) { alert('Test standard configuration not found for auto-pdf generation.'); return; }
      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const margin = 15
      const h = hospitalInfo
      let cursorY = margin

      // ═══════════════════════════════════════════════════════
      // HEADER — Hospital branding
      // ═══════════════════════════════════════════════════════
      const drawHeader = () => {
        let y = margin
        let textStartX = margin

        if (h?.report_print_mode === 'image') {
          if (headerBase64) {
            try {
              // Calculate height maintaining aspect ratio, full width
              const props = doc.getImageProperties(headerBase64)
              const imgW = pageW
              const imgH = (props.height * imgW) / props.width
              doc.addImage(headerBase64, 'PNG', 0, 0, imgW, imgH)
              return imgH + 5 // Return new cursorY below header
            } catch (e) {
              console.warn('Could not embed header image in PDF:', e)
            }
          }
          // If image mode but image not loaded/missing, just leave space
          return y + 25 
        }

        // Standard Text/Logo mode
        // Logo
        if (logoBase64) {
          try {
            const logoH = 22
            const logoW = 40
            doc.addImage(logoBase64, 'PNG', margin, y - 2, logoW, logoH)
            textStartX = margin + logoW + 5
          } catch (e) {
            console.warn('Could not embed logo in PDF:', e)
          }
        }

        if (h && h.report_header_text) {
          const headerLines = h.report_header_text.split('\n').filter(l => l.trim())
          headerLines.forEach((line, i) => {
            if (i === 0) {
              doc.setFontSize(14)
              doc.setTextColor(30, 58, 138)
              doc.setFont('helvetica', 'bold')
            } else {
              doc.setFontSize(8.5)
              doc.setTextColor(80, 80, 80)
              doc.setFont('helvetica', 'normal')
            }
            doc.text(line, textStartX, y + (i === 0 ? 5 : 7 + i * 4))
          })
          y += Math.max(22, 7 + headerLines.length * 4)

          // Tagline
          if (h.report_tagline) {
            doc.setFontSize(7.5)
            doc.setTextColor(79, 70, 229)
            doc.setFont('helvetica', 'italic')
            doc.text(h.report_tagline, textStartX, y + 2)
            y += 6
          }
        } else {
          // Fallback header if no branding configured
          doc.setFontSize(18)
          doc.setTextColor(30, 58, 138)
          doc.setFont('helvetica', 'bold')
          doc.text(h?.name || 'LABORATORY REPORT', textStartX, y + 10)
          y += 15
        }

        // Divider line
        y += 3
        doc.setDrawColor(79, 70, 229)
        doc.setLineWidth(0.8)
        doc.line(margin, y, pageW - margin, y)
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(margin, y + 1.5, pageW - margin, y + 1.5)

        return y + 6
      }

      // ═══════════════════════════════════════════════════════
      // FOOTER — Hospital footer on every page
      // ═══════════════════════════════════════════════════════
      const drawFooter = (pageNum, totalPages) => {
        if (h?.report_print_mode === 'image') {
          if (footerBase64) {
            try {
              const props = doc.getImageProperties(footerBase64)
              const imgW = pageW
              const imgH = (props.height * imgW) / props.width
              doc.addImage(footerBase64, 'PNG', 0, pageH - imgH, imgW, imgH)
              
              // Print page number over footer or above it
              doc.setFontSize(7)
              doc.setTextColor(150)
              doc.text(`Page ${pageNum}`, pageW - margin, pageH - imgH - 5, { align: 'right' })
              return
            } catch (e) {
              console.warn('Could not embed footer image in PDF:', e)
            }
          }
          // If image mode but image not loaded, just print page number
          doc.setFontSize(7)
          doc.setTextColor(150)
          doc.text(`Page ${pageNum}`, pageW - margin, pageH - 15, { align: 'right' })
          return
        }

        const footerTop = pageH - 30
        doc.setDrawColor(79, 70, 229)
        doc.setLineWidth(0.5)
        doc.line(margin, footerTop, pageW - margin, footerTop)

        if (h && h.report_footer_text) {
          const footerLines = h.report_footer_text.split('\n')
          doc.setFontSize(7)
          doc.setTextColor(100, 100, 100)
          doc.setFont('helvetica', 'normal')
          footerLines.forEach((line, i) => {
            if (i < 5) { // Max 5 footer lines to avoid overflow
              doc.text(line, margin, footerTop + 5 + i * 3.5)
            }
          })
        } else {
          doc.setFontSize(8)
          doc.setTextColor(150)
          doc.setFont('helvetica', 'normal')
          doc.text('*** End of Report ***', pageW / 2, footerTop + 8, { align: 'center' })
        }

        // Page number
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(`Page ${pageNum}`, pageW - margin, footerTop + 5, { align: 'right' })
      }

      cursorY = drawHeader()

      // ═══════════════════════════════════════════════════════
      // REPORT TITLE LINE
      // ═══════════════════════════════════════════════════════
      doc.setFontSize(11)
      doc.setTextColor(79, 70, 229)
      doc.setFont('helvetica', 'bold')
      doc.text('LABORATORY TEST REPORT', pageW / 2, cursorY, { align: 'center' })
      cursorY += 8

      // ═══════════════════════════════════════════════════════
      // PATIENT INFO BOX
      // ═══════════════════════════════════════════════════════
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margin, cursorY - 2, pageW - margin * 2, 20, 2, 2, 'F')

      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.text(`Patient Name: `, margin + 4, cursorY + 5)
      doc.setFont('helvetica', 'bold')
      doc.text(`${orderData.patient_name || 'N/A'}`, margin + 32, cursorY + 5)

      doc.setFont('helvetica', 'normal')
      doc.text(`Patient ID: ${orderData.patient_code || 'N/A'}`, margin + 4, cursorY + 12)
      doc.text(`Requested By: ${orderData.requested_by || 'Self Referral'}`, pageW / 2, cursorY + 5)
      doc.text(`Report Date: ${new Date().toLocaleString('en-IN')}`, pageW / 2, cursorY + 12)
      cursorY += 24

      // Investigation title
      doc.setFontSize(11)
      doc.setTextColor(20, 20, 20)
      doc.setFont('helvetica', 'bold')
      doc.text(`Investigation: ${orderData.test_name}`, margin, cursorY)
      cursorY += 5

      // ═══════════════════════════════════════════════════════
      // RESULTS TABLE
      // ═══════════════════════════════════════════════════════
      const tableData = testConfig.parameters.map(p => {
        const val = resObj[p.id] || ''
        const numVal = parseFloat(val)
        let flag = ''
        if (!isNaN(numVal)) {
          if (numVal < p.min) flag = 'LOW'
          else if (numVal > p.max) flag = 'HIGH'
        }
        return [p.name, val, flag, p.unit, p.range]
      })

      autoTable(doc, {
        startY: cursorY,
        head: [['Parameter', 'Result', 'Flag', 'Unit', 'Bio. Reference']],
        body: tableData,
        theme: 'grid',
        margin: { left: margin, right: margin, bottom: 35 }, // Reserve space for footer
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawCell: function (data) {
          if (data.column.index === 2 && data.cell.text[0]) {
             if (data.cell.text[0] === 'HIGH') data.cell.styles.textColor = [220, 38, 38]
             else if (data.cell.text[0] === 'LOW') data.cell.styles.textColor = [180, 83, 9]
             data.cell.styles.fontStyle = 'bold'
          }
        }
      })

      // Draw footer on all pages
      const totalPages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        drawFooter(i, totalPages)
      }
      
      const patientName = orderData.patient_name || orderData.patient_id || 'Patient'
      if (download && typeof doc.save === 'function') {
        doc.save(`${patientName.replace(/[^a-z0-9]/gi, '_')}_${orderData.test_name.replace(/[^a-z0-9]/gi, '_')}.pdf`)
      }
      return doc
    } catch (err) {
      console.error('PDF Generation Error:', err)
      alert('Could not generate PDF: ' + err.message)
    }
  }

  const handleSendEmail = async () => {
    const email = order.patient_email || prompt('Enter patient email:', '')
    if (!email) return

    setEmailing(true)
    try {
      const doc = generatePDF(order, results, false)
      if (!doc) throw new Error('PDF Generation failed')
      
      const pdfBlob = doc.output('blob')
      const formData = new FormData()
      formData.append('report_pdf', pdfBlob)
      formData.append('email', email)
      formData.append('patient_name', order.patient_name)
      formData.append('test_name', order.test_name)

      await api.sendLabEmail(order.id, formData)
      alert('Report sent successfully to ' + email)
    } catch (e) {
      console.error(e)
      alert('Error sending email: ' + e.message)
    } finally {
      setEmailing(false)
    }
  }


  const handleSaveResults = async () => {
    setSaving(true)
    try {
      const jsonStr = JSON.stringify(results)
      const updated = await api.updateLab(order.id, { result_notes: jsonStr, status: 'Completed', completed_at: new Date().toISOString() })
      // Merge with old order to keep patient_name and other join data
      const merged = { ...order, ...updated, result_notes: jsonStr, status: 'Completed' }
      onUpdated(merged)
      generatePDF(merged, results)
      onClose()
    } catch (e) {
      alert('Error updating lab: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ width: 520, background: '#fff', height: '100%', overflow: 'auto', boxShadow: 'var(--shadow-2xl)', padding: '2rem', animation: 'slideInRight 250ms cubic-bezier(0.4,0,0.2,1)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Lab Results Entry</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>#{order.id} · {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '0.375rem' }}>{order.patient_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{order.patient_code} · {order.requested_by}</div>
        </div>

        {testConfig ? (
          <div style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ fontWeight: 700, margin: '0 0 1rem', color: 'var(--primary-700)' }}>{order.test_name}</h5>
            <table className="data-table" style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)' }}>
              <thead style={{ background: 'var(--gray-100)' }}>
                <tr>
                  <th style={{ fontSize: '0.75rem' }}>Parameter</th>
                  <th style={{ fontSize: '0.75rem' }}>Result</th>
                  <th style={{ fontSize: '0.75rem' }}>Range / Unit</th>
                </tr>
              </thead>
              <tbody>
                {testConfig.parameters.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-700)' }}>{p.name}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <input 
                        className="form-input" 
                        style={{ padding: '0.4rem', fontSize: '0.8rem', minWidth: 80 }}
                        type="number" 
                        step="0.01"
                        placeholder="Eg. 4.5"
                        value={results[p.id] || ''}
                        disabled={!isEditable}
                        onChange={e => setResults(r => ({ ...r, [p.id]: e.target.value }))}
                      />
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      <div>{p.range}</div>
                      <div style={{ fontSize: '0.65rem' }}>{p.unit}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isEditable && (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
                onClick={handleSaveResults}
                disabled={saving}
              >
                {saving ? <Loader size={14} className="spin"/> : <FileText size={14}/>} 
                {isCompleted ? 'Update Results & Regenerate PDF' : 'Save & Generate PDF Report'}
              </button>
            )}
            {isCompleted && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" style={{ justifyContent: 'center', flex: 1 }} onClick={() => generatePDF(order, results)}>
                  <Download size={14} /> PDF
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ justifyContent: 'center', background: '#3b82f6', borderColor: '#3b82f6', flex: 1 }} 
                  onClick={handleSendEmail}
                  disabled={emailing}
                >
                  {emailing ? <Loader size={14} className="spin" /> : <Mail size={14} />} Email
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.5rem' }}>
            {[
              ['Test Name',    order.test_name],
              ['Category',     order.category],
              ['Priority',     order.priority],
              ['Status',       order.status],
              ['Ordered At',   order.ordered_at   ? new Date(order.ordered_at).toLocaleString('en-IN')   : '—'],
              ['Completed At', order.completed_at ? new Date(order.completed_at).toLocaleString('en-IN') : 'Pending'],
            ].map(([label, val]) => (
              <div key={label} style={{ padding: '0.625rem 0', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <span style={{ width: 120, fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)', fontWeight: 500 }}>{val || '—'}</span>
              </div>
            ))}
            {order.result_notes && (
              <div style={{ padding: '0.875rem', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', marginBottom: '0.375rem' }}>Result Notes</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{order.result_notes}</div>
              </div>
            )}
          </div>
        )}

        {/* PDF Upload Section */}
        <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={14} /> Manual / External PDF Upload
          </div>
          <PdfUploadBtn
            orderId={order.id}
            existingPath={order.result_pdf_path}
            uploadFn={api.uploadLabResult}
            onUploaded={onUpdated}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost w-full" style={{ border: '1px solid var(--gray-200)' }} onClick={onClose}>Close Panel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Laboratory() {
  const [labOrders, setLabOrders] = useState([])
  const [doctors,   setDoctors]   = useState([])
  const [patients,  setPatients]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal]   = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (search) params.search = search
      const data = await api.getLab(params)
      setLabOrders(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  useEffect(() => {
    api.getDoctors().then(setDoctors).catch(() => {})
    api.getPatients().then(setPatients).catch(() => {})
  }, [])

  const handleSave    = (o) => setLabOrders(prev => [o, ...prev])
  const handleUpdated = (updated) => {
    setLabOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
    setSelectedOrder(prev => prev ? { ...prev, ...updated } : prev)
  }

  return (
    <>
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laboratory</h1>
          <p className="page-subtitle">Lab orders, test results, and specimen tracking</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> New Lab Order</button>
      </div>

      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Orders',      val: labOrders.length,                                       color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'Pending Collection',val: labOrders.filter(o => o.status === 'Pending').length,    color: '#b45309',         bg: 'rgba(245,158,11,0.06)' },
          { label: 'Processing',        val: labOrders.filter(o => o.status === 'In Progress').length, color: '#4338ca',        bg: 'rgba(99,102,241,0.08)' },
          { label: 'Results Ready',     val: labOrders.filter(o => o.status === 'Completed').length,  color: '#059669',         bg: 'rgba(16,185,129,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by patient or test name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Pending', 'In Progress', 'Completed'].map(f => (
            <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(f)}>
              {STATUS_STYLES[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Patient</th><th>Test Name</th><th>Category</th>
                <th>Requested By</th><th>Priority</th><th>Ordered At</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}><Loader size={20} className="spin" style={{ display: 'inline-block' }} /></td></tr>
              ) : labOrders.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No lab orders found</td></tr>
              ) : labOrders.map(o => (
                <tr key={o.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>#{o.id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{o.patient_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{o.patient_code}</div>
                  </td>
                  <td>
                    <span style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                      {o.test_name}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{o.category || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{o.requested_by || '—'}</td>
                  <td>
                    <span style={{ background: PRIORITY_STYLES[o.priority]?.bg || 'var(--gray-100)', color: PRIORITY_STYLES[o.priority]?.color || 'var(--gray-600)', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: 999, letterSpacing: '0.06em' }}>
                      {PRIORITY_STYLES[o.priority]?.label || o.priority}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                    {o.ordered_at ? new Date(o.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td>
                    <span style={{ background: STATUS_STYLES[o.status]?.bg || 'var(--gray-100)', color: STATUS_STYLES[o.status]?.color || 'var(--gray-600)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                      {STATUS_STYLES[o.status]?.label || o.status}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                    <button className="btn btn-sm btn-secondary" style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }} onClick={() => setSelectedOrder(o)}>
                      {o.result_pdf_path ? <><FileText size={11} /> PDF</> : o.status === 'Completed' ? <><CheckCircle size={11} /> Results</> : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Showing {labOrders.length} orders</span>
        </div>
      </div>

    </div>
    {selectedOrder && <ResultPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdated={handleUpdated} />}
    {showModal && <NewLabModal onClose={() => setShowModal(false)} onSave={handleSave} patients={patients} doctors={doctors} />}
    </>
  )
}

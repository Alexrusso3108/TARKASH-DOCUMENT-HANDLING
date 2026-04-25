import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, Plus, Clock, Loader, X, CheckCircle, Phone,
  Siren, HeartPulse, BedDouble, RefreshCw, FileText, Users,
  AlertCircle, Activity, Shield
} from 'lucide-react'
import { api } from '../api'

const TRIAGE_LEVELS = {
  'Red - Immediate':    { color: '#dc2626', bg: 'rgba(239,68,68,0.12)', label: 'Immediate',  roman: 'I',  desc: 'Life-threatening — needs resuscitation immediately' },
  'Orange - Very Urgent':{ color: '#ea580c', bg: 'rgba(234,88,12,0.1)', label: 'Very Urgent', roman: 'II', desc: 'Very urgent — within 10 minutes' },
  'Yellow - Urgent':    { color: '#b45309', bg: 'rgba(245,158,11,0.1)', label: 'Urgent',     roman: 'III',desc: 'Urgent — within 30 minutes' },
  'Green - Standard':   { color: '#059669', bg: 'rgba(16,185,129,0.1)', label: 'Standard',   roman: 'IV', desc: 'Non-urgent — within 1–2 hours' },
  'Blue - Dead/Expectant':{ color: '#475569', bg: 'rgba(100,116,139,0.1)', label: 'Expectant',roman: 'V', desc: 'Expectant / Deceased' },
}

const CASE_TYPES = [
  'Road Traffic Accident (RTA)', 'Cardiac Arrest', 'Stroke', 'Poisoning / Overdose',
  'Burns', 'Respiratory Distress', 'Severe Allergic Reaction', 'Trauma / Fall',
  'Seizure / Epilepsy', 'Obstetric Emergency', 'Diabetic Emergency (DKA/HHS)',
  'Sepsis', 'Acute Abdomen', 'High Fever', 'Snake / Animal Bite',
  'Assault / Violence', 'Industrial Accident', 'Drowning', 'Other Emergency',
]

const DISPOSITION = {
  'Under Triage':  { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
  'Under Treatment':{ bg: 'rgba(99,102,241,0.1)', color: '#4338ca' },
  'Admitted (IPD)':{ bg: 'var(--primary-50)', color: 'var(--primary-700)' },
  'OPD Referral':  { bg: 'rgba(13,148,136,0.1)', color: '#0d9488' },
  'Discharged':    { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  'Deceased':      { bg: 'rgba(100,116,139,0.1)', color: '#475569' },
  'Transferred':   { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
}

const MLC_TYPES = ['None', 'Road Accident (RTA)', 'Assault', 'Poisoning', 'Burns', 'Sexual Assault', 'Suicide Attempt', 'Industrial Accident', 'Other MLC']

function elapsed(ts) {
  if (!ts) return '—'
  const m = Math.floor((Date.now() - new Date(ts)) / 60000)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// ─── Register Emergency Modal ─────────────────────────────────────────────────
function EmergencyRegisterModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    patient_name: '', age: '', gender: 'Male', phone: '',
    triage_level: 'Yellow - Urgent', case_type: 'Other Emergency',
    chief_complaint: '', brought_by: '', guardian_phone: '',
    mlc_type: 'None', police_info: '',
    is_known_patient: false, uhid: '',
    bp: '', pulse: '', spo2: '', temp: '', rr: '', gcs: '',
    disposition: 'Under Triage',
    doctor_assigned: '', ambulance_no: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const triage = TRIAGE_LEVELS[form.triage_level]

  const submit = async () => {
    if (!form.patient_name && !form.is_known_patient) { alert('Patient name is required'); return }
    setSaving(true)
    try {
      // Use patients API to create an emergency registration
      const payload = {
        name: form.patient_name || 'Unknown',
        age: form.age, gender: form.gender, phone: form.phone,
        admission_type: 'Emergency', department: 'Emergency Medicine',
        status: 'Critical', notes: form.chief_complaint,
        mlc_type: form.mlc_type, mlc_police_info: form.police_info,
        guardian_phone: form.guardian_phone,
      }
      const patient = await api.createPatient(payload)
      onSave({ ...form, id: Date.now(), patient_id: patient.id, registered_at: new Date(), er_number: `ER${String(Date.now()).slice(-5)}` })
      onClose()
    } catch (e) { alert('Registration failed: ' + e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 760, width: '95vw', maxHeight: '93vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ background: triage?.bg, borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}>
          <div>
            <h4 style={{ color: triage?.color, fontWeight: 700 }}>🚨 Emergency Registration</h4>
            <p style={{ fontSize: '0.8rem', color: triage?.color, opacity: 0.8, marginTop: 2 }}>Triage Level: {form.triage_level}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Triage Level - most prominent */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.625rem', display: 'block' }}>Triage Level *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
              {Object.entries(TRIAGE_LEVELS).map(([key, val]) => (
                <button key={key} onClick={() => set('triage_level', key)} style={{ padding: '0.625rem 0.25rem', borderRadius: 'var(--radius-lg)', border: `2px solid ${form.triage_level === key ? val.color : 'var(--gray-200)'}`, background: form.triage_level === key ? val.bg : '#fff', cursor: 'pointer', transition: 'all 150ms' }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: val.color }}>{val.roman}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: val.color, textTransform: 'uppercase' }}>{val.label}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.78rem', color: triage?.color, marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: triage?.bg, borderRadius: 'var(--radius-md)' }}>
              {triage?.desc}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0, gridColumn: '1 / span 2' }}>
              <label className="form-label">Patient Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input className="form-input" placeholder="Full name (or 'Unknown' for unconscious)" value={form.patient_name} onChange={e => set('patient_name', e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">ER Number (auto)</label>
              <input className="form-input" disabled style={{ background: 'var(--gray-50)', fontFamily: 'monospace' }} placeholder="Auto-generated" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Age</label>
              <input className="form-input" type="number" placeholder="Years" value={form.age} onChange={e => set('age', e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Gender</label>
              <select className="form-input form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                {['Male', 'Female', 'Other', 'Unknown'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Mobile</label>
              <input className="form-input" type="tel" placeholder="Patient / attendant" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>

          {/* Case Details */}
          <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Case Details</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Case Type</label>
                <select className="form-input form-select" value={form.case_type} onChange={e => set('case_type', e.target.value)}>
                  {CASE_TYPES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Brought By</label>
                <select className="form-input form-select" value={form.brought_by} onChange={e => set('brought_by', e.target.value)}>
                  {['', 'Self', 'Family / Friends', '108 Ambulance', 'Private Ambulance', 'Police', 'Passerby', 'CATS'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                <label className="form-label">Chief Complaint</label>
                <textarea className="form-input form-textarea" placeholder="Describe the emergency presentation…" value={form.chief_complaint} onChange={e => set('chief_complaint', e.target.value)} style={{ minHeight: 60 }} />
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Initial Vitals</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { key: 'bp', label: 'BP (mmHg)', ph: '120/80' },
                { key: 'pulse', label: 'Pulse (bpm)', ph: 'e.g. 72' },
                { key: 'spo2', label: 'SpO₂ (%)', ph: 'e.g. 98' },
                { key: 'temp', label: 'Temp (°F)', ph: 'e.g. 98.6' },
                { key: 'rr', label: 'Resp. Rate', ph: 'e.g. 16' },
                { key: 'gcs', label: 'GCS Score', ph: '3–15' },
              ].map(({ key, label, ph }) => (
                <div key={key} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* MLC */}
          <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Medico-Legal (MLC)</div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '0.875rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">MLC Type</label>
                <select className="form-input form-select" value={form.mlc_type} onChange={e => set('mlc_type', e.target.value)}>
                  {MLC_TYPES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              {form.mlc_type !== 'None' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Police Station / FIR Info</label>
                  <input className="form-input" placeholder="Station, officer, FIR no." value={form.police_info} onChange={e => set('police_info', e.target.value)} />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ background: triage?.color, color: '#fff', border: 'none', borderRadius: 'var(--radius-lg)', padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {saving ? <Loader size={14} className="spin" /> : <AlertTriangle size={14} />}
            {saving ? 'Registering…' : 'Register Emergency'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Emergency Patient Card ───────────────────────────────────────────────────
function ERCard({ entry, onDispose }) {
  const triage = TRIAGE_LEVELS[entry.triage_level] || TRIAGE_LEVELS['Green - Standard']
  const disp = DISPOSITION[entry.disposition] || DISPOSITION['Under Triage']

  return (
    <div style={{
      background: '#fff', border: `2px solid ${triage.color}22`,
      borderLeft: `4px solid ${triage.color}`,
      borderRadius: 'var(--radius-xl)', padding: '1rem 1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: triage.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontWeight: 900, fontSize: '1rem', color: triage.color }}>{triage.roman}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)', display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {entry.patient_name}
              {entry.mlc_type && entry.mlc_type !== 'None' && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.55rem', fontWeight: 800, padding: '0.1rem 0.3rem', borderRadius: 3, letterSpacing: '0.04em' }}>MLC</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.125rem' }}>
              ER# {entry.er_number} · {entry.age ? `Age ${entry.age}` : '—'} · {entry.gender}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span style={{ ...disp, fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{entry.disposition}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={10} />{elapsed(entry.registered_at)}
          </span>
        </div>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--gray-700)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
        <strong>Complaint:</strong> {entry.chief_complaint || entry.case_type || '—'}
      </div>

      {/* Vitals row */}
      {(entry.bp || entry.pulse || entry.spo2) && (
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          {[['BP', entry.bp], ['Pulse', entry.pulse && `${entry.pulse} bpm`], ['SpO₂', entry.spo2 && `${entry.spo2}%`], ['Temp', entry.temp && `${entry.temp}°F`], ['GCS', entry.gcs]].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ background: 'var(--gray-50)', borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>{k}: </span>
              <span style={{ color: 'var(--gray-800)', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Disposition update */}
      <select
        className="form-input form-select"
        style={{ fontSize: '0.78rem', padding: '0.375rem 0.75rem' }}
        value={entry.disposition}
        onChange={e => onDispose(entry.id, e.target.value)}>
        {Object.keys(DISPOSITION).map(d => <option key={d}>{d}</option>)}
      </select>
    </div>
  )
}

// ─── Main Emergency Page ──────────────────────────────────────────────────────
export default function Emergency() {
  const [erPatients, setErPatients] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [triageFilter, setTriageFilter] = useState('All')

  const addPatient = (entry) => setErPatients(prev => {
    const order = Object.keys(TRIAGE_LEVELS)
    return [entry, ...prev].sort((a, b) => order.indexOf(a.triage_level) - order.indexOf(b.triage_level))
  })

  const updateDisposition = (id, disposition) =>
    setErPatients(prev => prev.map(p => p.id === id ? { ...p, disposition } : p))

  const active = erPatients.filter(p => !['Discharged', 'Deceased', 'Transferred'].includes(p.disposition))
  const filtered = triageFilter === 'All' ? active : active.filter(p => p.triage_level === triageFilter)

  const counts = {
    red: erPatients.filter(p => p.triage_level === 'Red - Immediate').length,
    orange: erPatients.filter(p => p.triage_level === 'Orange - Very Urgent').length,
    yellow: erPatients.filter(p => p.triage_level === 'Yellow - Urgent').length,
    green: erPatients.filter(p => p.triage_level === 'Green - Standard').length,
    mlc: erPatients.filter(p => p.mlc_type && p.mlc_type !== 'None').length,
  }

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '0.25rem 0.5rem', fontSize: '0.8em' }}>🚨</span>
            Accident & Emergency
          </h1>
          <p className="page-subtitle">Emergency triage, MLC tracking and patient disposition</p>
        </div>
        <button className="btn btn-danger" style={{ background: '#dc2626', color: '#fff', border: 'none' }} onClick={() => setShowModal(true)}>
          <AlertTriangle size={15} /> Register Emergency
        </button>
      </div>

      {/* Triage Summary */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'red',    label: 'Immediate (I)',   value: counts.red,    ...TRIAGE_LEVELS['Red - Immediate'] },
          { key: 'orange', label: 'Very Urgent (II)', value: counts.orange, ...TRIAGE_LEVELS['Orange - Very Urgent'] },
          { key: 'yellow', label: 'Urgent (III)',     value: counts.yellow, ...TRIAGE_LEVELS['Yellow - Urgent'] },
          { key: 'green',  label: 'Standard (IV)',    value: counts.green,  ...TRIAGE_LEVELS['Green - Standard'] },
          { key: 'mlc',    label: 'MLC Cases',        value: counts.mlc,    color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
        ].map(s => (
          <div key={s.key} className="card" style={{ padding: '0.875rem 1rem', borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '1.625rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: '0.25rem', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Triage filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${triageFilter === 'All' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTriageFilter('All')}>All</button>
        {Object.entries(TRIAGE_LEVELS).map(([key, val]) => (
          <button key={key} onClick={() => setTriageFilter(key === triageFilter ? 'All' : key)}
            style={{ padding: '0.3rem 0.75rem', border: `1.5px solid ${triageFilter === key ? val.color : 'var(--gray-200)'}`, background: triageFilter === key ? val.bg : '#fff', color: triageFilter === key ? val.color : 'var(--gray-600)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: triageFilter === key ? 700 : 400, transition: 'all 150ms', whiteSpace: 'nowrap' }}>
            {val.roman} — {val.label}
          </button>
        ))}
      </div>

      {/* ER Patient Grid */}
      {active.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <AlertTriangle size={32} style={{ color: 'var(--gray-300)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
          <div style={{ fontWeight: 700, color: 'var(--gray-600)', fontSize: '1.0625rem' }}>No active emergency cases</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-400)', marginTop: '0.375rem' }}>Click "Register Emergency" to add a patient</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {filtered.map(entry => <ERCard key={entry.id} entry={entry} onDispose={updateDisposition} />)}
        </div>
      )}

      {showModal && <EmergencyRegisterModal onClose={() => setShowModal(false)} onSave={addPatient} />}
    </div>
  )
}

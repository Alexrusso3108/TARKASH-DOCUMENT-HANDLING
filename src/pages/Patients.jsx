import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Plus, Eye, FileText, Loader, X, Pen, ClipboardList,
  Activity, Phone, Droplets, BedDouble, Calendar, ChevronRight,
  CheckCircle, FolderOpen, AlertTriangle, Shield, UserCheck,
  CreditCard, MapPin, Users, Hash, Printer, Download,
  ChevronDown, RefreshCw, Filter
} from 'lucide-react'
import { api } from '../api'
import FormViewer from '../components/FormViewer'
import DischargeEditor from '../components/DischargeEditor'

// ─── Constants ────────────────────────────────────────────────────────────────
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']
const ADMISSION_TYPES = ['OPD', 'IPD', 'Emergency', 'Day Care', 'ICU Direct']
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other']
const MARITAL_STATUS = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated']
const RELATIONS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Sibling', 'Guardian', 'Friend', 'Other']
const PAYMENT_TYPES = ['Self Pay (Cash)', 'Self Pay (UPI/Card)', 'Insurance / TPA', 'CGHS', 'ECHS', 'ESI', 'Ayushman Bharat (PMJAY)', 'State Scheme', 'Govt / Free']
const PATIENT_CATEGORIES = ['General', 'BPL / Ration Card', 'Senior Citizen (60+)', 'Divyangjan', 'Freedom Fighter', 'Staff / Employee', 'VIP']
const MLC_TYPES = ['None', 'Road Accident (RTA)', 'Assault', 'Poisoning', 'Burns', 'Sexual Assault', 'Suicide Attempt', 'Industrial Accident', 'Other MLC']

const DEPARTMENTS = [
  'General Medicine', 'General Surgery', 'Orthopaedics', 'Gynaecology & Obstetrics',
  'Paediatrics', 'Neonatology', 'Cardiology', 'Cardiothoracic Surgery',
  'Neurology', 'Neurosurgery', 'Nephrology', 'Urology', 'Gastroenterology',
  'Oncology', 'Haematology', 'Pulmonology', 'Dermatology', 'Ophthalmology',
  'ENT', 'Dentistry', 'Psychiatry', 'Rheumatology', 'Endocrinology',
  'Infectious Disease', 'ICU / Critical Care', 'Emergency Medicine',
  'Anaesthesiology', 'Radiology', 'Pathology', 'Physiotherapy', 'Dietetics',
]

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
]

const STATUS_STYLES = {
  Critical:    { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
  Stable:      { bg: 'rgba(16,185,129,0.1)',  color: '#059669' },
  Recovering:  { bg: 'rgba(59,130,246,0.1)',  color: '#1d4ed8' },
  'Under Obs': { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
  Serious:     { bg: 'rgba(239,68,68,0.15)',  color: '#b91c1c' },
  Discharged:  { bg: 'rgba(100,116,139,0.1)', color: '#475569' },
}

const FORM_STATUS = {
  blank:       { bg: 'var(--gray-100)', color: 'var(--gray-500)', label: 'Blank' },
  'in-progress': { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'In Progress' },
  completed:   { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Completed' },
}

const CATEGORY_COLORS = {
  General:    { bg: 'var(--gray-100)', color: 'var(--gray-600)' },
  Consent:    { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  Assessment: { bg: 'rgba(99,102,241,0.1)', color: '#4338ca' },
  Discharge:  { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  Nursing:    { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
  ICU:        { bg: 'rgba(239,68,68,0.12)', color: '#b91c1c' },
  OT:         { bg: 'rgba(13,148,136,0.1)', color: '#0d9488' },
  Emergency:  { bg: 'rgba(239,68,68,0.15)', color: '#dc2626' },
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ label, icon: Icon, color = 'var(--primary-500)' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.625rem 0', marginBottom: '0.875rem',
      borderBottom: '1.5px solid var(--gray-100)',
    }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={13} style={{ color }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function F({ label, required, span, children }) {
  return (
    <div className="form-group" style={span ? { gridColumn: `1 / span ${span}` } : {}}>
      <label className="form-label">
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Registration / Admission Modal ──────────────────────────────────────────
function RegisterModal({ doctors, onClose, onSave }) {
  const [step, setStep] = useState(0) // 0=Personal, 1=Clinical, 2=Payment/Insurance, 3=Consent
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    // Personal
    name: '', age: '', dob: '', gender: 'Male', blood_group: 'Unknown',
    phone: '', alt_phone: '', email: '',
    aadhaar: '', abha_id: '',
    address: '', city: '', state: 'Maharashtra', pincode: '',
    religion: '', marital_status: '',
    patient_category: 'General',
    // Guardian / Emergency
    guardian_name: '', guardian_relation: 'Spouse', guardian_phone: '',
    // Clinical
    admission_type: 'OPD', department: '', doctor_id: '', notes: '',
    status: 'Stable', mlc_type: 'None', mlc_police_info: '',
    referred_by: '', referral_hospital: '',
    // Payment
    payment_type: 'Self Pay (Cash)',
    insurance_company: '', tpa_name: '', policy_no: '', validity: '',
    // Meta
    consent_given: false, estimate_given: false,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const STEPS = ['Personal Details', 'Clinical Info', 'Payment / Insurance', 'Consent & Submit']

  const validateStep = () => {
    if (step === 0 && (!form.name || !form.age || !form.phone)) return 'Name, Age and Phone are required.'
    if (step === 1 && !form.department) return 'Department is required.'
    if (step === 2) return null
    if (step === 3 && !form.consent_given) return 'Patient / Guardian consent is required before registration.'
    return null
  }

  const next = () => {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    if (step < 3) setStep(s => s + 1)
    else submit()
  }

  const submit = async () => {
    setSaving(true); setError(null)
    try {
      const payload = { ...form }
      const patient = await api.createPatient(payload)
      onSave(patient); onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const isInsurance = form.payment_type === 'Insurance / TPA'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 780, width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>New Patient Registration</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
              UHID will be auto-generated upon submission
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
              <div
                onClick={() => i < step && setStep(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  cursor: i < step ? 'pointer' : 'default', whiteSpace: 'nowrap',
                }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: i < step ? '#10b981' : i === step ? 'var(--primary-600)' : 'var(--gray-200)',
                  color: i <= step ? '#fff' : 'var(--gray-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {i < step ? <CheckCircle size={13} /> : i + 1}
                </div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: i === step ? 700 : 400,
                  color: i === step ? 'var(--primary-700)' : i < step ? '#059669' : 'var(--gray-400)',
                }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1.5, background: i < step ? '#10b981' : 'var(--gray-200)', margin: '0 0.5rem' }} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

          {/* STEP 0 — Personal */}
          {step === 0 && (
            <div>
              <SectionHeader label="Basic Information" icon={UserCheck} />
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <F label="Full Name" required span={2}><input className="form-input" placeholder="e.g. Priya Sharma" value={form.name} onChange={e => set('name', e.target.value)} /></F>
                <F label="Admission Type" required>
                  <select className="form-input form-select" value={form.admission_type} onChange={e => set('admission_type', e.target.value)}>
                    {ADMISSION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </F>
                <F label="Age*"><input className="form-input" type="number" min="0" max="120" placeholder="Years" value={form.age} onChange={e => set('age', e.target.value)} /></F>
                <F label="Date of Birth"><input className="form-input" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} /></F>
                <F label="Gender">
                  <select className="form-input form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                    {GENDERS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </F>
                <F label="Blood Group">
                  <select className="form-input form-select" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
                    {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </F>
                <F label="Marital Status">
                  <select className="form-input form-select" value={form.marital_status} onChange={e => set('marital_status', e.target.value)}>
                    <option value="">Select</option>
                    {MARITAL_STATUS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </F>
                <F label="Religion">
                  <select className="form-input form-select" value={form.religion} onChange={e => set('religion', e.target.value)}>
                    <option value="">Select</option>
                    {RELIGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </F>
              </div>

              <SectionHeader label="Contact Details" icon={Phone} color="#0d9488" />
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <F label="Mobile Number" required><input className="form-input" type="tel" placeholder="10-digit mobile" value={form.phone} onChange={e => set('phone', e.target.value)} /></F>
                <F label="Alternate Mobile"><input className="form-input" type="tel" placeholder="Optional" value={form.alt_phone} onChange={e => set('alt_phone', e.target.value)} /></F>
                <F label="Email"><input className="form-input" type="email" placeholder="Optional" value={form.email} onChange={e => set('email', e.target.value)} /></F>
                <F label="Address" span={2}><input className="form-input" placeholder="House No., Street, Area" value={form.address} onChange={e => set('address', e.target.value)} /></F>
                <F label="City / District"><input className="form-input" placeholder="e.g. Pune" value={form.city} onChange={e => set('city', e.target.value)} /></F>
                <F label="State">
                  <select className="form-input form-select" value={form.state} onChange={e => set('state', e.target.value)}>
                    {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </F>
                <F label="PIN Code"><input className="form-input" placeholder="6-digit PIN" maxLength={6} value={form.pincode} onChange={e => set('pincode', e.target.value)} /></F>
              </div>

              <SectionHeader label="ID Proofs (Optional)" icon={CreditCard} color="#6366f1" />
              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <F label="Aadhaar Number"><input className="form-input" placeholder="XXXX XXXX XXXX" maxLength={14} value={form.aadhaar} onChange={e => set('aadhaar', e.target.value)} /></F>
                <F label="ABHA ID (Health ID)"><input className="form-input" placeholder="14-digit ABHA number" value={form.abha_id} onChange={e => set('abha_id', e.target.value)} /></F>
              </div>

              <SectionHeader label="Emergency Contact / Guardian" icon={Shield} color="#f59e0b" />
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <F label="Guardian / Attendant Name" span={1}><input className="form-input" placeholder="Name" value={form.guardian_name} onChange={e => set('guardian_name', e.target.value)} /></F>
                <F label="Relation">
                  <select className="form-input form-select" value={form.guardian_relation} onChange={e => set('guardian_relation', e.target.value)}>
                    {RELATIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </F>
                <F label="Guardian Phone"><input className="form-input" type="tel" placeholder="Mobile" value={form.guardian_phone} onChange={e => set('guardian_phone', e.target.value)} /></F>
              </div>
            </div>
          )}

          {/* STEP 1 — Clinical */}
          {step === 1 && (
            <div>
              <SectionHeader label="Clinical Details" icon={Activity} />
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <F label="Department" required span={1}>
                  <select className="form-input form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </F>
                <F label="Attending Doctor">
                  <select className="form-input form-select" value={form.doctor_id} onChange={e => set('doctor_id', e.target.value)}>
                    <option value="">Select doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                  </select>
                </F>
                <F label="Initial Status">
                  <select className="form-input form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                    {Object.keys(STATUS_STYLES).filter(s => s !== 'Discharged').map(s => <option key={s}>{s}</option>)}
                  </select>
                </F>
                <F label="Patient Category">
                  <select className="form-input form-select" value={form.patient_category} onChange={e => set('patient_category', e.target.value)}>
                    {PATIENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </F>
                <F label="Referred By (Doctor / Hospital)" span={2}><input className="form-input" placeholder="Referring doctor name" value={form.referred_by} onChange={e => set('referred_by', e.target.value)} /></F>
                <F label="Chief Complaint / Presenting Complaints" span={3}>
                  <textarea className="form-input form-textarea" placeholder="Briefly describe the patient's main complaints and reason for visit..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ minHeight: 80 }} />
                </F>
              </div>

              <SectionHeader label="Medico-Legal Case (MLC)" icon={AlertTriangle} color="#ef4444" />
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <F label="MLC Type">
                  <select className="form-input form-select" value={form.mlc_type} onChange={e => set('mlc_type', e.target.value)}>
                    {MLC_TYPES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </F>
                {form.mlc_type !== 'None' && (
                  <F label="Police Station / FIR Details" span={2}>
                    <input className="form-input" placeholder="Police station, FIR no, officer name" value={form.mlc_police_info} onChange={e => set('mlc_police_info', e.target.value)} />
                  </F>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 — Payment / Insurance */}
          {step === 2 && (
            <div>
              <SectionHeader label="Payment Details" icon={CreditCard} color="#6366f1" />
              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <F label="Payment / Scheme Type" required>
                  <select className="form-input form-select" value={form.payment_type} onChange={e => set('payment_type', e.target.value)}>
                    {PAYMENT_TYPES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </F>
                <F label="Patient Category">
                  <select className="form-input form-select" value={form.patient_category} onChange={e => set('patient_category', e.target.value)}>
                    {PATIENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </F>
              </div>

              {isInsurance && (
                <>
                  <SectionHeader label="Insurance / TPA Details" icon={Shield} color="#10b981" />
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <F label="Insurance Company"><input className="form-input" placeholder="e.g. Star Health, HDFC ERGO" value={form.insurance_company} onChange={e => set('insurance_company', e.target.value)} /></F>
                    <F label="TPA Name"><input className="form-input" placeholder="Third Party Administrator name" value={form.tpa_name} onChange={e => set('tpa_name', e.target.value)} /></F>
                    <F label="Policy / Member ID"><input className="form-input" placeholder="Policy number" value={form.policy_no} onChange={e => set('policy_no', e.target.value)} /></F>
                    <F label="Policy Validity"><input className="form-input" type="date" value={form.validity} onChange={e => set('validity', e.target.value)} /></F>
                  </div>
                </>
              )}

              {!isInsurance && (
                <div style={{ padding: '1.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-200)', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                  <CreditCard size={28} style={{ marginBottom: '0.5rem', opacity: 0.4 }} /><br />
                  No insurance details needed for <strong style={{ color: 'var(--gray-600)' }}>{form.payment_type}</strong>.
                  <br />Billing will be generated directly after consultation.
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Consent */}
          {step === 3 && (
            <div>
              <SectionHeader label="Patient Summary" icon={UserCheck} color="#10b981" />
              <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--gray-200)' }}>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {[
                    ['Name', form.name || '—'],
                    ['Age / Gender', `${form.age || '—'} yrs / ${form.gender}`],
                    ['Blood Group', form.blood_group],
                    ['Mobile', form.phone || '—'],
                    ['Department', form.department || '—'],
                    ['Admission Type', form.admission_type],
                    ['Payment', form.payment_type],
                    ['MLC', form.mlc_type],
                    ['Category', form.patient_category],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: '#fff', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{k}</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <SectionHeader label="Consent & Compliance" icon={Shield} color="#ef4444" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  {
                    key: 'consent_given',
                    title: 'General Consent for Treatment *',
                    desc: 'Patient / Guardian has been explained the nature of treatment and has given verbal/written consent. A signed consent form will be obtained at the ward.',
                    required: true,
                  },
                  {
                    key: 'estimate_given',
                    title: 'Treatment Cost Estimate Provided (NABH Requirement)',
                    desc: 'A written estimate of anticipated treatment costs has been provided to the patient / attender as per NABH guidelines.',
                    required: false,
                  },
                ].map(({ key, title, desc, required }) => (
                  <label key={key} style={{ display: 'flex', gap: '0.875rem', padding: '1rem', borderRadius: 'var(--radius-lg)', border: `1.5px solid ${form[key] ? 'var(--primary-300)' : 'var(--gray-200)'}`, background: form[key] ? 'var(--primary-50)' : '#fff', cursor: 'pointer', transition: 'all 150ms' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${form[key] ? 'var(--primary-600)' : 'var(--gray-300)'}`, background: form[key] ? 'var(--primary-600)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {form[key] && <CheckCircle size={13} color="#fff" />}
                    </div>
                    <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} style={{ display: 'none' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-800)', marginBottom: '0.25rem' }}>{title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Step {step + 1} of {STEPS.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => { if (step > 0) { setStep(s => s - 1); setError(null) } else onClose() }}>
              {step === 0 ? 'Cancel' : '← Back'}
            </button>
            <button className="btn btn-primary" onClick={next} disabled={saving}>
              {saving ? <><Loader size={14} className="spin" /> Registering…</> : step < 3 ? 'Continue →' : <><CheckCircle size={14} /> Complete Registration</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Patient Detail Side Panel ────────────────────────────────────────────────
function PatientPanel({ patient, onClose }) {
  const [tab, setTab] = useState('overview')
  const [forms, setForms] = useState([])
  const [templates, setTemplates] = useState([])
  const [loadingForms, setLoadingForms] = useState(false)
  const [assigningId, setAssigningId] = useState(null)
  const [openForm, setOpenForm] = useState(null)
  const [dischargeSummaries, setDischargeSummaries] = useState([])
  const [dischargeTpls, setDischargeTpls] = useState([])
  const [loadingDischarge, setLoadingDischarge] = useState(false)
  const [assigningDischargeId, setAssigningDischargeId] = useState(null)

  useEffect(() => {
    if (tab !== 'forms') return
    setLoadingForms(true)
    Promise.all([api.getPatientForms(patient.id), api.getFormTemplates()])
      .then(([f, t]) => { setForms((f || []).map(form => ({ ...form, type: 'form' }))); setTemplates(t || []) })
      .catch(console.error).finally(() => setLoadingForms(false))
  }, [tab, patient.id])

  useEffect(() => {
    if (tab !== 'discharge') return
    setLoadingDischarge(true)
    Promise.all([api.getPatientDischargeSummaries(patient.id), api.getDischargeTemplates()])
      .then(([summaries, tpls]) => {
        setDischargeSummaries((summaries || []).map(s => ({ ...s, type: 'discharge' })))
        setDischargeTpls(tpls || [])
      }).catch(console.error).finally(() => setLoadingDischarge(false))
  }, [tab, patient.id])

  const handleAssign = async (template) => {
    setAssigningId(template.id)
    try {
      const form = await api.createPatientForm({ template_id: template.id, patient_id: patient.id, filled_by: '' })
      const enriched = { ...form, template_name: template.name, category: template.category, file_path: template.file_path, file_name: template.file_name, type: 'form' }
      setForms(prev => [enriched, ...prev])
      setOpenForm(enriched)
    } catch (e) { alert('Failed: ' + e.message) } finally { setAssigningId(null) }
  }

  const handleAssignDischarge = async (tpl) => {
    setAssigningDischargeId(tpl.id)
    try {
      const summary = await api.createDischargeSummary({ template_id: tpl.id, patient_id: patient.id, filled_by: '' })
      const enriched = { ...summary, template_name: tpl.name, category: tpl.type, file_path: tpl.file_path, file_name: tpl.file_name, type: 'discharge' }
      setDischargeSummaries(prev => [enriched, ...prev])
      setOpenForm(enriched)
    } catch (e) { alert('Failed: ' + e.message) } finally { setAssigningDischargeId(null) }
  }

  const handleAnnotationsSaved = useCallback((updatedAnnotations, newStatus) => {
    if (!openForm) return
    const updater = f => f && f.id === openForm.id ? { ...f, annotations: updatedAnnotations, status: newStatus || f.status } : f
    setForms(prev => (prev || []).map(updater))
    setDischargeSummaries(prev => (prev || []).map(updater))
  }, [openForm])

  const PANEL_TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'clinical', label: 'Clinical', icon: FileText },
    { id: 'forms', label: 'Forms', icon: ClipboardList },
    { id: 'discharge', label: 'Discharge', icon: CheckCircle },
  ]

  const isMLC = patient.mlc_type && patient.mlc_type !== 'None'

  return (
    <>
      {openForm && openForm.type === 'discharge' && (
        <DischargeEditor
          formInstance={{ ...openForm, patient_name: patient.name }}
          patientData={patient}
          onClose={() => setOpenForm(null)}
          onSaved={(html) => handleAnnotationsSaved([], 'in-progress')}
        />
      )}

      {openForm && openForm.type !== 'discharge' && (
        <FormViewer
          formInstance={{ ...openForm, patient_name: patient.name }}
          patientData={patient}
          onClose={() => setOpenForm(null)}
          onAnnotationsSaved={handleAnnotationsSaved}
          allForms={[...(forms || []).map(f => ({ ...f, type: 'form' }))].map(f => ({ ...f, patient_name: patient.name }))}
          onSwitchForm={(f) => setOpenForm(f)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-100)', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', animation: 'slideInLeft 280ms cubic-bezier(0.34,1.12,0.64,1)', minHeight: 0, overflow: 'hidden' }}>

        {/* Panel Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--gray-100)', background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--accent-teal) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: '#fff', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
              {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{patient.name}</span>
                {isMLC && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.58rem', fontWeight: 800, padding: '0.15rem 0.4rem', borderRadius: 4, letterSpacing: '0.05em' }}>MLC</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.125rem' }}>
                UHID: {patient.id} · Age {patient.age} · {patient.gender}
              </div>
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999 }}>{patient.admission_type}</span>
                <span style={{ background: STATUS_STYLES[patient.status]?.bg || 'rgba(255,255,255,0.15)', color: STATUS_STYLES[patient.status]?.color || '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999 }}>{patient.status}</span>
                {patient.blood_group && <span style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999 }}>{patient.blood_group}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
          {PANEL_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '0.75rem 0.25rem', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontWeight: tab === id ? 700 : 500, fontSize: '0.75rem', color: tab === id ? 'var(--primary-600)' : 'var(--gray-500)', borderBottom: `2.5px solid ${tab === id ? 'var(--primary-500)' : 'transparent'}`, transition: 'all 150ms' }}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* Panel Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem' }}>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div>
              {isMLC && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertTriangle size={14} color="#dc2626" />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#dc2626' }}>MLC Case</span>
                    <span style={{ fontSize: '0.8rem', color: '#dc2626' }}> — {patient.mlc_type}</span>
                    {patient.mlc_police_info && <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.2rem' }}>{patient.mlc_police_info}</div>}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.25rem' }}>
                {[
                  { icon: Calendar, label: 'Admitted', value: patient.admitted_at ? new Date(patient.admitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                  { icon: BedDouble, label: 'Department', value: patient.department || '—' },
                  { icon: Phone, label: 'Mobile', value: patient.phone || '—' },
                  { icon: FileText, label: 'Consultant', value: patient.doctor_name ? `Dr. ${patient.doctor_name}` : '—' },
                  { icon: CreditCard, label: 'Payment', value: patient.payment_type || '—' },
                  { icon: Users, label: 'Guardian', value: patient.guardian_name ? `${patient.guardian_name} (${patient.guardian_relation || ''})` : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', border: '1px solid var(--gray-100)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Icon size={12} color="var(--primary-500)" />
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-800)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {patient.notes && (
                <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chief Complaint</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>{patient.notes}</div>
                </div>
              )}

              <div onClick={() => setTab('forms')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: '1px solid var(--gray-100)', transition: 'all 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--gray-50)'}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={16} color="var(--primary-600)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--gray-800)' }}>View Patient Forms</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Consent forms, assessment sheets, nursing notes</div>
                </div>
                <ChevronRight size={15} color="var(--gray-400)" />
              </div>
            </div>
          )}

          {/* CLINICAL tab */}
          {tab === 'clinical' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.25rem' }}>
                {[
                  ['UHID', patient.id],
                  ['Age / DOB', `${patient.age} yrs`],
                  ['Gender', patient.gender],
                  ['Blood Group', patient.blood_group],
                  ['Aadhaar', patient.aadhaar || '—'],
                  ['ABHA ID', patient.abha_id || '—'],
                  ['City', patient.city || '—'],
                  ['State', patient.state || '—'],
                  ['Religion', patient.religion || '—'],
                  ['Marital Status', patient.marital_status || '—'],
                  ['Patient Category', patient.patient_category || 'General'],
                  ['Referred By', patient.referred_by || '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.75rem', border: '1px solid var(--gray-100)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{label}</div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-800)' }}>{value}</div>
                  </div>
                ))}
              </div>
              {patient.payment_type?.includes('Insurance') && (
                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insurance Details</div>
                  {[['Company', patient.insurance_company], ['TPA', patient.tpa_name], ['Policy No', patient.policy_no], ['Valid Till', patient.validity]].map(([k, v]) => v && (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
                      <span style={{ color: 'var(--gray-500)' }}>{k}</span>
                      <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FORMS tab */}
          {tab === 'forms' && (
            <div>
              {loadingForms ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}><Loader size={22} className="spin" style={{ display: 'inline-block' }} /></div>
              ) : (
                <>
                  {forms.length > 0 && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Assigned Forms ({forms.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {forms.map(form => (
                          <div key={form.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--gray-100)', cursor: 'pointer', transition: 'all 150ms', position: 'relative', overflow: 'hidden' }}
                            onMouseEnter={e => { e.currentTarget.style.border = '1.5px solid var(--primary-200)'; e.currentTarget.style.background = 'var(--primary-50)' }}
                            onMouseLeave={e => { e.currentTarget.style.border = '1.5px solid var(--gray-100)'; e.currentTarget.style.background = '#fff' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: form.status === 'completed' ? '#10b981' : form.status === 'in-progress' ? '#f59e0b' : 'var(--gray-200)', borderRadius: '3px 0 0 3px' }} />
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '0.25rem' }}>
                              <FileText size={16} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.template_name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                <span style={{ ...(CATEGORY_COLORS[form.category] || CATEGORY_COLORS.General), fontSize: '0.58rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, textTransform: 'uppercase' }}>{form.category}</span>
                                <span style={{ ...(FORM_STATUS[form.status] || FORM_STATUS.blank), fontSize: '0.58rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999 }}>{FORM_STATUS[form.status]?.label || 'Blank'}</span>
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); setOpenForm(form) }} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--primary-600)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.625rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                              <Pen size={11} /> Open
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {templates.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Templates — Click to Assign</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {templates.map(t => {
                          const count = forms.filter(f => f.template_id === t.id).length
                          return (
                            <div key={t.id} onClick={() => handleAssign(t)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: count > 0 ? 'var(--primary-50)' : 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: `1px dashed ${count > 0 ? 'var(--primary-200)' : 'var(--gray-200)'}`, cursor: assigningId === t.id ? 'wait' : 'pointer', opacity: assigningId === t.id ? 0.6 : 1, transition: 'all 150ms' }}
                              onMouseEnter={e => { if (assigningId !== t.id) { e.currentTarget.style.background = 'var(--primary-50)'; e.currentTarget.style.borderColor = 'var(--primary-300)' } }}
                              onMouseLeave={e => { e.currentTarget.style.background = count > 0 ? 'var(--primary-50)' : 'var(--gray-50)'; e.currentTarget.style.borderColor = count > 0 ? 'var(--primary-200)' : 'var(--gray-200)' }}>
                              <div style={{ width: 32, height: 32, borderRadius: 7, background: count > 0 ? 'var(--primary-100)' : 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {assigningId === t.id ? <Loader size={13} className="spin" /> : <Plus size={13} color={count > 0 ? 'var(--primary-600)' : 'var(--gray-500)'} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                <span style={{ ...(CATEGORY_COLORS[t.category] || CATEGORY_COLORS.General), fontSize: '0.58rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, textTransform: 'uppercase' }}>{t.category}</span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--primary-500)', fontWeight: 600, flexShrink: 0 }}>{count > 0 ? 'Add Copy' : 'Assign'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {forms.length === 0 && templates.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <FolderOpen size={26} color="var(--gray-300)" style={{ marginBottom: '0.75rem' }} />
                      <div style={{ fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.25rem' }}>No form templates available</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Ask an admin to upload templates from Form Templates page.</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* DISCHARGE tab */}
          {tab === 'discharge' && (
            <div>
              {loadingDischarge ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}><Loader size={22} className="spin" style={{ display: 'inline-block' }} /></div>
              ) : (
                <>
                  {dischargeSummaries.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Saved Summaries ({dischargeSummaries.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {dischargeSummaries.map(s => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--gray-100)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: s.approved_by ? '#8b5cf6' : s.status === 'completed' ? '#10b981' : s.status === 'in-progress' ? '#f59e0b' : 'var(--gray-200)', borderRadius: '3px 0 0 3px' }} />
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: s.approved_by ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)' : 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '0.25rem' }}>
                              <FileText size={16} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.template_name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                {s.approved_by ? (
                                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, background: 'rgba(139,92,246,0.1)', color: '#7c3aed' }}>
                                    ✓ Approved by {s.approved_by}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, background: s.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: s.status === 'completed' ? '#059669' : '#b45309' }}>
                                    {s.status === 'completed' ? 'Completed' : s.status === 'in-progress' ? 'In Progress' : 'Blank'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button onClick={() => setOpenForm({ ...s, type: 'discharge' })} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.625rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                              <Pen size={11} /> {s.approved_by ? 'View' : 'Open'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dischargeTpls.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Assign New Template</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {dischargeTpls.map(tpl => {
                          const count = dischargeSummaries.filter(s => s.template_id === tpl.id).length
                          return (
                            <div key={tpl.id} onClick={() => handleAssignDischarge(tpl)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: count > 0 ? 'var(--primary-50)' : 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: `1px dashed ${count > 0 ? 'var(--primary-200)' : 'var(--gray-200)'}`, cursor: assigningDischargeId === tpl.id ? 'wait' : 'pointer', opacity: assigningDischargeId === tpl.id ? 0.6 : 1, transition: 'all 150ms' }}>
                              <div style={{ width: 32, height: 32, borderRadius: 7, background: count > 0 ? 'rgba(16,185,129,0.12)' : 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {assigningDischargeId === tpl.id ? <Loader size={13} className="spin" /> : <Plus size={13} color={count > 0 ? '#059669' : 'var(--gray-500)'} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</div>
                                <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, textTransform: 'uppercase', background: 'var(--gray-100)', color: 'var(--gray-500)' }}>{tpl.type}</span>
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>{count > 0 ? 'Add Copy' : 'Assign'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {dischargeSummaries.length === 0 && dischargeTpls.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <CheckCircle size={26} color="var(--gray-300)" style={{ marginBottom: '0.75rem' }} />
                      <div style={{ fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.25rem' }}>No discharge templates yet</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Ask an admin to upload PDF templates from the Discharge Templates page.</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main Patients Page ───────────────────────────────────────────────────────
export default function Patients() {
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [pts, docs] = await Promise.all([api.getPatients({ search, filter }), api.getDoctors()])
      setPatients(pts); setDoctors(docs)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, filter])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const handleSave = (newPatient) => setPatients(p => [newPatient, ...p])
  const panelOpen = !!selectedPatient

  const FILTERS = ['All', 'IPD', 'OPD', 'Emergency', 'Critical', 'Stable', 'Recovering']

  // Stats summary
  const ipd = patients.filter(p => p.admission_type === 'IPD').length
  const opd = patients.filter(p => p.admission_type === 'OPD').length
  const critical = patients.filter(p => p.status === 'Critical' || p.status === 'Serious').length
  const mlcCount = patients.filter(p => p.mlc_type && p.mlc_type !== 'None').length

  return (
    <div className="animate-fadeInUp">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Administration</h1>
          <p className="page-subtitle">
            {loading ? '…' : `${patients.length} patients`} registered · UHID-based records system
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Register Patient
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Registered', value: patients.length, color: 'var(--primary-600)', icon: Users, bg: 'var(--primary-50)' },
          { label: 'IPD (In-Patient)', value: ipd, color: '#0d9488', icon: BedDouble, bg: 'rgba(13,148,136,0.08)' },
          { label: 'OPD (Out-Patient)', value: opd, color: '#6366f1', icon: UserCheck, bg: 'rgba(99,102,241,0.08)' },
          { label: 'Critical / Serious', value: critical, color: '#dc2626', icon: AlertTriangle, bg: 'rgba(239,68,68,0.08)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? '…' : s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input" style={{ paddingLeft: '2.25rem', fontSize: '0.875rem' }} placeholder="Search by name, UHID, phone, department..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          {mlcCount > 0 && (
            <button
              className={`btn btn-sm ${filter === 'MLC' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(filter === 'MLC' ? 'All' : 'MLC')}
              style={{ background: filter === 'MLC' ? '#ef4444' : undefined, borderColor: '#ef4444', color: filter === 'MLC' ? '#fff' : '#ef4444' }}>
              <AlertTriangle size={12} /> MLC ({mlcCount})
            </button>
          )}
        </div>
      </div>

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: panelOpen ? '1fr 460px' : '1fr', gap: '1.25rem', alignItems: 'start', transition: 'grid-template-columns 300ms ease' }}>

        {/* Table */}
        <div className="card" style={{ minWidth: 0 }}>
          {error && <div style={{ padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: '0.875rem' }}>⚠ {error} — Make sure the API server is running.</div>}

          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>UHID</th>
                  <th>Blood</th>
                  <th>Type</th>
                  {!panelOpen && <><th>Department</th><th>Consultant</th><th>Registered</th></>}
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={panelOpen ? 6 : 9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                    <Loader size={20} className="spin" style={{ display: 'inline-block' }} />
                  </td></tr>
                ) : patients.length === 0 ? (
                  <tr><td colSpan={panelOpen ? 6 : 9} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Users size={28} style={{ color: 'var(--gray-300)', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                    <div style={{ color: 'var(--gray-500)', fontWeight: 600 }}>No patients found</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>Try a different search or filter, or register a new patient.</div>
                  </td></tr>
                ) : patients.map(p => (
                  <tr key={p.id}
                    style={{ background: selectedPatient?.id === p.id ? 'var(--primary-50)' : undefined, cursor: 'pointer' }}
                    onClick={() => setSelectedPatient(prev => prev?.id === p.id ? null : p)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                          {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '0.875rem' }}>{p.name}</span>
                            {p.mlc_type && p.mlc_type !== 'None' && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.5rem', fontWeight: 800, padding: '0.1rem 0.3rem', borderRadius: 3, letterSpacing: '0.04em' }}>MLC</span>}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Age {p.age} · {p.gender}{p.phone && ` · ${p.phone}`}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--gray-500)', background: 'var(--gray-50)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{p.id}</span></td>
                    <td><span style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.45rem', borderRadius: 999 }}>{p.blood_group || '?'}</span></td>
                    <td><span style={{ background: p.admission_type === 'IPD' ? 'var(--primary-50)' : p.admission_type === 'Emergency' ? 'rgba(239,68,68,0.08)' : 'rgba(13,148,136,0.08)', color: p.admission_type === 'IPD' ? 'var(--primary-700)' : p.admission_type === 'Emergency' ? '#dc2626' : 'var(--accent-teal)', fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.45rem', borderRadius: 999 }}>{p.admission_type}</span></td>
                    {!panelOpen && (
                      <>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{p.department || '—'}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{p.doctor_name ? `Dr. ${p.doctor_name}` : '—'}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                          {p.admitted_at ? new Date(p.admitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </>
                    )}
                    <td>
                      <span style={{ background: STATUS_STYLES[p.status]?.bg, color: STATUS_STYLES[p.status]?.color, fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.45rem', borderRadius: 999, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {p.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-icon-sm"
                        title="View Patient"
                        onClick={() => setSelectedPatient(prev => prev?.id === p.id ? null : p)}
                        style={{ color: selectedPatient?.id === p.id ? 'var(--primary-600)' : undefined }}>
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              Showing {patients.length} patient{patients.length !== 1 ? 's' : ''}
            </span>
            {selectedPatient && (
              <span style={{ fontSize: '0.8rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                Viewing: {selectedPatient.name}
              </span>
            )}
          </div>
        </div>

        {/* Side Panel */}
        {selectedPatient && (
          <PatientPanel
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
          />
        )}
      </div>

      {showModal && <RegisterModal doctors={doctors} onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  )
}

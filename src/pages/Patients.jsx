import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Plus, Eye, FileText, MoreHorizontal, Loader,
  X, Pen, ClipboardList, Activity, Phone, Droplets,
  BedDouble, Calendar, ChevronRight, CheckCircle, FolderOpen, Upload, Download
} from 'lucide-react'
import { api } from '../api'
import FormViewer from '../components/FormViewer'

const STATUS_STYLES = {
  Critical: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  Stable: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  Recovering: { bg: 'rgba(59,130,246,0.1)', color: '#1d4ed8' },
  'Under Obs': { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
}

const FORM_STATUS = {
  blank: { bg: 'var(--gray-100)', color: 'var(--gray-500)', label: 'Blank' },
  'in-progress': { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'In Progress' },
  completed: { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Completed' },
}

const CATEGORY_COLORS = {
  General: { bg: 'var(--gray-100)', color: 'var(--gray-600)' },
  Consent: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  Assessment: { bg: 'rgba(99,102,241,0.1)', color: '#4338ca' },
  Discharge: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  Nursing: { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
  ICU: { bg: 'rgba(239,68,68,0.12)', color: '#b91c1c' },
  OT: { bg: 'rgba(13,148,136,0.1)', color: '#0d9488' },
  Emergency: { bg: 'rgba(239,68,68,0.15)', color: '#dc2626' },
}

const DEPARTMENTS = ['ICU', 'Cardiology', 'Orthopaedics', 'General Ward', 'Obs & Gyn', 'Neurology', 'Oncology', 'Paediatrics', 'Nephrology']

// ─── Admit Patient Modal ─────────────────────────────────────────────────────
function AdmitModal({ doctors, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', age: '', gender: 'Male', blood_group: 'O+', department: '',
    doctor_id: '', phone: '', admission_type: 'IPD', notes: '', status: 'Stable',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.department) {
      setError('Please fill in Name, Age and Department.')
      return
    }
    setSaving(true); setError(null)
    try {
      const patient = await api.createPatient(form)
      onSave(patient); onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Admit New Patient</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Fill in the patient details below</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name*</label>
              <input className="form-input" type="text" placeholder="e.g. Priya Kapoor" value={form.name} onChange={e => handle('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" type="tel" placeholder="e.g. 98120 44312" value={form.phone} onChange={e => handle('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Age*</label>
              <input className="form-input" type="number" placeholder="e.g. 45" value={form.age} onChange={e => handle('age', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input form-select" value={form.gender} onChange={e => handle('gender', e.target.value)}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Blood Group</label>
              <select className="form-input form-select" value={form.blood_group} onChange={e => handle('blood_group', e.target.value)}>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Admission Type</label>
              <select className="form-input form-select" value={form.admission_type} onChange={e => handle('admission_type', e.target.value)}>
                <option>IPD</option><option>OPD</option><option>Emergency</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department*</label>
              <select className="form-input form-select" value={form.department} onChange={e => handle('department', e.target.value)}>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Attending Doctor</label>
              <select className="form-input form-select" value={form.doctor_id} onChange={e => handle('doctor_id', e.target.value)}>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Chief Complaint / Reason for Admission</label>
              <textarea className="form-input form-textarea" placeholder="Briefly describe the patient's presenting complaint..." value={form.notes} onChange={e => handle('notes', e.target.value)} style={{ minHeight: 80 }} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <Plus size={14} />} Confirm Admission
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Patient Detail Side Panel ───────────────────────────────────────────────
function PatientPanel({ patient, onClose }) {
  const [tab, setTab] = useState('overview')
  const [forms, setForms] = useState([])
  const [templates, setTemplates] = useState([])
  const [loadingForms, setLoadingForms] = useState(false)
  const [assigningId, setAssigningId] = useState(null)
  const [openForm, setOpenForm] = useState(null) // open FormViewer
  // Discharge summary state
  const [dischargeSummaries, setDischargeSummaries] = useState([])
  const [dischargeTpls, setDischargeTpls] = useState([])
  const [loadingDischarge, setLoadingDischarge] = useState(false)
  const [assigningDischargeId, setAssigningDischargeId] = useState(null)

  useEffect(() => {
    if (tab !== 'forms') return
    setLoadingForms(true)
    Promise.all([
      api.getPatientForms(patient.id),
      api.getFormTemplates(),
    ]).then(([f, t]) => {
      setForms((f || []).map(form => ({ ...form, type: 'form' })))
      setTemplates(t || [])
    }).catch(console.error).finally(() => setLoadingForms(false))
  }, [tab, patient.id])

  useEffect(() => {
    if (tab !== 'discharge') return
    setLoadingDischarge(true)
    Promise.all([
      api.getPatientDischargeSummaries(patient.id),
      api.getDischargeTemplates(),
    ]).then(([summaries, tpls]) => {
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

  // Update the form card in the panel after annotations are saved
  const handleAnnotationsSaved = useCallback((updatedAnnotations, newStatus) => {
    if (!openForm) return
    const updater = f => f && f.id === openForm.id ? { ...f, annotations: updatedAnnotations, status: newStatus || f.status } : f
    setForms(prev => (prev || []).map(updater))
    setDischargeSummaries(prev => (prev || []).map(updater))
  }, [openForm])

  const infoRows = [
    { icon: Calendar, label: 'Admitted', value: patient.admitted_at ? new Date(patient.admitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
    { icon: BedDouble, label: 'Department', value: patient.department || '—' },
    { icon: Activity, label: 'Status', value: patient.status || '—' },
    { icon: Droplets, label: 'Blood Group', value: patient.blood_group || '—' },
    { icon: Phone, label: 'Phone', value: patient.phone || '—' },
    { icon: FileText, label: 'Doctor', value: patient.doctor_name || '—' },
  ]

  return (
    <>
      {/* FormViewer — full screen, opened directly from panel */}
      {openForm && (
        <FormViewer
          formInstance={{ ...openForm, patient_name: patient.name }}
          patientData={patient}
          onClose={() => setOpenForm(null)}
          onAnnotationsSaved={handleAnnotationsSaved}
          allForms={[
            ...(forms || []).map(f => ({ ...f, type: 'form' })),
            ...(dischargeSummaries || []).map(s => ({ ...s, type: 'discharge' }))
          ].map(f => ({ ...f, patient_name: patient.name }))}
          onSwitchForm={(f) => setOpenForm(f)}
        />
      )}

      {/* Inline Side Panel */}
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: '#fff', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--gray-100)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        animation: 'slideInLeft 280ms cubic-bezier(0.34,1.12,0.64,1)',
        minHeight: 0, overflow: 'hidden',
      }}>
        {/* Panel Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--gray-100)',
          display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--accent-teal) 100%)',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: '#fff', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
            {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{patient.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.125rem' }}>
              {patient.id} · Age {patient.age} · {patient.gender} · {patient.admission_type}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: STATUS_STYLES[patient.status]?.bg || 'rgba(255,255,255,0.15)', color: STATUS_STYLES[patient.status]?.color || '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: 999, backdropFilter: 'blur(4px)' }}>
              {patient.status}
            </span>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'forms', label: 'Forms', icon: ClipboardList },
            { id: 'discharge', label: 'Discharge', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, padding: '0.875rem', border: 'none', background: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                fontWeight: tab === id ? 700 : 500, fontSize: '0.8rem',
                color: tab === id ? 'var(--primary-600)' : 'var(--gray-500)',
                borderBottom: `2.5px solid ${tab === id ? 'var(--primary-500)' : 'transparent'}`,
                transition: 'all 150ms',
              }}
            >
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* Panel Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {tab === 'overview' && (
            <div>
              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {infoRows.map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', border: '1px solid var(--gray-100)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                      <Icon size={13} color="var(--primary-500)" />
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {patient.notes && (
                <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admission Notes</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>{patient.notes}</div>
                </div>
              )}

              {/* Quick navigate to Forms */}
              <div
                onClick={() => setTab('forms')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginTop: '1.25rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: '1px solid var(--gray-100)', transition: 'all 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--gray-50)'}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardList size={18} color="var(--primary-600)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>View Patient Forms</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>See all assigned hospital forms for this patient</div>
                </div>
                <ChevronRight size={16} color="var(--gray-400)" />
              </div>
            </div>
          )}

          {tab === 'forms' && (
            <div>
              {loadingForms ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                  <Loader size={22} className="spin" style={{ display: 'inline-block' }} />
                </div>
              ) : (
                <>
                  {/* Assigned forms */}
                  {forms.length > 0 && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
                        Assigned Forms ({forms.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {forms.map(form => (
                          <div
                            key={form.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.875rem',
                              padding: '1rem', background: '#fff', borderRadius: 'var(--radius-lg)',
                              border: '1.5px solid var(--gray-100)', cursor: 'pointer',
                              transition: 'all 150ms', position: 'relative', overflow: 'hidden',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.border = '1.5px solid var(--primary-200)'; e.currentTarget.style.background = 'var(--primary-50)' }}
                            onMouseLeave={e => { e.currentTarget.style.border = '1.5px solid var(--gray-100)'; e.currentTarget.style.background = '#fff' }}
                          >
                            {/* Status indicator stripe */}
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: form.status === 'completed' ? '#10b981' : form.status === 'in-progress' ? '#f59e0b' : 'var(--gray-200)', borderRadius: '4px 0 0 4px' }} />
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '0.5rem' }}>
                              <FileText size={18} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.template_name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                <span style={{ ...(CATEGORY_COLORS[form.category] || CATEGORY_COLORS.General), fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {form.category}
                                </span>
                                <span style={{ ...(FORM_STATUS[form.status] || FORM_STATUS.blank), fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 999 }}>
                                  {FORM_STATUS[form.status]?.label || 'Blank'}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                                  {form.updated_at ? new Date(form.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); setOpenForm(form) }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'var(--primary-600)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0, cursor: 'pointer' }}
                            >
                              <Pen size={12} /> Open
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available templates to assign */}
                  {templates.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
                        Templates — Click to Assign
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {templates.map(t => {
                          const count = forms.filter(f => f.template_id === t.id).length
                          return (
                            <div
                              key={t.id}
                              onClick={() => handleAssign(t)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.875rem',
                                padding: '0.875rem 1rem', background: count > 0 ? 'var(--primary-50)' : 'var(--gray-50)',
                                borderRadius: 'var(--radius-lg)', border: `1px dashed ${count > 0 ? 'var(--primary-200)' : 'var(--gray-200)'}`,
                                cursor: assigningId === t.id ? 'wait' : 'pointer',
                                transition: 'all 150ms', opacity: assigningId === t.id ? 0.6 : 1,
                              }}
                              onMouseEnter={e => { if (assigningId !== t.id) { e.currentTarget.style.background = 'var(--primary-50)'; e.currentTarget.style.borderColor = 'var(--primary-300)' } }}
                              onMouseLeave={e => { e.currentTarget.style.background = count > 0 ? 'var(--primary-50)' : 'var(--gray-50)'; e.currentTarget.style.borderColor = count > 0 ? 'var(--primary-200)' : 'var(--gray-200)' }}
                            >
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: count > 0 ? 'var(--primary-100)' : 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {assigningId === t.id ? <Loader size={15} className="spin" /> : <Plus size={15} color={count > 0 ? 'var(--primary-600)' : 'var(--gray-500)'} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  {t.name}
                                  {count > 0 && (
                                    <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, background: 'rgba(245,158,11,0.12)', color: '#b45309', flexShrink: 0 }}>
                                      {count}×
                                    </span>
                                  )}
                                </div>
                                <span style={{ ...(CATEGORY_COLORS[t.category] || CATEGORY_COLORS.General), fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {t.category}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--primary-500)', fontWeight: 600, flexShrink: 0 }}>
                                {count > 0 ? 'Add Copy' : 'Assign'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {forms.length === 0 && templates.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <FolderOpen size={26} color="var(--gray-300)" />
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.375rem' }}>No form templates available</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>
                        Ask an admin to upload form templates from the Form Templates page.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {tab === 'discharge' && (
            <div>
              {loadingDischarge ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                  <Loader size={22} className="spin" style={{ display: 'inline-block' }} />
                </div>
              ) : (
                <>
                  {/* Saved summaries */}
                  {dischargeSummaries.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                        Saved Summaries ({dischargeSummaries.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {dischargeSummaries.map(s => (
                          <div
                            key={s.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.875rem',
                              padding: '1rem', background: '#fff', borderRadius: 'var(--radius-lg)',
                              border: '1.5px solid var(--gray-100)', position: 'relative', overflow: 'hidden',
                            }}
                          >
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: s.status === 'completed' ? '#10b981' : s.status === 'in-progress' ? '#f59e0b' : 'var(--gray-200)', borderRadius: '4px 0 0 4px' }} />
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '0.5rem' }}>
                              <FileText size={18} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.template_name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 999, background: s.status === 'completed' ? 'rgba(16,185,129,0.1)' : s.status === 'in-progress' ? 'rgba(245,158,11,0.1)' : 'var(--gray-100)', color: s.status === 'completed' ? '#059669' : s.status === 'in-progress' ? '#b45309' : 'var(--gray-500)' }}>
                                  {s.status === 'in-progress' ? 'In Progress' : s.status === 'completed' ? 'Completed' : 'Blank'}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                                  {s.updated_at ? new Date(s.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => setOpenForm({ ...s, type: 'discharge' })}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0, cursor: 'pointer' }}
                            >
                              <Pen size={12} /> Open
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available discharge templates */}
                  {dischargeTpls.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                        Assign New Template
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {dischargeTpls.map(tpl => {
                          const count = dischargeSummaries.filter(s => s.template_id === tpl.id).length
                          return (
                            <div
                              key={tpl.id}
                              onClick={() => handleAssignDischarge(tpl)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: count > 0 ? 'var(--primary-50)' : 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: `1px dashed ${count > 0 ? 'var(--primary-200)' : 'var(--gray-200)'}`, cursor: assigningDischargeId === tpl.id ? 'wait' : 'pointer', opacity: assigningDischargeId === tpl.id ? 0.6 : 1, transition: 'all 150ms' }}
                              onMouseEnter={e => { if (!assigningDischargeId) { e.currentTarget.style.background = 'rgba(16,185,129,0.05)'; e.currentTarget.style.borderColor = '#6ee7b7' } }}
                              onMouseLeave={e => { e.currentTarget.style.background = count > 0 ? 'var(--primary-50)' : 'var(--gray-50)'; e.currentTarget.style.borderColor = count > 0 ? 'var(--primary-200)' : 'var(--gray-200)' }}
                            >
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: count > 0 ? 'rgba(16,185,129,0.1)' : 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {assigningDischargeId === tpl.id ? <Loader size={14} className="spin" /> : <Plus size={14} color={count > 0 ? '#059669' : 'var(--gray-500)'} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</div>
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 999, textTransform: 'uppercase', background: 'var(--gray-100)', color: 'var(--gray-500)' }}>{tpl.type}</span>
                                {count > 0 && <span style={{ marginLeft: '0.375rem', fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 999, background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>{count}×</span>}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>{count > 0 ? 'Add Copy' : 'Assign'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {dischargeSummaries.length === 0 && dischargeTpls.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <FileText size={26} color="#10b981" />
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.375rem' }}>No discharge templates yet</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>Ask an admin to upload PDF templates from the <strong>Discharge Templates</strong> page.</div>
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


// ─── Main Patients Page ──────────────────────────────────────────────────────
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

  // Columns to hide when panel is open (to save space in the table)
  const panelOpen = !!selectedPatient

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">{loading ? '…' : `${patients.length} patients`} registered in the system</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Admit Patient
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by name, ID, or department..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['All', 'IPD', 'OPD', 'Critical', 'Stable', 'Recovering'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Split-pane layout: table left, detail panel right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: panelOpen ? '1fr 480px' : '1fr',
        gap: '1.25rem',
        alignItems: 'start',
        transition: 'grid-template-columns 300ms ease',
      }}>
        {/* Table */}
        <div className="card" style={{ minWidth: 0 }}>
          {error && (
            <div style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: '0.875rem' }}>
              ⚠ Could not load patients: {error}. Make sure the API server is running.
            </div>
          )}
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th><th>ID</th><th>Blood</th><th>Type</th>
                  {!panelOpen && <><th>Department</th><th>Doctor</th><th>Admitted</th></>}
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={panelOpen ? 6 : 9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                    <Loader size={20} className="spin" style={{ display: 'inline-block' }} />
                  </td></tr>
                ) : patients.length === 0 ? (
                  <tr><td colSpan={panelOpen ? 6 : 9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No patients found</td></tr>
                ) : patients.map(p => (
                  <tr
                    key={p.id}
                    style={{ background: selectedPatient?.id === p.id ? 'var(--primary-50)' : undefined, cursor: 'pointer' }}
                    onClick={() => setSelectedPatient(prev => prev?.id === p.id ? null : p)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                          {p.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '0.875rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Age {p.age} · {p.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{p.id}</span></td>
                    <td>
                      <span style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                        {p.blood_group}
                      </span>
                    </td>
                    <td>
                      <span style={{ background: p.admission_type === 'IPD' ? 'var(--primary-50)' : 'rgba(13,148,136,0.08)', color: p.admission_type === 'IPD' ? 'var(--primary-700)' : 'var(--accent-teal)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                        {p.admission_type}
                      </span>
                    </td>
                    {!panelOpen && (
                      <>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{p.department}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{p.doctor_name || '—'}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                          {p.admitted_at ? new Date(p.admitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </>
                    )}
                    <td>
                      <span style={{ background: STATUS_STYLES[p.status]?.bg, color: STATUS_STYLES[p.status]?.color, fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, textTransform: 'uppercase' }}>
                        {p.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          className="btn btn-ghost btn-icon-sm"
                          title="View Details & Forms"
                          onClick={() => setSelectedPatient(prev => prev?.id === p.id ? null : p)}
                          style={{ color: selectedPatient?.id === p.id ? 'var(--primary-600)' : undefined }}
                        >
                          <Eye size={13} />
                        </button>
                        <button className="btn btn-ghost btn-icon-sm" title="Forms" onClick={() => setSelectedPatient(prev => prev?.id === p.id ? null : p)}>
                          <ClipboardList size={13} />
                        </button>
                      </div>
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

        {/* Inline Patient Detail Panel */}
        {selectedPatient && (
          <PatientPanel
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
          />
        )}
      </div>

      {showModal && <AdmitModal doctors={doctors} onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, FileText, X, Pen, CheckCircle, Loader, Users
} from 'lucide-react'
import { api } from '../api'
import FormViewer from '../components/FormViewer'

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

const STATUS_STYLES = {
  blank: { bg: 'var(--gray-100)', color: 'var(--gray-500)', label: 'Blank' },
  'in-progress': { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'In Progress' },
  completed: { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Completed' },
}

// ─── Assign Form Modal ───────────────────────────────────────────────────────
// assignedTemplateCounts: Map<templateId, count> — passed from parent
function AssignFormModal({ patient, templates, assignedTemplateCounts, onClose, onAssigned }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Show ALL templates - filter only by search
  const available = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleAssign = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const form = await api.createPatientForm({ template_id: selected.id, patient_id: patient.id, filled_by: '' })
      onAssigned({ ...form, template_name: selected.name, category: selected.category, file_path: selected.file_path, file_name: selected.file_name })
      onClose()
    } catch (e) { alert('Failed: ' + e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 400 }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Assign Form to Patient</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
              Patient: <strong>{patient.name}</strong> ({patient.id}) — same form can be assigned multiple times
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search forms..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {available.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
              No form templates available — ask an admin to upload templates.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: 380, overflow: 'auto' }}>
              {available.map(t => {
                const count = assignedTemplateCounts?.get(t.id) || 0
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelected(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
                      border: `1.5px solid ${selected?.id === t.id ? 'var(--primary-400)' : 'var(--gray-100)'}`,
                      background: selected?.id === t.id ? 'var(--primary-50)' : '#fff',
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={18} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {t.name}
                        {count > 0 && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 999, background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>
                            Assigned {count}×
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{t.description || t.file_name}</div>
                    </div>
                    <span style={{ ...(CATEGORY_COLORS[t.category] || CATEGORY_COLORS.General), fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t.category}
                    </span>
                    {selected?.id === t.id && <CheckCircle size={18} color="var(--primary-500)" />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssign} disabled={!selected || saving}>
            {saving ? <Loader size={14} className="spin" /> : <Plus size={14} />}
            {selected && (assignedTemplateCounts?.get(selected.id) || 0) > 0 ? ' Add Another Copy' : ' Assign Form'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PatientForms() {
  const [patients, setPatients] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientForms, setPatientForms] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loadingForms, setLoadingForms] = useState(false)
  const [search, setSearch] = useState('')
  const [showAssign, setShowAssign] = useState(false)
  const [openForm, setOpenForm] = useState(null)

  useEffect(() => {
    Promise.all([api.getPatients(), api.getFormTemplates()])
      .then(([pts, tpls]) => { setPatients(pts); setTemplates(tpls) })
      .catch(console.error)
      .finally(() => setLoadingPatients(false))
  }, [])

  const loadPatientForms = useCallback(async (patient) => {
    setSelectedPatient(patient)
    setLoadingForms(true)
    try {
      const forms = await api.getPatientForms(patient.id)
      setPatientForms(forms)
    } catch (e) { console.error(e) } finally { setLoadingForms(false) }
  }, [])

  // When annotations are saved, update the local card status
  const handleAnnotationsSaved = useCallback((updatedAnnotations, newStatus) => {
    if (!openForm) return
    setPatientForms(prev => prev.map(f =>
      f.id === openForm.id
        ? { ...f, annotations: updatedAnnotations, status: newStatus || f.status }
        : f
    ))
  }, [openForm])

  const filteredPatients = patients.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  )

  // Count how many times each template is already assigned
  const assignedTemplateCounts = patientForms.reduce((map, f) => {
    map.set(f.template_id, (map.get(f.template_id) || 0) + 1)
    return map
  }, new Map())

  return (
    <div className="animate-fadeInUp">
      {/* Full-screen form viewer — mounts over everything */}
      {openForm && (
        <FormViewer
          formInstance={{ ...openForm, patient_name: selectedPatient?.name }}
          patientData={selectedPatient}
          onClose={() => setOpenForm(null)}
          onAnnotationsSaved={handleAnnotationsSaved}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Forms</h1>
          <p className="page-subtitle">Assign and fill hospital forms — supports stylus writing on tablets</p>
        </div>
        {selectedPatient && (
          <button className="btn btn-primary" onClick={() => setShowAssign(true)}>
            <Plus size={15} /> Assign Form
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Patient selector */}
        <div className="card" style={{ position: 'sticky', top: '1rem' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={15} /> Select Patient
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="form-input" style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }} placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ maxHeight: 520, overflow: 'auto' }}>
            {loadingPatients ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}><Loader size={18} className="spin" style={{ display: 'inline-block' }} /></div>
            ) : filteredPatients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>No patients found</div>
            ) : filteredPatients.map(p => (
              <div
                key={p.id}
                onClick={() => loadPatientForms(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem 1rem', cursor: 'pointer', transition: 'all 150ms',
                  borderBottom: '1px solid var(--gray-50)',
                  background: selectedPatient?.id === p.id ? 'var(--primary-50)' : 'transparent',
                  borderLeft: `3px solid ${selectedPatient?.id === p.id ? 'var(--primary-500)' : 'transparent'}`,
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                  {p.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{p.id} · {p.department}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Forms grid */}
        <div>
          {!selectedPatient ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', background: '#fff', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--gray-200)' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <FileText size={32} color="var(--primary-300)" />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>Select a Patient</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-400)', textAlign: 'center', maxWidth: 320 }}>
                Choose a patient from the left panel to view and fill their assigned hospital forms
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--gray-900)' }}>{selectedPatient.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{selectedPatient.id} · {selectedPatient.department} · Age {selectedPatient.age}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}>
                  <Plus size={13} /> Assign Form
                </button>
              </div>

              {loadingForms ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}><Loader size={22} className="spin" style={{ display: 'inline-block' }} /></div>
              ) : patientForms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--gray-200)' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <FileText size={28} color="var(--gray-300)" />
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.375rem' }}>No forms assigned</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginBottom: '1.25rem' }}>Assign hospital forms to this patient to begin documentation</div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}><Plus size={13} /> Assign First Form</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {patientForms.map(form => (
                    <div
                      key={form.id}
                      className="card card-hoverable"
                      style={{ cursor: 'pointer', overflow: 'hidden' }}
                      onClick={() => setOpenForm(form)}
                    >
                      {/* Status strip */}
                      <div style={{ height: 4, background: form.status === 'completed' ? '#10b981' : form.status === 'in-progress' ? '#f59e0b' : 'var(--gray-200)' }} />
                      <div style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1rem' }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={20} color="#fff" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)', marginBottom: '0.25rem', lineHeight: 1.3 }}>{form.template_name}</div>
                            <span style={{ ...(CATEGORY_COLORS[form.category] || CATEGORY_COLORS.General), fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {form.category}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-100)' }}>
                          <span style={{ ...(STATUS_STYLES[form.status] || STATUS_STYLES.blank), fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                            {STATUS_STYLES[form.status]?.label || 'Blank'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                            <Pen size={12} /> Open & Fill
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAssign && selectedPatient && (
        <AssignFormModal
          patient={selectedPatient}
          templates={templates}
          assignedTemplateCounts={assignedTemplateCounts}
          onClose={() => setShowAssign(false)}
          onAssigned={form => setPatientForms(prev => [form, ...prev])}
        />
      )}
    </div>
  )
}

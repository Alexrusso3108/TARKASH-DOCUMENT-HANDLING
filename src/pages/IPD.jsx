import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, BedDouble, X, Loader, CheckCircle, AlertCircle, ClipboardList, FileText, Pen, FolderOpen, Trash2, ChevronRight } from 'lucide-react'
import { api, SERVER_URL } from '../api'
import FormViewer from '../components/FormViewer'

const BED_STATUS = {
  occupied: { color: '#6366f1', bg: 'var(--primary-50)', border: 'var(--primary-200)', label: 'Occupied' },
  available: { color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.3)', label: 'Available' },
  maintenance: { color: '#94a3b8', bg: 'var(--gray-50)', border: 'var(--gray-200)', label: 'Maintenance' },
  reserved: { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.3)', label: 'Reserved' },
}

const WARDS = ['ICU', 'General', 'Cardiology', 'Obs & Gyn', 'Neurology', 'Orthopedic', 'Pediatrics', 'Emergency']
const WARD_FILTER = ['All', ...WARDS]
const BED_TYPES = ['General', 'ICU', 'Private', 'Semi-Private', 'Maternity', 'Pediatric', 'Emergency']

// ─── Add Bed Modal ────────────────────────────────────────────────────────────
function AddBedModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ id: '', ward: 'General', bed_type: 'General', status: 'available' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.id.trim()) { setError('Bed ID is required'); return }
    if (!form.ward) { setError('Ward is required'); return }
    setSaving(true); setError(null)
    try {
      const bed = await api.createBed(form)
      onAdded(bed)
      onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Add New Bed</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Register a new bed in a ward</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Bed ID <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="form-input" placeholder="e.g. B-101, ICU-01" value={form.id} onChange={e => set('id', e.target.value.toUpperCase())} />
              <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '0.25rem', display: 'block' }}>Must be unique within your hospital</span>
            </div>
            <div className="form-group">
              <label className="form-label">Ward <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select className="form-input form-select" value={form.ward} onChange={e => set('ward', e.target.value)}>
                {WARDS.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Bed Type</label>
              <select className="form-input form-select" value={form.bed_type} onChange={e => set('bed_type', e.target.value)}>
                {BED_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Initial Status</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['available', 'maintenance', 'reserved'].map(s => (
                  <button key={s} type="button" onClick={() => set('status', s)}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-lg)', border: `1.5px solid ${form.status === s ? BED_STATUS[s].color : 'var(--gray-200)'}`, background: form.status === s ? BED_STATUS[s].bg : '#fff', color: form.status === s ? BED_STATUS[s].color : 'var(--gray-500)', fontWeight: form.status === s ? 700 : 400, fontSize: '0.8rem', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 150ms' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <Plus size={14} />}
            {saving ? 'Adding...' : 'Add Bed'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Assign Bed Modal ─────────────────────────────────────────────────────────
function AssignBedModal({ onClose, onAssigned }) {
  const [step, setStep] = useState(1)          // 1 = pick bed, 2 = fill details
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [availableBeds, setAvailableBeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [selectedBed, setSelectedBed] = useState(null)
  const [form, setForm] = useState({
    patient_id: '',
    doctor_id: '',
    diagnosis: '',
    has_alert: false,
  })
  const [bedSearch, setBedSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getBeds({ ward: 'All' }),
      api.getPatients(),
      api.getDoctors(),
    ]).then(([beds, pts, docs]) => {
      setAvailableBeds(beds.filter(b => b.status === 'available'))
      setPatients(pts)
      setDoctors(docs)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAssign = async () => {
    if (!selectedBed) { setError('Please select a bed.'); return }
    if (!form.patient_id) { setError('Please select a patient.'); return }
    setSaving(true); setError(null)
    try {
      const updated = await api.assignBed(selectedBed.id, {
        status: 'occupied',
        patient_id: form.patient_id,
        doctor_id: form.doctor_id || null,
        diagnosis: form.diagnosis || null,
        has_alert: form.has_alert,
      })
      // Enrich with joined names for instant UI update
      const patient = patients.find(p => p.id === form.patient_id)
      const doctor = doctors.find(d => d.id === form.doctor_id)
      onAssigned({
        ...selectedBed,
        ...updated,
        patient_name: patient?.name,
        age: patient?.age,
        doctor_name: doctor?.name,
      })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredBeds = availableBeds.filter(b =>
    !bedSearch || b.id.toLowerCase().includes(bedSearch.toLowerCase()) || b.ward?.toLowerCase().includes(bedSearch.toLowerCase())
  )

  const filteredPatients = patients.filter(p =>
    !patientSearch || p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.id.toLowerCase().includes(patientSearch.toLowerCase())
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Assign Bed</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
              {step === 1 ? 'Step 1 — Select an available bed' : `Step 2 — Assign patient to Bed ${selectedBed?.id}`}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
              <Loader size={22} className="spin" style={{ display: 'inline-block' }} />
            </div>
          ) : step === 1 ? (
            /* ── Step 1: Pick a bed ── */
            <div>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by bed ID or ward..." value={bedSearch} onChange={e => setBedSearch(e.target.value)} />
              </div>
              {filteredBeds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                  No available beds found
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', maxHeight: 360, overflow: 'auto' }}>
                  {filteredBeds.map(bed => (
                    <div
                      key={bed.id}
                      onClick={() => setSelectedBed(bed)}
                      style={{
                        padding: '1rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 150ms',
                        border: `2px solid ${selectedBed?.id === bed.id ? 'var(--primary-500)' : 'rgba(16,185,129,0.3)'}`,
                        background: selectedBed?.id === bed.id ? 'var(--primary-50)' : 'rgba(16,185,129,0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <BedDouble size={16} color={selectedBed?.id === bed.id ? 'var(--primary-600)' : '#10b981'} />
                        {selectedBed?.id === bed.id && <CheckCircle size={14} color="var(--primary-600)" />}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-800)' }}>{bed.id}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>{bed.ward}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>{bed.bed_type}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Step 2: Patient + details ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Selected bed preview */}
              <div style={{ background: 'var(--primary-50)', border: '1.5px solid var(--primary-200)', borderRadius: 'var(--radius-lg)', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BedDouble size={20} color="var(--primary-600)" />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--primary-800)' }}>Bed {selectedBed?.id}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)' }}>{selectedBed?.ward} · {selectedBed?.bed_type}</div>
                </div>
                <button onClick={() => setStep(1)} style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change</button>
              </div>

              {/* Patient select — native dropdown, always works */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Patient * {patients.length === 0 && <span style={{ color: '#dc2626', fontWeight: 400 }}>(loading...)</span>}</label>
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="Type to filter patients..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                  />
                </div>
                <select
                  className="form-input form-select"
                  style={{ fontSize: '0.875rem' }}
                  value={form.patient_id}
                  onChange={e => handle('patient_id', e.target.value)}
                  size={Math.min(filteredPatients.length + 1, 6)}
                >
                  <option value="">— Select a patient —</option>
                  {filteredPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) · Age {p.age} · {p.department}
                    </option>
                  ))}
                </select>
                {form.patient_id && (
                  <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <CheckCircle size={13} /> Patient selected: <strong>{patients.find(p => p.id === form.patient_id)?.name}</strong>
                  </div>
                )}
              </div>

              {/* Doctor */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Attending Doctor</label>
                <select className="form-input form-select" value={form.doctor_id} onChange={e => handle('doctor_id', e.target.value)}>
                  <option value="">Select doctor</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.department}</option>)}
                </select>
              </div>

              {/* Diagnosis */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Diagnosis / Chief Complaint</label>
                <input className="form-input" placeholder="e.g. Acute appendicitis" value={form.diagnosis} onChange={e => handle('diagnosis', e.target.value)} />
              </div>

              {/* Alert flag */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', userSelect: 'none', fontSize: '0.875rem', color: 'var(--gray-700)', fontWeight: 500 }}>
                <input type="checkbox" checked={form.has_alert} onChange={e => handle('has_alert', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#ef4444' }} />
                Mark as critical / alert
              </label>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
          {step === 2 && !form.patient_id && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--gray-400)', margin: 0 }}>
              ⬆ Select a patient from the list above to continue
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            {step === 1 ? (
              <button className="btn btn-primary" onClick={() => { if (!selectedBed) { setError('Select a bed first'); return } setError(null); setStep(2) }} disabled={!selectedBed}>
                Next → Patient Details
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleAssign} disabled={saving || !form.patient_id}>
                {saving ? <Loader size={14} className="spin" /> : <CheckCircle size={14} />} Confirm Bed Assignment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main IPD Page ────────────────────────────────────────────────────────────
export default function IPD() {
  const [beds, setBeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wardFilter, setWardFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAssign, setShowAssign] = useState(false)
  const [showAddBed, setShowAddBed] = useState(false)
  const [releasingId, setReleasingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Forms state
  const [panelTab, setPanelTab] = useState('info')       // 'info' | 'forms' | 'discharge'
  const [patientForms, setPatientForms] = useState([])
  const [formTemplates, setFormTemplates] = useState([])
  const [loadingForms, setLoadingForms] = useState(false)
  const [assigningFormId, setAssigningFormId] = useState(null)
  const [openForm, setOpenForm] = useState(null)

  // Discharge summary state
  const [dischargeTpls, setDischargeTpls]               = useState([])
  const [loadingDischargeTpls, setLoadingDischargeTpls] = useState(false)
  const [patientDischargeSummaries, setPatientDischargeSummaries] = useState([])
  const [loadingDischargeSummaries, setLoadingDischargeSummaries] = useState(false)
  const [openDischargeForm, setOpenDischargeForm]       = useState(null)  // {id, template_name, file_path, patient_name}
  const [assigningDischargeId, setAssigningDischargeId] = useState(null)

  const fetchBeds = useCallback(() => {
    setLoading(true); setError(null)
    api.getBeds({ ward: wardFilter, search })
      .then(setBeds)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [wardFilter, search])

  useEffect(() => {
    const t = setTimeout(fetchBeds, 300)
    return () => clearTimeout(t)
  }, [fetchBeds])

  // When an occupied bed is clicked, reset to info tab and clear old form data
  const handleSelectBed = (bed) => {
    setSelected(bed)
    setPanelTab('info')
    setPatientForms([]); setFormTemplates([]); setOpenForm(null)
    setDischargeTpls([]); setOpenDischargeForm(null); setPatientDischargeSummaries([])
  }

  // Load patient forms + templates when switching to Forms tab
  const loadForms = useCallback(async (patientId) => {
    setLoadingForms(true)
    try {
      const [forms, templates] = await Promise.all([
        api.getPatientForms(patientId),
        api.getFormTemplates(),
      ])
      setPatientForms(forms)
      setFormTemplates(templates)
    } catch (e) { console.error(e) }
    finally { setLoadingForms(false) }
  }, [])

  const handlePanelTabChange = (tab) => {
    setPanelTab(tab)
    if (tab === 'forms' && selected?.patient_id) loadForms(selected.patient_id)
    if (tab === 'discharge' && selected?.patient_id) {
      // Load templates
      if (!dischargeTpls.length) {
        setLoadingDischargeTpls(true)
        api.getDischargeTemplates()
          .then(setDischargeTpls)
          .catch(() => {})
          .finally(() => setLoadingDischargeTpls(false))
      }
      // Load patient summaries
      setLoadingDischargeSummaries(true)
      api.getPatientDischargeSummaries(selected.patient_id)
        .then(setPatientDischargeSummaries)
        .catch(() => {})
        .finally(() => setLoadingDischargeSummaries(false))
    }
  }

  // Assign a discharge template to a patient (creates an instance)
  const handleAssignDischargeTpl = async (tpl) => {
    if (!selected?.patient_id) return
    setAssigningDischargeId(tpl.id)
    try {
      const summary = await api.createDischargeSummary({ template_id: tpl.id, patient_id: selected.patient_id, filled_by: '' })
      const enriched = { ...summary, template_name: tpl.name, category: tpl.type, file_path: tpl.file_path, file_name: tpl.file_name, type: 'discharge' }
      setPatientDischargeSummaries(prev => [enriched, ...prev])
      setOpenDischargeForm(enriched)
    } catch (e) { alert('Failed to assign template: ' + e.message) }
    finally { setAssigningDischargeId(null) }
  }

  const handleDischargeSummarySaved = useCallback((updatedAnnotations, newStatus) => {
    if (!openDischargeForm) return
    setPatientDischargeSummaries(prev => prev.map(s =>
      s.id === openDischargeForm.id ? { ...s, annotations: updatedAnnotations, status: newStatus || s.status } : s
    ))
  }, [openDischargeForm])

  const handleAssignForm = async (template) => {
    if (!selected?.patient_id) return
    setAssigningFormId(template.id)
    try {
      const form = await api.createPatientForm({ template_id: template.id, patient_id: selected.patient_id, filled_by: '' })
      const enriched = { ...form, template_name: template.name, category: template.category, file_path: template.file_path, file_name: template.file_name }
      setPatientForms(prev => [enriched, ...prev])
    } catch (e) { alert('Failed to assign form: ' + e.message) }
    finally { setAssigningFormId(null) }
  }

  const handleAnnotationsSaved = useCallback((updatedAnnotations, newStatus) => {
    if (!openForm) return
    setPatientForms(prev => prev.map(f =>
      f.id === openForm.id ? { ...f, annotations: updatedAnnotations, status: newStatus || f.status } : f
    ))
  }, [openForm])

  const handleAssigned = (enrichedBed) => {
    setBeds(prev => prev.map(b => b.id === enrichedBed.id ? enrichedBed : b))
  }

  const handleBedAdded = (newBed) => {
    setBeds(prev => [...prev, newBed].sort((a, b) => a.id.localeCompare(b.id)))
  }

  const handleDeleteBed = async (bed, e) => {
    e.stopPropagation()
    if (bed.status === 'occupied') { alert('Cannot delete an occupied bed. Discharge the patient first.'); return }
    if (!window.confirm(`Delete bed ${bed.id} (${bed.ward})? This cannot be undone.`)) return
    setDeletingId(bed.id)
    try {
      await api.deleteBed(bed.id)
      setBeds(prev => prev.filter(b => b.id !== bed.id))
      if (selected?.id === bed.id) setSelected(null)
    } catch (e) { alert('Delete failed: ' + e.message) }
    finally { setDeletingId(null) }
  }

  const handleDischarge = async (bed) => {
    if (!window.confirm(`Discharge ${bed.patient_name} from Bed ${bed.id}?`)) return
    setReleasingId(bed.id)
    try {
      await api.releaseBed(bed.id)
      setBeds(prev => prev.map(b => b.id === bed.id
        ? { ...b, status: 'available', patient_id: null, patient_name: null, doctor_id: null, doctor_name: null, diagnosis: null, has_alert: false }
        : b
      ))
      if (selected?.id === bed.id) setSelected(null)
    } catch (e) {
      alert('Discharge failed: ' + e.message)
    } finally {
      setReleasingId(null)
    }
  }

  const stats = {
    total: beds.length,
    occupied: beds.filter(b => b.status === 'occupied').length,
    available: beds.filter(b => b.status === 'available').length,
    maintenance: beds.filter(b => b.status === 'maintenance').length,
  }

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">IPD Management</h1>
          <p className="page-subtitle">Inpatient department bed management and ward tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddBed(true)}>
            <Plus size={15} /> Add Bed
          </button>
          <button className="btn btn-primary" onClick={() => setShowAssign(true)}>
            <BedDouble size={15} /> Assign Bed
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Beds', val: stats.total, color: 'var(--gray-600)', bg: 'var(--gray-100)' },
          { label: 'Occupied', val: stats.occupied, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
          { label: 'Available', val: stats.available, color: '#059669', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Maintenance', val: stats.maintenance, color: '#b45309', bg: 'rgba(245,158,11,0.08)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Occupancy Bar */}
      {stats.total > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-700)' }}>Overall Occupancy</span>
              <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--primary-600)' }}>
                {Math.round((stats.occupied / stats.total) * 100)}%
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill gradient-primary" style={{ width: `${(stats.occupied / stats.total) * 100}%` }} />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
              {Object.entries(BED_STATUS).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: val.color }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{val.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search bed or patient..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {WARD_FILTER.map(w => (
                <button key={w} className={`btn btn-sm ${wardFilter === w ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWardFilter(w)}>{w}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      {/* Bed Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
          <Loader size={24} className="spin" style={{ display: 'inline-block' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {beds.map(bed => {
            const s = BED_STATUS[bed.status]
            const isAvailable = bed.status === 'available'
            return (
              <div
                key={bed.id}
                onClick={() => {
                  if (bed.status === 'occupied') handleSelectBed(bed)
                  else if (bed.status === 'available') { setShowAssign(true) }
                }}
                style={{
                  background: s.bg, border: `1.5px solid ${selected?.id === bed.id ? 'var(--primary-400)' : s.border}`,
                  borderRadius: 'var(--radius-xl)', padding: '1.125rem',
                  cursor: 'pointer', transition: 'all 150ms', position: 'relative',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              >
                {bed.has_alert && (
                  <span style={{ position: 'absolute', top: '0.625rem', right: '0.625rem', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse-dot 2s infinite' }} />
                )}
                {/* Delete button — only for non-occupied beds */}
                {bed.status !== 'occupied' && (
                  <button
                    onClick={(e) => handleDeleteBed(bed, e)}
                    disabled={deletingId === bed.id}
                    title="Delete this bed"
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', opacity: deletingId === bed.id ? 0.5 : 0.7, transition: 'all 150ms' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = deletingId === bed.id ? '0.5' : '0.7'}
                  >
                    {deletingId === bed.id ? <Loader size={11} className="spin" /> : <Trash2 size={11} />}
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <BedDouble size={16} style={{ color: s.color }} />
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{bed.id}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{bed.status}</span>
                </div>
                {bed.patient_name ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>{bed.patient_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Age {bed.age} · {bed.doctor_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', fontStyle: 'italic' }}>{bed.diagnosis}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '0.5rem' }}>
                      Since {bed.admitted_at ? new Date(bed.admitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </div>
                  </>
                ) : (
                  <div style={{ color: s.color, fontWeight: 600, fontSize: '0.875rem', opacity: 0.7 }}>
                    {bed.status === 'available' ? 'Click to assign' : bed.status === 'maintenance' ? 'Under maintenance' : 'Reserved'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Full-screen FormViewer — patient forms */}
      {openForm && (
        <FormViewer
          formInstance={{ ...openForm, patient_name: selected?.patient_name }}
          onClose={() => setOpenForm(null)}
          onAnnotationsSaved={handleAnnotationsSaved}
        />
      )}

      {/* Full-screen FormViewer — discharge summary */}
      {openDischargeForm && (
        <FormViewer
          formInstance={{ ...openDischargeForm, patient_name: selected?.patient_name, type: 'discharge' }}
          onClose={() => setOpenDischargeForm(null)}
          onAnnotationsSaved={handleDischargeSummarySaved}
        />
      )}

      {/* Bed Detail Side Panel */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelected(null)}>
          <div style={{ width: 440, background: '#fff', height: '100%', boxShadow: 'var(--shadow-2xl)', overflow: 'hidden', animation: 'slideInLeft 250ms ease', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

            {/* Panel Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--gray-100)', background: 'linear-gradient(135deg, var(--primary-600), var(--accent-teal))', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {selected.patient_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.patient_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Bed {selected.id} · Age {selected.age}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs: Info | Forms | Discharge */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
              {[
                { id: 'info',      label: 'Patient Info', icon: BedDouble    },
                { id: 'forms',     label: 'Forms',        icon: ClipboardList },
                { id: 'discharge', label: 'Discharge',    icon: FileText      },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handlePanelTabChange(id)}
                  style={{
                    flex: 1, padding: '0.875rem', border: 'none', background: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    fontWeight: panelTab === id ? 700 : 500, fontSize: '0.875rem',
                    color: panelTab === id ? 'var(--primary-600)' : 'var(--gray-500)',
                    borderBottom: `2.5px solid ${panelTab === id ? 'var(--primary-500)' : 'transparent'}`,
                    transition: 'all 150ms',
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>

              {/* ── INFO TAB ── */}
              {panelTab === 'info' && (
                <div>
                  {[
                    ['Ward', selected.ward],
                    ['Bed Type', selected.bed_type],
                    ['Attending Doctor', selected.doctor_name],
                    ['Admitted On', selected.admitted_at ? new Date(selected.admitted_at).toLocaleDateString('en-IN') : '—'],
                    ['Diagnosis', selected.diagnosis],
                  ].map(([label, val]) => (
                    <div key={label} style={{ padding: '0.875rem 0', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <span style={{ width: 110, fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)', fontWeight: 500 }}>{val || '—'}</span>
                    </div>
                  ))}

                  {/* Quick action to switch to Forms tab */}
                  <div onClick={() => handlePanelTabChange('forms')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: '1px solid var(--primary-100)', marginTop: '1.25rem' }}>
                    <ClipboardList size={18} color="var(--primary-600)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary-700)' }}>Patient Forms</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--primary-500)' }}>Assign & fill hospital forms for this patient</div>
                    </div>
                    <ChevronRight size={14} color="var(--primary-500)" />
                  </div>

                  {/* Discharge summary quick action */}
                  <div onClick={() => handlePanelTabChange('discharge')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', border: '1px solid rgba(16,185,129,0.2)', marginTop: '0.75rem' }}>
                    <FileText size={18} color="#059669" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#065f46' }}>Discharge Summary</div>
                      <div style={{ fontSize: '0.72rem', color: '#059669' }}>Pick a template, fill patient data & download PDF</div>
                    </div>
                    <ChevronRight size={14} color="#059669" />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button className="btn btn-primary w-full">View Full Patient Record</button>
                    <button className="btn btn-secondary w-full">Write Clinical Note</button>
                    <button className="btn btn-success w-full" style={{ background: '#059669', color: '#fff', border: 'none' }}
                      onClick={() => handlePanelTabChange('discharge')}>
                      <FileText size={14} /> Generate Discharge Summary
                    </button>
                    <button className="btn btn-danger w-full" disabled={releasingId === selected.id}
                      onClick={() => handleDischarge(selected)}>
                      {releasingId === selected.id ? <Loader size={14} className="spin" /> : null}
                      {releasingId === selected.id ? ' Processing...' : 'Release Bed (No Summary)'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── FORMS TAB ── */}
              {panelTab === 'forms' && (
                <div>
                  {loadingForms ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                      <Loader size={20} className="spin" style={{ display: 'inline-block' }} />
                    </div>
                  ) : (
                    <>
                      {/* Assigned forms */}
                      {patientForms.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                            Assigned Forms ({patientForms.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {patientForms.map(form => (
                              <div
                                key={form.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                                  padding: '0.875rem', background: '#fff',
                                  borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--gray-100)',
                                  position: 'relative', overflow: 'hidden',
                                }}
                              >
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: form.status === 'completed' ? '#10b981' : form.status === 'in-progress' ? '#f59e0b' : 'var(--gray-200)', borderRadius: '4px 0 0 4px' }} />
                                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.375rem', flexShrink: 0 }}>
                                  <FileText size={16} color="#fff" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.template_name}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, textTransform: 'uppercase', background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{form.category}</span>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, background: form.status === 'completed' ? 'rgba(16,185,129,0.1)' : form.status === 'in-progress' ? 'rgba(245,158,11,0.1)' : 'var(--gray-100)', color: form.status === 'completed' ? '#059669' : form.status === 'in-progress' ? '#b45309' : 'var(--gray-500)' }}>
                                      {form.status === 'in-progress' ? 'In Progress' : form.status === 'completed' ? 'Completed' : 'Blank'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setOpenForm(form)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--primary-600)', color: '#fff', border: 'none', borderRadius: 7, padding: '0.35rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                                >
                                  <Pen size={11} /> Open
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All templates — show count badge for already-assigned ones */}
                      {formTemplates.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                            Templates — Tap to Assign
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {formTemplates.map(t => {
                              const count = patientForms.filter(f => f.template_id === t.id).length
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => handleAssignForm(t)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem 0.875rem', background: count > 0 ? 'var(--primary-50)' : 'var(--gray-50)',
                                    borderRadius: 'var(--radius-lg)', border: `1px dashed ${count > 0 ? 'var(--primary-200)' : 'var(--gray-200)'}`,
                                    cursor: assigningFormId === t.id ? 'wait' : 'pointer',
                                    opacity: assigningFormId === t.id ? 0.6 : 1,
                                    transition: 'all 150ms',
                                  }}
                                  onMouseEnter={e => { if (!assigningFormId) { e.currentTarget.style.background = 'var(--primary-50)'; e.currentTarget.style.borderColor = 'var(--primary-300)' } }}
                                  onMouseLeave={e => { e.currentTarget.style.background = count > 0 ? 'var(--primary-50)' : 'var(--gray-50)'; e.currentTarget.style.borderColor = count > 0 ? 'var(--primary-200)' : 'var(--gray-200)' }}
                                >
                                  <div style={{ width: 30, height: 30, borderRadius: 7, background: count > 0 ? 'var(--primary-100)' : 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {assigningFormId === t.id ? <Loader size={13} className="spin" /> : <Plus size={13} color={count > 0 ? 'var(--primary-600)' : 'var(--gray-500)'} />}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                      {t.name}
                                      {count > 0 && (
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, background: 'rgba(245,158,11,0.12)', color: '#b45309', flexShrink: 0 }}>
                                          {count}×
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, textTransform: 'uppercase', background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{t.category}</span>
                                  </div>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--primary-500)', fontWeight: 600, flexShrink: 0 }}>
                                    {count > 0 ? 'Add Copy' : 'Assign'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {patientForms.length === 0 && formTemplates.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                          <FolderOpen size={32} color="var(--gray-300)" style={{ display: 'block', margin: '0 auto 0.75rem' }} />
                          <div style={{ fontWeight: 600, color: 'var(--gray-500)', fontSize: '0.875rem' }}>No form templates available</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>Ask an admin to upload templates from Form Templates page.</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {/* ── DISCHARGE TAB ── */}
              {panelTab === 'discharge' && (
                <div>
                  {loadingDischargeSummaries ? (
                    <div style={{ textAlign:'center', padding:'3rem', color:'var(--gray-400)' }}><Loader size={20} className="spin" style={{display:'inline-block'}} /></div>
                  ) : (
                    <>
                      {/* Assigned summaries */}
                      {patientDischargeSummaries.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                            Patient Summaries ({patientDischargeSummaries.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {patientDischargeSummaries.map(s => (
                              <div
                                key={s.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                                  padding: '0.875rem', background: '#fff',
                                  borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--gray-100)',
                                  position: 'relative', overflow: 'hidden',
                                }}
                              >
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: s.status === 'completed' ? '#10b981' : s.status === 'in-progress' ? '#f59e0b' : 'var(--gray-200)', borderRadius: '4px 0 0 4px' }} />
                                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.375rem', flexShrink: 0 }}>
                                  <FileText size={16} color="#fff" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.template_name}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, textTransform: 'uppercase', background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{s.category}</span>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999, background: s.status === 'completed' ? 'rgba(16,185,129,0.1)' : s.status === 'in-progress' ? 'rgba(245,158,11,0.1)' : 'var(--gray-100)', color: s.status === 'completed' ? '#059669' : s.status === 'in-progress' ? '#b45309' : 'var(--gray-500)' }}>
                                      {s.status === 'in-progress' ? 'In Progress' : s.status === 'completed' ? 'Completed' : 'Blank'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setOpenDischargeForm({ ...s, type: 'discharge' })}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 7, padding: '0.45rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                                >
                                  <Pen size={12} /> Fill / View
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PDF Templates for discharge */}
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Available Templates</div>
                        {loadingDischargeTpls ? (
                          <div style={{ textAlign:'center', padding:'3rem', color:'var(--gray-400)' }}><Loader size={20} className="spin" style={{display:'inline-block'}} /></div>
                        ) : dischargeTpls.length === 0 ? (
                          <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
                            <FileText size={32} color="var(--gray-300)" style={{ display: 'block', margin: '0 auto 0.75rem' }} />
                            <div style={{ fontWeight: 600, color: 'var(--gray-500)', fontSize: '0.875rem' }}>No discharge templates yet</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>Ask an admin to upload PDF templates from the <strong>Discharge Templates</strong> page.</div>
                          </div>
                        ) : (
                          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                            {dischargeTpls.map(tpl => {
                              const count = patientDischargeSummaries.filter(s => s.template_id === tpl.id).length
                              return (
                                <div key={tpl.id}
                                  onClick={() => handleAssignDischargeTpl(tpl)}
                                  style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem 0.875rem', background: count > 0 ? 'var(--primary-50)' : 'var(--gray-50)', borderRadius:'var(--radius-lg)', border:`1px dashed ${count > 0 ? 'var(--primary-200)' : 'var(--gray-200)'}`, cursor: assigningDischargeId === tpl.id ? 'wait' : 'pointer', opacity: assigningDischargeId === tpl.id ? 0.6 : 1 }}
                                >
                                  <div style={{ width:30, height:30, borderRadius:7, background: count > 0 ? 'var(--primary-100)' : 'var(--gray-200)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    {assigningDischargeId === tpl.id ? <Loader size={13} className="spin" /> : <Plus size={13} color={count > 0 ? 'var(--primary-600)' : 'var(--gray-500)'} />}
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontWeight:600, fontSize:'0.8rem', color:'var(--gray-700)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'0.375rem' }}>
                                      {tpl.name}
                                      {count > 0 && <span style={{ fontSize:'0.58rem', fontWeight:700, padding:'0.1rem 0.35rem', borderRadius:999, background:'rgba(245,158,11,0.12)', color:'#b45309', flexShrink:0 }}>{count}×</span>}
                                    </div>
                                    <span style={{ fontSize:'0.6rem', fontWeight:700, padding:'0.1rem 0.35rem', borderRadius:999, textTransform:'uppercase', background:'var(--gray-100)', color:'var(--gray-600)' }}>{tpl.type}</span>
                                  </div>
                                  <span style={{ fontSize:'0.72rem', color:'var(--primary-500)', fontWeight:600, flexShrink:0 }}>
                                    {count > 0 ? 'Add Copy' : 'Assign'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>{/* end tab content */}
          </div>
        </div>
      )}

      {showAddBed && (
        <AddBedModal
          onClose={() => setShowAddBed(false)}
          onAdded={handleBedAdded}
        />
      )}

      {/* Assign Bed Modal */}
      {showAssign && (
        <AssignBedModal
          onClose={() => setShowAssign(false)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  )
}

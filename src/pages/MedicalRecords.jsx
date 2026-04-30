import { useState, useEffect, useCallback } from 'react'
import {
  Search, FileText, Eye, Download, Plus, Clock, Loader,
  User, Hash, Printer, FolderOpen, RefreshCw, X, CheckCircle,
  AlertTriangle, BookOpen, ClipboardList
} from 'lucide-react'
import { api } from '../api'

const RECORD_TYPES = ['All', 'OPD Visit', 'IPD Admission', 'Lab Report', 'Radiology', 'Discharge Summary', 'Prescription', 'Consent Form', 'Operation Note']
const REQUEST_STATUS = {
  pending:   { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Pending' },
  approved:  { bg: 'var(--primary-50)', color: 'var(--primary-700)', label: 'Approved' },
  ready:     { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Ready' },
  rejected:  { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Rejected' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Record Request Modal ─────────────────────────────────────────────────────
function RequestModal({ patients, onClose, onSave }) {
  const [form, setForm] = useState({
    patient_id: '', requested_by: '', relation: 'Patient', purpose: '',
    record_types: [], date_from: '', date_to: '', urgency: 'Normal',
    identity_proof: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleType = (t) => set('record_types', form.record_types.includes(t) ? form.record_types.filter(x => x !== t) : [...form.record_types, t])
  const [saving, setSaving] = useState(false)

  const submit = () => {
    if (!form.patient_id) { alert('Please select a patient'); return }
    if (!form.requested_by) { alert('Requester name required'); return }
    setSaving(true)
    setTimeout(() => {
      onSave({
        id: Date.now(), ...form,
        patient_name: patients.find(p => p.id === form.patient_id)?.name || '—',
        uhid: form.patient_id,
        status: 'pending',
        requested_at: new Date(),
        request_no: `MRR${String(Date.now()).slice(-5)}`,
      })
      setSaving(false); onClose()
    }, 400)
  }

  const ALL_TYPES = RECORD_TYPES.filter(t => t !== 'All')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Medical Record Request</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>As per HMIS & Patient Rights guidelines</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Patient (UHID Search) *</label>
              <select className="form-input form-select" value={form.patient_id} onChange={e => set('patient_id', e.target.value)}>
                <option value="">Select patient…</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} — UHID: {p.id}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Requested By *</label>
              <input className="form-input" placeholder="Name of person requesting" value={form.requested_by} onChange={e => set('requested_by', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Relation to Patient</label>
              <select className="form-input form-select" value={form.relation} onChange={e => set('relation', e.target.value)}>
                {['Patient', 'Spouse', 'Parent', 'Child', 'Sibling', 'Guardian', 'Legal Representative', 'Insurance Company', 'Court Order'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Identity Proof Type</label>
              <select className="form-input form-select" value={form.identity_proof} onChange={e => set('identity_proof', e.target.value)}>
                {['', 'Aadhaar Card', 'Passport', 'Voter ID', 'Driving Licence', 'PAN Card', 'Employee ID'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Urgency</label>
              <select className="form-input form-select" value={form.urgency} onChange={e => set('urgency', e.target.value)}>
                {['Normal', 'Urgent', 'Court / Legal', 'Insurance'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration — From</label>
              <input className="form-input" type="date" value={form.date_from} onChange={e => set('date_from', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Duration — To</label>
              <input className="form-input" type="date" value={form.date_to} onChange={e => set('date_to', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Record Types Required</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
                {ALL_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => toggleType(t)} style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-lg)', border: `1.5px solid ${form.record_types.includes(t) ? 'var(--primary-400)' : 'var(--gray-200)'}`, background: form.record_types.includes(t) ? 'var(--primary-50)' : '#fff', color: form.record_types.includes(t) ? 'var(--primary-700)' : 'var(--gray-500)', fontSize: '0.78rem', fontWeight: form.record_types.includes(t) ? 700 : 400, cursor: 'pointer', transition: 'all 150ms' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Purpose / Reason</label>
              <textarea className="form-input form-textarea" placeholder="e.g. Insurance claim, Second opinion, Legal proceedings…" value={form.purpose} onChange={e => set('purpose', e.target.value)} style={{ minHeight: 64 }} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <FileText size={14} />} Submit Request
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Medical Records Page ────────────────────────────────────────────────
export default function MedicalRecords() {
  const [patients, setPatients] = useState([])
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientSearch, setPatientSearch] = useState('')

  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getPatients().then(setPatients).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const addRequest = (req) => setRequests(prev => [req, ...prev])

  const updateRequestStatus = (id, status) => {
    setUpdatingId(id)
    setTimeout(() => { setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r)); setUpdatingId(null) }, 300)
  }

  const filteredPatients = patients.filter(p =>
    !patientSearch || p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.id?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone?.includes(patientSearch)
  )

  const filteredRequests = requests.filter(r =>
    (statusFilter === 'All' || r.status === statusFilter) &&
    (!search || r.patient_name?.toLowerCase().includes(search.toLowerCase()) || r.uhid?.includes(search) || r.request_no?.includes(search))
  )

  return (
    <>
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Medical Record Management</h1>
          <p className="page-subtitle">UHID-based patient record lookup & request management</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPatient(null)}><RefreshCw size={13} /></button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> New Record Request</button>
        </div>
      </div>

      {/* Patient UHID Search */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h5 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Patient Record Lookup</h5>
          <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Search by UHID, name, or mobile</span>
        </div>
        <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
          <div style={{ position: 'relative', marginBottom: '1rem', maxWidth: 480 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Enter UHID, patient name or mobile…" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
          </div>

          {patientSearch && (
            <div style={{ border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}><Loader size={18} className="spin" style={{ display: 'inline-block' }} /></div>
              ) : filteredPatients.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.875rem' }}>No patients found matching your search</div>
              ) : filteredPatients.slice(0, 8).map(p => (
                <div key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)', background: selectedPatient?.id === p.id ? 'var(--primary-50)' : '#fff', transition: 'all 150ms' }}
                  onMouseEnter={e => { if (selectedPatient?.id !== p.id) e.currentTarget.style.background = 'var(--gray-50)' }}
                  onMouseLeave={e => { if (selectedPatient?.id !== p.id) e.currentTarget.style.background = '#fff' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                    {p.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.125rem' }}>UHID: {p.id} · Age {p.age} · {p.gender}{p.phone ? ` · ${p.phone}` : ''}</div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{p.admission_type}</div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Patient Detail */}
          {selectedPatient && !patientSearch && (
            <div style={{ background: 'var(--primary-50)', border: '1.5px solid var(--primary-200)', borderRadius: 'var(--radius-xl)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary-700)' }}>
                    {selectedPatient.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-900)' }}>{selectedPatient.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary-600)', marginTop: '0.125rem' }}>UHID: {selectedPatient.id} · {selectedPatient.age} yrs · {selectedPatient.gender}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedPatient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-500)' }}><X size={16} /></button>
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
                {[
                  ['Blood Group', selectedPatient.blood_group],
                  ['Department', selectedPatient.department],
                  ['Admission Type', selectedPatient.admission_type],
                  ['Doctor', selectedPatient.doctor_name ? `Dr. ${selectedPatient.doctor_name}` : '—'],
                  ['Mobile', selectedPatient.phone],
                  ['Aadhaar', selectedPatient.aadhaar || 'Not recorded'],
                  ['ABHA ID', selectedPatient.abha_id || 'Not linked'],
                  ['Payment', selectedPatient.payment_type],
                  ['Admitted', selectedPatient.admitted_at ? fmtDate(selectedPatient.admitted_at) : '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', border: '1px solid var(--primary-100)' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--primary-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{k}</div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-800)' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm"><Printer size={13} /> Print Summary</button>
                <button className="btn btn-secondary btn-sm"><Download size={13} /> Download Records</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}><FileText size={13} /> Raise Record Request</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Requests */}
      <div className="card">
        <div className="card-header">
          <h5 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Medical Record Requests</h5>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="form-input" style={{ paddingLeft: '1.875rem', fontSize: '0.8125rem', height: 34 }} placeholder="Search requests…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {['All', ...Object.keys(REQUEST_STATUS)].map(f => (
              <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(f)} style={{ textTransform: 'capitalize' }}>
                {REQUEST_STATUS[f]?.label || f}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Req No.</th><th>Patient (UHID)</th><th>Requested By</th>
                <th>Record Types</th><th>Purpose</th><th>Urgency</th>
                <th>Requested On</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem' }}>
                  <BookOpen size={28} style={{ color: 'var(--gray-300)', display: 'block', margin: '0 auto 0.75rem' }} />
                  <div style={{ color: 'var(--gray-500)', fontWeight: 600 }}>No record requests yet</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>Use the button above to raise a new request</div>
                </td></tr>
              ) : filteredRequests.map(r => (
                <tr key={r.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--gray-500)', background: 'var(--gray-50)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{r.request_no}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{r.patient_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>UHID: {r.uhid}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>{r.requested_by}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{r.relation}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {(r.record_types || []).slice(0, 3).map(t => (
                        <span key={t} style={{ background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 999 }}>{t}</span>
                      ))}
                      {r.record_types?.length > 3 && <span style={{ fontSize: '0.6rem', color: 'var(--gray-400)' }}>+{r.record_types.length - 3}</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.purpose || '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.45rem', borderRadius: 999, background: r.urgency === 'Urgent' || r.urgency === 'Court / Legal' ? 'rgba(239,68,68,0.1)' : 'var(--gray-100)', color: r.urgency === 'Urgent' || r.urgency === 'Court / Legal' ? '#dc2626' : 'var(--gray-600)' }}>
                      {r.urgency}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{fmtDate(r.requested_at)}</td>
                  <td>
                    <span style={{ ...REQUEST_STATUS[r.status], fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                      {REQUEST_STATUS[r.status]?.label || r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} disabled={updatingId === r.id} onClick={() => updateRequestStatus(r.id, 'approved')}>Approve</button>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#dc2626' }} disabled={updatingId === r.id} onClick={() => updateRequestStatus(r.id, 'rejected')}>Reject</button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: '#059669', borderColor: '#059669' }} disabled={updatingId === r.id} onClick={() => updateRequestStatus(r.id, 'ready')}>Mark Ready</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

    </div>
    {showModal && <RequestModal patients={patients} onClose={() => setShowModal(false)} onSave={addRequest} />}
    </>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Clock, X, Loader } from 'lucide-react'
import { api } from '../api'

const STATUS = {
  'checked-in': { bg: 'rgba(59,130,246,0.1)', color: '#1d4ed8', label: 'Checked In' },
  'waiting': { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Waiting' },
  'in-progress': { bg: 'rgba(99,102,241,0.1)', color: '#4338ca', label: 'In Progress' },
  'scheduled': { bg: 'var(--gray-100)', color: 'var(--gray-600)', label: 'Scheduled' },
  'completed': { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Completed' },
}

const TYPE_COLORS = {
  'Follow-up': { bg: 'rgba(13,148,136,0.08)', color: 'var(--accent-teal)' },
  'Consultation': { bg: 'var(--primary-50)', color: 'var(--primary-700)' },
  'New Patient': { bg: 'rgba(245,158,11,0.08)', color: '#b45309' },
  'Emergency': { bg: 'rgba(239,68,68,0.08)', color: '#dc2626' },
}

function BookModal({ onClose, onSave, doctors }) {
  const [form, setForm] = useState({
    patient_id: '', doctor_id: '', department: '', visit_type: 'Consultation',
    symptoms: '', fee: '', visit_date: new Date().toISOString().slice(0, 10),
  })
  const [patients, setPatients] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.getPatients().then(setPatients).catch(() => { })
  }, [])

  const handleSubmit = async () => {
    if (!form.patient_id || !form.doctor_id || !form.department) {
      setError('Please select a patient, doctor and department.')
      return
    }
    setSaving(true); setError(null)
    try {
      const visit = await api.createOPD(form)
      onSave(visit)
      onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Book OPD Appointment</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Schedule a new outpatient consultation</p>
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
              <label className="form-label">Doctor*</label>
              <select className="form-input form-select" value={form.doctor_id} onChange={e => h('doctor_id', e.target.value)}>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.department}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department*</label>
              <select className="form-input form-select" value={form.department} onChange={e => h('department', e.target.value)}>
                <option value="">Select department</option>
                {['Cardiology', 'Neurology', 'Orthopaedics', 'General Medicine', 'Endocrinology', 'Nephrology', 'Dermatology'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Visit Type</label>
              <select className="form-input form-select" value={form.visit_type} onChange={e => h('visit_type', e.target.value)}>
                <option>Consultation</option>
                <option>Follow-up</option>
                <option>New Patient</option>
                <option>Emergency</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Visit Date</label>
              <input className="form-input" type="date" value={form.visit_date} onChange={e => h('visit_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Consultation Fee (Rs)</label>
              <input className="form-input" type="number" placeholder="e.g. 500" value={form.fee} onChange={e => h('fee', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Chief Complaint / Symptoms</label>
              <textarea className="form-input form-textarea" placeholder="Briefly describe the reason for visit..." value={form.symptoms} onChange={e => h('symptoms', e.target.value)} style={{ minHeight: 72 }} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-teal" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <Plus size={14} />} Book Appointment
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OPD() {
  const [visits, setVisits] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (search) params.search = search
      const [opdData, docs] = await Promise.all([
        api.getOPD(params),
        api.getDoctors(),
      ])
      setVisits(opdData)
      setDoctors(docs)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const handleSave = (visit) => setVisits(v => [visit, ...v])

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const updated = await api.updateOPD(id, { status: newStatus })
      setVisits(v => v.map(visit => visit.id === id ? { ...visit, ...updated } : visit))
    } catch (e) { alert('Failed to update status: ' + e.message) }
  }

  const counts = {
    total: visits.length,
    waiting: visits.filter(a => a.status === 'waiting' || a.status === 'checked-in').length,
    inProgress: visits.filter(a => a.status === 'in-progress').length,
    completed: visits.filter(a => a.status === 'completed').length,
  }

  const inProgress = visits.find(v => v.status === 'in-progress')
  const nextUp = visits.find(v => v.status === 'waiting' || v.status === 'checked-in')

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">OPD Management</h1>
          <p className="page-subtitle">Outpatient appointments and consultation scheduling</p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Book Appointment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Today', val: counts.total, color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'Waiting / Checked-In', val: counts.waiting, color: '#b45309', bg: 'rgba(245,158,11,0.06)' },
          { label: 'In Consultation', val: counts.inProgress, color: '#4338ca', bg: 'rgba(99,102,241,0.08)' },
          { label: 'Completed', val: counts.completed, color: '#059669', bg: 'rgba(16,185,129,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Live Queue Banner */}
      {(inProgress || nextUp) && (
        <div style={{
          background: 'linear-gradient(135deg, var(--primary-600), var(--accent-teal))',
          borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.5rem', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#86efac', animation: 'pulse-dot 2s infinite' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem' }}>
                {inProgress ? 'Currently In Consultation' : 'Queue Active'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.825rem' }}>
                {inProgress
                  ? `${inProgress.patient_name || 'Patient'} (${inProgress.token}) — ${inProgress.doctor_name || ''} · ${inProgress.department}`
                  : 'No active consultation'}
              </div>
            </div>
          </div>
          {nextUp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
              <Clock size={15} />
              <span>Next: {nextUp.patient_name} ({nextUp.token})</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search patient or doctor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['All', 'waiting', 'checked-in', 'in-progress', 'scheduled', 'completed'].map(f => (
            <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
              onClick={() => setStatusFilter(f)}>
              {STATUS[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      {/* Appointments Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                  <Loader size={20} className="spin" style={{ display: 'inline-block' }} />
                </td></tr>
              ) : visits.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No OPD visits found</td></tr>
              ) : visits.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem', color: 'var(--primary-700)' }}>
                      {a.token}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                        {(a.patient_name || 'P').split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{a.patient_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{a.patient_id} {a.age ? `· Age ${a.age}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{a.doctor_name || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{a.department}</td>
                  <td>
                    <span style={{ background: TYPE_COLORS[a.visit_type]?.bg || 'var(--gray-100)', color: TYPE_COLORS[a.visit_type]?.color || 'var(--gray-600)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                      {a.visit_type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                    {a.visit_date ? new Date(a.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td>
                    <span style={{ background: STATUS[a.status]?.bg, color: STATUS[a.status]?.color, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                      {STATUS[a.status]?.label || a.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {a.status !== 'completed' && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            const next = a.status === 'scheduled' ? 'checked-in'
                              : a.status === 'checked-in' ? 'in-progress'
                                : a.status === 'in-progress' ? 'completed'
                                  : 'completed'
                            handleStatusUpdate(a.id, next)
                          }}
                        >
                          {a.status === 'scheduled' ? 'Check In' : a.status === 'checked-in' ? 'Start' : 'Complete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Showing {visits.length} appointments</span>
        </div>
      </div>

      {showModal && <BookModal onClose={() => setShowModal(false)} onSave={handleSave} doctors={doctors} />}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, Plus, Search, Clock, User, Phone, Stethoscope,
  CheckCircle, X, Loader, RefreshCw, Filter, ChevronLeft,
  ChevronRight, AlertTriangle, Hash
} from 'lucide-react'
import { api } from '../api'

const VISIT_TYPES = ['New Patient', 'Follow-up', 'Review', 'Emergency', 'Procedure', 'Post-Op']
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30'
]
const DEPARTMENTS = [
  'General Medicine', 'General Surgery', 'Orthopaedics', 'Gynaecology & Obstetrics',
  'Paediatrics', 'Cardiology', 'Neurology', 'Nephrology', 'Urology',
  'Gastroenterology', 'Oncology', 'Pulmonology', 'Dermatology', 'Ophthalmology',
  'ENT', 'Psychiatry', 'Endocrinology', 'Rheumatology', 'Emergency Medicine',
]

const STATUS = {
  scheduled:   { bg: 'rgba(100,116,139,0.1)',  color: '#475569', label: 'Scheduled' },
  confirmed:   { bg: 'var(--primary-50)',       color: 'var(--primary-700)', label: 'Confirmed' },
  waiting:     { bg: 'rgba(245,158,11,0.1)',   color: '#b45309', label: 'Waiting' },
  'checked-in':{ bg: 'rgba(245,158,11,0.1)',   color: '#b45309', label: 'Checked-In' },
  'with-doctor':{ bg: 'rgba(99,102,241,0.1)',  color: '#4338ca', label: 'With Doctor' },
  completed:   { bg: 'rgba(16,185,129,0.1)',   color: '#059669', label: 'Completed' },
  cancelled:   { bg: 'rgba(239,68,68,0.1)',    color: '#dc2626', label: 'Cancelled' },
  'no-show':   { bg: 'rgba(239,68,68,0.06)',   color: '#9f1239', label: 'No Show' },
}

const VISIT_COLORS = {
  'New Patient': { bg: 'rgba(245,158,11,0.1)',  color: '#b45309' },
  'Follow-up':   { bg: 'rgba(13,148,136,0.1)',  color: '#0d9488' },
  'Emergency':   { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626' },
  'Review':      { bg: 'var(--primary-50)',      color: 'var(--primary-700)' },
  'Procedure':   { bg: 'rgba(99,102,241,0.1)',  color: '#4338ca' },
  'Post-Op':     { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
}

// ─── Next status in workflow ──────────────────────────────────────────────────
function nextStatus(current) {
  const c = String(current || '').toLowerCase()
  if (c === 'waiting') return 'with-doctor'
  const flow = ['scheduled', 'confirmed', 'checked-in', 'with-doctor', 'completed']
  const idx = flow.indexOf(c)
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null
}
function nextLabel(current) {
  const c = String(current || '').toLowerCase()
  if (c === 'waiting') return 'Call In'
  const map = {
    scheduled: 'Confirm',
    confirmed: 'Check-In',
    'checked-in': 'Call In',
    'with-doctor': 'Mark Done',
  }
  return map[c] || null
}

// ─── Book Appointment Modal ───────────────────────────────────────────────────
function BookModal({ onClose, onSave, doctors }) {
  const [patients, setPatients] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isWalkIn, setIsWalkIn] = useState(false)
  const [form, setForm] = useState({
    patient_id: '', doctor_id: '', department: '',
    visit_type: 'New Patient', visit_date: new Date().toISOString().slice(0, 10),
    slot_time: '09:00', fee: '', symptoms: '', priority: 'Normal',
    // Walk-in quick fields
    walkin_name: '', walkin_age: '', walkin_gender: 'Male', walkin_phone: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { api.getPatients().then(setPatients).catch(() => {}) }, [])

  const submit = async () => {
    if (!form.doctor_id || !form.department) { setError('Doctor and Department are required.'); return }
    if (!isWalkIn && !form.patient_id) { setError('Please select a registered patient.'); return }
    if (isWalkIn && !form.walkin_name) { setError('Patient name is required for walk-in.'); return }
    setSaving(true); setError(null)
    try {
      const payload = isWalkIn
        ? { ...form, patient_name: form.walkin_name, age: form.walkin_age, gender: form.walkin_gender, phone: form.walkin_phone, is_walkin: true }
        : { ...form }
      const visit = await api.createOPD(payload)
      onSave(visit); onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Book Appointment</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Schedule a new OPD consultation</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

          {/* Walk-in toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {[false, true].map(w => (
              <button key={String(w)} onClick={() => setIsWalkIn(w)} style={{ flex: 1, padding: '0.625rem', borderRadius: 'var(--radius-lg)', border: `1.5px solid ${isWalkIn === w ? 'var(--primary-500)' : 'var(--gray-200)'}`, background: isWalkIn === w ? 'var(--primary-50)' : '#fff', color: isWalkIn === w ? 'var(--primary-700)' : 'var(--gray-500)', fontWeight: isWalkIn === w ? 700 : 400, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 150ms' }}>
                {w ? '🚶 Walk-In (Unregistered)' : '📋 Registered Patient'}
              </button>
            ))}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {isWalkIn ? (
              <>
                <div className="form-group"><label className="form-label">Patient Name *</label><input className="form-input" placeholder="Full name" value={form.walkin_name} onChange={e => set('walkin_name', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Mobile</label><input className="form-input" type="tel" placeholder="Mobile number" value={form.walkin_phone} onChange={e => set('walkin_phone', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Age</label><input className="form-input" type="number" placeholder="Age" value={form.walkin_age} onChange={e => set('walkin_age', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Gender</label>
                  <select className="form-input form-select" value={form.walkin_gender} onChange={e => set('walkin_gender', e.target.value)}>
                    {['Male', 'Female', 'Other'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Registered Patient *</label>
                <select className="form-input form-select" value={form.patient_id} onChange={e => set('patient_id', e.target.value)}>
                  <option value="">Search and select patient…</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} — UHID: {p.id} · Age {p.age}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select className="form-input form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Consulting Doctor *</label>
              <select className="form-input form-select" value={form.doctor_id} onChange={e => set('doctor_id', e.target.value)}>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} — {d.department}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Visit Type</label>
              <select className="form-input form-select" value={form.visit_type} onChange={e => set('visit_type', e.target.value)}>
                {VISIT_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['Normal', 'Urgent', 'Emergency', 'VIP', 'Senior Citizen'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Appointment Date</label>
              <input className="form-input" type="date" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Time Slot</label>
              <select className="form-input form-select" value={form.slot_time} onChange={e => set('slot_time', e.target.value)}>
                {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Consultation Fee (₹)</label>
              <input className="form-input" type="number" placeholder="e.g. 500" value={form.fee} onChange={e => set('fee', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Chief Complaint / Symptoms</label>
              <textarea className="form-input form-textarea" placeholder="Briefly describe reason for visit…" value={form.symptoms} onChange={e => set('symptoms', e.target.value)} style={{ minHeight: 72 }} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? <><Loader size={14} className="spin" /> Booking…</> : <><CheckCircle size={14} /> Book Appointment</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Today Date String ────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Main Appointments Page ───────────────────────────────────────────────────
export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState(todayStr())
  const [deptFilter, setDeptFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (search) params.search = search
      if (dateFilter) params.visit_date = dateFilter
      const [appts, docs] = await Promise.all([api.getOPD(params), api.getDoctors()])
      setAppointments(appts); setDoctors(docs)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, statusFilter, dateFilter])

  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t) }, [fetchData])

  const handleSave = (a) => setAppointments(prev => [a, ...prev])

  const handleAdvance = async (appt) => {
    const ns = nextStatus(appt.status)
    if (!ns) return
    setUpdatingId(appt.id)
    try {
      const updated = await api.updateOPD(appt.id, { status: ns })
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, ...updated } : a))
    } catch (e) { alert('Update failed: ' + e.message) } finally { setUpdatingId(null) }
  }

  const handleCancel = async (appt) => {
    if (!window.confirm(`Cancel appointment for ${appt.patient_name}?`)) return
    setUpdatingId(appt.id)
    try {
      await api.updateOPD(appt.id, { status: 'cancelled' })
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a))
    } catch (e) { alert('Cancel failed: ' + e.message) } finally { setUpdatingId(null) }
  }

  // Filter client-side by dept
  const filtered = appointments.filter(a =>
    (deptFilter === 'All' || a.department === deptFilter)
  )

  const counts = {
    total: filtered.length,
    waiting: filtered.filter(a => ['scheduled', 'confirmed', 'checked-in'].includes(a.status)).length,
    inRoom: filtered.filter(a => a.status === 'with-doctor').length,
    done: filtered.filter(a => a.status === 'completed').length,
    cancelled: filtered.filter(a => ['cancelled', 'no-show'].includes(a.status)).length,
  }

  const depts = ['All', ...Array.from(new Set(appointments.map(a => a.department).filter(Boolean)))]
  const inProgress = appointments.find(a => a.status === 'with-doctor')
  const nextUp = appointments.find(a => a.status === 'checked-in')

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointment & Scheduling</h1>
          <p className="page-subtitle">{fmtDate(dateFilter)} — OPD token & slot management</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Book Appointment</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Booked', value: counts.total, color: 'var(--gray-700)', bg: 'var(--gray-50)', icon: Calendar },
          { label: 'Waiting / Queue', value: counts.waiting, color: '#b45309', bg: 'rgba(245,158,11,0.07)', icon: Clock },
          { label: 'With Doctor', value: counts.inRoom, color: '#4338ca', bg: 'rgba(99,102,241,0.07)', icon: Stethoscope },
          { label: 'Completed', value: counts.done, color: '#059669', bg: 'rgba(16,185,129,0.07)', icon: CheckCircle },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={17} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? '…' : s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Queue Banner */}
      {(inProgress || nextUp) && (
        <div style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--accent-teal))', borderRadius: 'var(--radius-xl)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#86efac', animation: 'pulse-dot 2s infinite', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem' }}>
                {inProgress ? '🩺 Now Consulting' : '⏳ Queue Active'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.825rem' }}>
                {inProgress ? `Token ${inProgress.token} — ${inProgress.patient_name || 'Patient'} · Dr. ${inProgress.doctor_name || ''} · ${inProgress.department}` : 'No active consultation'}
              </div>
            </div>
          </div>
          {nextUp && (
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={14} />
              Next: <strong>{nextUp.patient_name}</strong> (Token {nextUp.token})
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body" style={{ padding: '0.875rem 1.25rem', display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="form-input" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: 160 }} />
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search patient, doctor, UHID…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input form-select" style={{ width: 190 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            {depts.map(d => <option key={d}>{d}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {['All', ...Object.keys(STATUS)].map(f => (
              <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize' }} onClick={() => setStatusFilter(f)}>
                {STATUS[f]?.label || f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      {/* Appointments Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Token</th><th>Patient</th><th>Doctor</th><th>Department</th>
                <th>Type</th><th>Date & Time</th><th>Fee</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                  <Loader size={20} className="spin" style={{ display: 'inline-block' }} />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem' }}>
                  <Calendar size={28} style={{ color: 'var(--gray-300)', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                  <div style={{ color: 'var(--gray-500)', fontWeight: 600 }}>No appointments found</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>Try changing the date or filters, or book a new appointment.</div>
                </td></tr>
              ) : filtered.map(a => {
                const ns = nextStatus(a.status)
                const nl = nextLabel(a.status)
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: a.priority === 'Emergency' ? 'rgba(239,68,68,0.1)' : 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: a.priority === 'Emergency' ? '#dc2626' : 'var(--primary-700)' }}>
                        {a.token || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                          {(a.patient_name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{a.patient_name || '—'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{a.patient_id}{a.age ? ` · Age ${a.age}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-700)' }}>Dr. {a.doctor_name || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{a.department}</td>
                    <td>
                      <span style={{ ...(VISIT_COLORS[a.visit_type] || {}), fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                        {a.visit_type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', fontWeight: 600 }}>{fmtDate(a.visit_date)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{a.slot_time || '—'}</div>
                    </td>
                    <td style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                      {a.fee ? `₹${Number(a.fee).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      <span style={{ background: STATUS[a.status]?.bg, color: STATUS[a.status]?.color, fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, whiteSpace: 'nowrap' }}>
                        {STATUS[a.status]?.label || a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        {nl && ns && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.3rem 0.625rem', fontSize: '0.72rem' }}
                            disabled={updatingId === a.id}
                            onClick={() => handleAdvance(a)}>
                            {updatingId === a.id ? <Loader size={12} className="spin" /> : nl}
                          </button>
                        )}
                        {!['completed', 'cancelled', 'no-show'].includes(a.status) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}
                            disabled={updatingId === a.id}
                            onClick={() => handleCancel(a)}>
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Showing {filtered.length} appointments</span>
          {counts.cancelled > 0 && <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>{counts.cancelled} cancelled / no-show</span>}
        </div>
      </div>

      {showModal && <BookModal onClose={() => setShowModal(false)} onSave={handleSave} doctors={doctors} />}
    </div>
  )
}

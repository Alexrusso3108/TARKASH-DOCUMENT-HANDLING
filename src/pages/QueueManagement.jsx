import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Hash, Users, Clock, CheckCircle, Loader, RefreshCw,
  Plus, X, AlertTriangle, Bell, Monitor, PhoneCall, ChevronRight
} from 'lucide-react'
import { api } from '../api'

const DEPARTMENTS = [
  'General Medicine', 'General Surgery', 'Orthopaedics', 'Gynaecology & Obstetrics',
  'Paediatrics', 'Cardiology', 'Neurology', 'Nephrology', 'Ophthalmology',
  'ENT', 'Dermatology', 'Psychiatry', 'Emergency Medicine',
]

const PRIORITY_STYLES = {
  Normal:         { bg: 'var(--gray-100)', color: 'var(--gray-600)', dot: '#94a3b8' },
  Urgent:         { bg: 'rgba(245,158,11,0.1)', color: '#b45309', dot: '#f59e0b' },
  Emergency:      { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', dot: '#ef4444' },
  VIP:            { bg: 'var(--primary-50)', color: 'var(--primary-700)', dot: '#6366f1' },
  'Senior Citizen':{ bg: 'rgba(13,148,136,0.1)', color: '#0d9488', dot: '#2dd4bf' },
}

const STATUS = {
  waiting:    { label: 'Waiting',     bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
  calling:    { label: 'Calling…',   bg: 'var(--primary-50)', color: 'var(--primary-700)' },
  'in-room':  { label: 'In Room',    bg: 'rgba(99,102,241,0.1)', color: '#4338ca' },
  done:       { label: 'Done',       bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  skipped:    { label: 'Skipped',    bg: 'rgba(239,68,68,0.08)', color: '#dc2626' },
}

let _tokenCounter = 1
function genToken(dept) {
  const prefix = dept ? dept.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'GN'
  return `${prefix}${String(_tokenCounter++).padStart(3, '0')}`
}

// ─── Issue Token Modal ────────────────────────────────────────────────────────
function TokenModal({ onClose, onIssued, doctors }) {
  const [patients, setPatients] = useState([])
  const [form, setForm] = useState({
    patient_name: '', patient_id: '', is_registered: false,
    department: 'General Medicine', doctor_id: '', priority: 'Normal',
    phone: '', visit_type: 'Consultation',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { api.getPatients().then(setPatients).catch(() => {}) }, [])

  const submit = () => {
    if (!form.patient_name && !form.patient_id) { setError('Patient name or selection required'); return }
    if (!form.department) { setError('Department is required'); return }
    setSaving(true); setError(null)
    const token = genToken(form.department)
    const entry = {
      id: Date.now(),
      token,
      ...form,
      patient_name: form.is_registered
        ? (patients.find(p => p.id === form.patient_id)?.name || form.patient_name)
        : form.patient_name,
      issued_at: new Date(),
      status: 'waiting',
    }
    setTimeout(() => { onIssued(entry); setSaving(false); onClose() }, 300)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Issue Queue Token</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Generate a numbered token for a patient</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

          {/* Registered toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {[false, true].map(reg => (
              <button key={String(reg)} onClick={() => set('is_registered', reg)} style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-lg)', border: `1.5px solid ${form.is_registered === reg ? 'var(--primary-400)' : 'var(--gray-200)'}`, background: form.is_registered === reg ? 'var(--primary-50)' : '#fff', color: form.is_registered === reg ? 'var(--primary-700)' : 'var(--gray-500)', fontWeight: form.is_registered === reg ? 700 : 400, fontSize: '0.825rem', cursor: 'pointer' }}>
                {reg ? '📋 Registered (UHID)' : '🚶 Walk-In'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {form.is_registered ? (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Select Registered Patient</label>
                <select className="form-input form-select" value={form.patient_id} onChange={e => { set('patient_id', e.target.value); set('patient_name', patients.find(p => p.id === e.target.value)?.name || '') }}>
                  <option value="">Choose patient…</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.id}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Patient Name</label>
                <input className="form-input" placeholder="Full name" value={form.patient_name} onChange={e => set('patient_name', e.target.value)} />
              </div>
            )}
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Department</label>
                <select className="form-input form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Priority</label>
                <select className="form-input form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {Object.keys(PRIORITY_STYLES).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Mobile</label>
                <input className="form-input" type="tel" placeholder="Optional" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Visit Type</label>
                <select className="form-input form-select" value={form.visit_type} onChange={e => set('visit_type', e.target.value)}>
                  {['Consultation', 'Follow-up', 'Emergency', 'Procedure'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <Hash size={14} />} Issue Token
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Token Card ───────────────────────────────────────────────────────────────
function TokenCard({ entry, onCall, onDone, onSkip }) {
  const pri = PRIORITY_STYLES[entry.priority] || PRIORITY_STYLES.Normal
  const st = STATUS[entry.status] || STATUS.waiting
  const elapsed = Math.floor((Date.now() - new Date(entry.issued_at)) / 60000)

  return (
    <div style={{
      background: entry.status === 'calling' ? 'var(--primary-50)' : '#fff',
      border: `1.5px solid ${entry.status === 'calling' ? 'var(--primary-300)' : entry.status === 'in-room' ? 'rgba(99,102,241,0.3)' : 'var(--gray-100)'}`,
      borderRadius: 'var(--radius-xl)', padding: '1rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '1rem',
      transition: 'all 200ms',
      animation: entry.status === 'calling' ? 'pulse-border 1.5s infinite' : undefined,
    }}>
      {/* Token Badge */}
      <div style={{ width: 52, height: 52, borderRadius: 12, background: entry.status === 'done' ? 'rgba(16,185,129,0.1)' : entry.status === 'calling' ? 'var(--primary-100)' : pri.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: '0.875rem', color: entry.status === 'done' ? '#059669' : entry.status === 'calling' ? 'var(--primary-700)' : pri.color, textAlign: 'center', lineHeight: 1 }}>
          {entry.token}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{entry.patient_name}</span>
          {entry.priority !== 'Normal' && (
            <span style={{ ...pri, fontSize: '0.6rem', fontWeight: 800, padding: '0.1rem 0.375rem', borderRadius: 999, textTransform: 'uppercase' }}>{entry.priority}</span>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
          {entry.department} · {entry.visit_type}
          {entry.phone && ` · ${entry.phone}`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <span style={{ ...st, fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.375rem', borderRadius: 999, textTransform: 'uppercase' }}>{st.label}</span>
          <span style={{ fontSize: '0.68rem', color: entry.status === 'waiting' && elapsed > 15 ? '#dc2626' : 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={10} />{elapsed}m wait
          </span>
        </div>
      </div>

      {/* Actions */}
      {entry.status === 'waiting' && (
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => onCall(entry.id)} style={{ padding: '0.3rem 0.625rem', fontSize: '0.72rem' }}>
            <Bell size={12} /> Call
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onSkip(entry.id)} style={{ padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}>
            Skip
          </button>
        </div>
      )}
      {entry.status === 'calling' && (
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => onDone(entry.id, 'in-room')} style={{ padding: '0.3rem 0.625rem', fontSize: '0.72rem', background: '#4338ca', borderColor: '#4338ca' }}>
            In Room
          </button>
        </div>
      )}
      {entry.status === 'in-room' && (
        <button className="btn btn-sm" onClick={() => onDone(entry.id, 'done')} style={{ padding: '0.3rem 0.625rem', fontSize: '0.72rem', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          <CheckCircle size={12} /> Done
        </button>
      )}
    </div>
  )
}

// ─── Display Board ────────────────────────────────────────────────────────────
function DisplayBoard({ queue }) {
  const calling = queue.filter(q => q.status === 'calling')
  const waiting = queue.filter(q => q.status === 'waiting')
  return (
    <div style={{ background: '#0f172a', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.5rem', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Monitor size={18} color="#94a3b8" />
        <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Queue Display Board</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Now Calling</div>
          {calling.length === 0
            ? <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#334155', letterSpacing: '-0.02em' }}>—</div>
            : calling.map(c => (
              <div key={c.id} style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.04em', animation: 'pulse-dot 1s infinite', lineHeight: 1, marginBottom: '0.25rem' }}>
                {c.token}
                <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#94a3b8', marginLeft: '0.75rem' }}>{c.department}</span>
              </div>
            ))}
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Up Next</div>
          <div style={{ display: 'flex', flex: 'column', gap: '0.375rem' }}>
            {waiting.slice(0, 5).map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.375rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontWeight: 800, color: '#e2e8f0', fontSize: '1rem', width: 60 }}>{w.token}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{w.department}</span>
                {w.priority !== 'Normal' && <span style={{ fontSize: '0.58rem', fontWeight: 800, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '0.1rem 0.35rem', borderRadius: 999, textTransform: 'uppercase' }}>{w.priority}</span>}
              </div>
            ))}
            {waiting.length === 0 && <div style={{ color: '#334155', fontSize: '0.875rem' }}>Queue clear</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Queue Management Page ───────────────────────────────────────────────
export default function QueueManagement() {
  const [queue, setQueue] = useState([])
  const [doctors, setDoctors] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [deptFilter, setDeptFilter] = useState('All')
  const [showBoard, setShowBoard] = useState(false)

  useEffect(() => { api.getDoctors().then(setDoctors).catch(() => {}) }, [])

  const filtered = queue.filter(q =>
    (deptFilter === 'All' || q.department === deptFilter) &&
    q.status !== 'done' && q.status !== 'skipped'
  )
  const done = queue.filter(q => q.status === 'done' || q.status === 'skipped')

  const addToQueue = (entry) => setQueue(prev => {
    // Priority ordering: Emergency > Urgent > Senior Citizen > VIP > Normal
    const order = { Emergency: 0, Urgent: 1, 'Senior Citizen': 2, VIP: 3, Normal: 4 }
    const newQ = [...prev, entry]
    return newQ.sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4))
  })

  const callToken = (id) => setQueue(prev => prev.map(q =>
    q.id === id ? { ...q, status: 'calling' } : q.status === 'calling' ? { ...q, status: 'waiting' } : q
  ))

  const updateStatus = (id, status) => setQueue(prev => prev.map(q => q.id === id ? { ...q, status } : q))

  const skipToken = (id) => setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'skipped' } : q))

  const depts = ['All', ...Array.from(new Set(queue.map(q => q.department).filter(Boolean)))]
  const stats = {
    total: queue.filter(q => q.status !== 'done' && q.status !== 'skipped').length,
    waiting: queue.filter(q => q.status === 'waiting').length,
    calling: queue.filter(q => q.status === 'calling').length,
    done: done.length,
  }

  return (
    <>
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Queue Management</h1>
          <p className="page-subtitle">Real-time OPD token queue and calling system</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowBoard(!showBoard)}>
            <Monitor size={13} /> {showBoard ? 'Hide' : 'Show'} Display Board
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Hash size={15} /> Issue Token
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'In Queue', value: stats.total, color: 'var(--primary-700)', bg: 'var(--primary-50)', icon: Users },
          { label: 'Waiting', value: stats.waiting, color: '#b45309', bg: 'rgba(245,158,11,0.07)', icon: Clock },
          { label: 'Being Called', value: stats.calling, color: '#4338ca', bg: 'rgba(99,102,241,0.07)', icon: Bell },
          { label: 'Completed Today', value: stats.done, color: '#059669', bg: 'rgba(16,185,129,0.07)', icon: CheckCircle },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={17} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Display board */}
      {showBoard && <DisplayBoard queue={queue} />}

      {/* Dept filter */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {depts.map(d => (
          <button key={d} className={`btn btn-sm ${deptFilter === d ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDeptFilter(d)}>{d}</button>
        ))}
      </div>

      {/* Active Queue */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <h5 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Active Queue</h5>
          <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{filtered.length} in queue</span>
        </div>
        <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
              <Users size={24} style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600 }}>Queue is empty</div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Issue a token to add a patient to the queue</div>
            </div>
          ) : (
            filtered.map(entry => (
              <TokenCard key={entry.id} entry={entry} onCall={callToken} onDone={updateStatus} onSkip={skipToken} />
            ))
          )}
        </div>
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Completed / Skipped</h5>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{done.length}</span>
          </div>
          <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 240, overflow: 'auto' }}>
            {done.map(entry => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-50)' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: 'var(--gray-400)', width: 64 }}>{entry.token}</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', flex: 1 }}>{entry.patient_name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{entry.department}</span>
                <span style={{ ...STATUS[entry.status], fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.375rem', borderRadius: 999 }}>{STATUS[entry.status]?.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
    {showModal && <TokenModal onClose={() => setShowModal(false)} onIssued={addToQueue} doctors={doctors} />}
    </>
  )
}

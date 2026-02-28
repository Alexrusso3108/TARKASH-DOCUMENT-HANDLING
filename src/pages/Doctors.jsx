import { useState, useEffect } from 'react'
import { Search, Plus, Star, Phone, Mail, X, Calendar, Loader } from 'lucide-react'
import { api } from '../api'

const STATUS_STYLES = {
  'available': { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Available', dot: '#059669' },
  'in-consultation': { bg: 'rgba(99,102,241,0.1)', color: '#4338ca', label: 'In Consultation', dot: '#6366f1' },
  'on-leave': { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'On Leave', dot: '#ef4444' },
}

function AddDoctorModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', department: '', qualification: '', experience: '', rating: '5.0',
    status: 'available', schedule: '', phone: '', email: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.department) { setError('Name and Department are required.'); return }
    setSaving(true); setError(null)
    try {
      const doc = await api.createDoctor(form)
      onSave(doc); onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Add New Doctor</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Fill in the doctor's details</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {[
              ['name', 'Full Name*', 'text', 'e.g. Dr. Anjali Sharma'],
              ['department', 'Department*', 'text', 'e.g. Cardiology'],
              ['qualification', 'Qualification', 'text', 'e.g. MBBS, MD'],
              ['experience', 'Experience (years)', 'number', 'e.g. 10'],
              ['phone', 'Phone', 'tel', 'e.g. 98765 10010'],
              ['email', 'Email', 'email', 'e.g. a.sharma@dscribe.in'],
              ['schedule', 'Working Schedule', 'text', 'e.g. Mon–Fri, 9AM–5PM'],
            ].map(([key, label, type, ph]) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input className="form-input" type={type} placeholder={ph} value={form[key]} onChange={e => handle(key, e.target.value)} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={e => handle('status', e.target.value)}>
                <option value="available">Available</option>
                <option value="in-consultation">In Consultation</option>
                <option value="on-leave">On Leave</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <Plus size={14} />} Add Doctor
          </button>
        </div>
      </div>
    </div>
  )
}

function DoctorModal({ doc, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Doctor Profile</h4>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {doc.name.split(' ').slice(1).map(n => n[0]).join('')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>{doc.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>{doc.department} · {doc.qualification}</div>
              <span style={{ background: STATUS_STYLES[doc.status]?.bg, color: STATUS_STYLES[doc.status]?.color, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: 999 }}>
                {STATUS_STYLES[doc.status]?.label}
              </span>
            </div>
          </div>
          {[
            ['Employee ID', doc.id],
            ['Experience', `${doc.experience} years`],
            ['Total Patients', doc.patient_count],
            ['Rating', `${doc.rating} / 5.0`],
            ['Working Schedule', doc.schedule],
            ['Phone', doc.phone],
            ['Email', doc.email],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', padding: '0.75rem 0', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ width: 140, fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)', fontWeight: 500 }}>{val || '—'}</span>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary"><Calendar size={14} /> Schedule Appointment</button>
        </div>
      </div>
    </div>
  )
}

export default function Doctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true); setError(null)
      api.getDoctors({ search, status: statusFilter })
        .then(d => setDoctors(d))
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [search, statusFilter])

  const handleSave = (doc) => setDoctors(prev => [doc, ...prev])

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="page-subtitle">{loading ? '…' : `${doctors.length}`} medical practitioners currently on staff</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Doctor</button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Available Now', val: doctors.filter(d => d.status === 'available').length, color: '#059669', bg: 'rgba(16,185,129,0.06)' },
          { label: 'In Consultation', val: doctors.filter(d => d.status === 'in-consultation').length, color: '#4338ca', bg: 'rgba(99,102,241,0.08)' },
          { label: 'On Leave', val: doctors.filter(d => d.status === 'on-leave').length, color: '#dc2626', bg: 'rgba(239,68,68,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by name or department..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['All', 'available', 'in-consultation', 'on-leave'].map(f => (
            <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }} onClick={() => setStatusFilter(f)}>
              {STATUS_STYLES[f]?.label || 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      {/* Doctors Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}><Loader size={24} className="spin" style={{ display: 'inline-block' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {doctors.map(doc => (
            <div key={doc.id} className="card card-hoverable" style={{ cursor: 'pointer', padding: '1.5rem' }} onClick={() => setSelected(doc)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: '#fff', flexShrink: 0, position: 'relative' }}>
                    {doc.name.split(' ').slice(1).map(n => n[0]).join('')}
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: STATUS_STYLES[doc.status]?.dot, border: '2px solid #fff' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '0.15rem' }}>{doc.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{doc.department}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star size={12} fill="#f59e0b" color="#f59e0b" />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--gray-700)' }}>{doc.rating}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '1rem', fontStyle: 'italic' }}>{doc.qualification}</div>
              <div className="divider" />
              <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--gray-900)', letterSpacing: '-0.03em' }}>{doc.patient_count}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Patients</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--gray-900)', letterSpacing: '-0.03em' }}>{doc.experience}y</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Experience</div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ background: STATUS_STYLES[doc.status]?.bg, color: STATUS_STYLES[doc.status]?.color, fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {STATUS_STYLES[doc.status]?.label}
                  </span>
                </div>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                  <Phone size={12} /> Call
                </button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                  <Calendar size={12} /> Schedule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <DoctorModal doc={selected} onClose={() => setSelected(null)} />}
      {showAdd && <AddDoctorModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </div>
  )
}

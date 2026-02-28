import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, UserPlus, Eye, EyeOff, Loader, X, CheckCircle, AlertCircle, Users, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'doctor', label: 'Doctor', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  { value: 'nurse', label: 'Nurse', color: '#0d9488', bg: 'rgba(13,148,136,0.1)' },
  { value: 'receptionist', label: 'Receptionist', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { value: 'lab_tech', label: 'Lab Technician', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: 'pharmacist', label: 'Pharmacist', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
]

const DEPARTMENTS = ['ICU', 'Cardiology', 'Orthopaedics', 'General Ward', 'Obs & Gyn', 'Neurology', 'Oncology', 'Paediatrics', 'Nephrology', 'Pharmacy', 'Laboratory', 'Reception']

function getRoleStyle(role) {
  return ROLES.find(r => r.value === role) || { color: 'var(--gray-500)', bg: 'var(--gray-100)', label: role }
}

function CreateStaffModal({ token, hospitalName, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', role: 'doctor', department: '', phone: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [created, setCreated] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.password) { setError('Name and password are required'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('http://localhost:5000/api/auth/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setCreated(data)
      onCreated(data)
    } catch { setError('Server error') } finally { setSaving(false) }
  }

  if (created) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <CheckCircle size={28} color="#fff" />
          </div>
          <h4 style={{ fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>Staff Account Created!</h4>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Share these credentials with the staff member.</p>

          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
            {[
              ['Name', created.name],
              ['Login ID', created.login_id],
              ['Role', getRoleStyle(created.role).label],
              ['Department', created.department || '—'],
              ['Password', '(as entered — not shown again)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--gray-500)' }}>{k}</span>
                <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontFamily: k === 'Login ID' ? 'monospace' : 'inherit', fontSize: k === 'Login ID' ? '0.875rem' : undefined }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#b45309', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-lg)', padding: '0.625rem 0.875rem', marginBottom: '1.5rem' }}>
            ⚠ The password is not stored in plaintext. Make sure to share it now.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setCreated(null); setForm({ name: '', role: 'doctor', department: '', phone: '', email: '', password: '' }) }}>
              <UserPlus size={14} /> Add Another
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Create Staff Login</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Generate credentials for a hospital staff member</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

          {/* Role Selector */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Role <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {ROLES.map(r => (
                <button key={r.value} type="button"
                  onClick={() => set('role', r.value)}
                  style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', border: `1.5px solid ${form.role === r.value ? r.color : 'var(--gray-200)'}`, background: form.role === r.value ? r.bg : '#fff', color: form.role === r.value ? r.color : 'var(--gray-600)', fontWeight: form.role === r.value ? 700 : 400, fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 150ms' }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.125rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="form-input" placeholder="e.g. Dr. Anjali Sharma" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" placeholder="Mobile number" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="staff@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Password <span style={{ color: 'var(--danger)' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={show ? 'text' : 'password'} style={{ paddingRight: '2.75rem' }} placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0 }}>
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>The Login ID will be auto-generated from the name and hospital.</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <UserPlus size={14} />}
            {saving ? 'Creating…' : 'Create Login'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StaffManagement() {
  const { token, user } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [toggling, setToggling] = useState(null)

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:5000/api/auth/staff', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setStaff(data)
    } catch { } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const handleCreated = (newMember) => setStaff(prev => [newMember, ...prev])

  const toggleActive = async (member) => {
    setToggling(member.id)
    try {
      const res = await fetch(`http://localhost:5000/api/auth/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !member.is_active }),
      })
      if (res.ok) {
        const updated = await res.json()
        setStaff(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
      }
    } catch { } finally { setToggling(null) }
  }

  const filtered = staff.filter(s => {
    const ms = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.login_id.toLowerCase().includes(search.toLowerCase())
    const mr = roleFilter === 'All' || s.role === roleFilter
    return ms && mr
  })

  const counts = ROLES.reduce((acc, r) => ({ ...acc, [r.value]: staff.filter(s => s.role === r.value).length }), {})

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={14} style={{ color: 'var(--primary-500)' }} />
            Manage login credentials for staff at <strong style={{ color: 'var(--gray-800)' }}>{user?.hospital_name || 'your hospital'}</strong>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={15} /> Create Staff Login
        </button>
      </div>

      {/* Role summary cards */}
      <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {ROLES.map(r => (
          <div key={r.value} style={{ background: '#fff', border: `1px solid ${staff.filter(s => s.role === r.value).length ? r.color + '33' : 'var(--gray-100)'}`, borderRadius: 'var(--radius-xl)', padding: '0.875rem 1.25rem', display: 'flex', flex: '1', minWidth: 110, alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 150ms' }} onClick={() => setRoleFilter(roleFilter === r.value ? 'All' : r.value)}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={16} style={{ color: r.color }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--gray-900)' }}>{counts[r.value] || 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{r.label}s</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter bar */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by name or login ID…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${roleFilter === 'All' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRoleFilter('All')}>All</button>
            {ROLES.map(r => (
              <button key={r.value} className={`btn btn-sm ${roleFilter === r.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRoleFilter(r.value)}>{r.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Login ID</th>
                <th>Role</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}><Loader size={20} className="spin" style={{ display: 'inline-block' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                      <UserPlus size={32} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.4 }} />
                      No staff accounts yet. Click "Create Staff Login" to get started.
                    </div>
                  </td>
                </tr>
              ) : filtered.map(s => {
                const rs = getRoleStyle(s.role)
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${rs.color}33, ${rs.color}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 800, color: rs.color, flexShrink: 0 }}>
                          {s.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '0.875rem' }}>{s.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{s.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary-700)', background: 'var(--primary-50)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>{s.login_id}</span></td>
                    <td><span style={{ background: rs.bg, color: rs.color, fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{rs.label}</span></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{s.department || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{s.phone || '—'}</td>
                    <td>
                      <span style={{ background: s.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: s.is_active ? '#059669' : '#dc2626', fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: 999, textTransform: 'uppercase' }}>
                        {s.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${s.is_active ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ fontSize: '0.75rem' }}
                        disabled={toggling === s.id}
                        onClick={() => toggleActive(s)}
                      >
                        {toggling === s.id ? <Loader size={12} className="spin" /> : s.is_active ? <><AlertCircle size={12} /> Suspend</> : <><CheckCircle size={12} /> Activate</>}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{filtered.length} staff member{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {showModal && <CreateStaffModal token={token} hospitalName={user?.hospital_name} onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  )
}

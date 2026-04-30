import { useState, useEffect, useRef } from 'react'
import {
  ShieldCheck, Search, Plus, X, FileText, CheckCircle,
  XCircle, AlertTriangle, Building2, Clock, ChevronDown,
  Save, RefreshCw, Loader
} from 'lucide-react'
import { api } from '../api'

const TPA_COMPANIES = [
  'Ayushman Bharat (PM-JAY)',
  'CGHS (Central Govt)',
  'ECHS (Ex-Servicemen)',
  'Star Health Insurance',
  'HDFC Ergo General Insurance',
  'ICICI Lombard',
  'Care Health Insurance',
  'Niva Bupa Health',
]

const STATUSES = ['Pre-Auth Pending', 'Approved', 'Rejected', 'Query Raised']

const STATUS_STYLE = {
  'Pre-Auth Pending': { bg: 'rgba(245,158,11,0.12)', color: '#b45309' },
  'Approved':         { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
  'Rejected':         { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
  'Query Raised':     { bg: 'rgba(139,92,246,0.12)',  color: '#6d28d9' },
}

const ICON_BG = {
  gray:   'rgba(99,102,241,0.10)',
  amber:  'rgba(245,158,11,0.12)',
  green:  'rgba(16,185,129,0.12)',
  red:    'rgba(239,68,68,0.12)',
}

/* ── New Pre-Auth modal ─────────────────────────────────── */
function NewClaimModal({ patients, onClose, onSave }) {
  const [form, setForm] = useState({
    patient_id: '', tpa: TPA_COMPANIES[0], policy_no: '',
    amount_requested: '', status: 'Pre-Auth Pending',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.patient_id || !form.policy_no || !form.amount_requested) return
    setSaving(true)
    const pt = patients.find(p => p.id === form.patient_id)
    const claim = {
      id: `CLM-${Date.now().toString().slice(-4)}`,
      patient_id: form.patient_id,
      patient_name: pt?.name || 'Unknown',
      tpa: form.tpa,
      policy_no: form.policy_no,
      amount_requested: parseInt(form.amount_requested),
      amount_approved: 0,
      status: form.status,
      date: new Date().toISOString(),
    }
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    onSave(claim)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>New Pre-Auth Request</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.15rem' }}>Submit a new insurance pre-authorisation claim</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 4 }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>Patient *</label>
            <select className="form-input form-select" value={form.patient_id} onChange={e => set('patient_id', e.target.value)}>
              <option value="">Select patient…</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>TPA / Insurance Provider *</label>
            <select className="form-input form-select" value={form.tpa} onChange={e => set('tpa', e.target.value)}>
              {TPA_COMPANIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>Policy Number *</label>
              <input className="form-input" placeholder="e.g. POL123456" value={form.policy_no} onChange={e => set('policy_no', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>Amount Requested (₹) *</label>
              <input className="form-input" type="number" placeholder="e.g. 45000" value={form.amount_requested} onChange={e => set('amount_requested', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>Initial Status</label>
            <select className="form-input form-select" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-100)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.patient_id || !form.policy_no || !form.amount_requested}>
            {saving ? <Loader size={14} className="spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Submit Claim'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Update Status modal ────────────────────────────────── */
function UpdateModal({ claim, onClose, onSave }) {
  const [status, setStatus]   = useState(claim.status)
  const [approved, setApproved] = useState(claim.amount_approved > 0 ? claim.amount_approved : '')
  const [remark, setRemark]   = useState('')
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    setSaving(false)
    onSave({ ...claim, status, amount_approved: approved ? parseInt(approved) : 0 })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>Update Claim Status</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.15rem' }}>{claim.id} · {claim.patient_name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>New Status</label>
            <select className="form-input form-select" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {status === 'Approved' && (
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>Amount Approved (₹)</label>
              <input className="form-input" type="number" placeholder={claim.amount_requested} value={approved} onChange={e => setApproved(e.target.value)} />
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '0.4rem' }}>Remark (optional)</label>
            <textarea className="form-input" rows={2} placeholder="TPA remarks, query details…" value={remark} onChange={e => setRemark(e.target.value)} style={{ resize: 'none' }} />
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-100)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main TPA page ──────────────────────────────────────── */
export default function TPA() {
  const [claims, setClaims]       = useState([])
  const [patients, setPatients]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterTPA, setFilterTPA] = useState('All Companies')
  const [showNew, setShowNew]     = useState(false)
  const [updateTarget, setUpdateTarget] = useState(null)

  useEffect(() => {
    api.getPatients().then(pts => {
      setPatients(pts)
      // Seed mock claims from real patients
      const seed = pts.slice(0, Math.min(pts.length, 6)).map((p, i) => ({
        id: `CLM-${1000 + i}`,
        patient_id: p.id,
        patient_name: p.name,
        tpa: TPA_COMPANIES[i % TPA_COMPANIES.length],
        policy_no: `POL${Math.floor(Math.random() * 90000000 + 10000000)}`,
        amount_requested: Math.floor(Math.random() * 80000) + 15000,
        amount_approved: [1, 2].includes(i) ? Math.floor(Math.random() * 70000) + 15000 : 0,
        status: STATUSES[i % 4],
        date: new Date(Date.now() - i * 86400000 * 1.5).toISOString(),
      }))
      setClaims(seed)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  /* Derived stats */
  const cleared = claims.filter(c => c.status === 'Approved').reduce((s, c) => s + c.amount_approved, 0)
  const fmtAmt  = n => n >= 1e5 ? `Rs ${(n/1e5).toFixed(1)}L` : `Rs ${(n/1000).toFixed(0)}K`

  /* Filtering */
  const filtered = claims.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.patient_name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.policy_no.toLowerCase().includes(q) ||
      c.tpa.toLowerCase().includes(q)
    const matchTPA = filterTPA === 'All Companies' || c.tpa === filterTPA
    return matchSearch && matchTPA
  })

  const addClaim  = (claim) => { setClaims(prev => [claim, ...prev]); setShowNew(false) }
  const saveClaim = (updated) => {
    setClaims(prev => prev.map(c => c.id === updated.id ? updated : c))
    setUpdateTarget(null)
  }

  return (
    <div className="animate-fadeInUp">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Insurance &amp; TPA Desk</h1>
          <p className="page-subtitle">Manage Ayushman Bharat, CGHS, and corporate health claims (NABH Compliant)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={15} /> New Pre-Auth Request
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active Claims',     val: loading ? '…' : claims.length,                                             bgKey: 'gray',  icon: FileText,       color: 'var(--primary-700)' },
          { label: 'Pre-Auth Pending',  val: loading ? '…' : claims.filter(c => c.status === 'Pre-Auth Pending').length, bgKey: 'amber', icon: AlertTriangle,  color: '#b45309' },
          { label: 'Cleared Amount',    val: loading ? '…' : fmtAmt(cleared),                                           bgKey: 'green', icon: CheckCircle,    color: '#059669' },
          { label: 'Rejected',          val: loading ? '…' : claims.filter(c => c.status === 'Rejected').length,         bgKey: 'red',   icon: XCircle,        color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', border: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: ICON_BG[s.bgKey], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.val}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search by patient name, claim ID, or policy no…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input form-select"
          style={{ width: 230 }}
          value={filterTPA}
          onChange={e => setFilterTPA(e.target.value)}
        >
          <option value="All Companies">All Companies</option>
          {TPA_COMPANIES.map(c => <option key={c}>{c}</option>)}
        </select>
        {(search || filterTPA !== 'All Companies') && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterTPA('All Companies') }}>
            <X size={13} /> Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
          {filtered.length} of {claims.length} claims
        </span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
              <Loader size={22} className="spin" style={{ display: 'inline-block', marginBottom: '0.75rem' }} />
              <div>Loading claims…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
              <ShieldCheck size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 0.75rem' }} />
              {claims.length === 0 ? 'No claims yet. Submit a new pre-auth request.' : 'No claims match your search.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Claim ID / Date</th>
                  <th>Patient Info</th>
                  <th>TPA / Provider</th>
                  <th>Policy No.</th>
                  <th>Requested (₹)</th>
                  <th>Approved (₹)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const ss = STATUS_STYLE[c.status] || STATUS_STYLE['Pre-Auth Pending']
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary-700)', fontSize: '0.85rem' }}>{c.id}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '0.125rem' }}>
                          {new Date(c.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '0.85rem' }}>{c.patient_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{c.patient_id}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                          <Building2 size={13} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                          {c.tpa}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--gray-600)' }}>{c.policy_no}</td>
                      <td style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.875rem' }}>
                        {c.amount_requested.toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 700, color: c.amount_approved > 0 ? '#059669' : 'var(--gray-300)', fontSize: '0.875rem' }}>
                        {c.amount_approved > 0 ? c.amount_approved.toLocaleString('en-IN') : '—'}
                      </td>
                      <td>
                        <span style={{ padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => setUpdateTarget(c)}>
                          <ShieldCheck size={13} /> Update
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNew     && <NewClaimModal patients={patients} onClose={() => setShowNew(false)} onSave={addClaim} />}
      {updateTarget && <UpdateModal  claim={updateTarget} onClose={() => setUpdateTarget(null)} onSave={saveClaim} />}
    </div>
  )
}

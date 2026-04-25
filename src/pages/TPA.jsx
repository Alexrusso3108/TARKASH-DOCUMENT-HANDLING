import { useState, useEffect } from 'react'
import { ShieldCheck, Search, Plus, Filter, FileText, CheckCircle, XCircle, AlertTriangle, Download, Building2 } from 'lucide-react'
import { api } from '../api'

const TPA_COMPANIES = [
  'Ayushman Bharat (PM-JAY)',
  'CGHS (Central Govt)',
  'ECHS (Ex-Servicemen)',
  'Star Health Insurance',
  'HDFC Ergo General Insurance',
  'ICICI Lombard',
  'Care Health Insurance',
  'Niva Bupa Health'
]

const STATUS_COLORS = {
  'Pre-Auth Pending': { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
  'Approved': { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  'Rejected': { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  'Query Raised': { bg: 'rgba(139,92,246,0.1)', color: '#6d28d9' }
}

export default function TPA() {
  const [claims, setClaims] = useState([])
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  
  // Dummy data builder since backend for TPA doesn't exist yet
  useEffect(() => {
    api.getPatients().then(pts => {
      setPatients(pts)
      // Generate some mock claims
      const mockClaims = pts.slice(0, 5).map((p, i) => ({
        id: `CLM-${1000 + i}`,
        patient_id: p.id,
        patient_name: p.name,
        tpa: TPA_COMPANIES[i % TPA_COMPANIES.length],
        policy_no: `POL${Math.random().toString().slice(2, 10)}`,
        amount_requested: Math.floor(Math.random() * 80000) + 15000,
        amount_approved: i % 3 === 0 ? 0 : Math.floor(Math.random() * 80000) + 15000,
        status: Object.keys(STATUS_COLORS)[i % 4],
        date: new Date(Date.now() - i * 86400000).toISOString()
      }))
      setClaims([...mockClaims])
    })
  }, [])

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Insurance & TPA Desk</h1>
          <p className="page-subtitle">Manage Ayushman Bharat, CGHS, and corporate health claims (NABH Compliant)</p>
        </div>
        <button className="btn btn-primary"><Plus size={15} /> New Pre-Auth Request</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active Claims', val: claims.length, color: 'var(--gray-800)', icon: FileText },
          { label: 'Pre-Auth Pending', val: claims.filter(c => c.status === 'Pre-Auth Pending').length, color: '#b45309', icon: AlertTriangle },
          { label: 'Cleared Amount', val: 'Rs 4.2L', color: '#059669', icon: CheckCircle },
          { label: 'Rejected', val: claims.filter(c => c.status === 'Rejected').length, color: '#dc2626', icon: XCircle }
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '50%', background: `rgba(${s.color === 'var(--gray-800)' ? '0,0,0' : s.color}, 0.08)`, color: s.color }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.val}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search policy no or patient name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input form-select" style={{ width: 220 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="All">All Companies</option>
          {TPA_COMPANIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Claim ID / Date</th>
                <th>Patient info</th>
                <th>TPA / Provider</th>
                <th>Policy No.</th>
                <th>Requested (Rs)</th>
                <th>Approved (Rs)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {claims.filter(c => filter === 'All' || c.tpa === filter).map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--primary-700)', fontSize: '0.85rem' }}>{c.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{new Date(c.date).toLocaleDateString('en-IN')}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '0.85rem' }}>{c.patient_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{c.patient_id}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                      <Building2 size={13} color="var(--primary-400)" />
                      {c.tpa}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--gray-600)' }}>{c.policy_no}</td>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{c.amount_requested.toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: c.amount_approved > 0 ? '#059669' : 'var(--gray-400)' }}>
                    {c.amount_approved > 0 ? c.amount_approved.toLocaleString() : '—'}
                  </td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                      background: STATUS_COLORS[c.status].bg, color: STATUS_COLORS[c.status].color
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm"><ShieldCheck size={13} /> Update Status</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, RefreshCw, Filter, User, Clock, Database,
  AlertTriangle, CheckCircle, Trash2, Edit, Plus, Search, Download,
} from 'lucide-react'
import { api } from '../api'

const ACTION_META = {
  PATIENT_CREATED:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: Plus,       label: 'Created' },
  PATIENT_UPDATED:  { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: Edit,       label: 'Updated' },
  PATIENT_DELETED:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: Trash2,      label: 'Deleted' },
  BILLING_CREATED:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Plus,       label: 'Billed'  },
  DISCHARGE_APPROVED:{ color: '#0d9488', bg: 'rgba(13,148,136,0.1)', icon: CheckCircle,label: 'Approved'},
  DEFAULT:          { color: '#6366f1', bg: 'rgba(99,102,241,0.08)', icon: Database,   label: 'Action'  },
}

const RESOURCE_COLORS = {
  patients:   '#6366f1',
  billing:    '#f59e0b',
  lab_tests:  '#0ea5e9',
  discharge:  '#0d9488',
  forms:      '#8b5cf6',
}

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000
  if (d < 60)    return `${Math.floor(d)}s ago`
  if (d < 3600)  return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}

export default function AuditLog() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getAuditLogs({ limit: 200 })
      setLogs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      (l.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.details   || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.action    || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.resource_id || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'ALL' || l.action.includes(filter) || l.resource === filter
    return matchSearch && matchFilter
  })

  // Summary counts
  const today     = new Date().toDateString()
  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === today)
  const uniqueUsers = new Set(logs.map(l => l.user_name)).size

  const downloadCSV = () => {
    const header = 'Timestamp,User,Role,Action,Resource,Resource ID,Details\n'
    const rows   = filtered.map(l =>
      `"${new Date(l.created_at).toLocaleString('en-IN')}","${l.user_name}","${l.user_role}","${l.action}","${l.resource||''}","${l.resource_id||''}","${(l.details||'').replace(/"/g,"'")}"`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'audit_log.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-fadeInUp">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={24} style={{ color: 'var(--primary-600)' }} /> Audit Trail
          </h1>
          <p className="page-subtitle">Complete log of all user actions and system changes</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={downloadCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Events',   value: logs.length,      icon: Database,       color: '#6366f1' },
          { label: 'Today\'s Events',value: todayLogs.length, icon: Clock,          color: '#0d9488' },
          { label: 'Active Users',   value: uniqueUsers,      icon: User,           color: '#f59e0b' },
          { label: 'Critical Actions',value: logs.filter(l => l.action.includes('DELETE')).length, icon: AlertTriangle, color: '#ef4444' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1 }}>
                {loading ? '…' : s.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user, action, patient ID…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: '0.5rem', paddingBottom: '0.5rem', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.85rem', outline: 'none', fontFamily: 'var(--font-primary)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'CREATED', 'UPDATED', 'DELETED', 'APPROVED', 'patients', 'billing'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.3rem 0.75rem', borderRadius: 999,
                border: `1.5px solid ${filter === f ? 'var(--primary-500)' : 'var(--gray-200)'}`,
                background: filter === f ? 'var(--primary-50)' : '#fff',
                color: filter === f ? 'var(--primary-700)' : 'var(--gray-600)',
                fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer',
              }}
            >{f}</button>
          ))}
        </div>
        <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginLeft: 'auto' }}>
          {filtered.length} records
        </span>
      </div>

      {/* Log Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, maxHeight: 'calc(100vh - 380px)', overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
              <RefreshCw size={22} className="spin" style={{ display: 'inline-block', marginBottom: '0.75rem' }} />
              <div>Loading audit logs…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
              <ShieldCheck size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 0.75rem' }} />
              No audit events found
            </div>
          ) : (
            <table className="data-table" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>Timestamp</th>
                  <th style={{ width: '14%' }}>User</th>
                  <th style={{ width: '10%' }}>Role</th>
                  <th style={{ width: '16%' }}>Action</th>
                  <th style={{ width: '10%' }}>Resource</th>
                  <th style={{ width: '10%' }}>ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const meta = ACTION_META[log.action] || ACTION_META.DEFAULT
                  const ActionIcon = meta.icon
                  return (
                    <tr key={log.id} style={{ verticalAlign: 'middle' }}>
                      <td>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gray-800)', fontWeight: 500 }}>
                          {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>
                          {timeAgo(log.created_at)}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--gray-300)' }}>
                          {new Date(log.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                            {(log.user_name || 'U').split(' ').map(n => n[0]).join('').slice(0,2)}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-800)' }}>{log.user_name || 'System'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                          {log.user_role || 'staff'}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: meta.bg, color: meta.color, fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: 999 }}>
                          <ActionIcon size={11} />
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {log.resource && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: RESOURCE_COLORS[log.resource] || 'var(--gray-600)', background: (RESOURCE_COLORS[log.resource] || '#888') + '15', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                            {log.resource}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--gray-600)', fontFamily: 'monospace', fontWeight: 600 }}>
                          {log.resource_id || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)', lineHeight: 1.4 }}>
                          {log.details || '—'}
                        </span>
                        {log.ip_address && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--gray-300)', marginTop: '0.125rem', fontFamily: 'monospace' }}>
                            {log.ip_address}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

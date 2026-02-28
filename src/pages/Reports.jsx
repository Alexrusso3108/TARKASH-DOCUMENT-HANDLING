import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Download, Loader } from 'lucide-react'
import { api } from '../api'

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '0.625rem 0.875rem', boxShadow: 'var(--shadow-lg)', fontSize: '0.8125rem' }}>
        <p style={{ fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>)}
      </div>
    )
  }
  return null
}

const REPORT_TABS = ['Overview', 'Department', 'Financial']

export default function Reports() {
  const [tab, setTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getReports()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem', color: 'var(--gray-400)' }}>
      <Loader size={28} className="spin" style={{ display: 'inline-block' }} />
    </div>
  )

  if (error) return (
    <div style={{ padding: '2rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-xl)', margin: '2rem' }}>
      ⚠ Could not load reports: {error}. Make sure the API server is running.
    </div>
  )

  const kpis = data?.kpis || {}
  const monthlyData = data?.monthly || []
  const deptData = data?.departments || []
  const deptBarData = deptData.map(d => ({ name: d.dept, Patients: parseInt(d.patient_count) || 0 }))

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Hospital performance metrics, trends, and insights</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary"><Download size={14} /> Export</button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Patients', val: (kpis.totalPatients || 0).toLocaleString(), color: 'var(--primary-600)', bg: 'var(--primary-50)' },
          { label: 'Total Beds', val: kpis.totalBeds || 0, color: '#059669', bg: 'rgba(16,185,129,0.06)' },
          { label: 'Occupied Beds', val: kpis.occupiedBeds || 0, color: '#b45309', bg: 'rgba(245,158,11,0.06)' },
          { label: 'Bed Occupancy', val: kpis.totalBeds > 0 ? `${Math.round((kpis.occupiedBeds / kpis.totalBeds) * 100)}%` : '0%', color: '#4338ca', bg: 'rgba(99,102,241,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Doctors', val: kpis.totalDoctors || 0, color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'Pending Notes', val: kpis.pendingNotes || 0, color: '#dc2626', bg: 'rgba(239,68,68,0.06)' },
          { label: 'Lab Orders', val: kpis.labOrders || 0, color: '#0ea5e9', bg: 'rgba(14,165,233,0.06)' },
          { label: 'OPD Today', val: kpis.opdToday || 0, color: '#0d9488', bg: 'rgba(13,148,136,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {REPORT_TABS.map(t => <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Patient Admissions by Month</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Monthly patient admission trend</p>
              </div>
            </div>
            <div className="card-body">
              {monthlyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No monthly data available yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#6366f1" strokeWidth={2.5} fill="url(#admGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'Department' && (
        <div className="card">
          <div className="card-header"><h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Patients by Department</h5></div>
          <div className="card-body">
            {deptData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No department data available yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={deptBarData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Patients" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', marginTop: '1.5rem' }}>
                  <table className="data-table">
                    <thead><tr><th>Department</th><th>Patients</th></tr></thead>
                    <tbody>
                      {deptData.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{d.dept}</td>
                          <td>{d.patient_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'Financial' && (
        <div className="card">
          <div className="card-header"><h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Billing Summary</h5></div>
          <div className="card-body">
            <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Invoiced (Rs)', val: (Number(data?.billing?.total) || 0).toLocaleString(), color: 'var(--primary-600)', bg: 'var(--primary-50)' },
                { label: 'Total Collected (Rs)', val: (Number(data?.billing?.paid) || 0).toLocaleString(), color: '#059669', bg: 'rgba(16,185,129,0.06)' },
                { label: 'Total Pending (Rs)', val: (Number(data?.billing?.pending) || 0).toLocaleString(), color: '#b45309', bg: 'rgba(245,158,11,0.06)' },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

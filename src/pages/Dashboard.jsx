import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  Users, BedDouble, FileText, Activity, TrendingUp,
  TrendingDown, ArrowRight, Clock, Loader
} from 'lucide-react'
import { api } from '../api'

// Static chart data (these would come from a /api/dashboard/charts endpoint in a fuller version)
const admissionsData = [
  { day: 'Mon', ipd: 28, opd: 85 }, { day: 'Tue', ipd: 35, opd: 92 },
  { day: 'Wed', ipd: 31, opd: 78 }, { day: 'Thu', ipd: 42, opd: 110 },
  { day: 'Fri', ipd: 38, opd: 96 }, { day: 'Sat', ipd: 22, opd: 64 },
  { day: 'Sun', ipd: 18, opd: 52 },
]
const revenueData = [
  { month: 'Sep', revenue: 3.2 }, { month: 'Oct', revenue: 4.1 },
  { month: 'Nov', revenue: 3.8 }, { month: 'Dec', revenue: 5.2 },
  { month: 'Jan', revenue: 4.7 }, { month: 'Feb', revenue: 6.1 },
]
const deptData = [
  { name: 'General Ward', value: 35, color: '#6366f1' },
  { name: 'ICU', value: 22, color: '#0d9488' },
  { name: 'Cardiology', value: 18, color: '#0ea5e9' },
  { name: 'Ortho', value: 14, color: '#f59e0b' },
  { name: 'Paediatrics', value: 11, color: '#10b981' },
]

const STATUS_COLORS = {
  Critical: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  Stable: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  Recovering: { bg: 'rgba(59,130,246,0.1)', color: '#1d4ed8' },
  'Under Obs': { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
}
const PRIORITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'High' },
  medium: { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Medium' },
  low: { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Low' },
}

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

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeChart, setActiveChart] = useState('admissions')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch(() => { }) // silently fail — show static fallback below
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const timeLabel = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const STATS = [
    { label: 'Total Patients', value: loading ? '…' : (stats?.totalPatients?.toLocaleString() ?? '1,284'), change: '+8.2%', dir: 'up', icon: Users, iconBg: 'gradient-primary', sub: 'Active in system' },
    { label: 'Bed Occupancy', value: loading ? '…' : (stats?.bedOccupancy ?? '89%'), change: '+4.1%', dir: 'up', icon: BedDouble, iconBg: 'gradient-teal', sub: stats?.bedDetail ?? '142/160 beds occupied' },
    { label: 'Pending Notes', value: loading ? '…' : (stats?.pendingNotes ?? '23'), change: '-12%', dir: 'down', icon: FileText, iconBg: 'gradient-amber', sub: 'Awaiting digitization' },
    { label: 'Discharges Today', value: loading ? '…' : (stats?.dischargesToday ?? '47'), change: '+22%', dir: 'up', icon: Activity, iconBg: 'gradient-green', sub: 'Faster than avg by 2hr' },
  ]

  const recentPatients = stats?.recentPatients ?? []
  const pendingNoteList = stats?.pendingNotesList ?? []

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{dateStr} — {timeLabel}, Admin</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/app/clinical-notes')}>
            <FileText size={14} /> New Clinical Note
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/patients')}>
            <Users size={14} /> Admit Patient
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-4" style={{ gap: '1.25rem', marginBottom: '1.75rem' }}>
        {STATS.map((s, i) => (
          <div key={i} className="stat-card animate-fadeInUp" style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
              <div className={`stat-card-icon ${s.iconBg}`} style={{ margin: 0 }}>
                <s.icon size={20} color="#fff" />
              </div>
              <span className={`stat-change ${s.dir}`} style={{ fontWeight: 700 }}>
                {s.dir === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {s.change}
              </span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h5 style={{ color: 'var(--gray-900)', fontWeight: 700, marginBottom: '0.125rem' }}>
                {activeChart === 'admissions' ? 'Admissions Overview' : 'Monthly Revenue'}
              </h5>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                {activeChart === 'admissions' ? 'IPD vs OPD — last 7 days' : 'Revenue trend — last 6 months (in Lakhs)'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['admissions', 'revenue'].map(tab => (
                <button key={tab} className={`btn btn-sm ${activeChart === tab ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize' }} onClick={() => setActiveChart(tab)}>{tab}</button>
              ))}
            </div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              {activeChart === 'admissions' ? (
                <AreaChart data={admissionsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ipdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="opdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="ipd" name="IPD" stroke="#6366f1" strokeWidth={2.5} fill="url(#ipdGrad)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="opd" name="OPD" stroke="#0d9488" strokeWidth={2.5} fill="url(#opdGrad)" dot={{ r: 4, fill: '#0d9488', strokeWidth: 0 }} />
                </AreaChart>
              ) : (
                <BarChart data={revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue (L)" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h5 style={{ color: 'var(--gray-900)', fontWeight: 700, marginBottom: '0.125rem' }}>Dept. Breakdown</h5>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Current admissions</p>
            </div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={deptData} innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {deptData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val}%`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {deptData.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-800)' }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: '1.25rem' }}>
        {/* Recent Patients from DB */}
        <div className="card">
          <div className="card-header">
            <div>
              <h5 style={{ color: 'var(--gray-900)', fontWeight: 700, marginBottom: '0.125rem' }}>Recent Admissions</h5>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Latest 5 patient admissions</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/patients')} style={{ color: 'var(--primary-600)', fontWeight: 600, gap: '0.25rem' }}>
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr><th>Patient</th><th>Department</th><th>Doctor</th><th>Admitted</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}><Loader size={18} className="spin" style={{ display: 'inline-block' }} /></td></tr>
                ) : recentPatients.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No recent admissions</td></tr>
                ) : recentPatients.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                          {p.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '0.875rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{p.id} · Age {p.age}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{p.dept}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{p.doctor}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>{p.admitted_at ? new Date(p.admitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                    <td>
                      <span style={{ display: 'inline-block', background: STATUS_COLORS[p.status]?.bg, color: STATUS_COLORS[p.status]?.color, fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, textTransform: 'uppercase' }}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Clinical Notes from DB */}
        <div className="card">
          <div className="card-header">
            <div>
              <h5 style={{ color: 'var(--gray-900)', fontWeight: 700, marginBottom: '0.125rem' }}>Pending Notes</h5>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Awaiting digitization</p>
            </div>
            {!loading && <span className="badge badge-danger">{pendingNoteList.length}</span>}
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}><Loader size={18} className="spin" style={{ display: 'inline-block' }} /></div>
            ) : pendingNoteList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)', fontSize: '0.875rem' }}>No pending notes 🎉</div>
            ) : pendingNoteList.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)', cursor: 'pointer', transition: 'all 150ms' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[n.priority]?.color, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)', marginBottom: '0.25rem' }}>{n.patient_name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{n.note_type}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{n.doctor_name}</span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--gray-300)' }} />
                    <Clock size={11} style={{ color: 'var(--gray-400)' }} />
                    <span style={{ fontSize: '0.7rem', color: n.priority === 'high' ? 'var(--danger)' : 'var(--gray-400)', fontWeight: n.priority === 'high' ? 700 : 400 }}>
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: PRIORITY_COLORS[n.priority]?.bg, color: PRIORITY_COLORS[n.priority]?.color, padding: '0.2rem 0.5rem', borderRadius: 999, flexShrink: 0 }}>
                  {PRIORITY_COLORS[n.priority]?.label}
                </span>
              </div>
            ))}
            <button className="btn btn-secondary w-full" style={{ marginTop: '0.25rem' }} onClick={() => navigate('/app/clinical-notes')}>
              View All Pending Notes <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

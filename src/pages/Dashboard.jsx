import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  Users, BedDouble, FileText, Activity, TrendingUp,
  TrendingDown, ArrowRight, Clock, Loader, HeartPulse,
  Stethoscope, FlaskConical, Pill, Receipt, BarChart2,
  ScanLine, UserSquare2, Calendar, Building2, AlertTriangle,
  ClipboardList, PackageOpen, Syringe, ShieldCheck, FolderOpen,
  LayoutGrid, QrCode, Barcode, Clipboard, GitMerge, Package,
  Wallet, CreditCard, FileCheck, BadgePercent, Bell, Layers,
  Globe, Zap, Link, Ambulance, Settings, Users2, Database,
  ReceiptText, BookOpen, TrendingUpIcon, PieChart as PieChartIcon,
  ChevronLeft, ChevronRight, ShieldAlert
} from 'lucide-react'
import { api } from '../api'

// ─── Module Definitions ──────────────────────────────────────────────────────
const MODULE_TABS = [
  {
    id: 'patient-admin',
    label: 'Patient Administration',
    modules: [
      { icon: Users, label: 'Patient Registration', path: '/app/patients', color: '#6366f1' },
      { icon: Stethoscope, label: 'OPD Management', path: '/app/opd', color: '#0d9488' },
      { icon: BedDouble, label: 'IPD Management', path: '/app/ipd', color: '#0ea5e9' },
      { icon: Building2, label: 'Ward Management', path: '/app/wards', color: '#8b5cf6' },
      { icon: Calendar, label: 'Appointment & Scheduling', path: '/app/appointments', color: '#f59e0b' },
      { icon: LayoutGrid, label: 'Queue Management', path: '/app/queue', color: '#10b981' },
      { icon: QrCode, label: 'QR Registration', path: '/app/qr-register', color: '#ec4899' },
      { icon: Barcode, label: 'Barcode Printing', path: '/app/barcode', color: '#6366f1' },
      { icon: GitMerge, label: 'Patient Merging', path: '/app/patient-merge', color: '#0d9488' },
      { icon: FileText, label: 'Medical Record Mgmt', path: '/app/medical-records', color: '#f59e0b' },
      { icon: ClipboardList, label: 'Multiple Consent Form', path: '/app/patient-forms', color: '#10b981' },
      { icon: AlertTriangle, label: 'Accident & Emergency', path: '/app/emergency', color: '#ef4444' },
      { icon: Stethoscope, label: 'Internal IP Referrals', path: '/app/ipd', color: '#8b5cf6' },
      { icon: Package, label: 'Health Packages', path: '/app/packages', color: '#0ea5e9' },
      { icon: Package, label: 'Package Management', path: '/app/package-mgmt', color: '#f59e0b' },
      { icon: BarChart2, label: 'Operational Reports', path: '/app/reports', color: '#10b981' },
      { icon: BarChart2, label: 'Management Dashboard', path: '/app/reports', color: '#6366f1' },
    ],
  },
  {
    id: 'clinical',
    label: 'Clinical',
    modules: [
      { icon: UserSquare2, label: 'Doctors Workbench', path: '/app/doctors', color: '#6366f1' },
      { icon: ClipboardList, label: 'Clinical Administration', path: '/app/clinical-notes', color: '#0d9488' },
      { icon: FileText, label: 'Clinical Notes', path: '/app/clinical-notes', color: '#0ea5e9' },
      { icon: ClipboardList, label: 'Discharge Summary', path: '/app/discharge-templates', color: '#8b5cf6' },
      { icon: FolderOpen, label: 'Patient Forms', path: '/app/patient-forms', color: '#f59e0b' },
      { icon: FileText, label: 'Medical Records', path: '/app/medical-records', color: '#10b981' },
      { icon: ShieldCheck, label: 'Clinical Audit', path: '/app/reports', color: '#ec4899' },
    ],
  },
  {
    id: 'patient-billing',
    label: 'Patient Billing',
    modules: [
      { icon: Receipt, label: 'OPD Billing', path: '/app/billing', color: '#6366f1' },
      { icon: ReceiptText, label: 'IPD Billing', path: '/app/billing', color: '#0d9488' },
      { icon: CreditCard, label: 'Payment Collection', path: '/app/billing', color: '#0ea5e9' },
      { icon: Wallet, label: 'Account & Cash', path: '/app/billing', color: '#8b5cf6' },
      { icon: BadgePercent, label: 'GST Management', path: '/app/billing', color: '#f59e0b' },
      { icon: Package, label: 'Health Packages', path: '/app/packages', color: '#10b981' },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue Cycle',
    modules: [
      { icon: FileCheck, label: 'Claims Processing', path: '/app/billing', color: '#6366f1' },
      { icon: ClipboardList, label: 'Claim Submission', path: '/app/billing', color: '#0d9488' },
      { icon: ShieldCheck, label: 'Medical Audit (Insurance)', path: '/app/reports', color: '#0ea5e9' },
      { icon: ShieldCheck, label: 'Technical Audit (Insurance)', path: '/app/reports', color: '#8b5cf6' },
      { icon: Bell, label: 'Alerts Management', path: '/app/reports', color: '#f59e0b' },
    ],
  },
  {
    id: 'radiology',
    label: 'Radiology',
    modules: [
      { icon: ScanLine, label: 'Radiology Orders', path: '/app/radiology', color: '#6366f1' },
      { icon: ScanLine, label: 'Report Management', path: '/app/radiology', color: '#0d9488' },
      { icon: ScanLine, label: 'PACS Integration', path: '/app/radiology', color: '#0ea5e9' },
    ],
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    modules: [
      { icon: FlaskConical, label: 'Lab Orders', path: '/app/laboratory', color: '#6366f1' },
      { icon: FlaskConical, label: 'Result Entry', path: '/app/laboratory', color: '#0d9488' },
      { icon: FlaskConical, label: 'Sample Collection', path: '/app/laboratory', color: '#0ea5e9' },
      { icon: FlaskConical, label: 'Lab Reports', path: '/app/laboratory', color: '#8b5cf6' },
    ],
  },
  {
    id: 'nursing',
    label: 'Nursing Management',
    modules: [
      { icon: HeartPulse, label: 'Nurse Station', path: '/app/nursing', color: '#6366f1' },
      { icon: ClipboardList, label: 'Medication Admin', path: '/app/nursing', color: '#0d9488' },
      { icon: Activity, label: 'Vitals Monitoring', path: '/app/nursing', color: '#0ea5e9' },
      { icon: Building2, label: 'Ward Rounds', path: '/app/wards', color: '#8b5cf6' },
    ],
  },
  {
    id: 'operation-theatre',
    label: 'Operation Theatre',
    modules: [
      { icon: Syringe, label: 'OT Scheduling', path: '/app/operation-theatre', color: '#6366f1' },
      { icon: ClipboardList, label: 'OT Notes', path: '/app/operation-theatre', color: '#0d9488' },
      { icon: ClipboardList, label: 'Anaesthesia Notes', path: '/app/operation-theatre', color: '#0ea5e9' },
      { icon: FileCheck, label: 'OT Reports', path: '/app/operation-theatre', color: '#8b5cf6' },
    ],
  },
  {
    id: 'blood-bank',
    label: 'Blood Bank',
    modules: [
      { icon: HeartPulse, label: 'Blood Inventory', path: '/app/blood-bank', color: '#ef4444' },
      { icon: Users2, label: 'Donor Management', path: '/app/blood-bank', color: '#0d9488' },
      { icon: ClipboardList, label: 'Blood Requests', path: '/app/blood-bank', color: '#0ea5e9' },
      { icon: FileCheck, label: 'Blood Reports', path: '/app/blood-bank', color: '#8b5cf6' },
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    modules: [
      { icon: Pill, label: 'Drug Dispensing', path: '/app/pharmacy', color: '#6366f1' },
      { icon: PackageOpen, label: 'Drug Inventory', path: '/app/pharmacy', color: '#0d9488' },
      { icon: ReceiptText, label: 'Pharmacy Billing', path: '/app/pharmacy', color: '#0ea5e9' },
      { icon: ClipboardList, label: 'Prescriptions', path: '/app/pharmacy', color: '#8b5cf6' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory Management',
    modules: [
      { icon: PackageOpen, label: 'Stock Management', path: '/app/inventory', color: '#6366f1' },
      { icon: Package, label: 'Purchase Orders', path: '/app/inventory', color: '#0d9488' },
      { icon: Database, label: 'Vendor Management', path: '/app/inventory', color: '#0ea5e9' },
      { icon: BarChart2, label: 'Inventory Reports', path: '/app/inventory', color: '#8b5cf6' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    modules: [
      { icon: BarChart2, label: 'MIS Dashboard', path: '/app/reports', color: '#6366f1' },
      { icon: PieChartIcon, label: 'MIS Reports', path: '/app/reports', color: '#0d9488' },
      { icon: TrendingUpIcon, label: 'Revenue Analytics', path: '/app/reports', color: '#0ea5e9' },
      { icon: BookOpen, label: 'Operational Reports', path: '/app/reports', color: '#8b5cf6' },
    ],
  },
  {
    id: 'emergency',
    label: 'Emergency',
    modules: [
      { icon: AlertTriangle, label: 'Emergency Triage', path: '/app/emergency', color: '#ef4444' },
      { icon: Ambulance, label: 'Ambulance Management', path: '/app/emergency', color: '#f59e0b' },
      { icon: HeartPulse, label: 'Critical Care', path: '/app/emergency', color: '#0d9488' },
    ],
  },
]

const STATUS_COLORS = {
  Critical: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  Stable: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  Recovering: { bg: 'rgba(59,130,246,0.1)', color: '#1d4ed8' },
  'Under Obs': { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
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

// ─── Module Card ─────────────────────────────────────────────────────────────
function ModuleCard({ icon: Icon, label, path, color, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={() => onClick(path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 190,
        minWidth: 190,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.7rem 0.875rem',
        borderRadius: 'var(--radius-lg)',
        border: `1.5px solid ${hovered ? color + '55' : 'var(--gray-100)'}`,
        background: hovered ? color + '08' : '#fff',
        cursor: 'pointer',
        transition: 'all 180ms ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? `0 4px 16px ${color}22` : 'none',
      }}
    >
      <div style={{
        width: 30,
        height: 30,
        borderRadius: 'var(--radius-md)',
        background: color + '18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 180ms ease',
        ...(hovered ? { background: color + '28' } : {}),
      }}>
        <Icon size={15} style={{ color }} />
      </div>
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: hovered ? color : 'var(--gray-700)',
        lineHeight: 1.3,
        transition: 'color 180ms',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {label}
      </span>
    </div>
  )
}

// ─── Module Launcher (Horizontal Slider) ─────────────────────────────────────
function ModuleLauncher({ tabs, activeTab, onTabChange, onNavigate }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [progress, setProgress] = useState(0)
  const ROWS = 3
  const SCROLL_STEP = 620

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    const pct = el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)
    setProgress(Math.round(pct * 100))
  }, [])

  useEffect(() => {
    if (scrollRef.current) { scrollRef.current.scrollLeft = 0; updateScrollState() }
  }, [activeTab, updateScrollState])

  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' })
    setTimeout(updateScrollState, 350)
  }

  const activeModules = tabs.find(t => t.id === activeTab)?.modules ?? []
  const totalModules = tabs.reduce((acc, t) => acc + t.modules.length, 0)

  return (
    <div className="card" style={{ marginBottom: '1.75rem' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h5 style={{ color: 'var(--gray-900)', fontWeight: 700, marginBottom: '0.125rem' }}>Hospital Modules</h5>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{totalModules}+ powerful modules — click to navigate</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', borderRadius: 'var(--radius-md)', padding: '0.3rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>
              {activeModules.length} Modules
            </span>
            {[{ dir: -1, Icon: ChevronLeft, can: canScrollLeft }, { dir: 1, Icon: ChevronRight, can: canScrollRight }].map(({ dir, Icon, can }) => (
              <button key={dir} onClick={() => scroll(dir)} disabled={!can} style={{
                width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--gray-200)',
                background: can ? '#fff' : 'var(--gray-50)', color: can ? 'var(--gray-700)' : 'var(--gray-300)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: can ? 'pointer' : 'default', transition: 'all 150ms',
                boxShadow: can ? 'var(--shadow-sm)' : 'none',
              }}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '0.125rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{
              padding: '0.45rem 0.875rem', border: 'none',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              background: activeTab === tab.id ? 'var(--primary-50)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary-700)' : 'var(--gray-500)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.785rem', cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-500)' : '2px solid transparent',
              transition: 'all 150ms', fontFamily: 'var(--font-primary)',
            }}>{tab.label}</button>
          ))}
        </div>
        <div style={{ height: 1, background: 'var(--gray-100)' }} />
      </div>

      {/* Slider Body */}
      <div style={{ position: 'relative', padding: '0.875rem 0' }}>
        {canScrollLeft && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 56, zIndex: 2, background: 'linear-gradient(to right, rgba(255,255,255,0.97), transparent)', pointerEvents: 'none' }} />}
        {canScrollRight && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 56, zIndex: 2, background: 'linear-gradient(to left, rgba(255,255,255,0.97), transparent)', pointerEvents: 'none' }} />}

        {/* Scrollable wrapper */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            padding: '0.25rem 1.5rem',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Inner container: flex column of 3 rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[0, 1, 2].map(rowIdx => {
              // Distribute modules column-by-column across 3 rows
              const rowModules = activeModules.filter((_, i) => i % ROWS === rowIdx)
              return (
                <div key={rowIdx} style={{ display: 'flex', gap: '0.5rem' }}>
                  {rowModules.map((mod, i) => (
                    <ModuleCard key={i} {...mod} onClick={onNavigate} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>


      {/* Progress bar */}
      <div style={{ padding: '0 1.5rem 1rem' }}>
        <div style={{ height: 3, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.max(15, 100 - progress)}%`,
            background: 'linear-gradient(90deg, var(--primary-400), var(--accent-teal))',
            borderRadius: 99, transition: 'width 200ms, margin-left 200ms',
            marginLeft: `${progress * 0.85}%`,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>Scroll or use ← → arrows to browse</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 600 }}>{activeModules.length} modules</span>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('patient-admin')
  const [activeChart, setActiveChart] = useState('admissions')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const timeLabel = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const fmt = (n) => n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${Math.round(n)}`

  const STATS = [
    { label: 'Total Patients',    value: loading ? '…' : (stats?.totalPatients?.toLocaleString() ?? '0'), change: '+8.2%', dir: 'up',   icon: Users,     iconBg: 'gradient-primary', sub: 'Active in system' },
    { label: 'Bed Occupancy',     value: loading ? '…' : (stats?.bedOccupancy ?? '0%'),                  change: '+4.1%', dir: 'up',   icon: BedDouble, iconBg: 'gradient-teal',   sub: stats?.bedDetail ?? '0/0 beds' },
    { label: 'Pending Notes',     value: loading ? '…' : (stats?.pendingNotes ?? '0'),                   change: '-12%',  dir: 'down', icon: FileText,  iconBg: 'gradient-amber',  sub: 'Awaiting digitization' },
    { label: 'Today OPD',        value: loading ? '…' : (stats?.todayOPD ?? '0'),                       change: '+5%',   dir: 'up',   icon: Activity,  iconBg: 'gradient-green',  sub: 'Visits today' },
    { label: 'Revenue (Month)',   value: loading ? '…' : fmt(stats?.monthRevenue ?? 0),                  change: stats?.revenueChange ?? '+0%', dir: (stats?.revenueChange||'+0%').startsWith('-')?'down':'up', icon: TrendingUp, iconBg: 'gradient-primary', sub: 'vs last month' },
    { label: 'Pending Lab Tests', value: loading ? '…' : (stats?.pendingLab ?? '0'),                    change: '',      dir: 'up',   icon: FlaskConical, iconBg: 'gradient-teal', sub: 'Awaiting results' },
    { label: 'Critical Patients', value: loading ? '…' : (stats?.criticalPatients ?? '0'),              change: '',      dir: 'up',   icon: HeartPulse, iconBg: 'gradient-amber', sub: 'Require urgent care' },
    { label: 'Today Revenue',     value: loading ? '…' : fmt(stats?.todayRevenue ?? 0),                 change: '',      dir: 'up',   icon: Receipt,   iconBg: 'gradient-green',  sub: 'Billed today' },
  ]

  const activeTabData = MODULE_TABS.find(t => t.id === activeTab)
  const recentPatients    = stats?.recentPatients    ?? []
  const pendingNoteList   = stats?.pendingNotesList  ?? []
  const admissionsData    = stats?.weeklyAdmissions  ?? []
  const revenueData       = stats?.monthlyRevenue    ?? []
  const deptData          = stats?.deptBreakdown     ?? []

  return (
    <div className="animate-fadeInUp">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{dateStr} — {timeLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/app/patients')}>
            <Users size={14} /> New Patient
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/appointments')}>
            <Calendar size={14} /> Schedule Appointment
          </button>
        </div>
      </div>

      {/* STAT CARDS — 2 rows of 4 */}
      <div className="grid grid-4" style={{ gap: '1.25rem', marginBottom: '1.75rem' }}>
        {STATS.map((s, i) => (
          <div key={i} className="stat-card animate-fadeInUp" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
              <div className={`stat-card-icon ${s.iconBg}`} style={{ margin: 0 }}>
                <s.icon size={20} color="#fff" />
              </div>
              {s.change && (
                <span className={`stat-change ${s.dir}`} style={{ fontWeight: 700 }}>
                  {s.dir === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {s.change}
                </span>
              )}
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── MODULE LAUNCHER ────────────────────────────────────────────────── */}
      <ModuleLauncher
        tabs={MODULE_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNavigate={navigate}
      />

      {/* ── CHARTS ROW ─────────────────────────────────────────────────────── */}
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

      {/* ── BOTTOM ROW ─────────────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: '1.25rem' }}>
        {/* Recent Patients */}
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

        {/* Pending Clinical Notes */}
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
            ) : pendingNoteList.map((n, i) => {
              const PRIORITY_COLORS = {
                high: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'High' },
                medium: { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Medium' },
                low: { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Low' },
              }
              return (
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
              )
            })}
            <button className="btn btn-secondary w-full" style={{ marginTop: '0.25rem' }} onClick={() => navigate('/app/clinical-notes')}>
              View All Pending Notes <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, BedDouble, Stethoscope, UserSquare2,
  FileText, FlaskConical, Pill, Receipt, BarChart2, Settings,
  Bell, Search, Menu, LogOut, ChevronRight, Activity, ShieldCheck,
  ClipboardList, FolderOpen, ScanLine
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const BASE_NAV = [
  {
    section: 'Main',
    items: [
      { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
      { label: 'Patients', path: '/app/patients', icon: Users, badge: 12 },
    ],
  },
  {
    section: 'Clinical',
    items: [
      { label: 'IPD Management', path: '/app/ipd', icon: BedDouble },
      { label: 'OPD Management', path: '/app/opd', icon: Stethoscope },
      { label: 'Clinical Notes', path: '/app/clinical-notes', icon: FileText, badge: 5 },
      { label: 'Doctors', path: '/app/doctors', icon: UserSquare2 },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Laboratory',  path: '/app/laboratory',  icon: FlaskConical },
      { label: 'Radiology',   path: '/app/radiology',   icon: ScanLine },
      { label: 'Pharmacy',    path: '/app/pharmacy',    icon: Pill },
      { label: 'Billing',     path: '/app/billing',     icon: Receipt },
    ],
  },
  {
    section: 'Forms',
    items: [
      { label: 'Patient Forms', path: '/app/patient-forms', icon: ClipboardList },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Reports', path: '/app/reports', icon: BarChart2 },
      { label: 'Settings', path: '/app/settings', icon: Settings },
    ],
  },
]

const ADMIN_NAV = {
  section: 'Admin',
  items: [
    { label: 'Staff Management',       path: '/app/staff',               icon: ShieldCheck },
    { label: 'Form Templates',         path: '/app/form-templates',      icon: FolderOpen },
    { label: 'Discharge Templates',    path: '/app/discharge-templates', icon: ClipboardList },
  ],
}


// Helper: convert ISO timestamp → "2 min ago" style string
function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isAdmin } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [notifs, setNotifs] = useState([])
  const [readIds, setReadIds] = useState(new Set())
  const [notifLoading, setNotifLoading] = useState(false)

  // Build real notifications from live API data
  const fetchNotifs = useCallback(async () => {
    setNotifLoading(true)
    try {
      const [beds, notes, lab, opd] = await Promise.all([
        api.getBeds({ ward: 'All' }).catch(() => []),
        api.getNotes({ status: 'pending' }).catch(() => []),
        api.getLab({ status: 'Pending' }).catch(() => []),
        api.getOPD({ status: 'Waiting' }).catch(() => []),
      ])

      const items = []

      // Recent bed admissions (occupied beds)
      beds
        .filter(b => b.status === 'occupied' && b.patient_name)
        .sort((a, b) => new Date(b.admitted_at || 0) - new Date(a.admitted_at || 0))
        .slice(0, 2)
        .forEach((b, i) => {
          items.push({
            id: `bed-${b.id}`,
            type: 'admission',
            msg: `Patient admitted: ${b.patient_name} — ${b.ward} Bed ${b.id}`,
            time: b.admitted_at ? timeAgo(b.admitted_at) : 'Recently',
            ts: new Date(b.admitted_at || 0),
          })
        })

      // Pending clinical notes needing digitization
      notes
        .slice(0, 2)
        .forEach(n => {
          items.push({
            id: `note-${n.id}`,
            type: 'note',
            msg: `Clinical note pending digitization — ${n.patient_name || 'Patient'} (${n.note_type || 'Note'})`,
            time: n.created_at ? timeAgo(n.created_at) : 'Recently',
            ts: new Date(n.created_at || 0),
          })
        })

      // Pending lab tests
      lab
        .slice(0, 2)
        .forEach(l => {
          items.push({
            id: `lab-${l.id}`,
            type: 'lab',
            msg: `Lab test ordered: ${l.test_name} — ${l.patient_name || `Patient ${l.patient_id}`}`,
            time: l.ordered_at ? timeAgo(l.ordered_at) : 'Recently',
            ts: new Date(l.ordered_at || 0),
          })
        })

      // Waiting OPD patients
      opd
        .slice(0, 2)
        .forEach(o => {
          items.push({
            id: `opd-${o.id}`,
            type: 'opd',
            msg: `OPD patient waiting: ${o.patient_name || o.patient_id} — Token ${o.token}`,
            time: o.created_at ? timeAgo(o.created_at) : 'Today',
            ts: new Date(o.created_at || 0),
          })
        })

      // Sort newest first
      items.sort((a, b) => b.ts - a.ts)
      setNotifs(items)
    } catch (e) {
      console.error('Notifications fetch error:', e)
    } finally {
      setNotifLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [fetchNotifs])

  // Build nav with admin section injected if applicable
  const navSections = isAdmin ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV
  const allItems = navSections.flatMap(s => s.items)

  const isActive = (path) =>
    path === '/app/dashboard' ? location.pathname === '/app/dashboard' : location.pathname.startsWith(path)

  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length

  const markAllRead = () => setReadIds(new Set(notifs.map(n => n.id)))

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <FileText size={18} color="#fff" />
          </div>
          <div>
            <div className="sidebar-logo-text">DScribe</div>
            <div className="sidebar-logo-sub">{user?.hospital_name || 'Clinical Suite'}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map(section => (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.items.map(item => (
                <div
                  key={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => { navigate(item.path); setSidebarOpen(false) }}
                >
                  <item.icon size={16} className="nav-link-icon" />
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius-lg)', padding: '0.625rem 0.875rem', marginBottom: '0.75rem' }}>
            <Activity size={14} color="var(--primary-400)" />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>System</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--accent-green)', fontWeight: 700 }}>Online</span>
          </div>
          <div className="sidebar-user">
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-role" style={{ textTransform: 'capitalize' }}>
                {user?.role === 'admin' ? 'Administrator' : user?.role?.replace('_', ' ') || 'Staff'}
              </div>
            </div>
            <LogOut
              size={15}
              style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', flexShrink: 0 }}
              onClick={handleLogout}
              title="Sign out"
            />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* TOPBAR */}
        <header className="topbar">
          <button className="btn-ghost btn btn-icon" style={{ color: 'var(--gray-600)' }} onClick={() => setSidebarOpen(!sidebarOpen)} id="sidebar-toggle">
            <Menu size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>
            <span style={{ color: 'var(--gray-600)', fontWeight: 600 }}>DScribe</span>
            <ChevronRight size={13} />
            <span style={{ color: 'var(--gray-800)', fontWeight: 600 }}>
              {allItems.find(i => isActive(i.path))?.label || 'Dashboard'}
            </span>
          </div>

          <div className="topbar-search" style={{ marginLeft: '1.5rem' }}>
            <Search size={15} className="topbar-search-icon" />
            <input type="text" placeholder="Search patients, notes, doctors..." value={searchVal} onChange={e => setSearchVal(e.target.value)} id="global-search" />
          </div>

          <div className="topbar-actions">
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button className="topbar-icon-btn" onClick={() => setNotifOpen(!notifOpen)}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="topbar-notif-dot" />}
              </button>
              {notifOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, width: 320, background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-xl)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)' }}>Notifications</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer' }} onClick={markAllRead}>Mark all read</span>
                  </div>
                  {notifLoading && notifs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8rem' }}>Loading...</div>
                  ) : notifs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8rem' }}>No notifications</div>
                  ) : (
                    <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                      {notifs.map(n => {
                        const isUnread = !readIds.has(n.id)
                        const dot = { admission: '🏥', note: '📋', lab: '🧪', opd: '👤' }[n.type] || '🔔'
                        return (
                          <div
                            key={n.id}
                            onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
                            style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--gray-50)', background: isUnread ? 'var(--primary-50)' : '#fff', cursor: 'pointer', transition: 'background 200ms' }}
                          >
                            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', fontWeight: isUnread ? 600 : 400, lineHeight: 1.5 }}>
                              {dot} {n.msg}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>{n.time}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User avatar */}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}
              title={user?.name}>
              {initials}
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

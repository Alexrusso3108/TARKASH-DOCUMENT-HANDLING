import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, BedDouble, Stethoscope, UserSquare2,
  FileText, FlaskConical, Pill, Receipt, BarChart2, Settings,
  Bell, Search, Menu, LogOut, ChevronRight, Activity, ShieldCheck,
  ClipboardList, FolderOpen
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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
      { label: 'Laboratory', path: '/app/laboratory', icon: FlaskConical },
      { label: 'Pharmacy', path: '/app/pharmacy', icon: Pill },
      { label: 'Billing', path: '/app/billing', icon: Receipt },
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
    { label: 'Staff Management', path: '/app/staff', icon: ShieldCheck },
    { label: 'Form Templates', path: '/app/form-templates', icon: FolderOpen },
  ],
}

const NOTIFICATIONS = [
  { id: 1, msg: 'New admission: Priya Kapoor — ICU Bed 4', time: '2 min ago', unread: true },
  { id: 2, msg: 'Lab results ready for patient #2841', time: '15 min ago', unread: true },
  { id: 3, msg: 'Dr. Mehta approved discharge for Room 12', time: '1 hr ago', unread: false },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isAdmin } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  // Build nav with admin section injected if applicable
  const navSections = isAdmin ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV
  const allItems = navSections.flatMap(s => s.items)

  const isActive = (path) =>
    path === '/app/dashboard' ? location.pathname === '/app/dashboard' : location.pathname.startsWith(path)

  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length

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
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer' }}>Mark all read</span>
                  </div>
                  {NOTIFICATIONS.map(n => (
                    <div key={n.id} style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--gray-50)', background: n.unread ? 'var(--primary-50)' : '#fff', cursor: 'pointer' }}>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', fontWeight: n.unread ? 600 : 400, lineHeight: 1.5 }}>{n.msg}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>{n.time}</div>
                    </div>
                  ))}
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

import { useState } from 'react'
import { Save, Bell, Shield, Users, Database, Globe, Palette, Server } from 'lucide-react'

const SETTING_NAV = [
  { icon: Users, label: 'Hospital Profile' },
  { icon: Users, label: 'User Management' },
  { icon: Bell, label: 'Notifications' },
  { icon: Shield, label: 'Security' },
  { icon: Database, label: 'Data & Backup' },
  { icon: Globe, label: 'Integrations' },
  { icon: Palette, label: 'Appearance' },
  { icon: Server, label: 'System Info' },
]

export default function Settings() {
  const [activeSection, setActiveSection] = useState('Hospital Profile')
  const [form, setForm] = useState({
    hospitalName: 'Metro City Hospital',
    tagline: 'Powered by DScribe HMS',
    address: '14/A, Bandra West, Mumbai – 400050, Maharashtra',
    phone: '+91 22 4000 5000',
    email: 'admin@metrocityhospital.in',
    website: 'www.metrocityhospital.in',
    beds: 160,
    departments: 14,
    regNumber: 'MH-MUM-HOSP-20041',
    accreditation: 'NABH Accredited',
    emailNotif: true,
    smsNotif: true,
    criticalAlerts: true,
    pendingNoteAlerts: true,
    labResultAlerts: true,
    twoFactor: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    autoBackup: true,
    backupFreq: 'daily',
    theme: 'light',
    compactMode: false,
    language: 'en',
    timezone: 'Asia/Kolkata',
  })
  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggle = k => setForm(f => ({ ...f, [k]: !f[k] }))

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure hospital profile, system preferences, and security</p>
        </div>
        <button className="btn btn-primary"><Save size={15} /> Save Changes</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '240px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar Nav */}
        <div className="card" style={{ padding: '0.5rem' }}>
          {SETTING_NAV.map(s => (
            <button
              key={s.label}
              onClick={() => setActiveSection(s.label)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
                background: activeSection === s.label ? 'var(--primary-50)' : 'transparent',
                color: activeSection === s.label ? 'var(--primary-700)' : 'var(--gray-600)',
                fontWeight: activeSection === s.label ? 700 : 500,
                fontSize: '0.875rem', border: 'none', cursor: 'pointer', textAlign: 'left',
                transition: 'all 150ms',
              }}
            >
              <s.icon size={16} style={{ flexShrink: 0 }} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="card">
          {activeSection === 'Hospital Profile' && (
            <>
              <div className="card-header"><h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Hospital Profile</h5></div>
              <div className="card-body">
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  {[
                    ['Hospital Name', 'hospitalName', 'text'],
                    ['Tagline', 'tagline', 'text'],
                    ['Phone Number', 'phone', 'text'],
                    ['Email Address', 'email', 'email'],
                    ['Website', 'website', 'text'],
                    ['Total Beds', 'beds', 'number'],
                    ['Departments', 'departments', 'number'],
                    ['Registration Number', 'regNumber', 'text'],
                    ['Accreditation Status', 'accreditation', 'text'],
                  ].map(([label, key, type]) => (
                    <div key={key} className="form-group">
                      <label className="form-label">{label}</label>
                      <input className="form-input" type={type} value={form[key]} onChange={e => h(key, e.target.value)} />
                    </div>
                  ))}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Full Address</label>
                    <textarea className="form-input form-textarea" value={form.address} onChange={e => h('address', e.target.value)} style={{ minHeight: 72 }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'Notifications' && (
            <>
              <div className="card-header"><h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Notification Preferences</h5></div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                  {[
                    ['emailNotif', 'Email Notifications', 'Receive system alerts via email'],
                    ['smsNotif', 'SMS Alerts', 'Receive critical alerts via SMS'],
                    ['criticalAlerts', 'Critical Patient Alerts', 'Notify when a patient status becomes critical'],
                    ['pendingNoteAlerts', 'Pending Note Reminders', 'Remind doctors of undigitized clinical notes'],
                    ['labResultAlerts', 'Lab Result Notifications', 'Notify when lab results are ready'],
                  ].map(([key, title, desc]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-800)' }}>{title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.125rem' }}>{desc}</div>
                      </div>
                      <div
                        onClick={() => toggle(key)}
                        style={{
                          width: 44, height: 24, borderRadius: 12, background: form[key] ? 'var(--primary-500)' : 'var(--gray-300)',
                          cursor: 'pointer', position: 'relative', transition: 'all 200ms', flexShrink: 0,
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', background: '#fff',
                          position: 'absolute', top: 3, left: form[key] ? 23 : 3, transition: 'left 200ms',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'Security' && (
            <>
              <div className="card-header"><h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Security Settings</h5></div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-800)' }}>Two-Factor Authentication</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Require 2FA for all admin logins</div>
                    </div>
                    <div onClick={() => toggle('twoFactor')} style={{ width: 44, height: 24, borderRadius: 12, background: form.twoFactor ? 'var(--primary-500)' : 'var(--gray-300)', cursor: 'pointer', position: 'relative', transition: 'all 200ms', flexShrink: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.twoFactor ? 23 : 3, transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">Session Timeout (minutes)</label>
                      <input className="form-input" type="number" value={form.sessionTimeout} onChange={e => h('sessionTimeout', +e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password Expiry (days)</label>
                      <input className="form-input" type="number" value={form.passwordExpiry} onChange={e => h('passwordExpiry', +e.target.value)} />
                    </div>
                  </div>
                  <div className="alert alert-info">
                    <Shield size={16} />
                    All data is encrypted at rest using AES-256. HIPAA-compliant audit logs are maintained for all user actions.
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'Appearance' && (
            <>
              <div className="card-header"><h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Appearance</h5></div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Theme</label>
                    <select className="form-input form-select" value={form.theme} onChange={e => h('theme', e.target.value)}>
                      <option value="light">Light</option>
                      <option value="dark">Dark (coming soon)</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <select className="form-input form-select" value={form.language} onChange={e => h('language', e.target.value)}>
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="mr">Marathi</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Timezone</label>
                    <select className="form-input form-select" value={form.timezone} onChange={e => h('timezone', e.target.value)}>
                      <option value="Asia/Kolkata">IST — Asia/Kolkata (UTC+5:30)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-800)' }}>Compact Mode</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Tighter spacing for data-dense views</div>
                    </div>
                    <div onClick={() => toggle('compactMode')} style={{ width: 44, height: 24, borderRadius: 12, background: form.compactMode ? 'var(--primary-500)' : 'var(--gray-300)', cursor: 'pointer', position: 'relative', transition: 'all 200ms', flexShrink: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.compactMode ? 23 : 3, transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!['Hospital Profile', 'Notifications', 'Security', 'Appearance'].includes(activeSection) && (
            <>
              <div className="card-header"><h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{activeSection}</h5></div>
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-state-icon"><Server size={28} /></div>
                  <div className="empty-state-title">{activeSection}</div>
                  <div className="empty-state-desc">This section will be available in the next build.</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

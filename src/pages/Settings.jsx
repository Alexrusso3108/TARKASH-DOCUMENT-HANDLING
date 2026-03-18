import { useState, useEffect } from 'react'
import { Save, Bell, Shield, Users, Database, Globe, Palette, Server, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '../api'

const SETTING_NAV = [
  { icon: Users, label: 'Hospital Profile' },
  { icon: Bell, label: 'Notifications' },
  { icon: Shield, label: 'Security' },
  { icon: Palette, label: 'Appearance' },
  { icon: Database, label: 'Data & Backup' },
  { icon: Globe, label: 'Integrations' },
  { icon: Server, label: 'System Info' },
]

export default function Settings() {
  const [activeSection, setActiveSection] = useState('Hospital Profile')

  // ── Hospital Profile state ──────────────────────────────────
  const [hospital, setHospital] = useState(null)
  const [loadingHospital, setLoadingHospital] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)   // 'saved' | 'error' | null
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    setLoadingHospital(true)
    api.getHospital()
      .then(h => setHospital(h))
      .catch(e => console.error('Could not load hospital:', e.message))
      .finally(() => setLoadingHospital(false))
  }, [])

  const hset = (k, v) => setHospital(h => ({ ...h, [k]: v }))

  const handleSaveHospital = async () => {
    if (!hospital) return
    setSaving(true); setSaveStatus(null); setSaveError(null)
    try {
      const updated = await api.updateHospital({
        name: hospital.name,
        address: hospital.address,
        city: hospital.city,
        phone: hospital.phone,
        email: hospital.email,
        license_no: hospital.license_no,
        bed_count: hospital.bed_count,
      })
      setHospital(updated)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (e) {
      setSaveError(e.message)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  // ── Misc settings state (client-side only) ──────────────────
  const [misc, setMisc] = useState({
    emailNotif: true, smsNotif: true, criticalAlerts: true,
    pendingNoteAlerts: true, labResultAlerts: true,
    twoFactor: false, sessionTimeout: 30, passwordExpiry: 90,
    autoBackup: true, backupFreq: 'daily',
    theme: 'light', compactMode: false, language: 'en', timezone: 'Asia/Kolkata',
  })
  const hm = (k, v) => setMisc(f => ({ ...f, [k]: v }))
  const toggle = k => setMisc(f => ({ ...f, [k]: !f[k] }))

  const isHospitalSection = activeSection === 'Hospital Profile'

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure hospital profile, system preferences, and security</p>
        </div>
        {isHospitalSection && (
          <button className="btn btn-primary" onClick={handleSaveHospital} disabled={saving || loadingHospital}>
            {saving ? <Loader size={15} className="spin" /> : saveStatus === 'saved' ? <CheckCircle size={15} /> : <Save size={15} />}
            {saving ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
          </button>
        )}
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

          {/* ── HOSPITAL PROFILE ── */}
          {activeSection === 'Hospital Profile' && (
            <>
              <div className="card-header">
                <h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Hospital Profile</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
                  This information reflects your registered hospital data
                </p>
              </div>
              <div className="card-body">
                {loadingHospital ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                    <Loader size={22} className="spin" style={{ display: 'inline-block' }} />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>Loading hospital profile...</p>
                  </div>
                ) : !hospital ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626', fontSize: '0.875rem' }}>
                    <AlertCircle size={22} style={{ display: 'block', margin: '0 auto 0.75rem' }} />
                    Could not load hospital data. Please refresh the page.
                  </div>
                ) : (
                  <>
                    {saveStatus === 'error' && (
                      <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={15} /> {saveError || 'Save failed. Please try again.'}
                      </div>
                    )}
                    {saveStatus === 'saved' && (
                      <div style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.15)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={15} /> Hospital profile updated successfully!
                      </div>
                    )}

                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                      <div className="form-group">
                        <label className="form-label">Hospital Name</label>
                        <input className="form-input" value={hospital.name || ''} onChange={e => hset('name', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">City</label>
                        <input className="form-input" placeholder="e.g. Mumbai" value={hospital.city || ''} onChange={e => hset('city', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input className="form-input" type="tel" value={hospital.phone || ''} onChange={e => hset('phone', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input className="form-input" type="email" value={hospital.email || ''} onChange={e => hset('email', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">License / Registration No.</label>
                        <input className="form-input" value={hospital.license_no || ''} onChange={e => hset('license_no', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total Beds</label>
                        <input className="form-input" type="number" value={hospital.bed_count || 0} onChange={e => hset('bed_count', parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Full Address</label>
                        <textarea className="form-input form-textarea" value={hospital.address || ''} onChange={e => hset('address', e.target.value)} style={{ minHeight: 72 }} />
                      </div>

                      {/* Read-only info */}
                      <div style={{ gridColumn: '1 / -1', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-150)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Read-Only Info</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          {[
                            ['Hospital ID', `#${hospital.id}`],
                            ['Registered Since', hospital.created_at ? new Date(hospital.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'],
                          ].map(([label, val]) => (
                            <div key={label}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.125rem' }}>{label}</div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-700)' }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── NOTIFICATIONS ── */}
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
                      <div onClick={() => toggle(key)} style={{ width: 44, height: 24, borderRadius: 12, background: misc[key] ? 'var(--primary-500)' : 'var(--gray-300)', cursor: 'pointer', position: 'relative', transition: 'all 200ms', flexShrink: 0 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: misc[key] ? 23 : 3, transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── SECURITY ── */}
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
                    <div onClick={() => toggle('twoFactor')} style={{ width: 44, height: 24, borderRadius: 12, background: misc.twoFactor ? 'var(--primary-500)' : 'var(--gray-300)', cursor: 'pointer', position: 'relative', transition: 'all 200ms', flexShrink: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: misc.twoFactor ? 23 : 3, transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">Session Timeout (minutes)</label>
                      <input className="form-input" type="number" value={misc.sessionTimeout} onChange={e => hm('sessionTimeout', +e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password Expiry (days)</label>
                      <input className="form-input" type="number" value={misc.passwordExpiry} onChange={e => hm('passwordExpiry', +e.target.value)} />
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

          {/* ── APPEARANCE ── */}
          {activeSection === 'Appearance' && (
            <>
              <div className="card-header"><h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Appearance</h5></div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Theme</label>
                    <select className="form-input form-select" value={misc.theme} onChange={e => hm('theme', e.target.value)}>
                      <option value="light">Light</option>
                      <option value="dark">Dark (coming soon)</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <select className="form-input form-select" value={misc.language} onChange={e => hm('language', e.target.value)}>
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="mr">Marathi</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Timezone</label>
                    <select className="form-input form-select" value={misc.timezone} onChange={e => hm('timezone', e.target.value)}>
                      <option value="Asia/Kolkata">IST — Asia/Kolkata (UTC+5:30)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-800)' }}>Compact Mode</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Tighter spacing for data-dense views</div>
                    </div>
                    <div onClick={() => toggle('compactMode')} style={{ width: 44, height: 24, borderRadius: 12, background: misc.compactMode ? 'var(--primary-500)' : 'var(--gray-300)', cursor: 'pointer', position: 'relative', transition: 'all 200ms', flexShrink: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: misc.compactMode ? 23 : 3, transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── OTHER SECTIONS ── */}
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

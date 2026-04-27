import { useState, useEffect, useRef } from 'react'
import { Save, Bell, Shield, Users, Database, Globe, Palette, Server, Loader, CheckCircle, AlertCircle, FileText, UploadCloud, Eye } from 'lucide-react'
import { api, SERVER_URL } from '../api'

const SETTING_NAV = [
  { icon: Users, label: 'Hospital Profile' },
  { icon: FileText, label: 'Lab Report Branding' },
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
        report_header_text: hospital.report_header_text,
        report_footer_text: hospital.report_footer_text,
        report_tagline: hospital.report_tagline,
        report_print_mode: hospital.report_print_mode || 'text',
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

  // ── Branding upload ────────────────────────────────────────────
  const logoInputRef = useRef()
  const headerInputRef = useRef()
  const footerInputRef = useRef()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingHeader, setUploadingHeader] = useState(false)
  const [uploadingFooter, setUploadingFooter] = useState(false)
  const [logoError, setLogoError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [imageHash, setImageHash] = useState(Date.now())

  const handleBrandingUpload = async (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setLogoError('Only PNG, JPG, WEBP images are allowed'); return
    }
    setLogoError(null)
    if (type === 'logo') setUploadingLogo(true)
    if (type === 'header') setUploadingHeader(true)
    if (type === 'footer') setUploadingFooter(true)

    try {
      const updated = await api.uploadHospitalBranding(type, file)
      setHospital(prev => ({
        ...prev,
        report_logo: updated.report_logo,
        report_header_image: updated.report_header_image,
        report_footer_image: updated.report_footer_image
      }))
      setImageHash(Date.now())
    } catch (err) { setLogoError(err.message) }
    finally {
      if (type === 'logo') setUploadingLogo(false)
      if (type === 'header') setUploadingHeader(false)
      if (type === 'footer') setUploadingFooter(false)
      e.target.value = ''
    }
  }

  const isHospitalSection = activeSection === 'Hospital Profile' || activeSection === 'Lab Report Branding'

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

          {/* ── LAB REPORT BRANDING ── */}
          {activeSection === 'Lab Report Branding' && (
            <>
              <div className="card-header">
                <h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Lab Report Branding</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
                  Configure the header & footer that appear on all generated lab report PDFs
                </p>
              </div>
              <div className="card-body">
                {loadingHospital ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                    <Loader size={22} className="spin" style={{ display: 'inline-block' }} />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>Loading branding settings...</p>
                  </div>
                ) : !hospital ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626', fontSize: '0.875rem' }}>
                    <AlertCircle size={22} style={{ display: 'block', margin: '0 auto 0.75rem' }} />
                    Could not load hospital data. Please refresh.
                  </div>
                ) : (
                  <>
                    {saveStatus === 'saved' && (
                      <div style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.15)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={15} /> Report branding saved successfully!
                      </div>
                    )}
                    {saveStatus === 'error' && (
                      <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={15} /> {saveError || 'Save failed.'}
                      </div>
                    )}

                    {/* Print Mode Selection */}
                    <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Print Mode</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <label style={{
                          display: 'flex', gap: '0.75rem', padding: '1rem', border: `2px solid ${hospital.report_print_mode !== 'image' ? 'var(--primary-500)' : 'var(--gray-200)'}`,
                          borderRadius: 'var(--radius-lg)', cursor: 'pointer', background: hospital.report_print_mode !== 'image' ? 'var(--primary-50)' : '#fff'
                        }}>
                          <input type="radio" name="printMode" checked={hospital.report_print_mode !== 'image'} onChange={() => hset('report_print_mode', 'text')} style={{ marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-900)' }}>Standard (Text & Logo)</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Auto-generates header/footer from your text and logo</div>
                          </div>
                        </label>
                        <label style={{
                          display: 'flex', gap: '0.75rem', padding: '1rem', border: `2px solid ${hospital.report_print_mode === 'image' ? 'var(--primary-500)' : 'var(--gray-200)'}`,
                          borderRadius: 'var(--radius-lg)', cursor: 'pointer', background: hospital.report_print_mode === 'image' ? 'var(--primary-50)' : '#fff'
                        }}>
                          <input type="radio" name="printMode" checked={hospital.report_print_mode === 'image'} onChange={() => hset('report_print_mode', 'image')} style={{ marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-900)' }}>Full Image Templates</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Upload full-width header & footer images (for pre-printed look)</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {hospital.report_print_mode !== 'image' ? (
                      <>
                        {/* Logo Upload */}
                        <div style={{ padding: '1.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-150)', marginBottom: '1.5rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hospital Logo</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{
                              width: 100, height: 100, borderRadius: 'var(--radius-lg)',
                              border: '2px dashed var(--gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              overflow: 'hidden', background: '#fff', flexShrink: 0,
                            }}>
                              {hospital.report_logo ? (
                                <img src={`${SERVER_URL}${hospital.report_logo}?t=${imageHash}`} alt="Hospital Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              ) : (
                                <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem' }}>
                                  <UploadCloud size={24} style={{ display: 'block', margin: '0 auto 0.25rem' }} />
                                  No logo
                                </div>
                              )}
                            </div>
                            <div>
                              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" style={{ display: 'none' }} onChange={(e) => handleBrandingUpload(e, 'logo')} />
                              <button className="btn btn-primary btn-sm" onClick={() => logoInputRef.current.click()} disabled={uploadingLogo} style={{ marginBottom: '0.5rem' }}>
                                {uploadingLogo ? <Loader size={13} className="spin" /> : <UploadCloud size={13} />}
                                {uploadingLogo ? 'Uploading...' : hospital.report_logo ? 'Change Logo' : 'Upload Logo'}
                              </button>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>PNG, JPG, or WEBP · Max 5 MB</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '0.125rem' }}>Recommended: 300×100 px, transparent background</div>
                              {logoError && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem' }}>⚠ {logoError}</div>}
                            </div>
                          </div>
                        </div>

                        {/* Header Text */}
                        <div style={{ marginBottom: '1.25rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Header Text</div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.625rem' }}>
                            This text appears at the top of every lab report, next to the logo. Include hospital name, accreditations (NABL, ISO), etc.
                          </p>
                          <textarea
                            className="form-input form-textarea"
                            value={hospital.report_header_text || ''}
                            onChange={e => hset('report_header_text', e.target.value)}
                            placeholder={`e.g.\nSunrise Multi-Specialty Hospital & Research Centre\nNABL Accredited | ISO 9001:2015 Certified\n123, MG Road, Mumbai - 400001\nPh: 022-12345678 | Email: lab@sunrisehospital.in`}
                            style={{ minHeight: 110, fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: 1.6 }}
                          />
                        </div>

                        {/* Tagline */}
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                          <label className="form-label">Tagline / Subtitle</label>
                          <input
                            className="form-input"
                            value={hospital.report_tagline || ''}
                            onChange={e => hset('report_tagline', e.target.value)}
                            placeholder='e.g. "Committed to Accurate Diagnostics & Patient Care"'
                          />
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>Displayed below the header in italics</div>
                        </div>

                        {/* Footer Text */}
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Footer Text</div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.625rem' }}>
                            This appears at the bottom of every page. Include signature lines, disclaimers, or lab contact info.
                          </p>
                          <textarea
                            className="form-input form-textarea"
                            value={hospital.report_footer_text || ''}
                            onChange={e => hset('report_footer_text', e.target.value)}
                            placeholder={`e.g.\nThis report is electronically generated and valid without signature.\nFor queries contact Lab: 022-12345679 | Email: lab@sunrisehospital.in\n\n_____________________          _____________________\n   Lab Technician                  Pathologist`}
                            style={{ minHeight: 110, fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: 1.6 }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          {/* Full Header Image Upload */}
                          <div style={{ padding: '1.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-150)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Header Template Image</div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>Upload a full-width image (e.g. letterhead top). It will span the entire width of the page.</p>
                            <div style={{
                              width: '100%', height: 120, borderRadius: 'var(--radius-lg)',
                              border: '2px dashed var(--gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              overflow: 'hidden', background: '#fff', marginBottom: '1rem'
                            }}>
                              {hospital.report_header_image ? (
                                <img src={`${SERVER_URL}${hospital.report_header_image}?t=${imageHash}`} alt="Header Template" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              ) : (
                                <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem' }}>
                                  <UploadCloud size={24} style={{ display: 'block', margin: '0 auto 0.25rem' }} />
                                  No header image
                                </div>
                              )}
                            </div>
                            <input ref={headerInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" style={{ display: 'none' }} onChange={(e) => handleBrandingUpload(e, 'header')} />
                            <button className="btn btn-secondary btn-sm" onClick={() => headerInputRef.current.click()} disabled={uploadingHeader}>
                              {uploadingHeader ? <Loader size={13} className="spin" /> : <UploadCloud size={13} />}
                              {uploadingHeader ? 'Uploading...' : hospital.report_header_image ? 'Change Header Image' : 'Upload Header Image'}
                            </button>
                            {logoError && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem' }}>⚠ {logoError}</div>}
                          </div>

                          {/* Full Footer Image Upload */}
                          <div style={{ padding: '1.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-150)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Footer Template Image</div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>Upload a full-width image (e.g. letterhead bottom with signatures). It will be placed at the bottom of every page.</p>
                            <div style={{
                              width: '100%', height: 120, borderRadius: 'var(--radius-lg)',
                              border: '2px dashed var(--gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              overflow: 'hidden', background: '#fff', marginBottom: '1rem'
                            }}>
                              {hospital.report_footer_image ? (
                                <img src={`${SERVER_URL}${hospital.report_footer_image}?t=${imageHash}`} alt="Footer Template" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              ) : (
                                <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem' }}>
                                  <UploadCloud size={24} style={{ display: 'block', margin: '0 auto 0.25rem' }} />
                                  No footer image
                                </div>
                              )}
                            </div>
                            <input ref={footerInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" style={{ display: 'none' }} onChange={(e) => handleBrandingUpload(e, 'footer')} />
                            <button className="btn btn-secondary btn-sm" onClick={() => footerInputRef.current.click()} disabled={uploadingFooter}>
                              {uploadingFooter ? <Loader size={13} className="spin" /> : <UploadCloud size={13} />}
                              {uploadingFooter ? 'Uploading...' : hospital.report_footer_image ? 'Change Footer Image' : 'Upload Footer Image'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Live Preview */}
                    <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1.25rem' }}>
                      <button className="btn btn-secondary" onClick={() => setShowPreview(p => !p)} style={{ marginBottom: '1rem' }}>
                        <Eye size={14} /> {showPreview ? 'Hide Preview' : 'Preview Report Layout'}
                      </button>
                      {showPreview && (
                        <div style={{
                          border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                          background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                        }}>
                          {/* Header preview */}
                          {hospital.report_print_mode === 'image' && hospital.report_header_image ? (
                            <img src={`${SERVER_URL}${hospital.report_header_image}?t=${imageHash}`} alt="Header" style={{ width: '100%', height: 'auto', display: 'block' }} />
                          ) : (
                            <div style={{
                              padding: '1.25rem 1.5rem', borderBottom: '3px solid #4f46e5',
                              display: 'flex', alignItems: 'center', gap: '1.25rem',
                            }}>
                              {hospital.report_logo && (
                                <img src={`${SERVER_URL}${hospital.report_logo}?t=${imageHash}`} alt="Logo" style={{ height: 60, objectFit: 'contain', flexShrink: 0 }} />
                              )}
                              <div style={{ flex: 1 }}>
                                {(hospital.report_header_text || hospital.name) ? (
                                  (hospital.report_header_text || hospital.name).split('\n').map((line, i) => (
                                    <div key={i} style={{
                                      fontSize: i === 0 ? '1rem' : '0.75rem',
                                      fontWeight: i === 0 ? 800 : 400,
                                      color: i === 0 ? '#1e3a8a' : 'var(--gray-600)',
                                      lineHeight: 1.5,
                                    }}>{line}</div>
                                  ))
                                ) : (
                                  <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', fontStyle: 'italic' }}>No header text configured</div>
                                )}
                                {hospital.report_tagline && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--primary-600)', fontStyle: 'italic', marginTop: '0.25rem' }}>{hospital.report_tagline}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Body placeholder */}
                          <div style={{ padding: '2rem 1.5rem', minHeight: 120 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.75rem' }}>Investigation: CBC (Complete Blood Count)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                              {['Parameter', 'Result', 'Flag', 'Unit', 'Ref. Range'].map(h => (
                                <div key={h} style={{ fontWeight: 700, padding: '0.5rem', background: '#eef2ff', borderRadius: 4 }}>{h}</div>
                              ))}
                              {['Haemoglobin', '14.2', '', 'g/dL', '13-17'].map((c, i) => (
                                <div key={i} style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-100)' }}>{c}</div>
                              ))}
                              {['Platelet Count', '2.8', '', 'lakhs/cumm', '1.5-4.5'].map((c, i) => (
                                <div key={i} style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-100)' }}>{c}</div>
                              ))}
                            </div>
                          </div>

                          {/* Footer preview */}
                          {hospital.report_print_mode === 'image' && hospital.report_footer_image ? (
                            <img src={`${SERVER_URL}${hospital.report_footer_image}?t=${imageHash}`} alt="Footer" style={{ width: '100%', height: 'auto', display: 'block' }} />
                          ) : (
                            <div style={{
                              padding: '1rem 1.5rem', borderTop: '2px solid var(--gray-200)', background: 'var(--gray-50)',
                              fontSize: '0.7rem', color: 'var(--gray-500)', whiteSpace: 'pre-wrap', lineHeight: 1.5,
                            }}>
                              {hospital.report_footer_text || (
                                <span style={{ fontStyle: 'italic', color: 'var(--gray-400)' }}>No footer text configured — default "End of Report" will be used</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
          {!['Hospital Profile', 'Lab Report Branding', 'Notifications', 'Security', 'Appearance'].includes(activeSection) && (
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

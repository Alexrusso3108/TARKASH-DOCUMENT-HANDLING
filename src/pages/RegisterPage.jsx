import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FileText, Loader, ArrowRight, ArrowLeft, Building2, User, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BASE_URL } from '../api'

const STEPS = ['Hospital Info', 'Admin Account', 'Review & Submit']

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '2.5rem' }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: i < current ? 'linear-gradient(135deg, #6366f1, #0d9488)' : i === current ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--gray-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: i <= current ? '#fff' : 'var(--gray-400)',
              fontWeight: 700, fontSize: '0.8125rem',
              boxShadow: i === current ? '0 0 20px rgba(99,102,241,0.4)' : 'none',
              transition: 'all 0.3s',
            }}>
              {i < current ? <CheckCircle size={16} /> : i + 1}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: i === current ? 700 : 400, color: i === current ? 'var(--primary-600)' : 'var(--gray-400)', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 80, height: 2, background: i < current ? 'var(--primary-400)' : 'var(--gray-200)', margin: '0 0.5rem', marginBottom: 18, transition: 'all 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Field({ label, children, required }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}</label>
      {children}
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [createdInfo, setCreatedInfo] = useState(null)

  const [hosp, setHosp] = useState({ name: '', city: '', address: '', phone: '', email: '', licenseNo: '', bedCount: '' })
  const [admin, setAdmin] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })

  const hset = (k, v) => setHosp(f => ({ ...f, [k]: v }))
  const aset = (k, v) => setAdmin(f => ({ ...f, [k]: v }))

  const validateStep0 = () => {
    if (!hosp.name.trim()) return 'Hospital name is required'
    if (!hosp.city.trim()) return 'City is required'
    return null
  }
  const validateStep1 = () => {
    if (!admin.name.trim()) return 'Admin name is required'
    if (!admin.password) return 'Password is required'
    if (admin.password.length < 6) return 'Password must be at least 6 characters'
    if (admin.password !== admin.confirm) return 'Passwords do not match'
    return null
  }

  const next = () => {
    const err = step === 0 ? validateStep0() : step === 1 ? validateStep1() : null
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalName: hosp.name, city: hosp.city, address: hosp.address,
          phone: hosp.phone, email: hosp.email, licenseNo: hosp.licenseNo,
          bedCount: hosp.bedCount ? parseInt(hosp.bedCount) : 0,
          adminName: admin.name, adminEmail: admin.email,
          adminPhone: admin.phone, password: admin.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); return }
      setCreatedInfo(data)
      setDone(true)
    } catch {
      setError('Could not connect to server. Make sure the API is running.')
    } finally {
      setLoading(false)
    }
  }

  const goToDashboard = () => {
    login(createdInfo.token, createdInfo.user)
    navigate('/app/dashboard')
  }

  if (done && createdInfo) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '3rem', maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 40px 80px rgba(0,0,0,0.3)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={36} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.75rem' }}>Registration Successful! 🎉</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: '2rem', fontSize: '0.9375rem', lineHeight: 1.7 }}>
            <strong>{hosp.name}</strong> has been registered. Your admin account is ready.
          </p>

          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', marginBottom: '2rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Your Login Credentials</p>
            {[
              ['Login ID', createdInfo.user.loginId],
              ['Role', 'Administrator'],
              ['Hospital', createdInfo.user.hospitalName],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{k}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--gray-900)', fontFamily: 'monospace' }}>{v}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.75rem', fontWeight: 500 }}>⚠ Save your Login ID — you'll need it every time you sign in.</p>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }} onClick={goToDashboard}>
            Go to Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-primary)' }}>

      <div style={{ background: '#fff', borderRadius: 24, padding: '2.5rem', maxWidth: 580, width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="#fff" />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--gray-900)' }}>DScribe</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.375rem' }}>Register Your Hospital</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Admin-only registration · Takes 2 minutes</p>
        </div>

        <StepIndicator current={step} />

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* ── STEP 0: Hospital Info ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Building2 size={16} style={{ color: 'var(--primary-500)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-800)' }}>Hospital Details</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Hospital Name" required>
                  <input className="form-input" placeholder="e.g. Sunrise Multispeciality Hospital" value={hosp.name} onChange={e => hset('name', e.target.value)} />
                </Field>
              </div>
              <Field label="City" required>
                <input className="form-input" placeholder="e.g. Mumbai" value={hosp.city} onChange={e => hset('city', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input className="form-input" type="tel" placeholder="Hospital contact" value={hosp.phone} onChange={e => hset('phone', e.target.value)} />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Address">
                  <input className="form-input" placeholder="Full address" value={hosp.address} onChange={e => hset('address', e.target.value)} />
                </Field>
              </div>
              <Field label="Email">
                <input className="form-input" type="email" placeholder="hospital@email.com" value={hosp.email} onChange={e => hset('email', e.target.value)} />
              </Field>
              <Field label="License / Reg. No.">
                <input className="form-input" placeholder="MH-2024-XXXX" value={hosp.licenseNo} onChange={e => hset('licenseNo', e.target.value)} />
              </Field>
              <Field label="Total Bed Count">
                <input className="form-input" type="number" placeholder="e.g. 150" value={hosp.bedCount} onChange={e => hset('bedCount', e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 1: Admin Account ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <User size={16} style={{ color: 'var(--primary-500)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-800)' }}>Admin Account</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: -8 }}>This account will have full admin access to manage the hospital and create staff credentials.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Admin Full Name" required>
                  <input className="form-input" placeholder="e.g. Rajesh Kumar" value={admin.name} onChange={e => aset('name', e.target.value)} />
                </Field>
              </div>
              <Field label="Admin Email">
                <input className="form-input" type="email" placeholder="admin@email.com" value={admin.email} onChange={e => aset('email', e.target.value)} />
              </Field>
              <Field label="Admin Phone">
                <input className="form-input" type="tel" placeholder="Admin mobile" value={admin.phone} onChange={e => aset('phone', e.target.value)} />
              </Field>
              <Field label="Password" required>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input className="form-input" type={showPass ? 'text' : 'password'} style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }} placeholder="Min 6 characters" value={admin.password} onChange={e => aset('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0 }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password" required>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input className="form-input" type={showConfirm ? 'text' : 'password'} style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }} placeholder="Repeat password" value={admin.confirm} onChange={e => aset('confirm', e.target.value)} />
                  <button type="button" onClick={() => setShowConfirm(s => !s)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0 }}>
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-800)', marginBottom: '0.5rem' }}>Please review your information</p>
            {[
              ['Hospital Name', hosp.name],
              ['City', hosp.city],
              ['Hospital Phone', hosp.phone || '—'],
              ['Hospital Email', hosp.email || '—'],
              ['License No.', hosp.licenseNo || '—'],
              ['Bed Count', hosp.bedCount || '—'],
              ['Admin Name', admin.name],
              ['Admin Email', admin.email || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--gray-500)' }}>{k}</span>
                <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{v}</span>
              </div>
            ))}
            <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--primary-700)' }}>
              ℹ After registration, your <strong>Login ID</strong> will be auto-generated and displayed. Save it — you'll need it to sign in.
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
          {step > 0 && (
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.8rem' }} onClick={() => { setError(null); setStep(s => s - 1) }}>
              <ArrowLeft size={14} /> Back
            </button>
          )}
          {step < 2 ? (
            <button className="btn btn-primary" style={{ flex: 2, padding: '0.8rem' }} onClick={next}>
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button className="btn btn-primary" style={{ flex: 2, padding: '0.8rem' }} onClick={handleSubmit} disabled={loading}>
              {loading ? <><Loader size={14} className="spin" /> Registering…</> : <>Complete Registration <CheckCircle size={14} /></>}
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/login" style={{ fontSize: '0.875rem', color: 'var(--gray-500)', textDecoration: 'none' }}>
            Already have an account? <span style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

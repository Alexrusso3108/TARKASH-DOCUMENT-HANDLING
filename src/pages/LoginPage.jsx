import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, FileText, Loader, ArrowRight, Lock, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BASE_URL } from '../api'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ loginId: '', password: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.loginId || !form.password) { setError('Please enter your Login ID and password.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      login(data.token, data.user)
      navigate('/app/dashboard')
    } catch {
      setError('Could not connect to the server. Make sure the API is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-primary)' }}>

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div style={{
        width: '45%', minHeight: '100vh',
        background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '3rem', position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(13,148,136,0.18)', filter: 'blur(60px)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 420 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(99,102,241,0.5)' }}>
              <FileText size={26} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>DScribe</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: -3 }}>Clinical Suite</div>
            </div>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Smarter Hospital Management Starts Here
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.75, marginBottom: '3rem' }}>
            Streamline your patient records, clinical workflows, and hospital operations — all in one unified platform.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
            {[['500+', 'Hospitals'], ['1M+', 'Patients'], ['99.9%', 'Uptime']].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{val}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ──────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>Sign in to your hospital account</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c', padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Login ID</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. ADM.rajesh.sunrise"
                  value={form.loginId}
                  onChange={e => handle('loginId', e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => handle('password', e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0 }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ padding: '0.8rem', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)', marginTop: '0.5rem', gap: '0.625rem' }}
            >
              {loading ? <Loader size={16} className="spin" /> : <ArrowRight size={16} />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-xl)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>New to DScribe?</p>
            <Link
              to="/register"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--primary-600)', fontWeight: 700, fontSize: '0.9375rem', textDecoration: 'none' }}
            >
              Register your hospital <ArrowRight size={14} />
            </Link>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.5rem' }}>Admin registration only</p>
          </div>
        </div>
      </div>
    </div>
  )
}

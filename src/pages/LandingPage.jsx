import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Zap, Shield, Users, BarChart2, Clock,
  ChevronRight, Check, ArrowRight, Star, Menu, X,
  Activity, Database, Cloud, Lock
} from 'lucide-react'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'FAQ', href: '#faq' },
]

const STATS = [
  { value: '60%', label: 'Cost Reduction' },
  { value: '35%', label: 'Efficiency Gain' },
  { value: '500+', label: 'Hospitals Served' },
  { value: '2x', label: 'Faster Discharges' },
]

const FEATURES = [
  {
    icon: FileText,
    title: 'Instant Digitization',
    desc: 'Handwritten clinical notes become searchable digital records the moment they are written. No scanning, no uploading, no delays.',
    color: 'gradient-primary',
  },
  {
    icon: Activity,
    title: 'Real-Time Access',
    desc: 'All departments see the same live patient file simultaneously, reducing coordination delays and improving care outcomes.',
    color: 'gradient-teal',
  },
  {
    icon: Shield,
    title: 'Audit-Ready Records',
    desc: 'Every note is timestamped, verified, and NABH-compliant. Eliminate medico-legal risks from missing or incomplete documentation.',
    color: 'gradient-blue',
  },
  {
    icon: Zap,
    title: 'Zero Learning Curve',
    desc: 'Doctors write naturally with a stylus, exactly as they always have. DScribe adapts to your workflow, not the other way around.',
    color: 'gradient-purple',
  },
  {
    icon: Cloud,
    title: 'Secure Cloud Storage',
    desc: 'Patient records are encrypted and stored securely. Access from anywhere with role-based permissions protecting sensitive data.',
    color: 'gradient-green',
  },
  {
    icon: BarChart2,
    title: 'Analytics Dashboard',
    desc: 'Track department performance, bed occupancy, discharge rates, and more with live operational dashboards.',
    color: 'gradient-amber',
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Doctor Writes Naturally',
    desc: 'Using a stylus on a tablet, clinicians write notes exactly as they would on paper. No forced templates, no typing, no retraining required.',
  },
  {
    step: '02',
    title: 'Notes Are Instantly Digitized',
    desc: 'DScribe converts handwriting into structured digital records in real time. The note is indexed, tagged, and made searchable immediately.',
  },
  {
    step: '03',
    title: 'Entire Team Gets Access',
    desc: 'Nurses, pharmacists, lab technicians, and billing staff all see the same up-to-date patient record, eliminating paper routing delays.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Dr. Rajiv Mehta',
    role: 'Medical Director, Apollo Hospitals',
    text: 'DScribe reduced our discharge paperwork time by 60%. Our nurses now spend more time at the bedside instead of behind a filing cabinet.',
    rating: 5,
  },
  {
    name: 'Dr. Priya Sharma',
    role: 'ICU Head, Fortis Healthcare',
    text: 'The real-time access across departments is transformative. Our ICU team can make decisions faster because everyone is looking at the same live chart.',
    rating: 5,
  },
  {
    name: 'Anant Bose',
    role: 'COO, Manipal Hospitals',
    text: 'Implementation took less than a week per department. The ROI was visible within 30 days through reduced storage and paper costs alone.',
    rating: 5,
  },
]

const FAQS = [
  {
    q: 'What ROI can hospitals expect after implementing DScribe?',
    a: 'For a 100-bed hospital, DScribe typically delivers Rs 25 lakhs or more in annual savings by reducing paper usage, physical storage, and file-handling overhead. Hospitals also experience a 30-35% productivity improvement across clinical teams.',
  },
  {
    q: 'Will doctors and nurses need to change how they work?',
    a: 'No. DScribe is designed to fit seamlessly into existing clinical workflows. Doctors continue writing with a stylus, and the system digitizes notes in the background without requiring any changes to how clinicians operate.',
  },
  {
    q: 'How long does it take to implement DScribe in a department?',
    a: 'Most departments are fully operational within 3-7 days. Our onboarding team handles setup, device configuration, and staff training so there is no disruption to patient care during rollout.',
  },
  {
    q: 'Are DScribe digital records accepted for NABH and insurance audits?',
    a: 'Yes. DScribe records are fully compliant with NABH documentation standards and are accepted by major insurance providers for audit and claim processing.',
  },
  {
    q: 'How secure are patient records in DScribe?',
    a: 'Patient data is encrypted at rest and in transit using industry-standard AES-256 encryption. Access is controlled through role-based permissions, and all actions are logged in a tamper-proof audit trail.',
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        border: '1.5px solid var(--gray-200)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        marginBottom: '0.75rem',
        transition: 'border-color 200ms',
        ...(open ? { borderColor: 'var(--primary-300)' } : {}),
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.125rem 1.5rem',
          background: open ? 'var(--primary-50)' : '#fff',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-primary)',
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: open ? 'var(--primary-700)' : 'var(--gray-800)',
          textAlign: 'left',
          gap: '1rem',
          transition: 'all 200ms',
        }}
      >
        {q}
        <div style={{
          width: 20, height: 20, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'var(--primary-100)' : 'var(--gray-100)',
          borderRadius: '50%', transition: 'all 200ms',
          color: open ? 'var(--primary-600)' : 'var(--gray-500)',
        }}>
          {open ? <X size={12} /> : <ChevronRight size={12} style={{ transform: 'rotate(90deg)' }} />}
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 1.5rem 1.25rem', background: '#fff', color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.75 }}>
          {a}
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: 'var(--font-primary)', color: 'var(--gray-800)' }}>

      {/* NAVBAR */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, var(--primary-600), var(--accent-teal))',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
          }}>
            <FileText size={18} color="#fff" />
          </div>
          <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.04em' }}>
            DScribe
          </span>
        </div>

        <ul className="landing-nav-links" style={{ display: menuOpen ? 'none' : undefined }}>
          {NAV_LINKS.map(l => (
            <li key={l.label}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/app')}>
            Sign In
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/app')}>
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section" id="hero">
        <div className="hero-bg-circle" style={{ width: 600, height: 600, top: -200, right: -200, opacity: 0.6 }} />
        <div className="hero-bg-circle" style={{ width: 400, height: 400, bottom: -100, left: -100, opacity: 0.4 }} />

        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
            <div className="animate-fadeInUp">
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                Trusted by 500+ hospitals across India
              </div>
              <h1 className="hero-headline">
                Cut discharge time
                <br />
                in <span>half</span>.
                <br />
                Eliminate the
                <br />
                paper chase.
              </h1>
              <p className="hero-subtext">
                DScribe helps hospitals instantly digitize handwritten clinical notes,
                reduce paperwork, speed up discharges, and improve doctor and nurse efficiency.
              </p>
              <div className="hero-cta">
                <button className="btn btn-primary btn-xl" onClick={() => navigate('/app')}>
                  Explore the System
                  <ArrowRight size={18} />
                </button>
                <button className="btn btn-secondary btn-lg" onClick={() => navigate('/app')}>
                  View Live Demo
                </button>
              </div>
              <div className="hero-stats">
                {STATS.map(s => (
                  <div key={s.label}>
                    <div className="hero-stat-value">{s.value}</div>
                    <div className="hero-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* HERO VISUAL */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
              <div style={{
                background: 'linear-gradient(160deg, var(--gray-900), var(--gray-800))',
                borderRadius: 'var(--radius-2xl)',
                padding: '1.5rem',
                boxShadow: '0 40px 80px rgba(15,23,42,0.35)',
                position: 'relative',
              }}>
                {/* Mock Dashboard Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  {['#ef4444', '#f59e0b', '#10b981'].map(c => (
                    <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                  ))}
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 6, height: 24, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>app.dscribe.in/dashboard</span>
                  </div>
                </div>
                {/* Mock stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'Active Patients', val: '1,284', color: 'var(--primary-500)' },
                    { label: 'Pending Notes', val: '23', color: 'var(--accent-teal)' },
                    { label: 'Discharges Today', val: '47', color: 'var(--accent-green)' },
                    { label: 'Bed Occupancy', val: '89%', color: 'var(--accent-amber)' },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, padding: '0.875rem',
                    }}>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                      <div style={{ fontSize: '1.375rem', fontWeight: 800, color: item.color, letterSpacing: '-0.04em' }}>{item.val}</div>
                    </div>
                  ))}
                </div>
                {/* Mock patient list */}
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Recent Admissions</div>
                  {[
                    { name: 'Priya Kapoor', dept: 'ICU', status: 'Critical', statusColor: '#ef4444' },
                    { name: 'Rahul Verma', dept: 'General Ward', status: 'Stable', statusColor: '#10b981' },
                    { name: 'Sunita Sharma', dept: 'Cardiology', status: 'Under Obs', statusColor: '#f59e0b' },
                  ].map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.625rem', fontWeight: 700, color: '#fff',
                        }}>
                          {p.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{p.name}</div>
                          <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)' }}>{p.dept}</div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: p.statusColor,
                        background: p.statusColor + '18', padding: '0.2rem 0.5rem',
                        borderRadius: 999, letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features" style={{ background: '#fff' }}>
        <div className="container">
          <div className="text-center" style={{ maxWidth: 640, margin: '0 auto 4rem' }}>
            <div className="badge badge-primary" style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}>
              Core Features
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Making clinical documentation simpler</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '1.0625rem' }}>
              Every feature in DScribe is built around one principle — clinicians should spend more time with patients, not with paperwork.
            </p>
          </div>
          <div className="grid grid-3" style={{ gap: '1.5rem' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card animate-fadeInUp" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className={`feature-icon-wrap ${f.color}`}>
                  <f.icon size={24} color="#fff" />
                </div>
                <h4 style={{ marginBottom: '0.625rem', color: 'var(--gray-900)' }}>{f.title}</h4>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how-it-works" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="text-center" style={{ maxWidth: 600, margin: '0 auto 4rem' }}>
            <div className="badge badge-teal" style={{ marginBottom: '1rem' }}>
              How It Works
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Three steps to a paperless hospital</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '1.0625rem' }}>
              DScribe integrates into your current workflow without disruption. Here is exactly what happens.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: '3rem', left: '18%', right: '18%', height: '2px',
              background: 'linear-gradient(90deg, var(--primary-300), var(--accent-teal))',
              opacity: 0.4,
            }} />
            {STEPS.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '2rem', position: 'relative' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-600), var(--accent-teal))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 8px 24px rgba(79,70,229,0.3)',
                  fontSize: '1rem', fontWeight: 800, color: '#fff',
                }}>
                  {s.step}
                </div>
                <h4 style={{ marginBottom: '0.75rem', color: 'var(--gray-900)', fontSize: '1.125rem' }}>{s.title}</h4>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', lineHeight: 1.75 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS BANNER */}
      <section className="section" id="benefits" style={{
        background: 'linear-gradient(160deg, var(--gray-900) 0%, #1a1040 100%)',
        color: '#fff',
      }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '5rem', alignItems: 'center' }}>
            <div>
              <div className="badge" style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--primary-300)', border: '1px solid rgba(99,102,241,0.3)', marginBottom: '1.5rem' }}>
                DScribe Advantage
              </div>
              <h2 style={{ color: '#fff', marginBottom: '1.5rem' }}>
                Better care, less paperwork.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem', lineHeight: 1.8, marginBottom: '2.5rem' }}>
                DScribe removes the everyday hassles around paper documentation so clinicians can focus on patients, not files. The impact is felt across every department.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  'Records complete and accessible within seconds of writing',
                  'Nursing time saved on filing, scanning, and searching',
                  'Paper and storage costs reduced by up to 60%',
                  'NABH and insurance audit compliance built in',
                  'Discharge process accelerated by 50%',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: 20, height: 20, background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                    }}>
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem' }}>{item}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-lg" style={{ marginTop: '2.5rem' }} onClick={() => navigate('/app')}>
                See It in Action
                <ArrowRight size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Annual Savings', value: 'Rs 25L+', sub: 'For a 100-bed hospital', color: 'var(--primary-400)' },
                { label: 'Productivity Gain', value: '35%', sub: 'Across clinical teams', color: 'var(--accent-teal)' },
                { label: 'Discharge Time', value: '-50%', sub: 'Reduction in delay', color: 'var(--accent-green)' },
                { label: 'Paper Costs', value: '-60%', sub: 'Operational savings', color: 'var(--accent-amber)' },
              ].map((m, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-2xl)',
                  padding: '2rem',
                  textAlign: 'center',
                  transition: 'all 200ms',
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: m.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', margin: '0.5rem 0 0.25rem' }}>{m.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="text-center" style={{ maxWidth: 560, margin: '0 auto 4rem' }}>
            <div className="badge badge-success" style={{ marginBottom: '1rem' }}>
              Testimonials
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Trusted by leading hospitals</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '1.0625rem' }}>
              See what medical leaders across India say about their experience with DScribe.
            </p>
          </div>
          <div className="grid grid-3" style={{ gap: '1.5rem' }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{
                background: '#fff', border: '1.5px solid var(--gray-100)',
                borderRadius: 'var(--radius-2xl)', padding: '2rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 200ms',
              }}>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem' }}>
                  {Array(t.rating).fill(0).map((_, j) => (
                    <Star key={j} size={14} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <p style={{ color: 'var(--gray-600)', fontSize: '0.9375rem', lineHeight: 1.8, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.875rem', fontWeight: 700, color: '#fff',
                  }}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="text-center" style={{ maxWidth: 560, margin: '0 auto 4rem' }}>
            <div className="badge badge-primary" style={{ marginBottom: '1rem' }}>
              FAQ
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Answers to your questions</h2>
          </div>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {FAQS.map((f, i) => <FAQItem key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{
        background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))',
        color: '#fff',
        textAlign: 'center',
      }}>
        <div className="container">
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Ready to go paperless?</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.125rem', marginBottom: '2.5rem', maxWidth: 480, margin: '0 auto 2.5rem' }}>
            Join 500+ hospitals that have eliminated paper documentation with DScribe.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-xl"
              style={{ background: '#fff', color: 'var(--primary-700)', fontWeight: 700 }}
              onClick={() => navigate('/app')}
            >
              Launch Demo System
              <ArrowRight size={18} />
            </button>
            <button
              className="btn btn-xl"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '2px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}
              onClick={() => navigate('/app')}
            >
              Book a Discovery Call
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: 'var(--gray-900)', color: 'rgba(255,255,255,0.5)', padding: '3rem 0 2rem' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 34, height: 34,
                  background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={16} color="#fff" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#fff' }}>DScribe</span>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.75, maxWidth: 280 }}>
                Helping hospitals eliminate paper documentation and focus on what matters most — patient care.
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'How It Works', 'Pricing', 'Integrations', 'Changelog'] },
              { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Press', 'Partners'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security', 'NABH Compliance'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>{col.title}</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {col.links.map(l => (
                    <li key={l}><a href="#" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.45)', transition: 'color 150ms' }}
                      onMouseEnter={e => e.target.style.color = '#fff'}
                      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}
                    >{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem' }}>2026 DScribe. All rights reserved.</span>
            <span style={{ fontSize: '0.8125rem' }}>contact@dscribe.in</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

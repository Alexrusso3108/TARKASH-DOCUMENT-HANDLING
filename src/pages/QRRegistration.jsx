import { useState, useEffect, useCallback, useRef } from 'react'
import {
  QrCode, Search, Download, Printer, Camera, CheckCircle, Loader,
  User, Phone, Droplets, Hash, Shield, RefreshCw, Copy, Eye,
  X, AlertTriangle, Scan, FileText, Plus, Monitor, Wifi, Activity
} from 'lucide-react'
import { api } from '../api'
import { Html5Qrcode } from 'html5-qrcode'

// ─── QR code via free public API (no npm install needed) ──────────────────────
function qrUrl(data, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&ecc=M&margin=2&color=1a1a2e`
}

// ─── Encode patient data into QR payload (ABDM-inspired) ─────────────────────
function buildQrPayload(patient) {
  return JSON.stringify({
    uhid:      patient.id,
    name:      patient.name,
    age:       patient.age,
    gender:    patient.gender?.[0] || '',
    bg:        patient.blood_group,
    abha:      patient.abha_id || '',
    phone:     patient.phone || '',
    dept:      patient.department || '',
    emergency: patient.guardian_phone || '',
    issued:    new Date().toISOString().slice(0, 10),
    hospital:  'CURA HOSPITAL',
  })
}

// ─── Badge Colors ─────────────────────────────────────────────────────────────
const BG_COLORS = {
  'A+': '#dc2626', 'A-': '#dc2626', 'B+': '#2563eb', 'B-': '#2563eb',
  'O+': '#16a34a', 'O-': '#16a34a', 'AB+': '#9333ea', 'AB-': '#9333ea',
}

// ─── Patient QR Card (printable) ─────────────────────────────────────────────
function PatientCard({ patient, size = 'full' }) {
  const payload = buildQrPayload(patient)
  const qr = qrUrl(payload, size === 'thumb' ? 80 : 140)
  const compact = size === 'thumb'

  return (
    <div id={`qr-card-${patient.id}`} style={{
      background: '#fff',
      borderRadius: compact ? 10 : 16,
      border: '1.5px solid #e2e8f0',
      overflow: 'hidden',
      width: compact ? 220 : '100%',
      fontFamily: 'Inter, sans-serif',
      boxShadow: compact ? 'none' : '0 4px 20px rgba(0,0,0,0.08)',
    }}>
      {/* Card Header — hospital brand strip */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0d9488 100%)',
        padding: compact ? '0.5rem 0.75rem' : '0.875rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: compact ? '0.625rem' : '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            SwasthyaSync HMS
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: compact ? '0.5rem' : '0.65rem', marginTop: 1 }}>
            CURA Hospital — Patient Identity Card
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: compact ? '0.5rem' : '0.65rem', color: '#fff', fontWeight: 700 }}>
          UHID CARD
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: compact ? '0.625rem' : '1.125rem', display: 'flex', gap: compact ? '0.5rem' : '1rem', alignItems: 'flex-start' }}>
        {/* QR */}
        <div style={{ flexShrink: 0 }}>
          <img src={qr} alt="Patient QR" style={{ width: compact ? 80 : 140, height: compact ? 80 : 140, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          <div style={{ textAlign: 'center', fontSize: '0.5rem', color: '#94a3b8', marginTop: 3 }}>Scan for records</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: compact ? '0.75rem' : '1.0625rem', color: '#1e293b', lineHeight: 1.2, marginBottom: compact ? '0.25rem' : '0.5rem' }}>
            {patient.name}
          </div>

          {[
            ['UHID', patient.id],
            ['Age / Gender', `${patient.age} Yrs / ${patient.gender}`],
            ['Blood Group', patient.blood_group],
            ['Mobile', patient.phone || '—'],
            ['Department', patient.department || '—'],
            ['ABHA ID', patient.abha_id || 'Not Linked'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: compact ? '0.25rem' : '0.375rem', marginBottom: compact ? '0.2rem' : '0.3rem' }}>
              <span style={{ fontSize: compact ? '0.5rem' : '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: compact ? 44 : 68, flexShrink: 0, paddingTop: 1 }}>{k}</span>
              <span style={{ fontSize: compact ? '0.6rem' : '0.8rem', fontWeight: 600, color: '#334155', wordBreak: 'break-all' }}>
                {k === 'Blood Group' ? (
                  <span style={{ background: BG_COLORS[v] || '#64748b', color: '#fff', fontSize: compact ? '0.5rem' : '0.65rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: 999 }}>{v}</span>
                ) : v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency strip */}
      {patient.guardian_phone && (
        <div style={{ background: '#fef2f2', borderTop: '1px solid #fee2e2', padding: compact ? '0.3rem 0.625rem' : '0.5rem 1.125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Phone size={compact ? 9 : 11} color="#ef4444" />
          <span style={{ fontSize: compact ? '0.5rem' : '0.65rem', color: '#ef4444', fontWeight: 700 }}>EMERGENCY CONTACT: {patient.guardian_name ? `${patient.guardian_name} — ` : ''}{patient.guardian_phone}</span>
        </div>
      )}

      {/* ABDM strip */}
      <div style={{ background: '#f0f9ff', borderTop: '1px solid #e0f2fe', padding: compact ? '0.25rem 0.625rem' : '0.375rem 1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: compact ? '0.45rem' : '0.58rem', color: '#0369a1', fontWeight: 600 }}>
          🇮🇳 Ayushman Bharat Digital Mission (ABDM) Compliant
        </span>
        <span style={{ fontSize: compact ? '0.45rem' : '0.55rem', color: '#94a3b8' }}>
          Issued: {new Date().toLocaleDateString('en-IN')}
        </span>
      </div>
    </div>
  )
}

// ─── Scanner Panel ────────────────────────────────────────────────────────────
function ScannerPanel({ patients, onFound }) {
  const [manualUhid, setManualUhid] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [camSupported] = useState(() => !!(navigator.mediaDevices?.getUserMedia))
  const [cameraActive, setCameraActive] = useState(false)
  const scannerRef = useRef(null)

  const lookup = useCallback((uhid) => {
    const p = patients.find(pt => pt.id === uhid.trim() || pt.id?.toLowerCase() === uhid.trim().toLowerCase())
    if (p) { onFound(p); setError(null) }
    else setError(`No patient found with UHID: "${uhid.trim()}"`)
  }, [patients, onFound])

  const handleManual = () => {
    if (!manualUhid.trim()) return
    lookup(manualUhid)
  }

  const startCamera = () => {
    setError(null)
    setCameraActive(true)
    
    // Allow DOM to render the qr-reader div before initializing
    setTimeout(async () => {
      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('qr-reader')
        }
        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, disableFlip: false },
          (decodedText) => {
            stopCamera()
            try { const parsed = JSON.parse(decodedText); lookup(parsed.uhid || parsed.id) }
            catch { lookup(decodedText) }
          },
          (errorMsg) => { /* ignore normal scan errors */ }
        )
      } catch (e) {
        setError('Camera access denied or could not be initiated.')
        setCameraActive(false)
      }
    }, 100)
  }

  const stopCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear()
        setCameraActive(false)
      }).catch(() => setCameraActive(false))
    } else {
      setCameraActive(false)
    }
  }

  useEffect(() => () => stopCamera(), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Camera Scanner */}
      <div style={{ background: '#0f172a', borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', minHeight: cameraActive ? 280 : 220 }}>
        <div id="qr-reader" style={{ width: '100%', display: cameraActive ? 'block' : 'none' }}></div>
        
        {cameraActive && (
          <div style={{ position: 'absolute', bottom: '0.875rem', left: 0, right: 0, textAlign: 'center', zIndex: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff', padding: '0.375rem 1rem', borderRadius: 999, fontSize: '0.8rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 1s infinite' }} />
              Scanning…
            </div>
            <button onClick={stopCamera} style={{ display: 'block', margin: '0.5rem auto 0', background: 'rgba(239,68,68,0.8)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer' }}>Stop</button>
          </div>
        )}

        {!cameraActive && (
          <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={36} color="#818cf8" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>QR / Barcode Scanner</div>
              <div style={{ color: '#64748b', fontSize: '0.8125rem', maxWidth: 260 }}>
                Point camera at a patient QR card or ABHA card to instantly load their records
              </div>
            </div>
            {camSupported
              ? <button onClick={startCamera} style={{ background: 'linear-gradient(135deg, #6366f1, #0d9488)', color: '#fff', border: 'none', borderRadius: 'var(--radius-lg)', padding: '0.625rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
                  <Camera size={15} /> Activate Camera
                </button>
              : <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>Camera not available in this browser</div>
            }
          </div>
        )}
      </div>

      {/* Manual UHID */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.625rem' }}>
          Manual UHID Lookup
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Hash size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Enter UHID or scan barcode here…"
              value={manualUhid} onChange={e => setManualUhid(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManual()} />
          </div>
          <button className="btn btn-primary" onClick={handleManual} disabled={!manualUhid.trim()}>
            <Search size={14} /> Look Up
          </button>
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            <AlertTriangle size={13} /> {error}
          </div>
        )}
      </div>

      {/* ABHA note */}
      <div style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(13,148,136,0.06))', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 'var(--radius-lg)', padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wifi size={15} color="#0ea5e9" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0369a1', marginBottom: '0.25rem' }}>ABDM "Scan & Share" Compatible</div>
          <div style={{ fontSize: '0.775rem', color: '#0ea5e9', lineHeight: 1.5 }}>
            Patients with an ABHA card can scan the hospital's QR code to auto-share their profile. This system supports both SwasthyaSync QR cards and ABHA-issued QR codes.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Hospital QR (for ABDM Scan & Share) ─────────────────────────────────────
function HospitalQRPanel({ hospitalInfo }) {
  const hospitalPayload = JSON.stringify({
    type: 'HOSPITAL_REGISTRATION',
    hfr_id: hospitalInfo.hfrId || 'HFR-MH-2024-CURA',
    name: hospitalInfo.name || 'Cura Hospital',
    city: hospitalInfo.city || 'Mumbai',
    state: 'Maharashtra',
    redirect: 'https://swasthyasync.hospital/register',
  })

  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--gray-100)', padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>Hospital Registration QR</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>Display at OPD counter for Scan & Share</div>
      </div>
      <div style={{ display: 'inline-block', padding: '1.25rem', background: '#f8fafc', borderRadius: 16, border: '2px solid var(--primary-100)', marginBottom: '1rem' }}>
        <img src={qrUrl(hospitalPayload, 180)} alt="Hospital QR" style={{ width: 180, height: 180, display: 'block' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm"><Download size={13} /> Download</button>
        <button className="btn btn-secondary btn-sm"><Printer size={13} /> Print A4</button>
      </div>
      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
        HFR ID: <strong>HFR-MH-2024-CURA</strong> · ABDM Enabled
      </div>
    </div>
  )
}

// ─── Bulk QR Panel ────────────────────────────────────────────────────────────
function BulkQRPanel({ patients }) {
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')

  const depts = ['All', ...Array.from(new Set(patients.map(p => p.department).filter(Boolean)))]

  useEffect(() => {
    setFiltered(patients.filter(p =>
      (deptFilter === 'All' || p.department === deptFilter) &&
      (!search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.id?.includes(search))
    ).slice(0, 30))
  }, [patients, search, deptFilter])

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search patients…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input form-select" style={{ width: 200 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          <Printer size={13} /> Print All Cards
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
          <QrCode size={28} style={{ marginBottom: '0.75rem' }} />
          <div style={{ fontWeight: 600 }}>No patients found</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {filtered.map(p => (
            <div key={p.id}>
              <PatientCard patient={p} size="thumb" />
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '0.25rem 0.5rem' }}>
                  <Download size={11} /> Save
                </button>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '0.25rem 0.5rem' }}>
                  <Printer size={11} /> Print
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {patients.length > 30 && (
        <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8125rem', marginTop: '1rem' }}>
          Showing first 30 — use search / filter to narrow down
        </div>
      )}
    </div>
  )
}

// ─── Main QR Registration Page ────────────────────────────────────────────────
export default function QRRegistration() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [tab, setTab] = useState('generate') // generate | scan | bulk | hospital

  // Load patients
  useEffect(() => {
    api.getPatients().then(p => { setPatients(p); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // Live search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const q = search.toLowerCase()
    setSearchResults(patients.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.abha_id?.includes(q)
    ).slice(0, 8))
  }, [search, patients])

  const handleFound = (patient) => {
    setSelected(patient)
    setSearch('')
    setSearchResults([])
    setTab('generate')
  }

  const copyUhid = () => { if (selected) navigator.clipboard?.writeText(selected.id).then(() => {}) }

  const TABS = [
    { id: 'generate', label: 'Generate Card', icon: QrCode },
    { id: 'scan',     label: 'QR Scanner',    icon: Scan },
    { id: 'bulk',     label: 'Bulk Print',    icon: Printer },
    { id: 'hospital', label: 'Hospital QR',   icon: Monitor },
  ]

  return (
    <div className="animate-fadeInUp">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary-500), #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={20} color="#fff" />
            </span>
            QR Registration
          </h1>
          <p className="page-subtitle">
            ABDM "Scan & Share" · UHID QR Cards · Quick OPD Check-in
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setLoading(true); api.getPatients().then(p => { setPatients(p); setLoading(false) }).catch(() => setLoading(false)) }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ABDM info banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.07), rgba(13,148,136,0.07))', border: '1px solid rgba(14,165,233,0.18)', borderRadius: 'var(--radius-xl)', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={20} color="#0ea5e9" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.9rem' }}>🇮🇳 Ayushman Bharat Digital Mission (ABDM) Compatible</div>
            <div style={{ fontSize: '0.8rem', color: '#0ea5e9', marginTop: '0.2rem' }}>QR cards are ABHA-linked and compliant with NHA's Scan & Share standard for OPD registration</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[['Total Patients', loading ? '…' : patients.length], ['ABHA Linked', loading ? '…' : patients.filter(p => p.abha_id).length], ['QR Ready', loading ? '…' : patients.length]].map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0369a1', lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: '0.7rem', color: '#0ea5e9', marginTop: '0.2rem' }}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Layout: left search + tabs, right card preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left panel */}
        <div>
          {/* Patient Search */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Find Patient</h5>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Search by UHID, name, ABHA ID or mobile</span>
            </div>
            <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" style={{ paddingLeft: '2.5rem', fontSize: '0.9375rem' }}
                  placeholder="Start typing patient name, UHID or ABHA ID…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {/* Search dropdown */}
              {searchResults.length > 0 && (
                <div style={{ marginTop: '0.625rem', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                  {searchResults.map(p => (
                    <div key={p.id} onClick={() => handleFound(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1.125rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)', transition: 'background 150ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                        {p.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '0.1rem' }}>
                          UHID: {p.id} · {p.age} yrs · {p.gender}
                          {p.abha_id && <span style={{ marginLeft: '0.5rem', color: '#0ea5e9', fontWeight: 600 }}>⚡ ABHA</span>}
                        </div>
                      </div>
                      <span style={{ background: BG_COLORS[p.blood_group] || '#64748b', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '0.1rem 0.375rem', borderRadius: 999 }}>{p.blood_group}</span>
                    </div>
                  ))}
                </div>
              )}

              {search && searchResults.length === 0 && !loading && (
                <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem', color: 'var(--gray-400)', textAlign: 'center', padding: '0.75rem' }}>
                  No patients found for "{search}"
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="card">
            <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '0.875rem 0.5rem', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontSize: '0.78rem', fontWeight: tab === id ? 700 : 500, color: tab === id ? 'var(--primary-600)' : 'var(--gray-500)', borderBottom: `2.5px solid ${tab === id ? 'var(--primary-500)' : 'transparent'}`, transition: 'all 150ms', whiteSpace: 'nowrap' }}>
                  <Icon size={13} />
                  <span className="hide-sm">{label}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: '1.5rem' }}>

              {/* Generate tab */}
              {tab === 'generate' && (
                <div>
                  {!selected ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <QrCode size={40} style={{ color: 'var(--gray-200)', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
                      <div style={{ fontWeight: 700, color: 'var(--gray-600)', fontSize: '1rem', marginBottom: '0.375rem' }}>No patient selected</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>Search and select a patient above to generate their QR card</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          QR Card Preview — {selected.name}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={copyUhid} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>
                            <Copy size={11} /> Copy UHID
                          </button>
                          <button onClick={() => window.print()} className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem' }}>
                            <Printer size={11} /> Print Card
                          </button>
                        </div>
                      </div>
                      <PatientCard patient={selected} size="full" />

                      {/* QR data info */}
                      <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-100)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>QR Contains</div>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
                          {['UHID', 'Full Name', 'Age & Gender', 'Blood Group', 'ABHA ID', 'Mobile', 'Department', 'Emergency Contact', 'Hospital', 'Issue Date'].map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.775rem', color: 'var(--gray-600)' }}>
                              <CheckCircle size={11} color="#10b981" /> {f}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick actions */}
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => window.print()}>
                          <Printer size={14} /> Print QR Card
                        </button>
                        <button className="btn btn-secondary">
                          <Download size={14} /> Download PNG
                        </button>
                        <button className="btn btn-secondary" onClick={() => setSelected(null)} style={{ marginLeft: 'auto' }}>
                          <X size={14} /> Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scanner tab */}
              {tab === 'scan' && <ScannerPanel patients={patients} onFound={handleFound} />}

              {/* Bulk tab */}
              {tab === 'bulk' && <BulkQRPanel patients={patients} />}

              {/* Hospital QR tab */}
              {tab === 'hospital' && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <HospitalQRPanel hospitalInfo={{ name: 'Cura Hospital', city: 'Mumbai', hfrId: 'HFR-MH-2024-CURA' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column — recent patients quick-select */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '5rem' }}>
            <div className="card-header">
              <h5 style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.875rem' }}>Recent Patients</h5>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Click to select</span>
            </div>
            <div style={{ maxHeight: 520, overflow: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}><Loader size={18} className="spin" style={{ display: 'inline-block' }} /></div>
              ) : patients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>No patients registered yet</div>
              ) : patients.slice(0, 20).map(p => (
                <div key={p.id} onClick={() => { setSelected(p); setTab('generate') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem',
                    cursor: 'pointer', borderBottom: '1px solid var(--gray-50)',
                    background: selected?.id === p.id ? 'var(--primary-50)' : '#fff',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => { if (selected?.id !== p.id) e.currentTarget.style.background = 'var(--gray-50)' }}
                  onMouseLeave={e => { if (selected?.id !== p.id) e.currentTarget.style.background = '#fff' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: selected?.id === p.id ? 'var(--primary-200)' : 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                    {p.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', marginTop: '0.1rem', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace' }}>{p.id}</span>
                      {p.abha_id && <span style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '0.6rem' }}>ABHA</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                    <span style={{ background: BG_COLORS[p.blood_group] || '#64748b', color: '#fff', fontSize: '0.55rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: 999 }}>{p.blood_group}</span>
                    {selected?.id === p.id && <CheckCircle size={13} color="var(--primary-500)" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

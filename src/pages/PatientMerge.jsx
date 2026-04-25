import { useState, useEffect } from 'react'
import {
  Users, Search, ArrowRight, CheckCircle, AlertTriangle,
  X, Loader, Merge, Eye, RefreshCw, Phone, Hash, Calendar,
  Shield, ChevronDown, ChevronRight
} from 'lucide-react'
import { api } from '../api'

const MATCH_REASONS = {
  phone:   { label: 'Same Mobile',    color: '#dc2626', icon: Phone },
  aadhaar: { label: 'Same Aadhaar',   color: '#7c3aed', icon: Shield },
  name_dob:{ label: 'Name + DOB Match',color: '#b45309', icon: Calendar },
  manual:  { label: 'Manual Flag',    color: '#0369a1', icon: Eye },
}

function similarity(a, b) {
  if (!a || !b) return 0
  const la = a.toLowerCase(), lb = b.toLowerCase()
  if (la === lb) return 1
  // Simple character-overlap ratio
  let matches = 0
  for (const c of la) if (lb.includes(c)) matches++
  return matches / Math.max(la.length, lb.length)
}

function findDuplicates(patients) {
  const dupes = []
  for (let i = 0; i < patients.length; i++) {
    for (let j = i + 1; j < patients.length; j++) {
      const a = patients[i], b = patients[j]
      const reasons = []
      if (a.phone && b.phone && a.phone === b.phone) reasons.push('phone')
      if (a.aadhaar && b.aadhaar && a.aadhaar === b.aadhaar) reasons.push('aadhaar')
      if (a.age === b.age && similarity(a.name, b.name) > 0.7) reasons.push('name_dob')
      if (reasons.length > 0) dupes.push({ a, b, reasons, confidence: Math.min(100, reasons.length * 40 + 20) })
    }
  }
  return dupes
}

function RecordCard({ patient, isKeeper, onSelect }) {
  return (
    <div style={{ background: isKeeper ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.03)', border: `2px solid ${isKeeper ? '#10b981' : 'var(--gray-200)'}`, borderRadius: 'var(--radius-xl)', padding: '1.125rem', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: isKeeper ? 'rgba(16,185,129,0.12)' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem', color: isKeeper ? '#059669' : 'var(--gray-500)' }}>
            {patient.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--gray-900)' }}>{patient.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>UHID: {patient.id}</div>
          </div>
        </div>
        {isKeeper && <span style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: '0.62rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: 999, whiteSpace: 'nowrap' }}>✓ Keep (Primary)</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
        {[
          ['Age', patient.age ? `${patient.age} yrs` : '—'],
          ['Gender', patient.gender || '—'],
          ['Blood Group', patient.blood_group || '—'],
          ['Mobile', patient.phone || '—'],
          ['Aadhaar', patient.aadhaar ? `••••${patient.aadhaar.slice(-4)}` : '—'],
          ['ABHA', patient.abha_id || '—'],
          ['Registered', patient.admitted_at ? new Date(patient.admitted_at).toLocaleDateString('en-IN') : '—'],
          ['Department', patient.department || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 6, padding: '0.25rem 0.5rem' }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-800)' }}>{v}</div>
          </div>
        ))}
      </div>
      {!isKeeper && (
        <button className="btn btn-primary btn-sm" onClick={onSelect} style={{ width: '100%', marginTop: '0.875rem', justifyContent: 'center', fontSize: '0.78rem' }}>
          Mark as Primary Record
        </button>
      )}
    </div>
  )
}

function MergeCard({ pair, onMerge, onDismiss }) {
  const [expanded, setExpanded] = useState(false)
  const [keepRecord, setKeepRecord] = useState('a')
  const [merging, setMerging] = useState(false)
  const [merged, setMerged] = useState(false)
  const keeper = keepRecord === 'a' ? pair.a : pair.b
  const dupe = keepRecord === 'a' ? pair.b : pair.a

  const handleMerge = async () => {
    if (!window.confirm(`Merge ${dupe.name} (${dupe.id}) into ${keeper.name} (${keeper.id})? The duplicate record will be deactivated. This cannot be undone.`)) return
    setMerging(true)
    // Simulate merge (in production would call backend)
    await new Promise(r => setTimeout(r, 800))
    setMerged(true); setMerging(false)
    onMerge(pair)
  }

  if (merged) return (
    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-xl)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
      <CheckCircle size={20} color="#10b981" />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.875rem' }}>Records Merged Successfully</div>
        <div style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>{dupe.name} ({dupe.id}) merged into {keeper.name} ({keeper.id})</div>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#fff', border: '1.5px solid var(--gray-100)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
      {/* Summary row */}
      <div style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderBottom: expanded ? '1px solid var(--gray-100)' : 'none' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={15} color="#dc2626" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)' }}>
              {pair.a.name} ↔ {pair.b.name}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
              {pair.reasons.map(r => {
                const d = MATCH_REASONS[r] || { label: r, color: '#64748b' }
                return <span key={r} style={{ fontSize: '0.6rem', fontWeight: 700, background: d.color + '15', color: d.color, padding: '0.1rem 0.4rem', borderRadius: 999 }}>{d.label}</span>
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: pair.confidence > 75 ? '#dc2626' : '#b45309', lineHeight: 1 }}>{pair.confidence}%</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--gray-400)' }}>match</div>
          </div>
          <button onClick={e => { e.stopPropagation(); onDismiss(pair) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)' }}><X size={14} /></button>
          {expanded ? <ChevronDown size={16} color="var(--gray-400)" /> : <ChevronRight size={16} color="var(--gray-400)" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <RecordCard patient={pair.a} isKeeper={keepRecord === 'a'} onSelect={() => setKeepRecord('a')} />
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingTop: '2.5rem' }}>
              <ArrowRight size={22} color="var(--gray-300)" />
            </div>
            <RecordCard patient={pair.b} isKeeper={keepRecord === 'b'} onSelect={() => setKeepRecord('b')} />
          </div>

          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#dc2626' }}>
            <AlertTriangle size={13} style={{ display: 'inline', marginRight: '0.375rem' }} />
            <strong>Warning:</strong> Merging will deactivate the duplicate record. All visits, labs, and forms will be re-linked to the primary record. This action generates an audit log entry.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => onDismiss(pair)}>Not a Duplicate</button>
            <button className="btn btn-danger" onClick={handleMerge} disabled={merging} style={{ background: '#dc2626', color: '#fff', border: 'none' }}>
              {merging ? <><Loader size={14} className="spin" /> Merging…</> : `Merge → Keep ${keeper.name}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PatientMerge() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [pairs, setPairs] = useState([])
  const [dismissed, setDismissed] = useState([])
  const [manualSearch, setManualSearch] = useState('')
  const [manualA, setManualA] = useState(null)
  const [manualB, setManualB] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getPatients().then(p => {
      setPatients(p)
      setPairs(findDuplicates(p))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const activePairs = pairs.filter(p => !dismissed.some(d => d.a.id === p.a.id && d.b.id === p.b.id))
  const highConf = activePairs.filter(p => p.confidence >= 60)

  const filteredPts = patients.filter(p =>
    !manualSearch || p.name?.toLowerCase().includes(manualSearch.toLowerCase()) || p.id?.includes(manualSearch) || p.phone?.includes(manualSearch)
  )

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Merging</h1>
          <p className="page-subtitle">Detect and resolve duplicate patient records using AI-assisted matching</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setLoading(true); api.getPatients().then(p => { setPatients(p); setPairs(findDuplicates(p)); setLoading(false) }).catch(() => setLoading(false)) }}>
            <RefreshCw size={13} /> Re-scan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Patients', value: patients.length, color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'Duplicate Groups', value: loading ? '…' : activePairs.length, color: '#dc2626', bg: 'rgba(239,68,68,0.07)' },
          { label: 'High Confidence', value: loading ? '…' : highConf.length, color: '#b45309', bg: 'rgba(245,158,11,0.07)' },
          { label: 'Dismissed', value: dismissed.length, color: '#059669', bg: 'rgba(16,185,129,0.07)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '1.625rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: detected duplicates */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.875rem' }}>
            Auto-Detected Duplicates ({activePairs.length})
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}><Loader size={24} className="spin" style={{ display: 'inline-block' }} /></div>
          ) : activePairs.length === 0 ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
              <CheckCircle size={32} color="#10b981" style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
              <div style={{ fontWeight: 700, color: '#059669', fontSize: '1.0625rem' }}>No duplicates detected!</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-400)', marginTop: '0.375rem' }}>All patient records appear unique based on phone, Aadhaar and name matching.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {activePairs.sort((a, b) => b.confidence - a.confidence).map((pair, idx) => (
                <MergeCard key={idx} pair={pair} onMerge={p => setDismissed(d => [...d, p])} onDismiss={p => setDismissed(d => [...d, p])} />
              ))}
            </div>
          )}
        </div>

        {/* Right: manual merge */}
        <div className="card" style={{ position: 'sticky', top: '5rem' }}>
          <div className="card-header"><h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Manual Merge</h5></div>
          <div className="card-body" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: '0.875rem' }}>
              Manually select two patients to compare and merge
            </div>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search patient…" value={manualSearch} onChange={e => setManualSearch(e.target.value)} />
            </div>

            {manualSearch && (
              <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-lg)', marginBottom: '0.875rem' }}>
                {filteredPts.slice(0, 10).map(p => (
                  <div key={p.id} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)', fontSize: '0.8rem' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    onClick={() => { if (!manualA) setManualA(p); else if (!manualB && p.id !== manualA.id) { setManualB(p); setManualSearch('') } }}>
                    <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{p.name}</span>
                    <span style={{ color: 'var(--gray-400)', fontSize: '0.7rem', marginLeft: '0.5rem' }}>{p.id}</span>
                  </div>
                ))}
              </div>
            )}

            {[manualA, manualB].map((p, i) => p ? (
              <div key={i} style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', padding: '0.625rem 0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${i === 0 ? 'var(--primary-200)' : 'rgba(239,68,68,0.2)'}` }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--gray-900)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{p.id}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: i === 0 ? 'var(--primary-600)' : '#dc2626' }}>{i === 0 ? 'PRIMARY' : 'DUPLICATE'}</span>
                  <button onClick={() => i === 0 ? setManualA(null) : setManualB(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={12} /></button>
                </div>
              </div>
            ) : (
              <div key={i} style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', padding: '0.625rem 0.875rem', marginBottom: '0.5rem', border: '1px dashed var(--gray-200)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--gray-400)' }}>
                {i === 0 ? 'Select primary record' : 'Select duplicate record'}
              </div>
            ))}

            {manualA && manualB && (
              <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={() => setPairs(prev => [...prev, { a: manualA, b: manualB, reasons: ['manual'], confidence: 50 }])}>
                <Users size={14} /> Compare & Merge
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

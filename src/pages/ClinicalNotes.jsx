import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, FileText, Clock, CheckCircle, X, Save, Eye, Loader } from 'lucide-react'
import { api } from '../api'

const PRIORITY_STYLES = {
  critical: { bg: 'rgba(239,68,68,0.12)', color: '#dc2626', border: 'rgba(239,68,68,0.3)', label: 'Critical' },
  high: { bg: 'rgba(245,158,11,0.1)', color: '#b45309', border: 'rgba(245,158,11,0.3)', label: 'High' },
  medium: { bg: 'rgba(99,102,241,0.1)', color: '#4338ca', border: 'rgba(99,102,241,0.2)', label: 'Medium' },
  low: { bg: 'rgba(16,185,129,0.08)', color: '#059669', border: 'rgba(16,185,129,0.2)', label: 'Low' },
}

const NOTE_TYPES = ['Progress Note', 'Discharge Summary', 'Consultation Note', 'Post-Op Note', 'Nursing Note', 'ICU Note', 'Obstetric Note']

function NewNoteModal({ onClose, onSave, doctors, patients }) {
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', note_type: 'Progress Note', priority: 'medium', content: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.patient_id || !form.doctor_id || !form.content) {
      setError('Please select a patient, doctor and enter note content.')
      return
    }
    setSaving(true); setError(null)
    try {
      const note = await api.createNote(form)
      onSave(note); onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>New Clinical Note</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Document and digitize a clinical note</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠ {error}
            </div>
          )}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Patient*</label>
              <select className="form-input form-select" value={form.patient_id} onChange={e => h('patient_id', e.target.value)}>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Attending Doctor*</label>
              <select className="form-input form-select" value={form.doctor_id} onChange={e => h('doctor_id', e.target.value)}>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Note Type</label>
              <select className="form-input form-select" value={form.note_type} onChange={e => h('note_type', e.target.value)}>
                {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={e => h('priority', e.target.value)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Clinical Note Content*</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Enter clinical observations, findings, plan, prescriptions..."
              value={form.content}
              onChange={e => h('content', e.target.value)}
              style={{ minHeight: 180, fontSize: '0.9rem', lineHeight: 1.75 }}
            />
          </div>
          <div className="alert alert-info" style={{ marginTop: '1rem' }}>
            <FileText size={16} />
            Note will be instantly digitized and made available to all authorized care team members.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <CheckCircle size={14} />} Digitize Note
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClinicalNotes() {
  const [notes, setNotes] = useState([])
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [expandedNote, setExpandedNote] = useState(null)

  const fetchNotes = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (priorityFilter !== 'All') params.priority = priorityFilter
      if (search) params.search = search
      const data = await api.getNotes(params)
      setNotes(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, statusFilter, priorityFilter])

  useEffect(() => {
    const t = setTimeout(fetchNotes, 300)
    return () => clearTimeout(t)
  }, [fetchNotes])

  useEffect(() => {
    api.getDoctors().then(setDoctors).catch(() => { })
    api.getPatients().then(setPatients).catch(() => { })
  }, [])

  const handleSave = (note) => setNotes(n => [note, ...n])

  const handleDigitize = async (id) => {
    try {
      const updated = await api.updateNote(id, { status: 'digitized' })
      setNotes(n => n.map(note => note.id === id ? { ...note, ...updated } : note))
    } catch (e) { alert('Failed to update: ' + e.message) }
  }

  const pendingCount = notes.filter(n => n.status === 'pending').length

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clinical Notes</h1>
          <p className="page-subtitle">Digitize and manage patient clinical documentation</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Clinical Note
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Notes', val: notes.length, color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'Pending Digitization', val: pendingCount, color: '#b45309', bg: 'rgba(245,158,11,0.06)' },
          { label: 'Digitized', val: notes.filter(n => n.status === 'digitized').length, color: '#059669', bg: 'rgba(16,185,129,0.06)' },
          { label: 'Critical Priority', val: notes.filter(n => n.priority === 'critical').length, color: '#dc2626', bg: 'rgba(239,68,68,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search notes by patient or doctor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'pending', 'digitized'].map(f => (
            <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }} onClick={() => setStatusFilter(f)}>{f === 'All' ? 'All Status' : f === 'pending' ? 'Pending' : 'Digitized'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'critical', 'high', 'medium', 'low'].map(f => (
            <button key={f} className={`btn btn-sm ${priorityFilter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }} onClick={() => setPriorityFilter(f)}>{f === 'All' ? 'All Priority' : f}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      {/* Notes List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}><Loader size={24} className="spin" style={{ display: 'inline-block' }} /></div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>No clinical notes found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {notes.map(note => (
            <div key={note.id} style={{
              background: '#fff', border: `1.5px solid ${note.status === 'pending' ? (PRIORITY_STYLES[note.priority]?.border || 'var(--gray-200)') : 'var(--gray-100)'}`,
              borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              boxShadow: note.status === 'pending' ? `0 2px 12px ${PRIORITY_STYLES[note.priority]?.bg || 'transparent'}` : 'var(--shadow-sm)',
            }}>
              <div style={{ padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: 4, height: 48, borderRadius: 2, background: PRIORITY_STYLES[note.priority]?.color || 'var(--gray-300)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)' }}>{note.patient_name}</div>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--gray-400)' }}>{note.patient_id}</span>
                    <span style={{ background: PRIORITY_STYLES[note.priority]?.bg, color: PRIORITY_STYLES[note.priority]?.color, fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {PRIORITY_STYLES[note.priority]?.label || note.priority}
                    </span>
                    <span style={{ background: note.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: note.status === 'pending' ? '#b45309' : '#059669', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {note.status === 'pending' ? 'Pending' : 'Digitized'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
                    {note.note_type} · {note.doctor_name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expandedNote === note.id ? 'unset' : 2, WebkitBoxOrient: 'vertical' }}>
                    {note.content}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    <Clock size={11} />
                    {note.created_at ? new Date(note.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--gray-400)' }}>#{note.id}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                      onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}>
                      <Eye size={12} />
                      {expandedNote === note.id ? 'Collapse' : 'Expand'}
                    </button>
                    {note.status === 'pending' && (
                      <button className="btn btn-primary btn-sm" style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }}
                        onClick={() => handleDigitize(note.id)}>
                        <CheckCircle size={12} /> Digitize
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NewNoteModal onClose={() => setShowModal(false)} onSave={handleSave} doctors={doctors} patients={patients} />}
    </div>
  )
}

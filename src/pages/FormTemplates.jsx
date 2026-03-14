import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { BASE_URL, SERVER_URL } from '../api'
import {
  Upload, Search, Trash2, FileText, Plus, Tag, Eye, X,
  CheckCircle, AlertCircle, Loader, FolderOpen
} from 'lucide-react'

const CATEGORIES = ['General', 'Consent', 'Assessment', 'Discharge', 'Nursing', 'ICU', 'OT', 'Emergency']

const CATEGORY_COLORS = {
  General: { bg: 'var(--gray-100)', color: 'var(--gray-600)' },
  Consent: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  Assessment: { bg: 'rgba(99,102,241,0.1)', color: '#4338ca' },
  Discharge: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  Nursing: { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
  ICU: { bg: 'rgba(239,68,68,0.12)', color: '#b91c1c' },
  OT: { bg: 'rgba(13,148,136,0.1)', color: '#0d9488' },
  Emergency: { bg: 'rgba(239,68,68,0.15)', color: '#dc2626' },
}

function UploadModal({ onClose, onUploaded, token }) {
  const [form, setForm] = useState({ name: '', description: '', category: 'General' })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (f) => {
    if (!f) return
    if (f.type !== 'application/pdf') { setError('Only PDF files are supported.'); return }
    if (f.size > 50 * 1024 * 1024) { setError('File must be under 50MB.'); return }
    setFile(f)
    if (!form.name) setForm(prev => ({ ...prev, name: f.name.replace('.pdf', '') }))
    setError(null)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file) { setError('Please select a PDF file.'); return }
    if (!form.name.trim()) { setError('Please enter a form name.'); return }
    setUploading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      fd.append('name', form.name)
      fd.append('description', form.description)
      fd.append('category', form.category)
      const res = await fetch(`${BASE_URL}/forms/templates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const template = await res.json()
      onUploaded(template)
      onClose()
    } catch (e) { setError(e.message) } finally { setUploading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Upload Form Template</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Upload a hospital PDF form to make it available for patients</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <AlertCircle size={15} />{error}
            </div>
          )}

          {/* Drop Zone */}
          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--primary-500)' : file ? '#10b981' : 'var(--gray-200)'}`,
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--primary-50)' : file ? 'rgba(16,185,129,0.04)' : 'var(--gray-50)',
              transition: 'all 200ms',
              marginBottom: '1.5rem',
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.875rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={24} color="#10b981" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: '0.9375rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{(file.size / 1024).toFixed(1)} KB · PDF</div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Upload size={24} color="var(--primary-500)" />
                </div>
                <div style={{ fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.375rem' }}>Drag & drop your PDF here</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>or click to browse · Max 50MB</div>
              </div>
            )}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Form Name*</label>
              <input className="form-input" placeholder="e.g. Patient Consent Form" value={form.name} onChange={e => h('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input form-select" value={form.category} onChange={e => h('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Brief description of the form..." value={form.description} onChange={e => h('description', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
            {uploading ? <><Loader size={14} className="spin" /> Uploading...</> : <><Upload size={14} /> Upload Form</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FormTemplates() {
  const { token } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (categoryFilter !== 'All') params.category = categoryFilter
      if (search) params.search = search
      const url = new URLSearchParams(params)
      const res = await fetch(`${BASE_URL}/forms/templates?${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load templates')
      setTemplates(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, categoryFilter, token])

  useEffect(() => {
    const t = setTimeout(fetchTemplates, 300)
    return () => clearTimeout(t)
  }, [fetchTemplates])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this form template? All patient form instances will also be deleted.')) return
    setDeleting(id)
    try {
      await fetch(`${BASE_URL}/forms/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setTemplates(t => t.filter(x => x.id !== id))
    } catch (e) { alert('Delete failed: ' + e.message) } finally { setDeleting(null) }
  }

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Form Templates</h1>
          <p className="page-subtitle">Upload and manage hospital PDF forms for patient use</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Upload size={15} /> Upload Form
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Forms', val: templates.length, color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'Consent Forms', val: templates.filter(t => t.category === 'Consent').length, color: '#dc2626', bg: 'rgba(239,68,68,0.06)' },
          { label: 'Assessment Forms', val: templates.filter(t => t.category === 'Assessment').length, color: '#4338ca', bg: 'rgba(99,102,241,0.06)' },
          { label: 'Nursing Forms', val: templates.filter(t => t.category === 'Nursing').length, color: '#b45309', bg: 'rgba(245,158,11,0.06)' },
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
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search forms..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['All', ...CATEGORIES].map(f => (
            <button key={f} className={`btn btn-sm ${categoryFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCategoryFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      {/* Templates Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--gray-400)' }}><Loader size={24} className="spin" style={{ display: 'inline-block' }} /></div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <FolderOpen size={36} color="var(--gray-300)" />
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>No forms yet</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-400)', marginBottom: '1.5rem' }}>Upload your first hospital form template to get started</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Upload size={15} /> Upload Form</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* Decorative corner */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'linear-gradient(225deg, var(--primary-50) 0%, transparent 60%)', borderRadius: 'var(--radius-xl)' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--primary-500), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={22} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '0.25rem', lineHeight: 1.3 }}>{t.name}</div>
                  <span style={{ ...CATEGORY_COLORS[t.category], fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t.category}
                  </span>
                </div>
              </div>

              {t.description && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '1rem', lineHeight: 1.5 }}>{t.description}</p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <span>{t.file_name}</span>
                {t.file_size && <span>· {(t.file_size / 1024).toFixed(0)} KB</span>}
                <span>· Added {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>

              <div className="divider" style={{ margin: '0 0 1rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={`${SERVER_URL}${t.file_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                >
                  <Eye size={13} /> Preview
                </a>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ padding: '0.375rem 0.75rem' }}
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id}
                >
                  {deleting === t.id ? <Loader size={12} className="spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <UploadModal onClose={() => setShowModal(false)} onUploaded={t => setTemplates(prev => [t, ...prev])} token={token} />}
    </div>
  )
}

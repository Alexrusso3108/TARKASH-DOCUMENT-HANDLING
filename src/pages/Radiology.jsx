import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plus, X, Loader, UploadCloud, FileText, ExternalLink, CheckCircle, ScanLine } from 'lucide-react'
import { api, SERVER_URL } from '../api'

const STATUS_STYLES = {
  'Scheduled':   { bg: 'var(--gray-100)',             color: 'var(--gray-600)',  label: 'Scheduled' },
  'In Progress': { bg: 'rgba(99,102,241,0.1)',         color: '#4338ca',         label: 'In Progress' },
  'Reported':    { bg: 'rgba(16,185,129,0.1)',         color: '#059669',         label: 'Report Ready' },
  'Cancelled':   { bg: 'rgba(239,68,68,0.08)',         color: '#dc2626',         label: 'Cancelled' },
}

const PRIORITY_STYLES = {
  'Stat':    { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'STAT' },
  'Urgent':  { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Urgent' },
  'Routine': { bg: 'var(--gray-100)',       color: 'var(--gray-600)', label: 'Routine' },
}

const MODALITIES = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'PET Scan', 'Mammography', 'Fluoroscopy', 'Nuclear Medicine', 'DEXA Scan', 'Angiography']
const BODY_PARTS = ['Chest', 'Abdomen', 'Pelvis', 'Head', 'Brain', 'Spine', 'Neck', 'Shoulder', 'Knee', 'Hip', 'Hand', 'Foot', 'Whole Body', 'Cardiac', 'Vascular']

// ─── PDF Upload Button ────────────────────────────────────────────────────────
function PdfUploadBtn({ orderId, existingPath, onUploaded, uploadFn }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const inputRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Only PDF files are allowed'); return }
    setUploading(true); setError(null)
    try {
      const updated = await uploadFn(orderId, file)
      onUploaded(updated)
    } catch (err) { setError(err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
      {existingPath ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a
            href={`${SERVER_URL}${existingPath}`} target="_blank" rel="noopener noreferrer"
            className="btn btn-sm btn-teal" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
          >
            <ExternalLink size={13} /> View Report PDF
          </a>
          <button
            className="btn btn-sm btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
            onClick={() => inputRef.current.click()} disabled={uploading}
          >
            {uploading ? <Loader size={12} className="spin" /> : <UploadCloud size={12} />}
            {uploading ? 'Uploading…' : 'Replace PDF'}
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => inputRef.current.click()} disabled={uploading}
        >
          {uploading ? <Loader size={14} className="spin" /> : <UploadCloud size={14} />}
          {uploading ? 'Uploading…' : 'Upload Radiology Report PDF'}
        </button>
      )}
      {error && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem' }}>⚠ {error}</div>}
    </div>
  )
}

// ─── New Radiology Order Modal ────────────────────────────────────────────────
function NewRadiologyModal({ onClose, onSave, patients, doctors }) {
  const [form, setForm] = useState({
    patient_id: '', study_type: '', modality: '', body_part: '',
    requested_by: '', priority: 'Routine', clinical_indication: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.patient_id || !form.study_type) { setError('Patient and study type are required.'); return }
    setSaving(true); setError(null)
    try { const order = await api.createRadiology(form); onSave(order); onClose() }
    catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>New Radiology Order</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Order an imaging study for a patient</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              ⚠ {error}
            </div>
          )}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Patient *</label>
              <select className="form-input form-select" value={form.patient_id} onChange={e => h('patient_id', e.target.value)}>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Requested By</label>
              <select className="form-input form-select" value={form.requested_by} onChange={e => h('requested_by', e.target.value)}>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Study Type *</label>
              <input className="form-input" placeholder="e.g. Chest X-Ray, Brain MRI, Abdomen CT" value={form.study_type} onChange={e => h('study_type', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Modality</label>
              <select className="form-input form-select" value={form.modality} onChange={e => h('modality', e.target.value)}>
                <option value="">Select modality</option>
                {MODALITIES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Body Part / Region</label>
              <select className="form-input form-select" value={form.body_part} onChange={e => h('body_part', e.target.value)}>
                <option value="">Select body part</option>
                {BODY_PARTS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={e => h('priority', e.target.value)}>
                <option>Routine</option><option>Urgent</option><option>Stat</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Clinical Indication</label>
              <textarea className="form-input form-textarea" placeholder="Reason for the imaging study, clinical symptoms, working diagnosis..." value={form.clinical_indication} onChange={e => h('clinical_indication', e.target.value)} style={{ minHeight: 80 }} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <ScanLine size={14} />} Order Study
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────
function OrderPanel({ order, onClose, onUpdated }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ width: 500, background: '#fff', height: '100%', overflow: 'auto', boxShadow: 'var(--shadow-2xl)', padding: '2rem', animation: 'slideInLeft 250ms ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Radiology Order</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
              #{order.id} · {order.ordered_at ? new Date(order.ordered_at).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Patient card */}
        <div style={{ background: 'linear-gradient(135deg, var(--primary-50), rgba(99,102,241,0.04))', borderRadius: 'var(--radius-xl)', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--primary-100)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '0.25rem' }}>{order.patient_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{order.patient_code}</div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ background: PRIORITY_STYLES[order.priority]?.bg, color: PRIORITY_STYLES[order.priority]?.color, fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 999, textTransform: 'uppercase' }}>
              {order.priority}
            </span>
            <span style={{ background: STATUS_STYLES[order.status]?.bg || 'var(--gray-100)', color: STATUS_STYLES[order.status]?.color || 'var(--gray-600)', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 999 }}>
              {STATUS_STYLES[order.status]?.label || order.status}
            </span>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            ['Study Type',           order.study_type],
            ['Modality',             order.modality],
            ['Body Part / Region',   order.body_part],
            ['Requested By',         order.requested_by],
            ['Ordered At',           order.ordered_at   ? new Date(order.ordered_at).toLocaleString('en-IN')   : '—'],
            ['Completed At',         order.completed_at ? new Date(order.completed_at).toLocaleString('en-IN') : 'Pending'],
          ].map(([label, val]) => (
            <div key={label} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '1rem' }}>
              <span style={{ width: 140, fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{val || '—'}</span>
            </div>
          ))}
          {order.clinical_indication && (
            <div style={{ padding: '0.875rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-150)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clinical Indication</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{order.clinical_indication}</div>
            </div>
          )}
          {order.radiologist_notes && (
            <div style={{ padding: '0.875rem', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Radiologist Notes</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{order.radiologist_notes}</div>
            </div>
          )}
        </div>

        {/* PDF Upload */}
        <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={14} /> Radiology Report PDF
          </div>
          <PdfUploadBtn
            orderId={order.id}
            existingPath={order.result_pdf_path}
            uploadFn={api.uploadRadiologyResult}
            onUploaded={onUpdated}
          />
        </div>

        <button className="btn btn-secondary w-full" style={{ marginTop: '1.5rem', justifyContent: 'center' }} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Radiology() {
  const [orders,       setOrders]       = useState([])
  const [doctors,      setDoctors]      = useState([])
  const [patients,     setPatients]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal,    setShowModal]    = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (search) params.search = search
      const data = await api.getRadiology(params)
      setOrders(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  useEffect(() => {
    api.getDoctors().then(setDoctors).catch(() => {})
    api.getPatients().then(setPatients).catch(() => {})
  }, [])

  const handleSave    = (o) => setOrders(prev => [o, ...prev])
  const handleUpdated = (updated) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
    setSelectedOrder(prev => prev ? { ...prev, ...updated } : prev)
  }

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Radiology</h1>
          <p className="page-subtitle">Imaging orders, study tracking, and report management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Radiology Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Orders',   val: orders.length,                                        color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'Scheduled',      val: orders.filter(o => o.status === 'Scheduled').length,   color: '#b45309',         bg: 'rgba(245,158,11,0.06)' },
          { label: 'In Progress',    val: orders.filter(o => o.status === 'In Progress').length,  color: '#4338ca',         bg: 'rgba(99,102,241,0.08)' },
          { label: 'Reports Ready',  val: orders.filter(o => o.status === 'Reported').length,    color: '#059669',         bg: 'rgba(16,185,129,0.06)' },
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
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by patient or study type..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Scheduled', 'In Progress', 'Reported', 'Cancelled'].map(f => (
            <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(f)}>
              {STATUS_STYLES[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      {/* Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Patient</th><th>Study Type</th><th>Modality</th>
                <th>Body Part</th><th>Requested By</th><th>Priority</th><th>Ordered At</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}><Loader size={20} className="spin" style={{ display: 'inline-block' }} /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No radiology orders found</td></tr>
              ) : orders.map(o => (
                <tr key={o.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>#{o.id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{o.patient_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{o.patient_code}</div>
                  </td>
                  <td>
                    <span style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--primary-700)', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                      {o.study_type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{o.modality || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{o.body_part || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--gray-600)' }}>{o.requested_by || '—'}</td>
                  <td>
                    <span style={{ background: PRIORITY_STYLES[o.priority]?.bg || 'var(--gray-100)', color: PRIORITY_STYLES[o.priority]?.color || 'var(--gray-600)', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: 999, letterSpacing: '0.06em' }}>
                      {PRIORITY_STYLES[o.priority]?.label || o.priority}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                    {o.ordered_at ? new Date(o.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td>
                    <span style={{ background: STATUS_STYLES[o.status]?.bg || 'var(--gray-100)', color: STATUS_STYLES[o.status]?.color || 'var(--gray-600)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                      {STATUS_STYLES[o.status]?.label || o.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }} onClick={() => setSelectedOrder(o)}>
                      {o.result_pdf_path ? <><FileText size={11} /> PDF</> : o.status === 'Reported' ? <><CheckCircle size={11} /> Report</> : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Showing {orders.length} radiology orders</span>
        </div>
      </div>

      {selectedOrder && <OrderPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdated={handleUpdated} />}
      {showModal && <NewRadiologyModal onClose={() => setShowModal(false)} onSave={handleSave} patients={patients} doctors={doctors} />}
    </div>
  )
}

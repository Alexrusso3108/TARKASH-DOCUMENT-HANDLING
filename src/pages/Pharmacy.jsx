import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, AlertTriangle, X, Loader } from 'lucide-react'
import { api } from '../api'

const STATUS_STYLES = {
  'In Stock': { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'In Stock' },
  'Low Stock': { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Low Stock' },
  'Out of Stock': { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Out of Stock' },
}

function AddDrugModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', category: '', stock: '', unit: 'tabs', price: '', expiry: '', manufacturer: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.stock) { setError('Drug name and stock are required.'); return }
    setSaving(true); setError(null)
    try {
      const drug = await api.createPharmacy({ ...form, stock: parseInt(form.stock), price: parseFloat(form.price) || 0 })
      onSave(drug); onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Add Drug to Inventory</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Add a new drug line to the pharmacy inventory</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {[
              ['name', 'Drug Name*', 'text', 'e.g. Paracetamol 500mg'],
              ['category', 'Category', 'text', 'e.g. Analgesic'],
              ['manufacturer', 'Manufacturer', 'text', 'e.g. Cipla'],
              ['expiry', 'Expiry Date', 'date', ''],
            ].map(([key, label, type, ph]) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input className="form-input" type={type} placeholder={ph} value={form[key]} onChange={e => h(key, e.target.value)} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Stock Quantity*</label>
              <input className="form-input" type="number" placeholder="e.g. 500" value={form.stock} onChange={e => h('stock', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-input form-select" value={form.unit} onChange={e => h('unit', e.target.value)}>
                {['tabs', 'caps', 'vials', 'bottles', 'sachets', 'units'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Price per unit (Rs)</label>
              <input className="form-input" type="number" placeholder="e.g. 12.50" value={form.price} onChange={e => h('price', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <Plus size={14} />} Add Drug
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Pharmacy() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (search) params.search = search
      const data = await api.getPharmacy(params)
      setInventory(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const handleSave = (drug) => setInventory(inv => [drug, ...inv])

  const lowStock = inventory.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length
  const activePrescriptions = inventory.filter(i => i.status === 'In Stock').length

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pharmacy</h1>
          <p className="page-subtitle">Drug inventory management</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {lowStock > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 0.875rem', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 600 }}>
              <AlertTriangle size={14} /> {lowStock} drug{lowStock > 1 ? 's' : ''} low/out of stock
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Drug</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Drug Lines', val: inventory.length, color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'In Stock', val: activePrescriptions, color: '#059669', bg: 'rgba(16,185,129,0.06)' },
          { label: 'Low Stock', val: inventory.filter(i => i.status === 'Low Stock').length, color: '#b45309', bg: 'rgba(245,158,11,0.06)' },
          { label: 'Out of Stock', val: inventory.filter(i => i.status === 'Out of Stock').length, color: '#dc2626', bg: 'rgba(239,68,68,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search drug name or category..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(f => (
            <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Drug Name</th><th>Category</th><th>Manufacturer</th><th>Stock</th><th>Unit</th><th>Price (Rs)</th><th>Expiry</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                  <Loader size={20} className="spin" style={{ display: 'inline-block' }} />
                </td></tr>
              ) : inventory.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No drugs found in inventory</td></tr>
              ) : inventory.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      {(item.status === 'Low Stock' || item.status === 'Out of Stock') && <AlertTriangle size={13} color="#ef4444" />}
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: item.status !== 'In Stock' ? '#dc2626' : 'var(--gray-800)' }}>{item.name}</span>
                    </div>
                  </td>
                  <td><span style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4 }}>{item.category || '—'}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{item.manufacturer || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ flex: 1, maxWidth: 80 }}>
                        <div className="progress-bar" style={{ height: 4 }}>
                          <div className="progress-bar-fill" style={{ width: `${Math.min((item.stock / 3000) * 100, 100)}%`, background: item.status !== 'In Stock' ? '#ef4444' : 'var(--primary-500)' }} />
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: item.status !== 'In Stock' ? '#dc2626' : 'var(--gray-800)', fontSize: '0.875rem' }}>
                        {item.stock?.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{item.unit}</td>
                  <td style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>{item.price != null ? Number(item.price).toFixed(2) : '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{item.expiry ? new Date(item.expiry).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</td>
                  <td>
                    <span style={{ background: STATUS_STYLES[item.status]?.bg || 'var(--gray-100)', color: STATUS_STYLES[item.status]?.color || 'var(--gray-600)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>
                      {STATUS_STYLES[item.status]?.label || item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Showing {inventory.length} drug lines</span>
        </div>
      </div>

      {showModal && <AddDrugModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  )
}

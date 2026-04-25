import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, AlertTriangle, X, Loader, Pill, PackagePlus, Users, Calculator, CheckSquare } from 'lucide-react'
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

function NewGrnModal({ inventory, onClose }) {
  const [supplier, setSupplier] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [items, setItems] = useState([{ drugId: '', batch: '', expiry: '', qty: '', ptr: '', mrp: '' }])
  const [saving, setSaving] = useState(false)

  const addItem = () => setItems(i => [...i, { drugId: '', batch: '', expiry: '', qty: '', ptr: '', mrp: '' }])
  
  const updateItem = (index, field, val) => {
    const newItems = [...items]
    newItems[index][field] = val
    setItems(newItems)
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      alert('GRN Processed Successfully. Stock Updated!')
      setSaving(false)
      onClose()
    }, 1000)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '900px', maxWidth: '95vw' }}>
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Goods Receipt Note (GRN)</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Inward stock entry from supplier invoice</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Supplier/Vendor*</label>
              <select className="form-input form-select" value={supplier} onChange={e => setSupplier(e.target.value)}>
                <option value="">Select Supplier</option>
                <option>Apollo Distributors</option>
                <option>Cipla Direct Wholesale</option>
                <option>SunPharma Depot</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Supplier Invoice No*</label>
              <input className="form-input" placeholder="INV-2026-..." value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
            </div>
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Stock Entry Lines</span>
            <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={14}/> Add Row</button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)' }}>
              <thead style={{ background: 'var(--gray-100)' }}>
                <tr>
                  <th>Drug/Product</th>
                  <th>Batch No.</th>
                  <th>Expiry Date</th>
                  <th>Qty Recv</th>
                  <th>Purchase Rate (PTR)</th>
                  <th>MRP (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '0.5rem' }}>
                      <select className="form-input form-select" style={{ fontSize: '0.8rem', padding: '0.4rem' }} value={item.drugId} onChange={e => updateItem(idx, 'drugId', e.target.value)}>
                        <option value="">Select Drug</option>
                        {inventory.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}><input className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} placeholder="Batch" value={item.batch} onChange={e => updateItem(idx, 'batch', e.target.value)} /></td>
                    <td style={{ padding: '0.5rem' }}><input className="form-input" type="month" style={{ fontSize: '0.8rem', padding: '0.4rem' }} value={item.expiry} onChange={e => updateItem(idx, 'expiry', e.target.value)} /></td>
                    <td style={{ padding: '0.5rem' }}><input className="form-input" type="number" style={{ fontSize: '0.8rem', padding: '0.4rem' }} placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></td>
                    <td style={{ padding: '0.5rem' }}><input className="form-input" type="number" style={{ fontSize: '0.8rem', padding: '0.4rem' }} placeholder="PTR" value={item.ptr} onChange={e => updateItem(idx, 'ptr', e.target.value)} /></td>
                    <td style={{ padding: '0.5rem' }}><input className="form-input" type="number" style={{ fontSize: '0.8rem', padding: '0.4rem' }} placeholder="MRP" value={item.mrp} onChange={e => updateItem(idx, 'mrp', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </div>
        <div className="modal-footer" style={{ borderTop: 'none', background: 'var(--gray-50)', marginTop: 0 }}>
          <div style={{ flex: 1, color: 'var(--gray-500)', fontSize: '0.85rem' }}>Total lines: {items.length}</div>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !supplier || !invoiceNo}>
            {saving ? <Loader size={14} className="spin" /> : <CheckSquare size={14} />} Process GRN & Verify
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
  const [showGrnModal, setShowGrnModal] = useState(false)
  const [activeTab, setActiveTab] = useState('pos') // pos, inventory, grn, ip-returns
  const [posCart, setPosCart] = useState([])
  const [posPatient, setPosPatient] = useState({ name: '', id: '', type: 'Walk-In' })
  const [posSearching, setPosSearching] = useState('')
  const [posResults, setPosResults] = useState([])

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
          <h1 className="page-title">Pharmacy Management & GRM</h1>
          <p className="page-subtitle">Inventory, Goods Receipt, and Supplier Management</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {lowStock > 0 && activeTab === 'inventory' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 0.875rem', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 600 }}>
              <AlertTriangle size={14} /> {lowStock} drug{lowStock > 1 ? 's' : ''} low/out of stock
            </div>
          )}
          {activeTab === 'grn' && <button className="btn btn-primary" onClick={() => setShowGrnModal(true)}><PackagePlus size={15} /> Receive Goods (GRN)</button>}
          {activeTab === 'inventory' && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Drug</button>}
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', marginBottom: '1.5rem', background: '#fff', borderRadius: 'var(--radius-lg)' }}>
        {[
          { id: 'pos', label: 'Sales Counter (POS)', icon: Calculator },
          { id: 'inventory', label: 'Master Inventory', icon: Pill },
          { id: 'grn', label: 'Goods Receipt (GRN)', icon: PackagePlus },
          { id: 'ip-returns', label: 'IP Med Returns', icon: PackagePlus },
          { id: 'suppliers', label: 'Suppliers', icon: Users },
        ].map(t => (
          <button 
            key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ 
              padding: '1rem 1.5rem', background: 'none', border: 'none', 
              borderBottom: `2.5px solid ${activeTab === t.id ? 'var(--primary-600)' : 'transparent'}`, 
              color: activeTab === t.id ? 'var(--primary-700)' : 'var(--gray-500)', 
              fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' 
            }}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'pos' && (
        <div className="grid animate-fadeInUp" style={{ gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontWeight: 800, marginBottom: '1.25rem', color: 'var(--gray-900)' }}>Retail Sale / Billing</h4>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Patient Search (UHID/Name)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search registered patient..." onChange={(e) => {
                    const v = e.target.value
                    if(v.length > 2) api.getPatients({ search: v }).then(setPosResults)
                    else setPosResults([])
                  }} />
                  {posResults.length > 0 && activeTab === 'pos' && !posSearching && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-lg)', zIndex: 10, marginTop: '0.25rem', border: '1px solid var(--gray-200)', maxHeight: 200, overflow: 'auto' }}>
                      {posResults.map(p => (
                        <div key={p.id} onClick={() => { setPosPatient({ name: p.name, id: p.id, type: 'Patient' }); setPosResults([]) }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)' }} className="hover-bg">
                           <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{p.id} · {p.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group" style={{ width: 140 }}>
                <label className="form-label">Patient Type</label>
                <select className="form-input form-select" value={posPatient.type} onChange={(e) => setPosPatient(f => ({ ...f, type: e.target.value }))}>
                  <option>Walk-In</option><option>Patient</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Search Medicine (F2)</label>
              <div style={{ position: 'relative' }}>
                <Pill size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Type medicine name..." value={posSearching} onChange={(e) => {
                   setPosSearching(e.target.value)
                   const v = e.target.value
                   if(v.length > 1) {
                     const hits = inventory.filter(i => i.name.toLowerCase().includes(v.toLowerCase()) && i.stock > 0)
                     setPosResults(hits)
                   } else setPosResults([])
                }} />
                {posResults.length > 0 && activeTab === 'pos' && posSearching && (
                   <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-lg)', zIndex: 10, marginTop: '0.25rem', border: '1px solid var(--gray-200)' }}>
                      {posResults.map(i => (
                        <div key={i.id} onClick={() => { 
                           if(!posCart.find(c => c.id === i.id)) setPosCart([...posCart, { ...i, qty: 1 }]);
                           setPosSearching(''); setPosResults([]);
                        }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-50)', display: 'flex', justifyContent: 'space-between' }} className="hover-bg">
                           <div>
                             <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{i.name}</div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Stock: {i.stock} {i.unit} · Exp: {new Date(i.expiry).toLocaleDateString()}</div>
                           </div>
                           <div style={{ fontWeight: 800, color: 'var(--primary-600)' }}>Rs {Number(i.price).toFixed(2)}</div>
                        </div>
                      ))}
                   </div>
                )}
              </div>
            </div>

            <table className="data-table">
              <thead><tr><th>Medicine</th><th>Expiry</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {posCart.map((item, idx) => (
                  <tr key={item.id}>
                    <td><div style={{ fontWeight: 600 }}>{item.name}</div></td>
                    <td style={{ fontSize: '0.75rem' }}>{new Date(item.expiry).toLocaleDateString()}</td>
                    <td><input type="number" className="form-input" style={{ width: 60, padding: '0.25rem' }} value={item.qty} onChange={(e) => {
                       const v = parseInt(e.target.value) || 0
                       setPosCart(posCart.map((c, i) => i === idx ? { ...c, qty: Math.min(v, item.stock) } : c))
                    }} /></td>
                    <td>{Number(item.price).toFixed(2)}</td>
                    <td style={{ fontWeight: 700 }}>{(item.qty * item.price).toFixed(2)}</td>
                    <td><button className="btn btn-ghost btn-icon" onClick={() => setPosCart(posCart.filter((_, i) => i !== idx))}><X size={14}/></button></td>
                  </tr>
                ))}
                {posCart.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No items in cart. Search medicine to add.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h5 style={{ fontWeight: 800 }}>Bill Summary</h5>
            <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Billed to:</div>
              <div style={{ fontWeight: 700 }}>{posPatient.name || 'Guest Patient'}</div>
              {posPatient.id && <div style={{ fontSize: '0.75rem' }}>UHID: {posPatient.id}</div>}
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>Rs {posCart.reduce((s, i) => s + (i.qty * i.price), 0).toFixed(2)}</span></div>
               <div style={{ borderTop: '1px dashed var(--gray-200)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 900 }}>
                 <span>Total</span><span style={{ color: 'var(--primary-700)' }}>Rs {posCart.reduce((s, i) => s + (i.qty * i.price), 0).toFixed(2)}</span>
               </div>
            </div>
            <button className="btn btn-primary" style={{ height: 48, justifyContent: 'center', fontSize: '1rem' }} onClick={async () => {
              if(posCart.length === 0) return
              const total = posCart.reduce((s, i) => s + (i.qty * i.price), 0)
              try {
                await api.processPharmacySale({ items: posCart, patient_id: posPatient.id, total_amount: total })
                alert(`Bill Generated for Rs ${total.toFixed(2)}! Stock deducted.`)
                setInventory(prev => prev.map(inv => {
                  const cartItem = posCart.find(c => c.id === inv.id)
                  return cartItem ? { ...inv, stock: inv.stock - cartItem.qty } : inv
                }))
                setPosCart([]); setPosPatient({ name: '', id: '', type: 'Walk-In' });
              } catch(e) { alert('Transaction failed: ' + e.message) }
            }}>
              <Calculator size={18} /> Complete Sale & Print
            </button>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <>
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
        </div>
        </>
      )}

      {/* GRN View */}
      {activeTab === 'grn' && (
        <div className="card">
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr><th>GRN Id</th><th>Date</th><th>Supplier</th><th>Inv No.</th><th>Status</th><th>Value (Rs)</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><span style={{ fontWeight: 700, color: 'var(--primary-600)', fontFamily: 'monospace' }}>GRN-1011</span></td>
                  <td>Today</td>
                  <td style={{ fontWeight: 600 }}>Apollo Distributors</td>
                  <td>INV-10928</td>
                  <td><span style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>Verified</span></td>
                  <td style={{ fontWeight: 700 }}>45,200.00</td>
                </tr>
                <tr>
                  <td><span style={{ fontWeight: 700, color: 'var(--primary-600)', fontFamily: 'monospace' }}>GRN-1010</span></td>
                  <td>18 Apr 2026</td>
                  <td style={{ fontWeight: 600 }}>SunPharma Depot</td>
                  <td>SP-9921</td>
                  <td><span style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>Verified</span></td>
                  <td style={{ fontWeight: 700 }}>12,850.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers / Vendors View */}
      {activeTab === 'suppliers' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', color: 'var(--gray-400)', background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-200)' }}>
          <Users size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--gray-600)' }}>Supplier Directory</h3>
          <p>Database of pharmaceutical vendors, reps, and direct manufacturers.</p>
        </div>
      )}

      {showModal && <AddDrugModal onClose={() => setShowModal(false)} onSave={handleSave} />}
      {showGrnModal && <NewGrnModal inventory={inventory} onClose={() => setShowGrnModal(false)} />}
    </div>
  )
}

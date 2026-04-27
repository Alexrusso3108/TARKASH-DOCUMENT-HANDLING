import { useState, useEffect } from 'react'
import { PackageOpen, Search, Plus, AlertTriangle, Edit3, X, Save } from 'lucide-react'
import { api } from '../api'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editPrice, setEditPrice] = useState('')

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const data = await api.getPharmacy()
      setItems(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const handleUpdatePrice = async (id) => {
    try {
      await api.updatePharmacy(id, { price: Number(editPrice) })
      setEditingItem(null)
      fetchInventory()
    } catch (e) {
      alert("Failed to update price: " + e.message)
    }
  }

  const handleAddStock = async (form) => {
    try {
      await api.createPharmacy(form)
      setShowAddModal(false)
      fetchInventory()
    } catch (e) {
      alert("Failed to add stock: " + e.message)
    }
  }

  const filteredItems = items.filter(i => 
    i.category !== 'BLOOD_BANK' && (
      i.name.toLowerCase().includes(search.toLowerCase()) || 
      i.category?.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toString().includes(search)
    )
  )

  const lowStockCount = items.filter(i => i.status === 'Low Stock').length
  const criticalStockCount = items.filter(i => i.status === 'Out of Stock' || i.stock < 10).length

  return (
    <div className="animate-fadeInUp">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Hospital Inventory & Central Stores</h1>
          <p className="page-subtitle">Track consumables, surgical items, ward supplies, and set prices</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchInventory}>Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Stock</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Items Tracked', val: items.length, color: 'var(--gray-800)', bg: 'var(--gray-50)' },
          { label: 'Low Stock Alerts', val: lowStockCount, color: '#b45309', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Critical Stock', val: criticalStockCount, color: '#dc2626', bg: 'rgba(239,68,68,0.08)' },
          { label: 'Total Value', val: `₹${items.reduce((s,i) => s + (Number(i.stock)*Number(i.price||0)), 0).toLocaleString()}`, color: '#059669', bg: 'rgba(16,185,129,0.08)' }
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid var(--gray-200)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '0.5rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Stock Ledger</h3>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input form-sm" style={{ paddingLeft: '2.25rem' }} placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Stock Level</th>
                <th>Price per Unit (₹)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading inventory...</td></tr> : null}
              {!loading && filteredItems.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No items found</td></tr> : null}
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: 'var(--gray-500)', fontSize: '0.85rem' }}>INV-{item.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{item.name}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 4, fontWeight: 600 }}>{item.category || 'General'}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: item.status.includes('Out') || item.stock < 10 ? '#dc2626' : (item.status.includes('Low') ? '#b45309' : 'var(--gray-900)') }}>{item.stock}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{item.unit}</div>
                  </td>
                  <td>
                    {editingItem === item.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input 
                          type="number" className="form-input form-sm" 
                          style={{ width: 80 }} 
                          value={editPrice} 
                          onChange={e => setEditPrice(e.target.value)} 
                          autoFocus
                        />
                        <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleUpdatePrice(item.id)}><Save size={14}/></button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingItem(null)}><X size={14}/></button>
                      </div>
                    ) : (
                      <div style={{ fontWeight: 600 }}>
                        ₹{Number(item.price || 0).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                      background: item.status === 'In Stock' ? 'rgba(16,185,129,0.1)' : (item.status === 'Low Stock' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'),
                      color: item.status === 'In Stock' ? '#059669' : (item.status === 'Low Stock' ? '#b45309' : '#dc2626')
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    {editingItem !== item.id && (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditingItem(item.id); setEditPrice(item.price || 0) }}>
                        <Edit3 size={14} style={{ marginRight: 4 }} /> Edit Price
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <AddStockModal onClose={() => setShowAddModal(false)} onSave={handleAddStock} />}
    </div>
  )
}

function AddStockModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', category: 'Consumables', stock: '', unit: 'Pieces', price: '' })

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h4>Add New Stock Item</h4>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Item Name</label>
            <input className="form-input" placeholder="e.g. Surgical Gloves" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {['Consumables', 'Fluids', 'Testing', 'Surgical', 'Pharmacy', 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit Type</label>
              <select className="form-input form-select" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                {['Pieces', 'Pairs', 'Bottles', 'Packets', 'Rolls', 'Boxes', 'Vials', 'Strips'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Initial Stock</label>
              <input type="number" className="form-input" placeholder="e.g. 500" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Price per Unit (₹)</label>
              <input type="number" className="form-input" placeholder="e.g. 150" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!form.name || !form.stock) return alert('Name and Stock are required')
            onSave(form)
          }}>Save Item</button>
        </div>
      </div>
    </div>
  )
}

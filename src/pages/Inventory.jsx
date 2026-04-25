import { useState } from 'react'
import { PackageOpen, Search, Plus, Filter, AlertTriangle, ArrowRightCircle } from 'lucide-react'

export default function Inventory() {
  const [items, setItems] = useState([
    { id: 'INV-101', name: 'Surgical Gloves (Size 7)', category: 'Consumables', stock: 1200, unit: 'Pairs', reorder_level: 500, status: 'In Stock' },
    { id: 'INV-102', name: 'IV Fluids (NS 500ml)', category: 'Fluids', stock: 150, unit: 'Bottles', reorder_level: 200, status: 'Low Stock' },
    { id: 'INV-103', name: 'Syringes (5ml)', category: 'Consumables', stock: 3500, unit: 'Pieces', reorder_level: 1000, status: 'In Stock' },
    { id: 'INV-104', name: 'ECG Electrodes', category: 'Testing', stock: 20, unit: 'Packets', reorder_level: 50, status: 'Critical Stock' },
    { id: 'INV-105', name: 'Cotton Rolls (500g)', category: 'Consumables', stock: 45, unit: 'Rolls', reorder_level: 100, status: 'Low Stock' },
  ])

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hospital Inventory & Central Stores</h1>
          <p className="page-subtitle">Track consumables, surgical items, and ward supplies</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm">PO Status</button>
          <button className="btn btn-primary"><Plus size={14} /> Add Stock</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Items Tracked', val: items.length, color: 'var(--gray-800)', bg: 'var(--gray-50)' },
          { label: 'Low Stock Alerts', val: items.filter(i => i.status.includes('Low')).length, color: '#b45309', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Critical Stock', val: items.filter(i => i.status.includes('Critical')).length, color: '#dc2626', bg: 'rgba(239,68,68,0.08)' },
          { label: 'Pending Requisitions', val: 12, color: '#4338ca', bg: 'rgba(99,102,241,0.08)' }
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid var(--gray-200)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Stock Ledger</h3>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input form-sm" style={{ paddingLeft: '2.25rem' }} placeholder="Search items..." />
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
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: 'var(--gray-500)', fontSize: '0.85rem' }}>{item.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{item.name}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 4, fontWeight: 600 }}>{item.category}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: item.status.includes('Critical') ? '#dc2626' : (item.status.includes('Low') ? '#b45309' : 'var(--gray-900)') }}>{item.stock}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{item.unit}</div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{item.reorder_level}</td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                      background: item.status === 'In Stock' ? 'rgba(16,185,129,0.1)' : (item.status === 'Low Stock' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'),
                      color: item.status === 'In Stock' ? '#059669' : (item.status === 'Low Stock' ? '#b45309' : '#dc2626')
                    }}>
                      {item.status.includes('Stock') ? item.status : <><AlertTriangle size={10} style={{display:'inline'}}/> Critical</>}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" title="Issue Stock"><ArrowRightCircle size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

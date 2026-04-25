import { useState, useEffect } from 'react'
import {
  BedDouble, Users, Activity, Plus, FileText, CheckCircle, Search, 
  Filter, AlertTriangle, BatteryMedium, BatteryCharging, HeartPulse, Loader,
  ArrowRightLeft, Building, X
} from 'lucide-react'
import { api } from '../api'

const WARD_TYPES = ['General Ward', 'Private Room', 'Semi-Private', 'ICU', 'NICU', 'Maternity', 'Isolation']

export default function WardManagement() {
  const [beds, setBeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [showAddWard, setShowAddWard] = useState(false)
  const [transferBed, setTransferBed] = useState(null)

  useEffect(() => {
    api.getBeds().then(b => { setBeds(b); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const wards = Array.from(new Set(beds.map(b => b.ward)))

  const filteredBeds = beds.filter(b => 
    (filter === 'All' || b.ward === filter) &&
    (!search || b.patient_name?.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search))
  )

  const stats = {
    total: beds.length,
    occupied: beds.filter(b => b.status === 'occupied').length,
    available: beds.filter(b => b.status === 'available').length,
    maintenance: beds.filter(b => b.status === 'maintenance').length,
  }

  const occRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ward Management</h1>
          <p className="page-subtitle">Real-time bed occupancy, ICU monitoring and ward-wise patient census</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setShowAddWard(true)}>
            <Building size={14} /> Add Ward
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Beds', val: stats.total, color: 'var(--gray-700)', icon: BedDouble },
          { label: 'Occupied', val: stats.occupied, color: '#b45309', icon: Users },
          { label: 'Available', val: stats.available, color: '#059669', icon: CheckCircle },
          { label: 'Occupancy Rate', val: `${occRate}%`, color: '#4338ca', icon: Activity },
        ].map((s, i) => (
           <div key={i} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>{s.label}</div>
              </div>
           </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <button className={`btn btn-sm ${filter === 'All' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('All')}>All Wards</button>
        {wards.map(w => (
          <button key={w} className={`btn btn-sm ${filter === w ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(w)}>{w}</button>
        ))}
        <div style={{ position: 'relative', marginLeft: 'auto', width: 250 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem', height: 32 }} placeholder="Search current patients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {loading ? <div style={{ padding: '2rem' }}><Loader className="spin" size={24} /></div> : filteredBeds.map(b => (
          <div key={b.id} style={{
            background: '#fff', border: `1.5px solid ${b.status === 'occupied' ? 'rgba(99,102,241,0.2)' : b.status === 'maintenance' ? 'rgba(239,68,68,0.2)' : 'var(--gray-200)'}`,
            borderRadius: 'var(--radius-xl)', overflow: 'hidden',
            borderTop: `4px solid ${b.status === 'occupied' ? '#4338ca' : b.status === 'maintenance' ? '#dc2626' : '#10b981'}`
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--gray-900)' }}>{b.id}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{b.ward}</div>
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, height: 'fit-content', textTransform: 'uppercase',
                background: b.status === 'occupied' ? 'rgba(99,102,241,0.1)' : b.status === 'maintenance' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                color: b.status === 'occupied' ? '#4338ca' : b.status === 'maintenance' ? '#dc2626' : '#059669'
              }}>{b.status}</span>
            </div>
            
            <div style={{ padding: '1rem', minHeight: 90 }}>
              {b.status === 'occupied' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                      {b.patient_name?.substring(0, 2) || 'P'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{b.patient_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>UHID: {b.patient_id}</div>
                    </div>
                  </div>
                  {b.ward.includes('ICU') && (
                    <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', padding: '0.3rem 0.6rem', borderRadius: 6, display: 'flex', gap: '0.375rem', alignItems: 'center', fontWeight: 600 }}>
                      <HeartPulse size={12} /> Live Vitals Monitored
                    </div>
                  )}
                  <button 
                    className="btn btn-sm btn-secondary" 
                    style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center', fontSize: '0.75rem', height: 28 }}
                    onClick={() => setTransferBed(b)}
                  >
                    <ArrowRightLeft size={12} /> Ward Transfer
                  </button>
                </>
              ) : b.status === 'maintenance' ? (
                <div style={{ color: '#ef4444', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={14} /> Under Maintenance / Cleaning
                </div>
              ) : (
                <div style={{ color: '#10b981', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} /> Ready for Admission
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Ward Modal */}
      {showAddWard && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddWard(false)}>
          <div className="modal">
            <div className="modal-header">
              <div><h4 style={{ fontWeight: 700 }}>Create New Ward</h4></div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddWard(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Ward Name</label>
                <input id="add-ward-name" className="form-input" placeholder="e.g. Isolation Ward C" />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Bed Prefix</label>
                  <input id="add-ward-prefix" className="form-input" placeholder="e.g. ISO-C" defaultValue="GW" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Number of Beds</label>
                  <input id="add-ward-count" className="form-input" type="number" defaultValue="5" min="1" max="50" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddWard(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                const name = document.getElementById('add-ward-name').value
                const prefix = document.getElementById('add-ward-prefix').value
                const count = parseInt(document.getElementById('add-ward-count').value)
                if (!name || !prefix) return alert('Name and prefix required')
                
                try {
                  const newBeds = []
                  for (let i = 1; i <= count; i++) {
                    const bed = await api.createBed({ id: `${prefix}-${Math.floor(Math.random()*9000)+1000}`, ward: name, bed_type: 'General', status: 'available' })
                    newBeds.push(bed)
                  }
                  setBeds(prev => [...prev, ...newBeds])
                  setShowAddWard(false)
                } catch(e) { console.error(e) }
              }}>Create Ward</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Patient Modal */}
      {transferBed && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setTransferBed(null)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h4 style={{ fontWeight: 700 }}>Ward Transfer</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Transfer {transferBed.patient_name} to a new bed</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setTransferBed(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Target Available Bed</label>
                <select id="transfer-target" className="form-input form-select">
                  <option value="">Select Bed...</option>
                  {beds.filter(b => b.status === 'available').map(b => (
                    <option key={b.id} value={b.id}>[{b.ward}] Bed {b.id}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTransferBed(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                const targetId = document.getElementById('transfer-target').value
                if(!targetId) return alert('Please select a bed')
                try {
                  // Release old bed
                  await api.assignBed(transferBed.id, { status: 'available', patient_id: null, doctor_id: null, diagnosis: null })
                  // Occupy new bed
                  await api.assignBed(targetId, { status: 'occupied', patient_id: transferBed.patient_id, doctor_id: transferBed.doctor_id, diagnosis: transferBed.diagnosis })
                  
                  // Optimistic UI update
                  setBeds(prev => prev.map(b => {
                    if (b.id === transferBed.id) return { ...b, status: 'available', patient_id: null, patient_name: null }
                    if (b.id === targetId) return { ...b, status: 'occupied', patient_id: transferBed.patient_id, patient_name: transferBed.patient_name, doctor_id: transferBed.doctor_id, diagnosis: transferBed.diagnosis }
                    return b
                  }))
                  setTransferBed(null)
                } catch(e) { console.error(e) }
              }}>Confirm Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

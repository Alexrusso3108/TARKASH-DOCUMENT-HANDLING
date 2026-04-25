import { useState } from 'react'
import { Droplet, Search, Plus, Filter, AlertCircle, Heart } from 'lucide-react'

const INVENTORY = [
  { group: 'O+', units: 45, status: 'Healthy' },
  { group: 'O-', units: 4, status: 'Critical' },
  { group: 'A+', units: 30, status: 'Healthy' },
  { group: 'A-', units: 8, status: 'Low' },
  { group: 'B+', units: 25, status: 'Healthy' },
  { group: 'B-', units: 5, status: 'Low' },
  { group: 'AB+', units: 12, status: 'Healthy' },
  { group: 'AB-', units: 2, status: 'Critical' },
]

export default function BloodBank() {
  const [requests, setRequests] = useState([
    { id: 'BB-1021', patient: 'Aakash Singh', ward: 'OT-03', group: 'O+', units: 2, type: 'PRBC', priority: 'Urgent', status: 'Cross-Matching' },
    { id: 'BB-1022', patient: 'Meena Reddy', ward: 'ICU-A', group: 'A-', units: 1, type: 'Platelets', priority: 'STAT', status: 'Pending' },
    { id: 'BB-1023', patient: 'Rajiv Kumar', ward: 'Ward 4', group: 'B+', units: 2, type: 'Whole Blood', priority: 'Routine', status: 'Issued' },
  ])

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Blood Bank</h1>
          <p className="page-subtitle">Blood stock inventory, donations, and transfusion requests</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm"><Heart size={14} /> Register Donor</button>
          <button className="btn btn-primary"><Droplet size={14} /> New Request</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'linear-gradient(to right, #7f1d1d, #b91c1c)', color: '#fff' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Droplet size={18} /> Live Inventory Status
        </h3>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {INVENTORY.map(inv => (
            <div key={inv.group} style={{ 
              background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: 'var(--radius-lg)', minWidth: '100px',
              border: `1px solid rgba(255,255,255,${inv.status === 'Critical' ? '0.6' : '0.1'})`,
              boxShadow: inv.status === 'Critical' ? '0 0 10px rgba(239,68,68,0.5)' : 'none'
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.2rem' }}>{inv.group}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{inv.units} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>Units</span></div>
              {inv.status === 'Critical' && <div style={{ fontSize: '0.65rem', background: '#fca5a5', color: '#7f1d1d', padding: '0.1rem 0.3rem', borderRadius: 4, marginTop: '0.3rem', display: 'inline-block', fontWeight: 800 }}>CRITICAL</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b">
          <h3 className="card-title">Active Transfusion Requests</h3>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Req ID</th>
                <th>Patient / Location</th>
                <th>Blood Needs</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: 'var(--primary-700)', fontSize: '0.85rem' }}>{r.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.patient}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Loc: {r.ward}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                      <span style={{ color: '#b91c1c' }}>{r.group}</span>
                      <span style={{ color: 'var(--gray-400)' }}>•</span>
                      <span>{r.units} Unit(s)</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{r.type}</div>
                  </td>
                  <td>
                    {r.priority === 'STAT' ? <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.75rem' }}><AlertCircle size={10} style={{display:'inline'}}/> STAT</span> : <span style={{ fontSize: '0.8rem' }}>{r.priority}</span>}
                  </td>
                  <td>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                      background: r.status === 'Issued' ? 'rgba(16,185,129,0.1)' : (r.status === 'Cross-Matching' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)'),
                      color: r.status === 'Issued' ? '#059669' : (r.status === 'Cross-Matching' ? '#1d4ed8' : '#b45309')
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm">Process</button>
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

import { useState, useEffect } from 'react'
import { Activity, Search, Calendar, User, Clock, CheckCircle, Plus, X } from 'lucide-react'
import { api } from '../api'

const THEATRES = ['OT-01 (General)', 'OT-02 (Ortho)', 'OT-03 (Cardiac)', 'OT-04 (Neuro)', 'Cath Lab']

function ScheduleModal({ patients, doctors, onClose, onSave }) {
  const [form, setForm] = useState({ patient_id: '', procedure: '', surgeon: '', ot: THEATRES[0], date: new Date().toISOString().slice(0,10), time: '08:00' })
  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    const p = patients.find(pt => pt.id === form.patient_id)
    if (!p || !form.procedure || !form.surgeon) {
      alert("Please fill all required fields (Patient, Procedure, Surgeon).")
      return
    }
    onSave({
      id: `SURG-${Math.floor(Math.random() * 9000) + 1000}`,
      patient_id: p.id,
      patient_name: p.name,
      surgeon: form.surgeon,
      procedure: form.procedure,
      ot: form.ot,
      date: form.date,
      time: form.time,
      pac_status: 'Pending',
      status: 'Scheduled'
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h4 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Schedule Surgery</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Book an available Operation Theatre</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Patient *</label>
            <select className="form-input form-select" value={form.patient_id} onChange={e => h('patient_id', e.target.value)}>
              <option value="">Select patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Procedure Name *</label>
            <input className="form-input" value={form.procedure} onChange={e => h('procedure', e.target.value)} placeholder="e.g. Appendectomy"/>
          </div>
          <div className="form-group">
            <label className="form-label">Primary Surgeon *</label>
            <select className="form-input form-select" value={form.surgeon} onChange={e => h('surgeon', e.target.value)}>
              <option value="">Select Doctor...</option>
              {doctors.map(d => <option key={d.id} value={d.name}>Dr. {d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Operation Theatre</label>
            <select className="form-input form-select" value={form.ot} onChange={e => h('ot', e.target.value)}>
              {THEATRES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => h('date', e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Time</label>
              <input className="form-input" type="time" value={form.time} onChange={e => h('time', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}><CheckCircle size={14} /> Schedule</button>
        </div>
      </div>
    </div>
  )
}

export default function OperationTheatre() {
  const [surgeries, setSurgeries] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const handleUpdate = (id) => {
    setSurgeries(prev => prev.map(s => {
      if (s.id !== id) return s
      if (s.pac_status === 'Pending') return { ...s, pac_status: 'Cleared' }
      if (s.status === 'Scheduled') return { ...s, status: 'In Progress' }
      if (s.status === 'In Progress') return { ...s, status: 'Completed' }
      return s
    }))
  }

  useEffect(() => {
    // Mock backend data for OT
    Promise.all([api.getPatients(), api.getDoctors()])
      .then(([pts, docs]) => {
        setPatients(pts)
        setDoctors(docs)
        
        // Generate mock scheduled surgeries
        const mockSurgeries = pts.slice(0, 4).map((p, i) => ({
          id: `SURG-${3000 + i}`,
          patient_id: p.id,
          patient_name: p.name,
          surgeon: docs[i % docs.length]?.name || 'Dr. Sharma',
          procedure: ['Appendectomy', 'CABG', 'TKR', 'Craniotomy'][i],
          ot: THEATRES[i],
          date: new Date().toISOString().slice(0,10),
          time: ['08:00', '10:30', '13:00', '15:30'][i],
          pac_status: i % 2 === 0 ? 'Cleared' : 'Pending',
          status: i === 0 ? 'In Progress' : (i === 1 ? 'Completed' : 'Scheduled')
        }))
        setSurgeries(mockSurgeries)
        setLoading(false)
      })
  }, [])

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operation Theatre</h1>
          <p className="page-subtitle">NABH Compliant OT Scheduling & PAC Workflow</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Schedule Surgery
        </button>
      </div>

      <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Scheduled Today', val: surgeries.length, color: 'var(--gray-800)', bg: 'var(--gray-50)' },
          { label: 'In Progress', val: surgeries.filter(s => s.status === 'In Progress').length, color: '#4338ca', bg: 'rgba(99,102,241,0.08)' },
          { label: 'PAC Pending', val: surgeries.filter(s => s.pac_status === 'Pending').length, color: '#b45309', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Completed', val: surgeries.filter(s => s.status === 'Completed').length, color: '#059669', bg: 'rgba(16,185,129,0.08)' }
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid var(--gray-200)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Surgery ID</th>
                <th>Patient Details</th>
                <th>Procedure</th>
                <th>Theatre / Time</th>
                <th>Surgeon</th>
                <th>PAC Status</th>
                <th>Current Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading OT Schedule...</td></tr>
              ) : (
                surgeries.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-700)', fontSize: '0.85rem' }}>{s.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{s.patient_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{s.patient_id}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.procedure}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray-800)', fontWeight: 600 }}>{s.ot}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}><Clock size={11} style={{ display:'inline', marginBottom: -1 }}/> {s.time}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>Dr. {s.surgeon}</td>
                    <td>
                      <span className={`badge ${s.pac_status === 'Cleared' ? 'badge-success' : 'badge-warning'}`}>
                        {s.pac_status}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                        background: s.status === 'In Progress' ? 'rgba(99,102,241,0.1)' : (s.status === 'Completed' ? 'rgba(16,185,129,0.1)' : 'var(--gray-100)'),
                        color: s.status === 'In Progress' ? '#4338ca' : (s.status === 'Completed' ? '#059669' : 'var(--gray-600)')
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleUpdate(s.id)} disabled={s.status === 'Completed'}>
                        {s.pac_status === 'Pending' ? 'Clear PAC' : (s.status === 'Scheduled' ? 'Start Surgery' : (s.status === 'In Progress' ? 'Complete' : 'Done'))}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <ScheduleModal patients={patients} doctors={doctors} onClose={() => setShowModal(false)} onSave={(surg) => setSurgeries(prev => [surg, ...prev])} />}
    </div>
  )
}

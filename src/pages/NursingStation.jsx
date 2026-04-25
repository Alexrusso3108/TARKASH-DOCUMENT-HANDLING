import { useState, useEffect } from 'react'
import { Activity, ClipboardList, PenTool, CheckCircle, Search, Droplet, HeartPulse, ListPlus, Plus } from 'lucide-react'
import { api } from '../api'

const VITALS = [
  { time: '08:00 AM', bp: '120/80', pulse: 75, temp: '98.6', spo2: 98, resp: 16 },
  { time: '12:00 PM', bp: '122/82', pulse: 78, temp: '98.8', spo2: 97, resp: 18 },
  { time: '04:00 PM', bp: '118/79', pulse: 72, temp: '98.4', spo2: 99, resp: 16 },
]

const EMAR = [
  { drug: 'Paracetamol 500mg (SOS)', route: 'Oral', frequency: 'SOS', last_given: '10:30 AM', status: 'Pending' },
  { drug: 'Pantoprazole 40mg', route: 'IV', frequency: 'OD (Morning)', last_given: '-', status: 'Given Today' },
  { drug: 'Ceftriaxone 1g', route: 'IV', frequency: 'BD', last_given: '08:00 AM', status: 'Next due at 08:00 PM' },
]

export default function NursingStation() {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [activeTab, setActiveTab] = useState('vitals') // vitals, emar, io, notes

  useEffect(() => {
    // Fetch IPD patients
    api.getPatients().then(pts => {
      const ipd = pts.filter(p => p.admission_type === 'IPD' || p.status === 'Under Obs')
      setPatients(ipd.length ? ipd : pts.slice(0, 5)) // Fallback to some patients for demo
    })
  }, [])

  return (
    <div className="animate-fadeInUp" style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 140px)' }}>
      {/* LEFT: Ward Patient List */}
      <div style={{ width: '300px', background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-100)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gray-900)' }}>My Assigned Ward</h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{patients.length} patients active</div>
        </div>
        <div style={{ padding: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input form-sm" style={{ paddingLeft: '2.25rem', width: '100%' }} placeholder="Search patients..." />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
          {patients.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPatient(p)}
              style={{ 
                padding: '1rem', margin: '0.25rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                background: selectedPatient?.id === p.id ? 'rgba(99,102,241,0.08)' : '#fff',
                border: `1px solid ${selectedPatient?.id === p.id ? 'rgba(99,102,241,0.3)' : 'var(--gray-100)'}`,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: selectedPatient?.id === p.id ? 'var(--primary-700)' : 'var(--gray-800)' }}>{p.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{p.id} • Bed: {p.bed_id || 'Ward B-4'}</div>
              <div style={{ fontSize: '0.7rem', marginTop: 4, display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 4, background: p.status === 'Critical' ? '#fee2e2' : 'var(--gray-100)', color: p.status === 'Critical' ? '#dc2626' : 'var(--gray-600)', fontWeight: 600 }}>
                {p.status || 'Stable'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Nursing Charts */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedPatient ? (
          <>
            <div style={{ padding: '1.25rem 1.5rem', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                  {selectedPatient.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.15rem' }}>{selectedPatient.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'flex', gap: '1rem' }}>
                    <span>UHID: {selectedPatient.id}</span>
                    <span>{selectedPatient.age} Y / {selectedPatient.gender?.[0] || 'U'}</span>
                    <span>Primary Dr: {selectedPatient.doctor_id || 'General'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)', padding: '0 1.5rem' }}>
              {[
                { id: 'vitals', label: 'TPR/Vitals Chart', icon: HeartPulse },
                { id: 'emar', label: 'eMAR (Meds)', icon: ClipboardList },
                { id: 'io', label: 'Intake/Output', icon: Droplet },
                { id: 'notes', label: 'Nursing Notes', icon: PenTool }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{ 
                    padding: '1rem 1.25rem', background: 'none', border: 'none', borderBottom: `2.5px solid ${activeTab === t.id ? 'var(--primary-600)' : 'transparent'}`,
                    color: activeTab === t.id ? 'var(--primary-700)' : 'var(--gray-500)', fontWeight: activeTab === t.id ? 700 : 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem'
                  }}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8fafc' }}>
              
              {/* VITALS TAB */}
              {activeTab === 'vitals' && (
                <div className="card">
                  <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 className="card-title">TPR/BP Flowsheet</h3>
                    <button className="btn btn-primary btn-sm"><Plus size={14}/> Record Vitals</button>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Time</th><th>Temp (°F)</th><th>Pulse (bpm)</th><th>BP (mmHg)</th><th>SpO2 (%)</th><th>Resp (bpm)</th><th>Sign</th></tr></thead>
                    <tbody>
                      {VITALS.map((v, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{v.time}</td>
                          <td>{v.temp}</td><td>{v.pulse}</td><td>{v.bp}</td><td>{v.spo2}</td><td>{v.resp}</td>
                          <td style={{ color: 'var(--primary-600)', fontSize: '0.8rem', fontWeight: 700 }}>RN. Smith</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* EMAR TAB */}
              {activeTab === 'emar' && (
                <div className="card">
                  <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 className="card-title">Electronic Medication Administration (eMAR)</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Date: {new Date().toLocaleDateString()}</div>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Prescribed Drug</th><th>Route</th><th>Frequency</th><th>Last Given</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {EMAR.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{m.drug}</td>
                          <td>{m.route}</td>
                          <td style={{ fontWeight: 600 }}>{m.frequency}</td>
                          <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{m.last_given}</td>
                          <td>
                            <span style={{ padding: '0.2rem 0.5rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: m.status.includes('Given') ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: m.status.includes('Given') ? '#059669' : '#b45309' }}>
                              {m.status}
                            </span>
                          </td>
                          <td><button className={`btn btn-sm ${m.status.includes('Given') ? 'btn-secondary' : 'btn-primary'}`}>{m.status.includes('Given') ? 'Undo' : 'Mark Given'}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* INTAKE OUTPUT TAB */}
              {activeTab === 'io' && (
                <div className="card">
                  <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 className="card-title">Intake / Output Chart</h3>
                    <button className="btn btn-secondary btn-sm"><Plus size={14}/> Add Entry</button>
                  </div>
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>
                    No I/O records strictly logged for today. 
                  </div>
                </div>
              )}

              {/* NURSING NOTES TAB */}
              {activeTab === 'notes' && (
                <div className="card">
                  <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 className="card-title">Shift Handover & Nursing Notes</h3>
                    <button className="btn btn-primary btn-sm"><PenTool size={14}/> Write Note</button>
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--gray-800)' }}>Morning Shift Handover</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{new Date().toLocaleDateString()} 08:15 AM</div>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', margin: 0, lineHeight: 1.5 }}>
                        Patient rested comfortably overnight. Hemodynamically stable. IV fluids running as per schedule. Cannula site is clean and intact without any signs of phlebitis. Morning dose of Pantoprazole given. Handed over to morning team: Sr. Maya.
                      </p>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-600)', marginTop: '0.5rem' }}>Logged by: RN. Sneha (Night Shift)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
            <Activity size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--gray-500)' }}>Nurse Station Active</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>Select an admitted patient to chart vitals and eMAR.</p>
          </div>
        )}
      </div>
    </div>
  )
}

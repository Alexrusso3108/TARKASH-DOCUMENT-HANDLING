import { useState, useEffect, useCallback } from 'react'
import { Activity, ClipboardList, PenTool, CheckCircle, Search, Droplet, HeartPulse, Plus, X, Loader } from 'lucide-react'
import { api } from '../api'

export default function NursingStation() {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [activeTab, setActiveTab] = useState('vitals')
  const [loading, setLoading] = useState(false)

  // Data states
  const [vitals, setVitals] = useState([])
  const [emar, setEmar] = useState([])
  const [notes, setNotes] = useState([])

  // Modal states
  const [showVitalsModal, setShowVitalsModal] = useState(false)
  const [showEmarModal, setShowEmarModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)

  // Fetch Ward Patients
  useEffect(() => {
    api.getBeds().then(beds => {
      const occupied = beds.filter(b => b.status === 'occupied')
      setPatients(occupied.map(b => ({
        id: b.patient_id,
        bed_id: b.id,
        name: b.patient_name || 'Unknown',
        ward: `${b.ward} - Bed ${b.id}`,
        status: 'Admitted',
        doctor_id: b.doctor_name
      })))
    }).catch(e => console.error("Failed to load patients for nursing station", e))
  }, [])

  // Fetch Patient specific data
  const fetchData = useCallback(async (patientId) => {
    if (!patientId) return
    setLoading(true)
    try {
      const allNotes = await api.getNotes({ patient_id: patientId })
      setVitals(allNotes.filter(n => n.note_type === 'VITALS').map(n => ({ id: n.id, date: n.created_at, ...JSON.parse(n.content) })))
      setEmar(allNotes.filter(n => n.note_type === 'EMAR').map(n => ({ id: n.id, date: n.created_at, ...JSON.parse(n.content) })))
      setNotes(allNotes.filter(n => n.note_type === 'NURSING_NOTE').map(n => ({ id: n.id, date: n.created_at, ...JSON.parse(n.content) })))
    } catch (e) {
      console.error("Failed to load clinical notes", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPatient) {
      fetchData(selectedPatient.id)
    }
  }, [selectedPatient, fetchData])

  const handleSaveData = async (type, data) => {
    try {
      await api.createNote({
        patient_id: selectedPatient.id,
        doctor_id: 'NURSE_01', // Logged in user mock
        note_type: type,
        content: JSON.stringify(data)
      })
      fetchData(selectedPatient.id)
      setShowVitalsModal(false)
      setShowEmarModal(false)
      setShowNoteModal(false)
    } catch (e) {
      alert("Error saving record: " + e.message)
    }
  }

  const markMedicationGiven = async (record) => {
    try {
      const updatedData = { ...record, status: 'Given', last_given: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
      delete updatedData.id
      delete updatedData.date
      // To simulate update, we create a new note and it acts as the latest status, or we just add a new note. 
      // For simplicity, we just add a new note representing the updated status.
      await api.createNote({
        patient_id: selectedPatient.id,
        doctor_id: 'NURSE_01',
        note_type: 'EMAR',
        content: JSON.stringify(updatedData)
      })
      fetchData(selectedPatient.id)
    } catch (e) {
      alert("Error updating medication status: " + e.message)
    }
  }

  return (
    <div className="animate-fadeInUp" style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 100px)' }}>
      {/* LEFT: Ward Patient List */}
      <div style={{ width: '320px', background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-100)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gray-900)' }}>My Assigned Ward</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{patients.length} active patients</div>
        </div>
        <div style={{ padding: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input form-sm" style={{ paddingLeft: '2.25rem', width: '100%', background: 'var(--gray-50)' }} placeholder="Search patients..." />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
          {patients.map(p => (
            <div 
              key={p.bed_id} 
              onClick={() => setSelectedPatient(p)}
              style={{ 
                padding: '1rem', margin: '0.25rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                background: selectedPatient?.bed_id === p.bed_id ? 'var(--primary-50)' : '#fff',
                borderLeft: `4px solid ${selectedPatient?.bed_id === p.bed_id ? 'var(--primary-600)' : 'transparent'}`,
                borderBottom: '1px solid var(--gray-100)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: selectedPatient?.bed_id === p.bed_id ? 'var(--primary-700)' : 'var(--gray-800)' }}>{p.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 4 }}>UHID: <strong style={{ color: 'var(--gray-700)' }}>{p.id}</strong></div>
              <div style={{ fontSize: '0.8rem', marginTop: 4, display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 4, background: 'var(--gray-100)', color: 'var(--gray-600)', fontWeight: 600 }}>
                {p.ward}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Nursing Charts */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedPatient ? (
          <>
            <div style={{ padding: '1.25rem 1.5rem', background: '#1e293b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                  {selectedPatient.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{selectedPatient.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-300)', display: 'flex', gap: '1.5rem' }}>
                    <span>UHID: <strong>{selectedPatient.id}</strong></span>
                    <span>Ward: <strong>{selectedPatient.ward}</strong></span>
                    <span>Primary Dr: <strong>{selectedPatient.doctor_id || 'General'}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)', padding: '0 1.5rem' }}>
              {[
                { id: 'vitals', label: 'TPR/Vitals Chart', icon: HeartPulse },
                { id: 'emar', label: 'eMAR (Meds)', icon: ClipboardList },
                { id: 'notes', label: 'Nursing Notes', icon: PenTool }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{ 
                    padding: '1rem 1.25rem', background: 'none', border: 'none', borderBottom: `2.5px solid ${activeTab === t.id ? 'var(--primary-600)' : 'transparent'}`,
                    color: activeTab === t.id ? 'var(--primary-700)' : 'var(--gray-600)', fontWeight: activeTab === t.id ? 700 : 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
                  }}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8fafc' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader className="spin" size={32} color="var(--primary-600)" /></div>
              ) : (
                <>
                  {/* VITALS TAB */}
                  {activeTab === 'vitals' && (
                    <div className="card animate-fadeInUp">
                      <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>TPR/BP Flowsheet</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowVitalsModal(true)}><Plus size={14}/> Record Vitals</button>
                      </div>
                      <table className="data-table">
                        <thead><tr><th>Date & Time</th><th>Temp (°F)</th><th>Pulse (bpm)</th><th>BP (mmHg)</th><th>SpO2 (%)</th><th>Resp (bpm)</th><th>Logged By</th></tr></thead>
                        <tbody>
                          {vitals.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No vitals recorded</td></tr> : null}
                          {vitals.map(v => (
                            <tr key={v.id}>
                              <td style={{ fontWeight: 600 }}>{new Date(v.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                              <td style={{ color: Number(v.temp) > 99.5 ? '#dc2626' : 'inherit', fontWeight: Number(v.temp) > 99.5 ? 700 : 400 }}>{v.temp}</td>
                              <td>{v.pulse}</td>
                              <td>{v.bp}</td>
                              <td>{v.spo2}</td>
                              <td>{v.resp}</td>
                              <td style={{ color: 'var(--primary-600)', fontSize: '0.8rem', fontWeight: 700 }}>{v.nurse_name || 'RN. On Duty'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* EMAR TAB */}
                  {activeTab === 'emar' && (
                    <div className="card animate-fadeInUp">
                      <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>Electronic Medication Administration (eMAR)</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowEmarModal(true)}><Plus size={14}/> Add Medication</button>
                      </div>
                      <table className="data-table">
                        <thead><tr><th>Prescribed Drug</th><th>Route</th><th>Frequency</th><th>Status</th><th>Last Given</th><th>Action</th></tr></thead>
                        <tbody>
                          {emar.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No medications active</td></tr> : null}
                          {emar.map(m => (
                            <tr key={m.id}>
                              <td style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{m.drug}</td>
                              <td>{m.route}</td>
                              <td style={{ fontWeight: 600 }}>{m.frequency}</td>
                              <td>
                                <span style={{ padding: '0.2rem 0.5rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: m.status === 'Given' ? '#d1fae5' : '#fef3c7', color: m.status === 'Given' ? '#059669' : '#b45309' }}>
                                  {m.status || 'Pending'}
                                </span>
                              </td>
                              <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{m.last_given || '-'}</td>
                              <td>
                                {m.status !== 'Given' && (
                                  <button className="btn btn-sm btn-secondary" style={{ borderColor: '#10b981', color: '#10b981' }} onClick={() => markMedicationGiven(m)}>
                                    <CheckCircle size={14} /> Mark Given
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* NURSING NOTES TAB */}
                  {activeTab === 'notes' && (
                    <div className="card animate-fadeInUp">
                      <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>Shift Handover & Nursing Notes</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowNoteModal(true)}><PenTool size={14}/> Write Note</button>
                      </div>
                      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {notes.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No notes logged for this patient</div>}
                        {notes.map(n => (
                          <div key={n.id} style={{ background: '#fff', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                              <div style={{ fontWeight: 800, color: 'var(--gray-900)' }}>{n.title}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{new Date(n.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                            </div>
                            <p style={{ fontSize: '0.95rem', color: 'var(--gray-700)', margin: 0, lineHeight: 1.6 }}>{n.description}</p>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-600)', marginTop: '1rem', borderTop: '1px solid var(--gray-100)', paddingTop: '0.5rem' }}>Logged by: {n.nurse_name || 'RN. Staff'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
            <Activity size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gray-600)' }}>Nurse Station Active</h3>
            <p style={{ fontSize: '1rem', marginTop: '0.5rem' }}>Select an admitted patient from the ward to chart vitals, eMAR, and notes.</p>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showVitalsModal && <VitalsModal onClose={() => setShowVitalsModal(false)} onSave={(d) => handleSaveData('VITALS', d)} />}
      {showEmarModal && <EmarModal onClose={() => setShowEmarModal(false)} onSave={(d) => handleSaveData('EMAR', d)} />}
      {showNoteModal && <NoteModal onClose={() => setShowNoteModal(false)} onSave={(d) => handleSaveData('NURSING_NOTE', d)} />}

    </div>
  )
}

function VitalsModal({ onClose, onSave }) {
  const [form, setForm] = useState({ temp: '', bp: '', pulse: '', spo2: '', resp: '', nurse_name: 'RN. Duty' })
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h4>Record Vitals (TPR/BP)</h4><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body">
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Temperature (°F)</label><input type="number" step="0.1" className="form-input" value={form.temp} onChange={e => setForm({...form, temp: e.target.value})} placeholder="98.6" /></div>
            <div className="form-group"><label className="form-label">Blood Pressure (mmHg)</label><input className="form-input" value={form.bp} onChange={e => setForm({...form, bp: e.target.value})} placeholder="120/80" /></div>
            <div className="form-group"><label className="form-label">Pulse (bpm)</label><input type="number" className="form-input" value={form.pulse} onChange={e => setForm({...form, pulse: e.target.value})} placeholder="72" /></div>
            <div className="form-group"><label className="form-label">SpO2 (%)</label><input type="number" className="form-input" value={form.spo2} onChange={e => setForm({...form, spo2: e.target.value})} placeholder="98" /></div>
            <div className="form-group"><label className="form-label">Respiration (bpm)</label><input type="number" className="form-input" value={form.resp} onChange={e => setForm({...form, resp: e.target.value})} placeholder="16" /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>Save Vitals</button>
        </div>
      </div>
    </div>
  )
}

function EmarModal({ onClose, onSave }) {
  const [form, setForm] = useState({ drug: '', route: 'Oral', frequency: 'OD', status: 'Pending', last_given: '-' })
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h4>Add Medication to eMAR</h4><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group"><label className="form-label">Drug Name & Dose</label><input className="form-input" value={form.drug} onChange={e => setForm({...form, drug: e.target.value})} placeholder="e.g. Paracetamol 500mg" /></div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Route</label>
              <select className="form-input form-select" value={form.route} onChange={e => setForm({...form, route: e.target.value})}>
                {['Oral', 'IV', 'IM', 'Subcutaneous', 'Topical'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Frequency</label>
              <select className="form-input form-select" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                {['OD (Once Daily)', 'BD (Twice Daily)', 'TDS (Thrice Daily)', 'QID (Four Times)', 'SOS (As Needed)', 'STAT (Immediately)'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!form.drug) return alert("Drug name is required")
            onSave(form)
          }}>Add to eMAR</button>
        </div>
      </div>
    </div>
  )
}

function NoteModal({ onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', nurse_name: 'RN. Duty' })
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h4>Write Nursing Note</h4><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group"><label className="form-label">Title / Context</label><input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Morning Shift Handover" /></div>
          <div className="form-group"><label className="form-label">Detailed Notes</label><textarea className="form-input" style={{ minHeight: 120, resize: 'vertical' }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe patient condition, care given, etc." /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!form.title || !form.description) return alert("All fields are required")
            onSave(form)
          }}>Save Note</button>
        </div>
      </div>
    </div>
  )
}

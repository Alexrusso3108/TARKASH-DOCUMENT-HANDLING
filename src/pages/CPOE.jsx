import { useState, useEffect } from 'react'
import { 
  Stethoscope, Activity, FileText, Pill, Save, CheckCircle, Clock, Plus, 
  Search, AlertCircle, X, ChevronRight, User, Hash, Loader
} from 'lucide-react'
import { api } from '../api'

const COMMON_DRUGS = [
  { name: 'Paracetamol', mg: '500', route: 'Oral', type: 'Tablet' },
  { name: 'Amoxicillin', mg: '500', route: 'Oral', type: 'Capsule' },
  { name: 'Pantoprazole', mg: '40', route: 'Oral', type: 'Tablet' },
  { name: 'Azithromycin', mg: '500', route: 'Oral', type: 'Tablet' },
  { name: 'Ibuprofen', mg: '400', route: 'Oral', type: 'Tablet' },
  { name: 'Salbutamol', mg: '2.5', route: 'Inhalation', type: 'Nebulizer' },
  { name: 'Metformin', mg: '500', route: 'Oral', type: 'Tablet' },
  { name: 'Amlodipine', mg: '5', route: 'Oral', type: 'Tablet' },
]

const ICD_CODES = [
  { code: 'J00', name: 'Acute nasopharyngitis [common cold]' },
  { code: 'J02.9', name: 'Acute pharyngitis, unspecified' },
  { code: 'I10', name: 'Essential (primary) hypertension' },
  { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications' },
  { code: 'A09', name: 'Infectious gastroenteritis and colitis, unspecified' },
  { code: 'K21.9', name: 'Gastro-esophageal reflux disease without esophagitis' },
  { code: 'M54.5', name: 'Low back pain' },
  { code: 'R50.9', name: 'Fever, unspecified' },
]

export default function CPOE() {
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  
  // Charting state
  const [chiefComplaints, setChiefComplaints] = useState('')
  const [examination, setExamination] = useState('')
  const [diagnoses, setDiagnoses] = useState([])
  const [diagSearch, setDiagSearch] = useState('')
  
  const [prescriptions, setPrescriptions] = useState([])
  const [drugSearch, setDrugSearch] = useState('')
  const [showDiagDropdown, setShowDiagDropdown] = useState(false)
  const [showDrugDropdown, setShowDrugDropdown] = useState(false)

  const [saving, setSaving] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)

  useEffect(() => {
    // Load patients and scheduled opd visits
    Promise.all([api.getPatients(), api.getOPD()])
      .then(([pts, appts]) => {
        setPatients(pts)
        // Filter for today's active appointments
        const active = appts.filter(a => {
          const s = (a.status || '').toLowerCase()
          return ['scheduled', 'waiting', 'confirmed', 'checked-in', 'with-doctor'].includes(s)
        })
        setAppointments(active)
      })
      .catch(e => console.error(e))
  }, [])

  const handleCheckIn = async (e, appt) => {
    e.stopPropagation()
    try {
      await api.updateOPD(appt.id, { status: 'checked-in' })
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'checked-in'} : a))
    } catch(err) { console.error(err) }
  }

  const handleSelectPatient = async (appt, ptsStore = patients) => {
    const p = ptsStore.find(pt => pt.id === appt.patient_id)
    if (p) {
      setSelectedPatient(p)
      setSelectedAppt(appt)
      setChiefComplaints('')
      setExamination('')
      setDiagnoses([])
      setPrescriptions([])
      setAlertMsg(null)
      // Update status to 'with-doctor' if it's 'checked-in' or 'waiting'
      const s = (appt.status || '').toLowerCase()
      if (['checked-in', 'waiting', 'scheduled', 'confirmed'].includes(s)) {
        try {
          await api.updateOPD(appt.id, { status: 'with-doctor' })
          setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'with-doctor'} : a))
        } catch(e) {}
      }
    }
  }

  const addDiagnosis = (d) => {
    if (!diagnoses.find(x => x.code === d.code)) setDiagnoses([...diagnoses, d])
    setDiagSearch('')
    setShowDiagDropdown(false)
  }

  const removeDiagnosis = (code) => {
    setDiagnoses(diagnoses.filter(d => d.code !== code))
  }

  const addDrug = (drug) => {
    setPrescriptions([...prescriptions, { 
      ...drug, 
      frequency: '1-0-1', 
      duration: '5 Days',
      instructions: 'After Food' 
    }])
    setDrugSearch('')
    setShowDrugDropdown(false)
  }

  const updateDrug = (idx, field, val) => {
    const arr = [...prescriptions]
    arr[idx][field] = val
    setPrescriptions(arr)
  }

  const removeDrug = (idx) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!selectedPatient || !selectedAppt) return
    setSaving(true)
    
    // Construct the clinical note payload
    const payload = {
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      doctor_id: selectedAppt.doctor_id,
      note_type: 'Consultation Note',
      priority: 'medium',
      content: `Chief Complaints:\n${chiefComplaints || 'None listed'}\n\nClinical Examination:\n${examination || 'None listed'}\n\nAssessments/Diagnoses:\n${diagnoses.map(d => `[${d.code}] ${d.name}`).join('\n') || 'None listed'}\n\nPrescriptions:\n${prescriptions.map(p => `${p.name} ${p.mg}mg - ${p.frequency} x ${p.duration} (${p.instructions})`).join('\n') || 'None prescribed'}`
    }

    try {
      await api.createNote(payload)
      // Complete the OPD visit workflow
      await api.updateOPD(selectedAppt.id, { status: 'completed' })
      
      setAlertMsg({ type: 'success', text: 'Prescription & Consultation Note Saved Successfully!' })
      // Remove from active queue
      setAppointments(prev => prev.filter(a => a.id !== selectedAppt.id))
      // Clear forms
      setTimeout(() => {
        setAlertMsg(null)
        setSelectedPatient(null)
        setSelectedAppt(null)
      }, 2000)
    } catch (e) {
      setAlertMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const filteredDiags = ICD_CODES.filter(d => d.name.toLowerCase().includes(diagSearch.toLowerCase()) || d.code.toLowerCase().includes(diagSearch.toLowerCase()))
  const filteredDrugs = COMMON_DRUGS.filter(d => d.name.toLowerCase().includes(drugSearch.toLowerCase()))

  return (
    <div className="animate-fadeInUp" style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 140px)' }}>
      
      {/* LEFT: Queue Pane */}
      <div style={{ width: '320px', background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-100)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gray-900)' }}>My Queue</h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{appointments.length} patients waiting</div>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
          {appointments.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.9rem' }}>No patients waiting</div>
          ) : (
            appointments.map(appt => {
              const p = patients.find(pt => pt.id === appt.patient_id)
              if (!p) return null
              const isSelected = selectedPatient?.id === p.id
              return (
                <div 
                  key={appt.id} 
                  onClick={() => handleSelectPatient(appt)}
                  style={{ 
                    padding: '1rem', margin: '0.5rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                    background: isSelected ? 'rgba(99,102,241,0.08)' : '#fff',
                    border: `1px solid ${isSelected ? 'rgba(99,102,241,0.3)' : 'var(--gray-100)'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--primary-700)' : 'var(--gray-800)' }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      {['scheduled', 'waiting'].includes((appt.status || '').toLowerCase()) && (
                        <button className="btn btn-secondary btn-sm" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }} onClick={(e) => handleCheckIn(e, appt)}>
                          Verify & Check-In
                        </button>
                      )}
                      <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: 999, background: (appt.status || '').toLowerCase() === 'checked-in' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: (appt.status || '').toLowerCase() === 'checked-in' ? '#b45309' : '#059669', textTransform: 'capitalize', fontWeight: 700 }}>
                        {appt.status.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Hash size={12} /> {p.id}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT: CPOE Workbench */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Patient Header Banner */}
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
                    <span><Hash size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }}/>{selectedPatient.id}</span>
                    <span>{selectedPatient.age} Y / {selectedPatient.gender?.[0] || 'U'}</span>
                    <span>Blood: {selectedPatient.blood_group || 'N/A'}</span>
                    <span style={{ color: '#fca5a5' }}>Allergies: {selectedPatient.allergies || 'NKA'}</span>
                  </div>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ background: '#3b82f6', border: 'none' }}><Clock size={14}/> Timeline</button>
            </div>

            {/* Workbench Scroll Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              
              {alertMsg && (
                <div style={{ padding: '0.8rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', background: alertMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: alertMsg.type === 'success' ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  {alertMsg.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                  {alertMsg.text}
                </div>
              )}

              {/* Subjective / Objective */}
              <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-700)' }}>
                    <Activity size={15}/> Chief Complaints (Subjective)
                  </label>
                  <textarea 
                    className="form-input form-textarea" 
                    placeholder="E.g. Fever since 3 days, dry cough..." 
                    style={{ minHeight: 120 }}
                    value={chiefComplaints} onChange={e => setChiefComplaints(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-700)' }}>
                    <Stethoscope size={15}/> Clinical Examination (Objective)
                  </label>
                  <textarea 
                    className="form-input form-textarea" 
                    placeholder="O/E: Chest clear bilaterally, Throat congested..." 
                    style={{ minHeight: 120 }}
                    value={examination} onChange={e => setExamination(e.target.value)}
                  />
                </div>
              </div>

              {/* Assessment / ICD-10 */}
              <div style={{ marginBottom: '2rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309' }}>
                  <FileText size={15}/> Diagnosis (Assessment)
                </label>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {diagnoses.map(d => (
                    <div key={d.code} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#b45309', padding: '0.4rem 0.75rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ opacity: 0.6 }}>[{d.code}]</span> {d.name}
                      <X size={12} style={{ cursor: 'pointer', marginLeft: '0.25rem' }} onClick={() => removeDiagnosis(d.code)} />
                    </div>
                  ))}
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input 
                    className="form-input" 
                    placeholder="Search ICD-10 diagnosis codes..." 
                    style={{ paddingLeft: '2.5rem' }}
                    value={diagSearch}
                    onChange={e => { setDiagSearch(e.target.value); setShowDiagDropdown(true) }}
                    onFocus={() => setShowDiagDropdown(true)}
                  />
                  {showDiagDropdown && diagSearch && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: '0.25rem' }}>
                      {filteredDiags.length > 0 ? filteredDiags.map(d => (
                        <div key={d.code} onClick={() => addDiagnosis(d)} style={{ padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)', fontSize: '0.85rem' }} className="hover-bg-gray">
                          <strong>{d.code}</strong> - {d.name}
                        </div>
                      )) : <div style={{ padding: '0.6rem 1rem', color: 'var(--gray-500)', fontSize: '0.85rem' }}>No matching codes</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Plan / e-Prescription */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669' }}>
                  <Pill size={15}/> Medication & Plan (e-Prescription)
                </label>
                
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input 
                    className="form-input" 
                    placeholder="Search drugs from formulary (e.g. Paracetamol)..." 
                    style={{ paddingLeft: '2.5rem' }}
                    value={drugSearch}
                    onChange={e => { setDrugSearch(e.target.value); setShowDrugDropdown(true) }}
                    onFocus={() => setShowDrugDropdown(true)}
                  />
                  {showDrugDropdown && drugSearch && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: '0.25rem' }}>
                      {filteredDrugs.length > 0 ? filteredDrugs.map((d, idx) => (
                        <div key={idx} onClick={() => addDrug(d)} style={{ padding: '0.6rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }} className="hover-bg-gray">
                          <span><strong>{d.name}</strong> {d.mg}mg</span>
                          <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>{d.type}</span>
                        </div>
                      )) : <div style={{ padding: '0.6rem 1rem', color: 'var(--gray-500)', fontSize: '0.85rem' }}>No drugs found</div>}
                    </div>
                  )}
                </div>

                {prescriptions.length > 0 && (
                  <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.03)', fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Drug Name</th>
                          <th style={{ padding: '0.75rem 1rem', width: 140 }}>Frequency</th>
                          <th style={{ padding: '0.75rem 1rem', width: 120 }}>Duration</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Instructions</th>
                          <th style={{ padding: '0.75rem 1rem', width: 50 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.map((p, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid var(--gray-200)' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{p.name} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--gray-500)' }}>{p.mg}mg</span></div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{p.type} · {p.route}</div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <select className="form-input form-select form-sm" value={p.frequency} onChange={e => updateDrug(idx, 'frequency', e.target.value)}>
                                <option>1-0-1</option>
                                <option>1-1-1</option>
                                <option>1-0-0</option>
                                <option>0-0-1</option>
                                <option>SOS</option>
                                <option>Stat</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <select className="form-input form-select form-sm" value={p.duration} onChange={e => updateDrug(idx, 'duration', e.target.value)}>
                                <option>1 Day</option>
                                <option>3 Days</option>
                                <option>5 Days</option>
                                <option>1 Week</option>
                                <option>2 Weeks</option>
                                <option>1 Month</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <input className="form-input form-sm" value={p.instructions} onChange={e => updateDrug(idx, 'instructions', e.target.value)} placeholder="e.g. After Food" />
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <button className="btn btn-ghost btn-icon" style={{ color: '#ef4444' }} onClick={() => removeDrug(idx)}><X size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Sticky Action Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--gray-200)', background: 'var(--gray-50)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-secondary">Order Investigations</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader size={16} className="spin" /> : <Save size={16}/>} Sign & Save Note
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray-400)', gap: '1rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stethoscope size={36} color="var(--gray-300)" />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--gray-500)' }}>Select a patient from the queue</div>
            <div style={{ fontSize: '0.9rem', width: 280, textAlign: 'center' }}>To begin consultation and write prescriptions, select a patient waiting outside.</div>
          </div>
        )}
      </div>

    </div>
  )
}

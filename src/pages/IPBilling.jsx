import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Calculator, FileText, CheckCircle, Loader, DollarSign, ArrowRight, ShieldCheck, CreditCard, X, Printer, BedDouble } from 'lucide-react'
import { api } from '../api'

const CHARGE_CATEGORIES = [
  'Room Rent / Bed Charges',
  'Nursing & Service Charges',
  'Doctor Consultation Fees',
  'OT & Procedure Charges',
  'Pharmacy & Consumables',
  'Laboratory Investigations',
  'Radiology / Diagnostics',
  'Miscellaneous (Diet, Bio-Waste)'
]

export default function IPBilling() {
  const [ipPatients, setIpPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)

  // Patient Billing Data
  const [charges, setCharges] = useState([])
  const [advances, setAdvances] = useState([])
  const [dataLoading, setDataLoading] = useState(false)

  // Forms
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [showFinalBill, setShowFinalBill] = useState(false)

  // Fetch admitted patients
  const fetchAdmittedPatients = useCallback(async () => {
    setLoading(true)
    try {
      const beds = await api.getBeds()
      const occupied = beds.filter(b => b.status === 'occupied')
      setIpPatients(occupied.map(b => ({
        id: b.patient_id,
        bed_id: b.id,
        name: b.patient_name || 'Unknown Patient',
        ward: `${b.ward} (${b.id})`,
        doctor: b.doctor_name || 'General Physician',
        admitted_at: b.admitted_at || new Date().toISOString()
      })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdmittedPatients()
  }, [fetchAdmittedPatients])

  // Fetch billing data for selected patient
  const fetchBillingData = useCallback(async (patientId) => {
    if (!patientId) return
    setDataLoading(true)
    try {
      const notes = await api.getClinicalNotes(patientId)
      
      const parsedCharges = notes
        .filter(n => n.note_type === 'IP_CHARGE')
        .map(n => ({ ...JSON.parse(n.content), id: n.id, date: n.created_at }))
        
      const parsedAdvances = notes
        .filter(n => n.note_type === 'IP_ADVANCE')
        .map(n => ({ ...JSON.parse(n.content), id: n.id, date: n.created_at }))

      setCharges(parsedCharges)
      setAdvances(parsedAdvances)
    } catch (e) {
      console.error(e)
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPatient) fetchBillingData(selectedPatient.id)
  }, [selectedPatient, fetchBillingData])

  const totalCharges = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const totalAdvances = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0)
  const netPayable = Math.max(0, totalCharges - totalAdvances)

  const handleAddCharge = async (chargeData) => {
    await api.createClinicalNote({
      patient_id: selectedPatient.id,
      doctor_id: 'SYSTEM',
      note_type: 'IP_CHARGE',
      content: JSON.stringify(chargeData)
    })
    fetchBillingData(selectedPatient.id)
    setShowChargeModal(false)
  }

  const handleAddAdvance = async (advanceData) => {
    await api.createClinicalNote({
      patient_id: selectedPatient.id,
      doctor_id: 'SYSTEM',
      note_type: 'IP_ADVANCE',
      content: JSON.stringify(advanceData)
    })
    fetchBillingData(selectedPatient.id)
    setShowAdvanceModal(false)
  }

  const handleFinalSettle = async (finalData) => {
    try {
      // 1. Create final bill record
      await api.createBilling({
        patient_id: selectedPatient.id,
        type: 'IPD',
        total_amount: totalCharges,
        paid_amount: finalData.amountPaid,
        payment_method: finalData.paymentMethod,
        notes: JSON.stringify({ 
          breakdown: charges, 
          advances: advances, 
          discount: finalData.discount,
          netPayable: netPayable - finalData.discount 
        })
      })

      // 2. Discharge patient (free bed)
      await api.updateBed(selectedPatient.bed_id, {
        status: 'available',
        patient_id: null
      })

      alert('Patient Successfully Discharged & Bill Settled.')
      setShowFinalBill(false)
      setSelectedPatient(null)
      fetchAdmittedPatients()
    } catch (e) {
      alert('Failed to settle: ' + e.message)
    }
  }

  const filteredPatients = ipPatients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fadeInUp" style={{ height: 'calc(100vh - 6rem)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">IP Billing Module</h1>
          <p className="page-subtitle">Manage inpatient running bills, collect advances, and process final discharge settlements</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Left Side: Patient List */}
        <div style={{ width: 340, background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="form-input" style={{ paddingLeft: '2.25rem', background: 'var(--gray-50)' }} placeholder="Search admitted patients..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}><Loader size={20} className="spin" /></div>
            ) : filteredPatients.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.9rem' }}>No admitted patients found.</div>
            ) : (
              filteredPatients.map(p => (
                <div 
                  key={p.bed_id}
                  onClick={() => setSelectedPatient(p)}
                  style={{ 
                    padding: '1.25rem', 
                    borderBottom: '1px solid var(--gray-100)', 
                    cursor: 'pointer',
                    background: selectedPatient?.bed_id === p.bed_id ? 'var(--primary-50)' : '#fff',
                    borderLeft: `4px solid ${selectedPatient?.bed_id === p.bed_id ? 'var(--primary-600)' : 'transparent'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.95rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>UHID: <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{p.id}</span></div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)', background: 'var(--gray-100)', padding: '0.15rem 0.5rem', borderRadius: 999 }}>{p.ward}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Billing Dashboard */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedPatient ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
              <Calculator size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Select a patient to view IP Billing</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)' }}>{selectedPatient.name}</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                    <span>UHID: <strong>{selectedPatient.id}</strong></span>
                    <span>Ward: <strong>{selectedPatient.ward}</strong></span>
                    <span>Admitted: <strong>{new Date(selectedPatient.admitted_at).toLocaleDateString('en-IN')}</strong></span>
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowFinalBill(true)}>
                  <CheckCircle size={14} /> Finalize Discharge Bill
                </button>
              </div>

              {/* Stats Cards */}
              <div style={{ padding: '1.5rem', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <div className="grid grid-3" style={{ gap: '1.5rem' }}>
                  <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Total Charges</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)', marginTop: '0.25rem' }}>₹{totalCharges.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-200)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Advances Paid</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>₹{totalAdvances.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'var(--primary-600)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', color: '#fff', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 600, textTransform: 'uppercase' }}>Net Payable Balance</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>₹{netPayable.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                <div className="grid grid-2" style={{ gap: '2rem' }}>
                  {/* Left: Charges Ledger */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-800)' }}>Charges Ledger</h3>
                      <button className="btn btn-sm btn-secondary" onClick={() => setShowChargeModal(true)}>
                        <Plus size={12} /> Add Charge
                      </button>
                    </div>
                    {charges.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>No charges added yet.</div>
                    ) : (
                      <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <table className="data-table" style={{ margin: 0 }}>
                          <thead style={{ background: 'var(--gray-50)' }}>
                            <tr><th>Date</th><th>Category</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
                          </thead>
                          <tbody>
                            {charges.map(c => (
                              <tr key={c.id}>
                                <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{new Date(c.date).toLocaleDateString()}</td>
                                <td style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)' }}>{c.category}</td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{c.description}</td>
                                <td style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-900)', textAlign: 'right' }}>₹{Number(c.amount).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right: Advances Ledger */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-800)' }}>Advance Receipts</h3>
                      <button className="btn btn-sm btn-secondary" onClick={() => setShowAdvanceModal(true)}>
                        <Plus size={12} /> Collect Advance
                      </button>
                    </div>
                    {advances.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>No advances collected.</div>
                    ) : (
                      <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <table className="data-table" style={{ margin: 0 }}>
                          <thead style={{ background: 'var(--gray-50)' }}>
                            <tr><th>Date</th><th>Method</th><th>Receipt No</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
                          </thead>
                          <tbody>
                            {advances.map(a => (
                              <tr key={a.id}>
                                <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{new Date(a.date).toLocaleDateString()}</td>
                                <td><span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--gray-100)', color: 'var(--gray-700)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>{a.method}</span></td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{a.receipt_no || '—'}</td>
                                <td style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', textAlign: 'right' }}>₹{Number(a.amount).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Charge Modal */}
      {showChargeModal && (
        <AddChargeModal 
          onClose={() => setShowChargeModal(false)} 
          onSave={handleAddCharge} 
        />
      )}

      {/* Add Advance Modal */}
      {showAdvanceModal && (
        <AddAdvanceModal 
          onClose={() => setShowAdvanceModal(false)} 
          onSave={handleAddAdvance} 
        />
      )}

      {/* Final Bill Modal */}
      {showFinalBill && (
        <FinalBillModal 
          patient={selectedPatient}
          charges={charges}
          advances={advances}
          onClose={() => setShowFinalBill(false)} 
          onSettle={handleFinalSettle} 
        />
      )}
    </div>
  )
}

function AddChargeModal({ onClose, onSave }) {
  const [form, setForm] = useState({ category: CHARGE_CATEGORIES[0], description: '', qty: 1, rate: '' })

  const handleSubmit = () => {
    if (!form.description || !form.rate) return alert('Description and Rate are required')
    const amount = Number(form.qty) * Number(form.rate)
    onSave({ ...form, amount })
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h4>Add IP Charge</h4>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CHARGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description / Service Name</label>
            <input className="form-input" placeholder="e.g. ICU Bed Rent (Day 1)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Quantity / Days</label>
              <input className="form-input" type="number" min="1" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Rate (₹)</label>
              <input className="form-input" type="number" placeholder="0" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} />
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', textAlign: 'right', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Total Amount:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)', marginLeft: '0.5rem' }}>
              ₹{((Number(form.qty)||0) * (Number(form.rate)||0)).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Add Charge</button>
        </div>
      </div>
    </div>
  )
}

function AddAdvanceModal({ onClose, onSave }) {
  const [form, setForm] = useState({ amount: '', method: 'Cash', receipt_no: `REC-${Math.floor(Math.random()*10000)}` })

  const handleSubmit = () => {
    if (!form.amount) return alert('Amount is required')
    onSave(form)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h4>Collect Advance Deposit</h4>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" type="number" placeholder="e.g. 10000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-input form-select" value={form.method} onChange={e => setForm({...form, method: e.target.value})}>
              {['Cash', 'Card', 'UPI', 'NEFT/RTGS'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Receipt Number</label>
            <input className="form-input" value={form.receipt_no} onChange={e => setForm({...form, receipt_no: e.target.value})} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background: '#10b981' }} onClick={handleSubmit}>Collect Advance</button>
        </div>
      </div>
    </div>
  )
}

function FinalBillModal({ patient, charges, advances, onClose, onSettle }) {
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')

  const totalCharges = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const totalAdvances = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0)
  const subTotal = Math.max(0, totalCharges - discount)
  const netPayable = Math.max(0, subTotal - totalAdvances)

  // Group charges by category for summary
  const groupedCharges = CHARGE_CATEGORIES.map(cat => {
    const sum = charges.filter(c => c.category === cat).reduce((s, c) => s + Number(c.amount), 0)
    return { category: cat, sum }
  }).filter(g => g.sum > 0)

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--primary-600)" /> Final Discharge Bill</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>Review charges and settle account for {patient.name}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="grid grid-2" style={{ gap: '2rem', gridTemplateColumns: '1fr 320px' }}>
            
            {/* Left: Summary */}
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', marginBottom: '1rem' }}>Charge Summary</h5>
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <tbody>
                  {groupedCharges.map(g => (
                    <tr key={g.category}>
                      <td style={{ padding: '0.5rem 0', color: 'var(--gray-700)', borderBottom: '1px solid var(--gray-100)' }}>{g.category}</td>
                      <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'var(--gray-900)', textAlign: 'right', borderBottom: '1px solid var(--gray-100)' }}>₹{g.sum.toLocaleString()}</td>
                    </tr>
                  ))}
                  {groupedCharges.length === 0 && (
                    <tr><td colSpan={2} style={{ color: 'var(--gray-400)', padding: '1rem 0' }}>No charges recorded.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ padding: '1rem 0 0.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>Total Gross Amount</td>
                    <td style={{ padding: '1rem 0 0.5rem', fontWeight: 800, color: 'var(--gray-900)', textAlign: 'right' }}>₹{totalCharges.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Right: Settlement */}
            <div style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Total Gross</label>
                <span style={{ fontWeight: 700 }}>₹{totalCharges.toLocaleString()}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Discount (₹)</label>
                <input className="form-input" type="number" style={{ width: 100, textAlign: 'right', padding: '0.25rem 0.5rem' }} value={discount} onChange={e => setDiscount(Number(e.target.value))} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--gray-200)' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Advances Paid</label>
                <span style={{ fontWeight: 700, color: '#10b981' }}>- ₹{totalAdvances.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gray-900)' }}>Net Payable</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: netPayable > 0 ? '#dc2626' : '#10b981' }}>₹{netPayable.toLocaleString()}</span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Payment Method</label>
                <select className="form-input form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  {['Cash', 'Card', 'UPI', 'Insurance/TPA'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

          </div>
        </div>
        
        <div className="modal-footer" style={{ borderTop: '1px solid var(--gray-200)' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSettle({ discount, paymentMethod, amountPaid: netPayable })}>
            <CheckCircle size={14} /> Settle Bill & Discharge
          </button>
        </div>
      </div>
    </div>
  )
}

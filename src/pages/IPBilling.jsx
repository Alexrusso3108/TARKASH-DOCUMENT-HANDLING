import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Calculator, FileText, CheckCircle, Loader, DollarSign, ArrowRight, ShieldCheck, CreditCard, X, Printer, AlertTriangle, Package as PackageIcon, HeartPulse, Receipt, Download } from 'lucide-react'
import { api } from '../api'

const CHARGE_CATEGORIES = [
  'Room Rent & Boarding',
  'Nursing Charges',
  'Consultation & Visits',
  'OT & Surgeon Charges',
  'Pharmacy & Consumables',
  'Laboratory Investigations',
  'Radiology & Diagnostics',
  'Non-Medical / Misc'
]

const GST_RATES = [0, 5, 12, 18]

const PACKAGES = [
  { id: 'PKG01', name: 'Normal Delivery', cost: 45000, days: 3 },
  { id: 'PKG02', name: 'C-Section Delivery', cost: 75000, days: 5 },
  { id: 'PKG03', name: 'CABG (Bypass Surgery)', cost: 250000, days: 7 },
  { id: 'PKG04', name: 'Total Knee Replacement', cost: 180000, days: 5 },
]

export default function IPBilling() {
  const [ipPatients, setIpPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // overview, charges, advances, insurance, bill

  // Patient Billing Data
  const [charges, setCharges] = useState([])
  const [advances, setAdvances] = useState([])
  const [insurance, setInsurance] = useState(null)
  const [activePackage, setActivePackage] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)

  // Forms
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [showInsuranceModal, setShowInsuranceModal] = useState(false)
  const [showPackageModal, setShowPackageModal] = useState(false)

  const fetchAdmittedPatients = useCallback(async () => {
    setLoading(true)
    try {
      const beds = await api.getBeds()
      const occupied = beds.filter(b => b.status === 'occupied')
      setIpPatients(occupied.map(b => ({
        id: b.patient_id || 'UNK',
        bed_id: b.id,
        name: b.patient_name || 'Unknown Patient',
        ward: `${b.ward} - Bed ${b.id}`,
        doctor: b.doctor_name || 'General Physician',
        admitted_at: b.admitted_at || new Date().toISOString(),
        payment_type: b.patient_id?.includes('INS') ? 'TPA' : 'Cash'
      })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAdmittedPatients() }, [fetchAdmittedPatients])

  const fetchBillingData = useCallback(async (patientId) => {
    if (!patientId) return
    setDataLoading(true)
    try {
      const notes = await api.getClinicalNotes(patientId)
      
      const parsedCharges = notes.filter(n => n.note_type === 'IP_CHARGE').map(n => ({ ...JSON.parse(n.content), id: n.id, date: n.created_at }))
      const parsedAdvances = notes.filter(n => n.note_type === 'IP_ADVANCE').map(n => ({ ...JSON.parse(n.content), id: n.id, date: n.created_at }))
      const insRec = notes.filter(n => n.note_type === 'IP_INSURANCE').pop()
      const pkgRec = notes.filter(n => n.note_type === 'IP_PACKAGE').pop()

      setCharges(parsedCharges)
      setAdvances(parsedAdvances)
      setInsurance(insRec ? JSON.parse(insRec.content) : null)
      setActivePackage(pkgRec ? JSON.parse(pkgRec.content) : null)
    } catch (e) {
      console.error(e)
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPatient) fetchBillingData(selectedPatient.id)
  }, [selectedPatient, fetchBillingData])

  // Financial Calculations
  const calculateGross = () => charges.reduce((sum, c) => sum + (Number(c.amount) || 0) + (Number(c.gstAmount) || 0), 0)
  
  const totalGross = activePackage ? activePackage.cost + charges.filter(c => !c.includedInPackage).reduce((s, c) => s + (Number(c.amount) || 0) + (Number(c.gstAmount)||0), 0) : calculateGross()
  
  const totalAdvances = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0)
  
  const insuranceApproved = insurance?.status === 'Approved' ? Number(insurance.approvedAmount) : 0
  const nonMedicalDeductions = insurance?.status === 'Approved' ? Number(insurance.nonMedicalAmount || 0) : 0

  const netPayable = Math.max(0, totalGross - totalAdvances - insuranceApproved + nonMedicalDeductions)
  const lowBalanceAlert = totalGross > 0 && (totalAdvances + insuranceApproved) < (totalGross * 0.2) // Warn if less than 20% covered

  const handleAddRecord = async (type, data) => {
    await api.createClinicalNote({ patient_id: selectedPatient.id, doctor_id: 'SYSTEM', note_type: type, content: JSON.stringify(data) })
    fetchBillingData(selectedPatient.id)
    setShowChargeModal(false); setShowAdvanceModal(false); setShowInsuranceModal(false); setShowPackageModal(false)
  }

  const handleFinalSettle = async (finalData) => {
    try {
      await api.createBilling({
        patient_id: selectedPatient.id,
        type: 'IPD',
        total_amount: totalGross,
        paid_amount: finalData.amountPaid,
        payment_method: finalData.paymentMethod,
        notes: JSON.stringify({ breakdown: charges, advances: advances, netPayable, isDetailedIP: true })
      })
      await api.updateBed(selectedPatient.bed_id, { status: 'available', patient_id: null })
      alert('Discharge Bill Generated Successfully.')
      setSelectedPatient(null); fetchAdmittedPatients()
    } catch (e) { alert('Failed: ' + e.message) }
  }

  const filteredPatients = ipPatients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="animate-fadeInUp" style={{ height: 'calc(100vh - 6rem)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">IP Billing Module (Indian HMS)</h1>
          <p className="page-subtitle">Manage inpatient running bills, TPA claims, HSN/SAC GST, and final settlements</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Left Side: Patient List */}
        <div style={{ width: 340, background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="form-input" style={{ paddingLeft: '2.25rem', background: 'var(--gray-50)' }} placeholder="Search IP number or name..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}><Loader className="spin" /></div> : filteredPatients.map(p => (
              <div 
                key={p.bed_id} onClick={() => { setSelectedPatient(p); setActiveTab('overview') }}
                style={{ padding: '1.25rem', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer', background: selectedPatient?.bed_id === p.bed_id ? 'var(--primary-50)' : '#fff', borderLeft: `4px solid ${selectedPatient?.bed_id === p.bed_id ? 'var(--primary-600)' : 'transparent'}` }}
              >
                <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 4 }}>IP No: <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{p.id}</span></div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 8 }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 4, background: 'var(--gray-100)' }}>{p.ward}</span>
                  {p.payment_type === 'TPA' && <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#4338ca', fontWeight: 600 }}><ShieldCheck size={10} style={{display:'inline'}}/> TPA</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Billing Dashboard */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedPatient ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
              <Calculator size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Select a patient to manage IP Billing</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)' }}>{selectedPatient.name}</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: 4, display: 'flex', gap: '1rem' }}>
                    <span>IP No: <strong>{selectedPatient.id}</strong></span>
                    <span>DOA: <strong>{new Date(selectedPatient.admitted_at).toLocaleDateString('en-IN')}</strong></span>
                    <span>Ward: <strong>{selectedPatient.ward}</strong></span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('bill')}><Printer size={14}/> Interim Bill</button>
                  <button className="btn btn-primary" onClick={() => setActiveTab('bill')}><CheckCircle size={14}/> Discharge Settlement</button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                {['Overview', 'Charges', 'Advances', 'Insurance / TPA', 'Packages'].map(tab => {
                  const key = tab.split(' ')[0].toLowerCase()
                  return (
                    <button key={key} onClick={() => setActiveTab(key)}
                      style={{ padding: '1rem 1.5rem', border: 'none', background: 'transparent', fontWeight: activeTab === key ? 700 : 500, color: activeTab === key ? 'var(--primary-700)' : 'var(--gray-600)', borderBottom: `2.5px solid ${activeTab === key ? 'var(--primary-600)' : 'transparent'}`, cursor: 'pointer' }}>
                      {tab}
                    </button>
                  )
                })}
              </div>

              {/* Main Content Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="animate-fadeInUp">
                    {lowBalanceAlert && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', fontWeight: 600 }}>
                        <AlertTriangle size={18} /> ALERT: Patient's running bill has exceeded deposits. Request advance payment.
                      </div>
                    )}
                    <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '2rem' }}>
                      <div className="card" style={{ padding: '1.25rem', background: 'var(--gray-50)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Gross Amount</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>₹{totalGross.toLocaleString()}</div>
                      </div>
                      <div className="card" style={{ padding: '1.25rem', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                        <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Total Advances</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4, color: '#059669' }}>₹{totalAdvances.toLocaleString()}</div>
                      </div>
                      <div className="card" style={{ padding: '1.25rem', background: '#eef2ff', borderColor: '#c7d2fe' }}>
                        <div style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 600, textTransform: 'uppercase' }}>TPA Approved</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4, color: '#4338ca' }}>₹{insuranceApproved.toLocaleString()}</div>
                      </div>
                      <div className="card" style={{ padding: '1.25rem', background: 'var(--primary-600)', color: '#fff' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.9 }}>Net Payable</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>₹{netPayable.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Admission Details</h3>
                    <div className="card" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div><span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Primary Consultant:</span> <strong style={{ marginLeft: 8 }}>{selectedPatient.doctor}</strong></div>
                      <div><span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Current Bed/Ward:</span> <strong style={{ marginLeft: 8 }}>{selectedPatient.ward}</strong></div>
                      <div><span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Billing Type:</span> <strong style={{ marginLeft: 8 }}>{selectedPatient.payment_type}</strong></div>
                      <div><span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Active Package:</span> <strong style={{ marginLeft: 8, color: activePackage ? 'var(--primary-700)' : 'var(--gray-600)' }}>{activePackage ? activePackage.name : 'None (Tariff Billing)'}</strong></div>
                    </div>
                  </div>
                )}

                {/* CHARGES TAB */}
                {activeTab === 'charges' && (
                  <div className="animate-fadeInUp">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Itemized Charges Tracker</h3>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowChargeModal(true)}><Plus size={14}/> Add Charge</button>
                    </div>
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Category</th><th>Description/HSN</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {charges.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No charges recorded</td></tr> : null}
                        {charges.map(c => (
                          <tr key={c.id}>
                            <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{new Date(c.date).toLocaleDateString()}</td>
                            <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.category}</td>
                            <td>
                              <div style={{ fontSize: '0.85rem', color: 'var(--gray-800)' }}>{c.description}</div>
                              {c.hsn && <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>HSN/SAC: {c.hsn}</div>}
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{c.qty}</td>
                            <td style={{ fontSize: '0.85rem' }}>₹{c.rate}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{c.gstRate}% (₹{c.gstAmount})</td>
                            <td style={{ fontWeight: 700 }}>₹{(Number(c.amount) + Number(c.gstAmount)).toLocaleString()}</td>
                            <td>
                              {c.includedInPackage ? <span style={{ fontSize: '0.7rem', background: '#fef08a', color: '#854d0e', padding: '0.15rem 0.4rem', borderRadius: 4 }}>In Package</span> : <span style={{ fontSize: '0.7rem', background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>Billable</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ADVANCES TAB */}
                {activeTab === 'advances' && (
                  <div className="animate-fadeInUp">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Advance Deposits & Receipts</h3>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowAdvanceModal(true)} style={{ background: '#10b981', borderColor: '#10b981' }}><DollarSign size={14}/> Collect Advance</button>
                    </div>
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Receipt No</th><th>Payment Mode</th><th>Collected By</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                      <tbody>
                        {advances.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>No deposits collected</td></tr> : null}
                        {advances.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{new Date(a.date).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 600, color: 'var(--primary-700)' }}>{a.receipt_no}</td>
                            <td><span style={{ fontSize: '0.75rem', background: 'var(--gray-100)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>{a.method}</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{a.collected_by || 'Admin'}</td>
                            <td style={{ fontWeight: 700, color: '#10b981', textAlign: 'right' }}>₹{Number(a.amount).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* INSURANCE / TPA TAB */}
                {activeTab === 'insurance' && (
                  <div className="animate-fadeInUp">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Pre-Authorization & Claims</h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowInsuranceModal(true)}><ShieldCheck size={14}/> Update TPA Status</button>
                    </div>
                    {insurance ? (
                      <div className="card" style={{ padding: '1.5rem' }}>
                        <div className="grid grid-2" style={{ gap: '2rem' }}>
                          <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 4 }}>TPA Company / Corporate</p>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{insurance.tpaName}</h4>
                            
                            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '1rem', marginBottom: 4 }}>Policy / Card Number</p>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{insurance.policyNo}</h4>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 4 }}>Pre-Auth Status</p>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: 999, background: insurance.status === 'Approved' ? '#d1fae5' : '#fef3c7', color: insurance.status === 'Approved' ? '#059669' : '#b45309' }}>{insurance.status}</span>
                            
                            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '1rem', marginBottom: 4 }}>Approved Claim Amount</p>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>₹{insuranceApproved.toLocaleString()}</h4>
                            
                            {nonMedicalDeductions > 0 && (
                              <p style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: 8 }}>Patient Co-pay / Non-Medical: <strong>₹{nonMedicalDeductions.toLocaleString()}</strong></p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
                        <ShieldCheck size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <p style={{ color: 'var(--gray-500)' }}>No Insurance/TPA details logged for this patient.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* PACKAGES TAB */}
                {activeTab === 'packages' && (
                  <div className="animate-fadeInUp">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Treatment Packages</h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowPackageModal(true)}><PackageIcon size={14}/> Apply Package</button>
                    </div>
                    {activePackage ? (
                      <div className="card" style={{ padding: '1.5rem', background: 'var(--primary-50)', borderColor: 'var(--primary-200)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--primary-600)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: 4 }}>ACTIVE</span>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)', marginTop: 8 }}>{activePackage.name}</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: 4 }}>Includes {activePackage.days} days Room Rent, Surgeon Fees, and standard OT meds.</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Package Cost</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-700)' }}>₹{activePackage.cost.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
                        <PackageIcon size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <p style={{ color: 'var(--gray-500)' }}>Patient is on standard Tariff Billing.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* FINAL BILL / INVOICE TAB */}
                {activeTab === 'bill' && (
                  <div className="animate-fadeInUp" style={{ maxWidth: 850, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Interim / Final Invoice</h3>
                      <button className="btn btn-secondary btn-sm"><Download size={14}/> Download PDF</button>
                    </div>
                    
                    <div className="card" style={{ padding: '2rem', background: '#fff' }}>
                      {/* Invoice Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--gray-800)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>DScribe Superspeciality Hospital</h2>
                          <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>123 Health Avenue, Medical District, Chennai 600001<br/>GSTIN: 33AAAAA0000A1Z5</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>Tax Invoice</h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: 4 }}>Bill No: INV-{Math.floor(Math.random()*10000)}<br/>Date: {new Date().toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Patient Details */}
                      <div className="grid grid-2" style={{ gap: '2rem', marginBottom: '2rem', fontSize: '0.85rem' }}>
                        <div>
                          <p><strong>Patient Name:</strong> {selectedPatient.name}</p>
                          <p><strong>IP Number:</strong> {selectedPatient.id}</p>
                          <p><strong>Admission Date:</strong> {new Date(selectedPatient.admitted_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p><strong>Primary Doctor:</strong> {selectedPatient.doctor}</p>
                          <p><strong>Billing Category:</strong> {selectedPatient.payment_type}</p>
                          {insurance && <p><strong>TPA Sponsor:</strong> {insurance.tpaName}</p>}
                        </div>
                      </div>

                      {/* Line Items */}
                      <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--gray-100)', borderBottom: '1px solid var(--gray-300)' }}>
                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Particulars</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Qty</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Rate</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>GST</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activePackage && (
                            <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                              <td style={{ padding: '0.75rem' }}><strong>Package: {activePackage.name}</strong><br/><span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>HSN: 999311</span></td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>1</td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>{activePackage.cost.toLocaleString()}</td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>EXEMPT</td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{activePackage.cost.toLocaleString()}</td>
                            </tr>
                          )}
                          {charges.filter(c => !c.includedInPackage).map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                              <td style={{ padding: '0.75rem' }}>{c.description}<br/><span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>HSN: {c.hsn || '999311'}</span></td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>{c.qty}</td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>{c.rate}</td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>{c.gstRate}%</td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{(Number(c.amount) + Number(c.gstAmount)).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals & Settlement */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: 320, fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                            <span>Gross Total</span><strong style={{ fontSize: '1rem' }}>₹{totalGross.toLocaleString()}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#059669', borderBottom: '1px solid var(--gray-100)' }}>
                            <span>Less: Advance Paid</span><strong>- ₹{totalAdvances.toLocaleString()}</strong>
                          </div>
                          {insuranceApproved > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#4338ca', borderBottom: '1px solid var(--gray-100)' }}>
                              <span>Less: TPA Approved</span><strong>- ₹{insuranceApproved.toLocaleString()}</strong>
                            </div>
                          )}
                          {nonMedicalDeductions > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#dc2626', borderBottom: '1px solid var(--gray-100)' }}>
                              <span>Add: Non-Medical (Co-Pay)</span><strong>+ ₹{nonMedicalDeductions.toLocaleString()}</strong>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', marginTop: '0.5rem', background: 'var(--gray-50)', borderTop: '2px solid var(--gray-800)' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>NET PAYABLE</span>
                            <strong style={{ fontSize: '1.25rem', color: netPayable > 0 ? '#dc2626' : '#10b981' }}>₹{netPayable.toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Discharge Button */}
                      <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                        <button className="btn btn-primary" onClick={() => handleFinalSettle({ amountPaid: netPayable, paymentMethod: 'Cash' })}>
                          <CheckCircle size={16}/> Settle & Finalize Discharge
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showChargeModal && (
        <ChargeModal onClose={() => setShowChargeModal(false)} onSave={(d) => handleAddRecord('IP_CHARGE', d)} activePackage={activePackage} />
      )}
      {showAdvanceModal && (
        <AdvanceModal onClose={() => setShowAdvanceModal(false)} onSave={(d) => handleAddRecord('IP_ADVANCE', d)} />
      )}
      {showInsuranceModal && (
        <InsuranceModal onClose={() => setShowInsuranceModal(false)} onSave={(d) => handleAddRecord('IP_INSURANCE', d)} current={insurance} />
      )}
      {showPackageModal && (
        <PackageModal onClose={() => setShowPackageModal(false)} onSave={(d) => handleAddRecord('IP_PACKAGE', d)} />
      )}

    </div>
  )
}

function ChargeModal({ onClose, onSave, activePackage }) {
  const [form, setForm] = useState({ category: CHARGE_CATEGORIES[0], description: '', hsn: '999311', qty: 1, rate: '', gstRate: 0, includedInPackage: false })

  const amount = Number(form.qty) * Number(form.rate)
  const gstAmount = amount * (Number(form.gstRate) / 100)

  const handleSubmit = () => {
    if (!form.description || !form.rate) return alert('Description and Rate required')
    onSave({ ...form, amount, gstAmount })
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h4>Add Itemized Charge</h4><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Charge Category</label>
            <select className="form-input form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CHARGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Service / Description</label>
              <input className="form-input" placeholder="e.g. CBC Test" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">HSN/SAC Code</label>
              <input className="form-input" placeholder="999311" value={form.hsn} onChange={e => setForm({...form, hsn: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-3" style={{ gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Qty</label><input className="form-input" type="number" min="1" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Rate (₹)</label><input className="form-input" type="number" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} /></div>
            <div className="form-group">
              <label className="form-label">GST %</label>
              <select className="form-input form-select" value={form.gstRate} onChange={e => setForm({...form, gstRate: e.target.value})}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
          {activePackage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef08a', padding: '0.75rem', borderRadius: 'var(--radius-lg)' }}>
              <input type="checkbox" id="pkg" checked={form.includedInPackage} onChange={e => setForm({...form, includedInPackage: e.target.checked})} />
              <label htmlFor="pkg" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#854d0e' }}>Mark as Included in Package ({activePackage.name})</label>
            </div>
          )}
          <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Gross Value (inc. GST):</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, marginLeft: 8 }}>₹{(amount + gstAmount).toLocaleString()}</span>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Save Charge</button></div>
      </div>
    </div>
  )
}

function AdvanceModal({ onClose, onSave }) {
  const [form, setForm] = useState({ amount: '', method: 'Cash', receipt_no: `REC-${Math.floor(Math.random()*100000)}` })
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h4>Collect Advance Deposit</h4><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select className="form-input form-select" value={form.method} onChange={e => setForm({...form, method: e.target.value})}>{['Cash', 'Card', 'UPI', 'NEFT/RTGS'].map(c => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="form-group"><label className="form-label">Receipt Number</label><input className="form-input" value={form.receipt_no} readOnly /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" style={{background:'#10b981'}} onClick={() => form.amount ? onSave(form) : alert('Enter amount')}>Collect</button></div>
      </div>
    </div>
  )
}

function InsuranceModal({ onClose, onSave, current }) {
  const [form, setForm] = useState(current || { tpaName: '', policyNo: '', status: 'Pending', approvedAmount: '', nonMedicalAmount: '' })
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h4>Update TPA / Insurance Claim</h4><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group"><label className="form-label">TPA / Corporate Name</label><input className="form-input" value={form.tpaName} onChange={e => setForm({...form, tpaName: e.target.value})} placeholder="e.g. Star Health"/></div>
          <div className="form-group"><label className="form-label">Policy No / Member ID</label><input className="form-input" value={form.policyNo} onChange={e => setForm({...form, policyNo: e.target.value})} /></div>
          <div className="form-group">
            <label className="form-label">Pre-Auth Status</label>
            <select className="form-input form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{['Pending', 'Approved', 'Rejected'].map(c => <option key={c}>{c}</option>)}</select>
          </div>
          {form.status === 'Approved' && (
            <div className="grid grid-2" style={{ gap: '1rem' }}>
              <div className="form-group"><label className="form-label">Approved Amount (₹)</label><input className="form-input" type="number" value={form.approvedAmount} onChange={e => setForm({...form, approvedAmount: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Patient Co-pay (Non-Medical)</label><input className="form-input" type="number" value={form.nonMedicalAmount} onChange={e => setForm({...form, nonMedicalAmount: e.target.value})} /></div>
            </div>
          )}
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => onSave(form)}>Save Details</button></div>
      </div>
    </div>
  )
}

function PackageModal({ onClose, onSave }) {
  const [selectedPkg, setSelectedPkg] = useState(PACKAGES[0])
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h4>Assign Treatment Package</h4><button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16}/></button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Select Package</label>
            <select className="form-input form-select" onChange={e => setSelectedPkg(PACKAGES.find(p => p.id === e.target.value))}>
              {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name} - ₹{p.cost.toLocaleString()}</option>)}
            </select>
          </div>
          <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.85rem', color: 'var(--gray-700)' }}>
            <strong>Includes:</strong> {selectedPkg.days} Days Room Rent, Surgeon Fee, standard medicines.<br/>
            <em>Note: Any items marked as 'Excluded' will be billed separately.</em>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => onSave(selectedPkg)}>Apply Package</button></div>
      </div>
    </div>
  )
}

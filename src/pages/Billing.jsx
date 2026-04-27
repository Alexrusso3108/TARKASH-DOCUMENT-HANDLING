import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Receipt, X, CheckCircle, Download, Loader, Activity, ShieldCheck, ArrowRight, CreditCard, Stethoscope, FileText, Calculator, Pill, FlaskConical } from 'lucide-react'
import { api } from '../api'

const STATUS_STYLES = {
  Paid: { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Paid' },
  Pending: { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Pending' },
  Partial: { bg: 'rgba(99,102,241,0.1)', color: '#4338ca', label: 'Partial' },
  Overdue: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Overdue' },
}

function BillModal({ bill, onClose, onMarkPaid }) {
  if (!bill) return null
  const total = Number(bill.total_amount) || 0
  const paid = Number(bill.paid_amount) || 0
  const balance = total - paid

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Invoice {bill.id}</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
              {bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-IN') : '—'} · {bill.type}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm"><Download size={13} /> Download PDF</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-xl)', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)' }}>{bill.patient_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{bill.patient_id}</div>
              {bill.payment_method && <div style={{ fontSize: '0.8rem', color: 'var(--primary-600)', marginTop: '0.25rem', fontWeight: 600 }}>Payment: {bill.payment_method}</div>}
            </div>
            <span style={{ background: STATUS_STYLES[bill.status]?.bg, color: STATUS_STYLES[bill.status]?.color, fontSize: '0.875rem', fontWeight: 700, padding: '0.375rem 0.875rem', borderRadius: 999, alignSelf: 'flex-start' }}>
              {STATUS_STYLES[bill.status]?.label || bill.status}
            </span>
          </div>
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', maxWidth: 320, marginLeft: 'auto' }}>
            {[
              ['Total Amount', `Rs ${total.toLocaleString()}`],
              ['Amount Paid', `Rs ${paid.toLocaleString()}`],
              ['Balance Due', `Rs ${balance.toLocaleString()}`],
            ].map(([label, val], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: i === 2 && balance > 0 ? '#dc2626' : 'var(--gray-600)' }}>
                <span>{label}</span><span style={{ fontWeight: i === 2 ? 800 : 600 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {bill.status !== 'Paid' && (
            <button className="btn btn-teal" onClick={() => onMarkPaid(bill.id)}>
              <CheckCircle size={14} /> Mark as Paid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function NewBillModal({ patients, onClose, onSave }) {
  const [form, setForm] = useState({ patient_id: '', total_amount: '', paid_amount: '', payment_method: 'Cash', type: 'OPD' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const h = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.patient_id || !form.total_amount) { setError('Patient and total amount are required.'); return }
    setSaving(true); setError(null)
    try {
      const bill = await api.createBilling({ ...form, total_amount: parseFloat(form.total_amount), paid_amount: parseFloat(form.paid_amount) || 0 })
      onSave(bill); onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 700 }}>Generate Invoice</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>Create a billing record for a patient</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Patient*</label>
              <select className="form-input form-select" value={form.patient_id} onChange={e => h('patient_id', e.target.value)}>
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Billing Type</label>
              <select className="form-input form-select" value={form.type} onChange={e => h('type', e.target.value)}>
                <option>OPD</option><option>IPD</option><option>Lab</option><option>Pharmacy</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Total Amount (Rs)*</label>
              <input className="form-input" type="number" placeholder="e.g. 5000" value={form.total_amount} onChange={e => h('total_amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount Paid (Rs)</label>
              <input className="form-input" type="number" placeholder="e.g. 2500" value={form.paid_amount} onChange={e => h('paid_amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-input form-select" value={form.payment_method} onChange={e => h('payment_method', e.target.value)}>
                {['Cash', 'Card', 'UPI', 'Insurance', 'Cheque', 'NEFT'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <Plus size={14} />} Generate Invoice
          </button>
        </div>
      </div>
    </div>
  )
}

function IPBillingModal({ patient, onClose, onSave }) {
  const [charges, setCharges] = useState({
    roomRent: 0,
    nursing: 0,
    consultation: 0,
    pharmacy: 0,
    laboratory: 0,
    radiology: 0,
    otCharges: 0,
    miscellaneous: 0,
  })
  const [concession, setConcession] = useState(0)
  const [advance, setAdvance] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [saving, setSaving] = useState(false)

  const h = (k, v) => setCharges(c => ({ ...c, [k]: Number(v) || 0 }))

  const totalGross = Object.values(charges).reduce((a, b) => a + b, 0)
  const netPayable = Math.max(0, totalGross - concession - advance)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const bill = await api.createBilling({
        patient_id: patient.id,
        type: 'IPD',
        total_amount: totalGross,
        paid_amount: netPayable > 0 ? netPayable : 0,
        payment_method: paymentMethod,
        notes: JSON.stringify({ breakdown: charges, concession, advance, netPayable, isDetailedIP: true })
      })
      onSave(bill)
      onClose()
    } catch (e) { 
      alert('Failed to generate IP Bill: ' + e.message) 
    } finally { 
      setSaving(false) 
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: 800 }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ color: 'var(--gray-900)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calculator size={18} color="var(--primary-600)" /> Final IP Discharge Bill
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 4 }}>
              Patient: <strong>{patient.name} ({patient.id})</strong> | Ward: {patient.ward}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
          <div className="grid grid-2" style={{ gap: '1.5rem', gridTemplateColumns: '1fr 340px' }}>
            {/* Left Column: Charges Breakdown */}
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Itemized Charge Breakdown (Rs)</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { key: 'roomRent', label: 'Room Rent / Bed Charges' },
                  { key: 'nursing', label: 'Nursing & Service Charges' },
                  { key: 'consultation', label: 'Doctor Consultation Fees' },
                  { key: 'otCharges', label: 'OT & Procedure Charges' },
                  { key: 'pharmacy', label: 'Pharmacy & Consumables' },
                  { key: 'laboratory', label: 'Laboratory Investigations' },
                  { key: 'radiology', label: 'Radiology / Diagnostics' },
                  { key: 'miscellaneous', label: 'Miscellaneous (Diet, Bio-Waste)' },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--gray-100)', paddingBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--gray-800)', fontWeight: 500, flex: 1 }}>{item.label}</label>
                    <input className="form-input" type="number" min="0" style={{ width: 120, textAlign: 'right', padding: '0.3rem 0.5rem', fontWeight: 600, fontSize: '0.9rem' }} value={charges[item.key] || ''} onChange={e => h(item.key, e.target.value)} placeholder="0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Adjustments & Total */}
            <div style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--gray-200)', alignSelf: 'start' }}>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Settlement Summary</h5>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1rem' }}>
                <span style={{ color: 'var(--gray-600)' }}>Total Gross Amount</span>
                <span style={{ fontWeight: 800, color: 'var(--gray-900)' }}>Rs {totalGross.toLocaleString()}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>Discount / Concession</label>
                <input className="form-input" type="number" min="0" style={{ width: 110, textAlign: 'right', padding: '0.4rem 0.6rem', borderColor: '#f59e0b', fontWeight: 700 }} value={concession || ''} onChange={e => setConcession(Number(e.target.value))} placeholder="0" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>Advance Paid (Deposit)</label>
                <input className="form-input" type="number" min="0" style={{ width: 110, textAlign: 'right', padding: '0.4rem 0.6rem', borderColor: '#10b981', fontWeight: 700 }} value={advance || ''} onChange={e => setAdvance(Number(e.target.value))} placeholder="0" />
              </div>

              <div style={{ height: 1, background: 'var(--gray-300)', margin: '1.25rem 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--gray-900)' }}>Net Payable</span>
                <span style={{ fontWeight: 900, fontSize: '1.5rem', color: netPayable > 0 ? '#dc2626' : '#10b981', letterSpacing: '-0.02em' }}>Rs {netPayable.toLocaleString()}</span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Payment Method</label>
                <select className="form-input form-select" style={{ fontWeight: 600 }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  {['Cash', 'Card', 'UPI', 'Insurance/TPA', 'Cheque', 'NEFT'].map(m => <option key={m}>{m}</option>)}
                </select>
                {paymentMethod === 'Insurance/TPA' && (
                  <div style={{ fontSize: '0.75rem', color: '#4338ca', marginTop: '0.5rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: 6 }}>
                    This will be recorded as pending until TPA settlement is reconciled.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--gray-200)', marginTop: '1rem', paddingTop: '1.25rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader size={14} className="spin" /> : <CheckCircle size={14} />} Finalize & Generate Bill
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Billing() {
  const [bills, setBills] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedBill, setSelectedBill] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('op') // 'op' or 'ip'
  const [selectedIpBillPatient, setSelectedIpBillPatient] = useState(null)

  // IP Discharge Queue (Actual Admitted Patients)
  const [ipQueue, setIpQueue] = useState([])

  const IP_STEPS = [
    'Discharge Advised',
    'Clinical Summary',
    'Pharmacy Clearance',
    'Laboratory Clearance',
    'Final Billing',
    'Settle & Vacate'
  ]

  const advanceIpWorkflow = async (bedId, currentStep) => {
    if (currentStep >= IP_STEPS.length - 1) return
    try {
      const next = currentStep + 1
      const updated = await api.updateDischargeStep(bedId, { step: next, status: IP_STEPS[next] })
      setIpQueue(prev => prev.map(p => p.bed_id === bedId ? { ...p, step: updated.discharge_step, status: updated.discharge_status } : p))
    } catch (e) { alert('Update failed: ' + e.message) }
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (search) params.search = search
      const data = await api.getBilling(params)
      setBills(data)

      // Fetch actual admitted IP patients from Ward/Beds
      const allBeds = await api.getBeds()
      const occupied = allBeds.filter(b => b.status === 'occupied')
      
      setIpQueue(occupied.map(b => ({
        id: b.patient_id || 'Unknown',
        bed_id: b.id,
        name: b.patient_name || 'Unknown Patient',
        ward: `${b.ward} (${b.id})`,
        type: b.patient_id?.includes('INS') ? 'Insurance' : 'Cash', // Simple heuristic
        doctor: b.doctor_name || 'General Physician',
        step: b.discharge_step || 0,
        status: b.discharge_status || 'Admitted'
      })))

    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  useEffect(() => {
    api.getPatients().then(setPatients).catch(() => { })
  }, [])

  const handleSave = (bill) => setBills(b => [bill, ...b])

  const handleMarkPaid = async (id) => {
    try {
      const updated = await api.updateBilling(id, { status: 'Paid', paid_amount: bills.find(b => b.id === id)?.total_amount })
      setBills(b => b.map(bill => bill.id === id ? { ...bill, ...updated } : bill))
      setSelectedBill(null)
    } catch (e) { alert('Failed to update: ' + e.message) }
  }

  const totalRevenue = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + Number(b.total_amount || 0), 0)
  const totalPending = bills.filter(b => b.status === 'Pending').reduce((s, b) => s + Number(b.total_amount || 0) - Number(b.paid_amount || 0), 0)

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing & Discharge</h1>
          <p className="page-subtitle">Manage OP invoices and track IP discharge workflows</p>
        </div>
        {activeTab === 'op' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Generate Invoice</button>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', marginBottom: '1.5rem', background: '#fff', borderRadius: 'var(--radius-lg)' }}>
        <button 
          onClick={() => setActiveTab('op')}
          style={{ padding: '1rem 1.5rem', background: 'none', border: 'none', borderBottom: `2.5px solid ${activeTab === 'op' ? 'var(--primary-600)' : 'transparent'}`, color: activeTab === 'op' ? 'var(--primary-700)' : 'var(--gray-500)', fontWeight: activeTab === 'op' ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt size={16} /> OP Billing Ledger
        </button>
        <button 
          onClick={() => setActiveTab('ip')}
          style={{ padding: '1rem 1.5rem', background: 'none', border: 'none', borderBottom: `2.5px solid ${activeTab === 'ip' ? 'var(--primary-600)' : 'transparent'}`, color: activeTab === 'ip' ? 'var(--primary-700)' : 'var(--gray-500)', fontWeight: activeTab === 'ip' ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={16} /> IP Billing & Discharge Process
        </button>
      </div>

      {activeTab === 'op' ? (
        <>
          <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Invoices', val: bills.length, color: 'var(--gray-700)', bg: 'var(--gray-50)' },
          { label: 'Revenue Collected', val: `Rs ${(totalRevenue / 100000).toFixed(1)}L`, color: '#059669', bg: 'rgba(16,185,129,0.06)' },
          { label: 'Pending Amount', val: `Rs ${(totalPending / 100000).toFixed(1)}L`, color: '#b45309', bg: 'rgba(245,158,11,0.06)' },
          { label: 'Partial Payments', val: bills.filter(b => b.status === 'Partial').length, color: '#4338ca', bg: 'rgba(99,102,241,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.375rem', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by patient or invoice ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Paid', 'Pending', 'Partial'].map(f => (
            <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }} onClick={() => setStatusFilter(f)}>
              {STATUS_STYLES[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', color: '#dc2626', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>⚠ {error}</div>}

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Invoice</th><th>Patient</th><th>Type</th><th>Total (Rs)</th><th>Paid (Rs)</th><th>Balance (Rs)</th><th>Payment</th><th>Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                  <Loader size={20} className="spin" style={{ display: 'inline-block' }} />
                </td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No invoices found</td></tr>
              ) : bills.map(bill => {
                const total = Number(bill.total_amount) || 0
                const paid = Number(bill.paid_amount) || 0
                const balance = total - paid
                return (
                  <tr key={bill.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--primary-600)', fontWeight: 600 }}>{bill.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{bill.patient_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{bill.patient_id}</div>
                    </td>
                    <td>
                      <span style={{ background: bill.type === 'IPD' ? 'var(--primary-50)' : 'rgba(13,148,136,0.08)', color: bill.type === 'IPD' ? 'var(--primary-700)' : 'var(--accent-teal)', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>{bill.type}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.9rem' }}>{total.toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: '#059669', fontSize: '0.875rem' }}>{paid.toLocaleString()}</td>
                    <td style={{ fontWeight: balance > 0 ? 700 : 400, color: balance > 0 ? '#dc2626' : 'var(--gray-400)', fontSize: '0.875rem' }}>{balance.toLocaleString()}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{bill.payment_method || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                      {bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td><span style={{ background: STATUS_STYLES[bill.status]?.bg, color: STATUS_STYLES[bill.status]?.color, fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999 }}>{STATUS_STYLES[bill.status]?.label || bill.status}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.625rem', fontSize: '0.75rem' }} onClick={() => setSelectedBill(bill)}>
                        <Receipt size={12} /> View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </div>
        </>
      ) : (
        <div className="grid" style={{ gap: '1.5rem' }}>
          {ipQueue.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '1.5rem', border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{p.name} <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, background: 'var(--gray-100)', color: 'var(--gray-700)' }}>{p.id}</span></h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                    <span>Ward: <strong style={{ color: 'var(--gray-800)' }}>{p.ward}</strong></span>
                    <span>Doctor: <strong>{p.doctor}</strong></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: p.type === 'Insurance' ? '#4338ca' : '#059669', fontWeight: 700 }}>
                      {p.type === 'Insurance' ? <ShieldCheck size={14}/> : <CreditCard size={14}/>} {p.type} Patient
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {p.step >= 4 && p.step <= 5 && (
                    <button 
                      className="btn btn-sm btn-secondary" 
                      style={{ background: '#fff', borderColor: 'var(--primary-600)', color: 'var(--primary-700)' }}
                      onClick={() => setSelectedIpBillPatient(p)}
                    >
                      <Calculator size={14} /> Generate IP Bill
                    </button>
                  )}
                  <button 
                    className={`btn btn-sm ${p.step >= IP_STEPS.length - 1 ? 'btn-ghost' : 'btn-primary'}`} 
                    disabled={p.step >= IP_STEPS.length - 1}
                    onClick={() => advanceIpWorkflow(p.bed_id, p.step)}
                  >
                    {p.step >= IP_STEPS.length - 1 ? 'Discharged' : 'Advance Workflow'} <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Progress Stepper */}
              <div style={{ display: 'flex', position: 'relative', marginTop: '1rem', gap: '0.5rem' }}>
                {IP_STEPS.map((stepName, idx) => {
                  const isCompleted = idx < p.step;
                  const isActive = idx === p.step;
                  let stepColor = isCompleted ? '#10b981' : isActive ? 'var(--primary-600)' : 'var(--gray-200)';
                  
                  return (
                    <div key={stepName} style={{ flex: 1, position: 'relative' }}>
                      <div style={{ height: 6, background: stepColor, borderRadius: 999, marginBottom: '0.5rem', transition: 'background 0.3s' }}></div>
                      <div style={{ fontSize: '0.7rem', fontWeight: isActive ? 800 : 600, color: isCompleted || isActive ? 'var(--gray-800)' : 'var(--gray-400)', lineHeight: 1.2 }}>{stepName}</div>
                                     {/* Workflow Details per Step */}
                      {isActive && (
                        <div className="animate-fadeInUp" style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-lg)', marginTop: '0.75rem', border: '1px solid var(--gray-200)' }}>
                          {idx === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}><Stethoscope size={12}/> Treating doctor advises discharge. Ward in-charge notified.</span>}
                          {idx === 1 && <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}><Activity size={12}/> Compiling medical records and final clinical notes into Discharge Summary.</span>}
                          {idx === 2 && <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}><Pill size={12}/> Returning unused meds and generating final pharmacy clearance bill.</span>}
                          {idx === 3 && <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}><FlaskConical size={12}/> Verifying all pending lab tests are completed and reports attached.</span>}
                          {idx === 4 && <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}><Receipt size={12}/> Billing department calculating final invoice including bed, meds, and tests.</span>}
                          {idx === 5 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-700)' }}>
                              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Billing & Settlement</p>
                              {p.type === 'Cash' ? (
                                <span style={{ color: '#059669', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>Settle final bill amount directly via Cash/Card/UPI.</span>
                              ) : (
                                <span style={{ color: '#4338ca', background: 'rgba(99,102,241,0.1)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>Awaiting TPA approval for claim settlement (2-6 hours).</span>
                              )}
                            </div>
                          )}
                          {idx === 6 && <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}><CheckCircle size={12}/> All clearances received. Final gate pass issued. Room vacated.</span>}
                        </div>
                      )}       )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBill && <BillModal bill={selectedBill} onClose={() => setSelectedBill(null)} onMarkPaid={handleMarkPaid} />}
      {showModal && <NewBillModal patients={patients} onClose={() => setShowModal(false)} onSave={handleSave} />}
      {selectedIpBillPatient && <IPBillingModal patient={selectedIpBillPatient} onClose={() => setSelectedIpBillPatient(null)} onSave={(bill) => {
        handleSave(bill);
        setActiveTab('op'); // Switch to OP tab to view the generated bill
      }} />}
    </div>
  )
}

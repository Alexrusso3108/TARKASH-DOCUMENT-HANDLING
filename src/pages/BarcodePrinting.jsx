import { useState, useEffect } from 'react'
import {
  Printer, Search, Hash, RefreshCw, X, Loader, Users, CheckCircle, Package
} from 'lucide-react'
import { api } from '../api'

const BARCODE_TYPES = [
  { id: '1d', label: '1D Barcode (Code-128)' },
  { id: 'qr', label: '2D QR Code' }
]

function BarcodePreview({ patient, type, size }) {
  if (!patient) return null

  const getDims = () => {
    switch (size) {
      case 'wristband': return { w: 250, h: 40, showDetails: true, compact: true }
      case 'vial': return { w: 100, h: 30, showDetails: false, compact: true }
      case 'file': return { w: 200, h: 60, showDetails: true, compact: false }
      case 'custom': return { w: 180, h: 50, showDetails: true, compact: false }
      default: return { w: 200, h: 50, showDetails: true, compact: false }
    }
  }

  const { w, h, showDetails, compact } = getDims()

  // We use placeholder images since actual barcode gen requires a library like bwip-js or react-barcode,
  // but we can simulate the UI. For QR we use qrserver API.
  const barcodeUrl = type === 'qr'
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(patient.id)}&size=${w}x${w}`
    : `https://barcode.tec-it.com/barcode.ashx?data=${patient.id}&code=Code128&dpi=96&dataseparator=`

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--gray-200)', padding: compact ? '0.5rem' : '1rem',
      borderRadius: 'var(--radius-md)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
      width: type === 'qr' ? 'auto' : w + (compact ? 20 : 40), cursor: 'pointer'
    }}>
      {showDetails && !compact && (
        <div style={{ alignSelf: 'flex-start', fontSize: '0.625rem', fontWeight: 700, color: 'var(--gray-900)' }}>
          {patient.name}
        </div>
      )}
      
      {type === 'qr' ? (
        <img src={barcodeUrl} alt="QR" style={{ width: compact ? 60 : 100, height: compact ? 60 : 100 }} />
      ) : (
        <img src={barcodeUrl} alt="1D Barcode" style={{ width: w, height: h, objectFit: 'contain' }} className="barcode-img" />
      )}
      
      {showDetails && (
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.55rem', color: 'var(--gray-500)', fontWeight: 600 }}>
          <span>{patient.id}</span>
          {!compact && <span>· {patient.age}Y/{patient.gender?.[0]}</span>}
        </div>
      )}
    </div>
  )
}

export default function BarcodePrinting() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedList, setSelectedList] = useState([]) // For batch printing
  
  const [bType, setBType] = useState('1d')
  const [bSize, setBSize] = useState('file')
  const [copies, setCopies] = useState(1)

  useEffect(() => {
    setLoading(true)
    api.getPatients().then(p => { setPatients(p); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = patients.filter(p => 
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.id?.includes(search)
  ).slice(0, 50)

  const toggleSelect = (p) => {
    setSelectedList(prev => prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p])
  }

  const handlePrint = () => {
    if (selectedList.length === 0) { alert('Select patients to print'); return }
    window.print()
  }

  return (
    <div className="animate-fadeInUp">
      <div className="page-header print-hide">
        <div>
          <h1 className="page-title">Barcode Printing</h1>
          <p className="page-subtitle">Print patient identification barcodes for files, wristbands, and lab samples</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} /> Print Selected ({selectedList.length})
          </button>
        </div>
      </div>

      <div className="grid print-hide" style={{ gridTemplateColumns: 'minmax(300px, 1fr) 320px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left: Patient List */}
        <div className="card">
          <div className="card-header">
            <h5 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Select Patients</h5>
            <div style={{ position: 'relative', width: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input className="form-input" style={{ paddingLeft: '2.25rem', height: 32, fontSize: '0.8rem' }} placeholder="Search UHID / Name…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          
          <div style={{ maxHeight: 600, overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-400)' }}><Loader className="spin" size={20} /></div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-400)' }}>No patients found</div>
            ) : (
              <table className="data-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input type="checkbox" onChange={e => setSelectedList(e.target.checked ? filtered : [])} checked={selectedList.length === filtered.length && filtered.length > 0} />
                    </th>
                    <th>UHID</th>
                    <th>Patient Name</th>
                    <th>Admitted / Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const isSelected = !!selectedList.find(x => x.id === p.id)
                    return (
                      <tr key={p.id} onClick={() => toggleSelect(p)} style={{ cursor: 'pointer', background: isSelected ? 'var(--primary-50)' : 'transparent' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={isSelected} readOnly />
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--gray-500)', fontSize: '0.8rem' }}>{p.id}</td>
                        <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{p.name}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{p.admission_type || 'OPD'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Print Settings */}
        <div className="card" style={{ position: 'sticky', top: '5rem' }}>
          <div className="card-header"><h5 style={{ fontWeight: 700 }}>Print Settings</h5></div>
          <div className="card-body" style={{ padding: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Barcode Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {BARCODE_TYPES.map(t => (
                  <button key={t.id} onClick={() => setBType(t.id)} style={{ flex: 1, padding: '0.5rem', borderRadius: 6, border: `1px solid ${bType === t.id ? 'var(--primary-500)' : 'var(--gray-200)'}`, background: bType === t.id ? 'var(--primary-50)' : '#fff', color: bType === t.id ? 'var(--primary-700)' : 'var(--gray-500)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Format / Label Size</label>
              <select className="form-input form-select" value={bSize} onChange={e => setBSize(e.target.value)}>
                <option value="file">Patient File Sticker (100x50mm)</option>
                <option value="wristband">Wristband (250x25mm)</option>
                <option value="vial">Lab Vial Tube (50x25mm)</option>
                <option value="custom">Standard Barcode (Auto)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Copies per Patient</label>
              <input type="number" className="form-input" min="1" max="20" value={copies} onChange={e => setCopies(parseInt(e.target.value) || 1)} />
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-100)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: '1rem' }}>Live Preview</div>
              {selectedList.length > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 8 }}>
                  <BarcodePreview patient={selectedList[0]} type={bType} size={bSize} />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--gray-50)', borderRadius: 8, color: 'var(--gray-400)', fontSize: '0.8125rem' }}>
                  Select a patient to see preview
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print-only CSS injection & hidden container for actual print layout */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-hide { display: none !important; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; display: flex; flex-wrap: wrap; gap: 10px; }
          @page { margin: 0; }
        }
      `}</style>
      
      <div id="print-area" style={{ display: 'none' }}>
        {selectedList.map(p => 
          Array.from({ length: copies }).map((_, i) => (
            <BarcodePreview key={`${p.id}-${i}`} patient={p} type={bType} size={bSize} />
          ))
        )}
      </div>

    </div>
  )
}

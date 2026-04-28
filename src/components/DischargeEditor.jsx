import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Download, Save, Loader, CheckCircle, ChevronLeft,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Type, Printer, RotateCcw,
} from 'lucide-react'
import { SERVER_URL, BASE_URL, api } from '../api'

// ─── Patient field substitution map ──────────────────────────────────────────
const FIELD_ALIASES = [
  { key: 'patient_name',      aliases: ['patient name', "patient's name", 'pt name', 'name of patient', 'name'] },
  { key: 'age_gender',        aliases: ['age / gender', 'age/gender', 'age & gender', 'age-gender', 'age / sex'] },
  { key: 'age',               aliases: ['age'] },
  { key: 'gender',            aliases: ['gender', 'sex'] },
  { key: 'reg_no',            aliases: ['reg no', 'reg. no', 'uhid', 'mrd no', 'mr no', 'patient id', 'registration no'] },
  { key: 'date_of_admission', aliases: ['date of admission', 'admission date', 'd.o.a', 'doa', 'admitted on'] },
  { key: 'date_of_discharge', aliases: ['date of discharge', 'discharge date', 'd.o.d', 'dod', 'discharged on'] },
  { key: 'consultant',        aliases: ['consultant', 'doctor', 'physician', 'attending doctor', 'surgeon'] },
  { key: 'department',        aliases: ['department', 'dept', 'specialty', 'unit', 'ward name'] },
  { key: 'diagnosis',         aliases: ['diagnosis', 'final diagnosis', 'primary diagnosis', 'clinical diagnosis'] },
  { key: 'room_bed',          aliases: ['room / bed', 'room/bed', 'bed no', 'bed number', 'room', 'bed', 'ward'] },
  { key: 'ip_no',             aliases: ['ip no', 'ip number', 'ipd no', 'inpatient no', 'admission no'] },
  { key: 'phone',             aliases: ['phone number', 'phone no', 'mobile no', 'contact no', 'phone'] },
  { key: 'address',           aliases: ['address', 'residence'] },
  { key: 'blood_group',       aliases: ['blood group', 'blood type'] },
]

function buildValues(p) {
  if (!p) return {}
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
  return {
    patient_name:      p.name || '',
    age:               p.age  ? `${p.age} Y` : '',
    gender:            p.gender || '',
    age_gender:        [p.age ? `${p.age} Y` : '', p.gender].filter(Boolean).join(' / '),
    reg_no:            p.id || p.uhid || '',
    date_of_admission: fmtDate(p.admitted_at),
    date_of_discharge: fmtDate(p.discharged_at),
    phone:             p.phone || '',
    consultant:        p.doctor_name ? `Dr. ${p.doctor_name}` : '',
    room_bed:          p.bed_id || p.room_bed || p.ward || '',
    ip_no:             p.ip_no || p.id || '',
    department:        p.department || '',
    diagnosis:         p.diagnosis || '',
    blood_group:       p.blood_group || '',
    address:           p.address || '',
  }
}

// Generate a beautiful, formal Indian Hospital Discharge Summary
function generateFormalSummary(text, values, hospitalInfo = {}) {
  // Strip out messy header text from PDF extraction
  const lines = text.split('\n')
  const cleanLines = []
  
  // Skip the first few lines that contain typical header labels 
  // (we replace them with our clean HTML table)
  const skipKeywords = ['DISCHARGE SUMMARY', 'Patient Name', 'Age', 'Gender', 'Reg No', 'UHID', 'Date of', 'Phone', 'Department', 'Consultant', 'Room', 'Bed', 'IP No']
  
  let headerPassed = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!headerPassed && i < 20) {
      const isHeaderGarbage = skipKeywords.some(k => line.toLowerCase().includes(k.toLowerCase()))
      if (isHeaderGarbage || line.trim() === '') continue
      else headerPassed = true // We hit the first clinical line
    }
    cleanLines.push(line)
  }

  // Format the remaining text: make known section headings bold
  const sectionHeadings = [
    'Final Diagnosis', 'Diagnosis', 'Procedure Performed', 'Procedures',
    'Chief Complaint', 'Chief Complaints', 'History Of Presenting Illness', 'History',
    'Obstetric History', 'Obstetric', 'LMP', 'EDD', 'Past History', 'Clinical Examination',
    'Systemic Examination', 'Investigations', 'Treatment Given', 'Hospital Course',
    'Course in Hospital', 'Condition at Discharge', 'Advice on Discharge',
    'Discharge Advice', 'Medications', 'Follow Up', 'Follow up'
  ]

  let formattedText = cleanLines.map(line => {
    let fmt = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    
    // Check if line starts with a known heading
    for (const heading of sectionHeadings) {
      const regex = new RegExp(`^(${heading}\\s*[:\\-]?\\s*)`, 'i')
      if (regex.test(fmt)) {
        fmt = fmt.replace(regex, '<strong>$1</strong>')
        break
      }
    }
    
    // Interactive checkboxes
    fmt = fmt.replace(/[□☐🞏]/g, () => `<span class="interactive-checkbox" contenteditable="false" data-checked="false" style="cursor: pointer; user-select: none; color: #4f46e5; font-size: 1.2em; display: inline-block; width: 1.2em; text-align: center;">&#9744;</span>`)
    fmt = fmt.replace(/[☑]/g, () => `<span class="interactive-checkbox" contenteditable="false" data-checked="true" style="cursor: pointer; user-select: none; color: #4f46e5; font-size: 1.2em; display: inline-block; width: 1.2em; text-align: center;">&#9745;</span>`)
    
    return `<p style="margin-top: 0.5em; margin-bottom: 0.5em;">${fmt || '<br>'}</p>`
  }).join('')

  // Build the formal HTML header table
  const logoHtml = hospitalInfo.report_logo 
    ? `<img src="${SERVER_URL}${hospitalInfo.report_logo}" alt="Logo" style="max-height: 60px; max-width: 250px; object-fit: contain;" />`
    : `<h1 style="margin: 0; font-size: 22px; color: #1e3a8a; font-weight: 800;">${hospitalInfo.name || 'HOSPITAL DISCHARGE SUMMARY'}</h1>`

  const hospDetailsHtml = hospitalInfo.name
    ? `<p style="margin: 4px 0 0; font-size: 11px; color: #555;">${hospitalInfo.address || ''} ${hospitalInfo.city ? '- ' + hospitalInfo.city : ''}<br/>${hospitalInfo.phone ? 'Phone: ' + hospitalInfo.phone : ''}</p>`
    : ''

  const html = `
    <div style="font-family: Arial, sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px;">
        <div>
          ${logoHtml}
          ${hospDetailsHtml}
        </div>
        <div style="text-align: right; padding-top: 5px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px; color: #1e293b;">DISCHARGE SUMMARY</h2>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10.5pt; border: 1.5px solid #000;">
        <tbody>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #000; font-weight: bold; width: 18%; background: #f8f9fa;">Patient Name</td>
            <td style="padding: 6px 10px; border: 1px solid #000; width: 32%;"><strong>${values.patient_name}</strong></td>
            <td style="padding: 6px 10px; border: 1px solid #000; font-weight: bold; width: 18%; background: #f8f9fa;">UHID / IP No</td>
            <td style="padding: 6px 10px; border: 1px solid #000; width: 32%;">${values.reg_no}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #000; font-weight: bold; background: #f8f9fa;">Age / Gender</td>
            <td style="padding: 6px 10px; border: 1px solid #000;">${values.age_gender}</td>
            <td style="padding: 6px 10px; border: 1px solid #000; font-weight: bold; background: #f8f9fa;">Room / Bed</td>
            <td style="padding: 6px 10px; border: 1px solid #000;">${values.room_bed}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #000; font-weight: bold; background: #f8f9fa;">Date of Adm.</td>
            <td style="padding: 6px 10px; border: 1px solid #000;">${values.date_of_admission}</td>
            <td style="padding: 6px 10px; border: 1px solid #000; font-weight: bold; background: #f8f9fa;">Date of Disch.</td>
            <td style="padding: 6px 10px; border: 1px solid #000;">${values.date_of_discharge}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #000; font-weight: bold; background: #f8f9fa;">Consultant</td>
            <td style="padding: 6px 10px; border: 1px solid #000;"><strong>${values.consultant}</strong></td>
            <td style="padding: 6px 10px; border: 1px solid #000; font-weight: bold; background: #f8f9fa;">Department</td>
            <td style="padding: 6px 10px; border: 1px solid #000;">${values.department}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size: 11pt; line-height: 1.6;">
        ${formattedText}
      </div>
    </div>
  `
  return html
}

// ─── Extract text from PDF maintaining structure ──────────────────────────────
async function extractPdfText(pdfUrl) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs', import.meta.url
  ).toString()

  const doc = await pdfjsLib.getDocument(pdfUrl).promise
  let fullText = ''

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })
    const pageH = viewport.height

    // Group items by row (y position), then sort rows top-to-bottom
    const rowMap = new Map()
    for (const item of content.items) {
      if (!item.str?.trim()) continue
      const [, , , , , ty] = item.transform
      // Round y to nearest 3pt to group items on the same line
      const rowKey = Math.round((pageH - ty) / 3) * 3
      if (!rowMap.has(rowKey)) rowMap.set(rowKey, [])
      rowMap.get(rowKey).push({ text: item.str, x: item.transform[4] })
    }

    // Sort rows top-to-bottom, sort items within row left-to-right
    const sortedRows = [...rowMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, items]) => {
        items.sort((a, b) => a.x - b.x)
        return items.map(i => i.text).join(' ')
      })

    if (pageNum > 1) fullText += '\n\n'
    fullText += sortedRows.join('\n')
  }

  return fullText
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolBtn({ onClick, active, title, children, disabled }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick && onClick() }}
      title={title}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 30, border: 'none', borderRadius: 5, cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: active ? '#4f46e5' : '#374151',
        transition: 'all 120ms', opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  )
}

// ─── Main Editor ─────────────────────────────────────────────────────────────
export default function DischargeEditor({ formInstance, patientData, onClose, onSaved }) {
  const [content, setContent]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [fontFamily, setFontFamily]   = useState('Arial')
  const [fontSize, setFontSize]       = useState('12')
  const editorRef = useRef(null)
  const pdfUrl    = `${SERVER_URL}${formInstance.file_path}`

  // ── Load PDF and extract text ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // Try to load previously saved HTML content first
    if (formInstance.text_content) {
      setContent(formInstance.text_content)
      setLoading(false)
      return
    }

    extractPdfText(pdfUrl).then(async text => {
      if (cancelled) return
      let hospitalInfo = {}
      try { hospitalInfo = await api.getHospital() } catch(e) {}
      
      const values = buildValues(patientData)
      const htmlContent = generateFormalSummary(text, values, hospitalInfo)
      if (!cancelled) setContent(htmlContent)
    }).catch(e => {
      if (!cancelled) setError('Could not read PDF template: ' + e.message)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [formInstance.id])

  // ── Sync content to editor when loaded ────────────────────────────────────
  useEffect(() => {
    if (loading || !editorRef.current) return
    if (!content) {
      editorRef.current.innerHTML = '<p><br></p>'
      return
    }
    
    // content is now ALWAYS valid HTML structure generated by generateFormalSummary
    editorRef.current.innerHTML = content
    
    editorRef.current.focus()
  }, [loading])

  // ── Exec command wrapper ──────────────────────────────────────────────────
  const exec = (cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  // ── Interactive Checkboxes ────────────────────────────────────────────────
  const handleEditorClick = (e) => {
    if (e.target.classList.contains('interactive-checkbox')) {
      e.preventDefault()
      const isChecked = e.target.getAttribute('data-checked') === 'true'
      const newState = !isChecked
      e.target.setAttribute('data-checked', String(newState))
      e.target.innerHTML = newState ? '&#9745;' : '&#9744;'
      
      // Update color based on checked state
      if (newState) {
        e.target.style.color = '#10b981' // Green for checked
      } else {
        e.target.style.color = '#4f46e5' // Indigo for unchecked
      }
    }
  }

  // ── Save text content to server ───────────────────────────────────────────
  const handleSave = async () => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    setSaving(true)
    try {
      const token = localStorage.getItem('hms_token')
      await fetch(`${BASE_URL}/discharge-summaries/${formInstance.id}/text`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text_content: html, status: 'in-progress' }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      if (onSaved) onSaved(html)
    } catch (e) { alert('Save failed: ' + e.message) }
    finally { setSaving(false) }
  }

  // ── Download as PDF via html2pdf ──────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!editorRef.current) return
    setDownloading(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const name = patientData?.name
        ? `Discharge Summary - ${patientData.name}.pdf`
        : `${formInstance.template_name || 'Discharge Summary'}.pdf`

      const opt = {
        margin:       [15, 15, 15, 15],
        filename:     name.replace(/[/\\:*?"<>|]/g, '_'),
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      // Create a temporary clone of the editor to remove any UI artifacts
      const clone = editorRef.current.cloneNode(true)
      clone.style.boxShadow = 'none'
      clone.style.margin = '0'
      clone.style.padding = '10mm'
      clone.style.width = '190mm' // Adjust width for A4

      await html2pdf().from(clone).set(opt).save()
    } catch (e) {
      alert('Download failed: ' + e.message)
      console.error(e)
    } finally {
      setDownloading(false)
    }
  }, [patientData, formInstance])

  // ── Print handler ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    const html = editorRef.current?.innerHTML || ''
    const w = window.open('', '_blank')
    w.document.write(`
      <!DOCTYPE html><html><head>
      <title>Discharge Summary${patientData?.name ? ' - ' + patientData.name : ''}</title>
      <style>
        body { margin: 20mm; font-family: Arial, sans-serif; font-size: 12pt; color: #111; line-height: 1.6; }
        p { margin: 0 0 4pt; } h1,h2,h3 { margin: 8pt 0 4pt; }
        @page { size: A4; margin: 20mm; }
      </style></head><body>
      ${html}
      </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  const patientStrip = patientData ? [
    patientData.name,
    patientData.age ? `${patientData.age}Y` : null,
    patientData.gender,
    patientData.id,
    patientData.doctor_name ? `Dr. ${patientData.doctor_name}` : null,
  ].filter(Boolean).join('  ·  ') : null

  const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana']
  const SIZES = ['10', '11', '12', '14', '16', '18', '20', '24']

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column',
      background: '#f1f5f9',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem',
        background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
          padding: '0.4rem 0.8rem', color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
          fontSize: '0.875rem', fontWeight: 600,
        }}>
          <ChevronLeft size={16} /> Back
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem' }}>
            {formInstance.template_name}
          </div>
          {patientStrip && (
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>{patientStrip}</div>
          )}
        </div>

        <button onClick={handlePrint} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
          padding: '0.4rem 0.9rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
          fontSize: '0.825rem', fontWeight: 600,
        }}>
          <Printer size={14} /> Print
        </button>

        <button onClick={handleDownload} disabled={downloading} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: downloading ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.85)',
          border: 'none', borderRadius: 8, padding: '0.4rem 0.9rem',
          color: '#fff', cursor: downloading ? 'not-allowed' : 'pointer',
          fontSize: '0.825rem', fontWeight: 600,
        }}>
          {downloading ? <Loader size={14} className="spin" /> : <Download size={14} />}
          {downloading ? ' Generating…' : ' Download PDF'}
        </button>

        <button onClick={handleSave} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: saved ? 'rgba(16,185,129,0.85)' : 'rgba(16,185,129,0.7)',
          border: 'none', borderRadius: 8, padding: '0.4rem 0.9rem',
          color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: '0.825rem', fontWeight: 600,
        }}>
          {saving ? <Loader size={14} className="spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saving ? ' Saving…' : saved ? ' Saved!' : ' Save'}
        </button>

        <button onClick={onClose} style={{
          background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 8,
          width: 36, height: 36, cursor: 'pointer', color: '#f87171',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={18} />
        </button>
      </div>

      {/* ── Formatting toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 1rem',
        background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Font family */}
        <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); exec('fontName', e.target.value) }}
          style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 5, padding: '0 6px', fontSize: '0.8rem', cursor: 'pointer' }}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Font size */}
        <select value={fontSize} onChange={e => { setFontSize(e.target.value); exec('fontSize', e.target.value <= 12 ? '2' : e.target.value <= 16 ? '3' : e.target.value <= 18 ? '4' : '5') }}
          style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 5, padding: '0 6px', fontSize: '0.8rem', width: 58, cursor: 'pointer' }}>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={{ width: 1, height: 22, background: '#e2e8f0', margin: '0 4px' }} />

        <ToolBtn onClick={() => exec('bold')} title="Bold (Ctrl+B)"><Bold size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="Italic (Ctrl+I)"><Italic size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="Underline (Ctrl+U)"><Underline size={14} /></ToolBtn>

        <div style={{ width: 1, height: 22, background: '#e2e8f0', margin: '0 4px' }} />

        <ToolBtn onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenter size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyRight')} title="Align Right"><AlignRight size={14} /></ToolBtn>

        <div style={{ width: 1, height: 22, background: '#e2e8f0', margin: '0 4px' }} />

        <ToolBtn onClick={() => exec('undo')} title="Undo (Ctrl+Z)"><RotateCcw size={14} /></ToolBtn>

        {/* Font color */}
        <div title="Text Color" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Type size={14} style={{ position: 'absolute', left: 5, pointerEvents: 'none', color: '#374151' }} />
          <input type="color" defaultValue="#111111"
            onChange={e => exec('foreColor', e.target.value)}
            style={{ width: 36, height: 28, border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', paddingLeft: 18, paddingRight: 0 }} />
        </div>
      </div>

      {/* ── Patient info strip ── */}
      {patientData && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(13,148,136,0.06))',
          borderBottom: '1px solid rgba(99,102,241,0.12)',
          padding: '0.375rem 1.25rem', fontSize: '0.75rem', color: '#4338ca', fontWeight: 500,
          flexShrink: 0,
        }}>
          📋 {patientStrip}
        </div>
      )}

      {/* ── Editor body ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '2rem 1rem', background: '#f1f5f9' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#64748b', marginTop: '10vh' }}>
            <Loader size={32} className="spin" />
            <div style={{ fontWeight: 600 }}>Reading template…</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Extracting text from your PDF and pre-filling patient details</div>
          </div>
        ) : error ? (
          <div style={{ color: '#dc2626', textAlign: 'center', padding: '4rem' }}>{error}</div>
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            onClick={handleEditorClick}
            style={{
              margin: '0 auto',
              width: '210mm',
              minHeight: '297mm',
              background: '#fff',
              boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
              padding: '20mm 20mm',
              fontFamily,
              fontSize: '12pt',
              lineHeight: 1.5,
              color: '#111',
              outline: 'none',
              borderRadius: 4,
              // Paragraph spacing
              wordBreak: 'break-word',
            }}
          />
        )}
      </div>

      <style>{`
        [contenteditable] p { margin: 0 0 4pt; }
        [contenteditable]:focus { outline: none; }
        [contenteditable] h1 { font-size: 20pt; font-weight: 700; margin: 12pt 0 6pt; }
        [contenteditable] h2 { font-size: 16pt; font-weight: 700; margin: 10pt 0 5pt; }
        [contenteditable] h3 { font-size: 13pt; font-weight: 700; margin: 8pt 0 4pt; }
      `}</style>
    </div>,
    document.body
  )
}

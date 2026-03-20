// src/components/FormViewer.jsx
// Shared annotatable PDF viewer used by Patients panel and PatientForms page

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Pen, Eraser, Undo2, Trash2, Save, CheckCircle, Loader,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Lock, Maximize2, Type, Download,
} from 'lucide-react'
import { api, SERVER_URL } from '../api'
import { useAuth } from '../context/AuthContext'

// ─── Ink Canvas ──────────────────────────────────────────────────────────────
// InkCanvas — canErase controls whether eraser/undo/clear tools are available
function InkCanvas({ formId, initialAnnotations, pdfPage, viewportSize, onSave, canErase, allowDrawing = true, scale = 1 }) {
  const canvasRef = useRef(null)
  const [tool, setTool] = useState(allowDrawing ? 'pen' : 'type')
  const [color, setColor] = useState('#1a1a2e')
  const [lineWidth, setLineWidth] = useState(2.5)
  const [strokes, setStrokes] = useState(initialAnnotations || [])
  const [currentStroke, setCurrentStroke] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const isDrawing = useRef(false)
  const lastPoint = useRef(null)
  const ctxRef = useRef(null)
  const [activeText, setActiveText] = useState(null) // {x, y, content}
  const textInputRef = useRef(null)

  const commitText = useCallback(() => {
    if (!activeText || !activeText.content.trim()) {
      setActiveText(null)
      return
    }
    const newTextAnnotation = {
      type: 'text',
      content: activeText.content,
      x: activeText.canvasX,
      y: activeText.canvasY,
      color: color,
      lineWidth: lineWidth,
    }
    setStrokes(prev => [...prev, newTextAnnotation])
    setSaved(false)
    setActiveText(null)
  }, [activeText, color, lineWidth])

  // Bulletproof focus resolution: Wait for native mouseup/click to finish,
  // then forcefully focus the active text area. 
  useEffect(() => {
    if (activeText && textInputRef.current && document.activeElement !== textInputRef.current) {
      const timer = setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus()
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [activeText])

  // ── Redraw all strokes on a ctx ──────────────────────────────────────────
  const redrawAll = useCallback((ctx, strokeList) => {
    if (!ctx || !canvasRef.current) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    for (const stroke of strokeList) {
      if (stroke.type === 'text') {
        ctx.save()
        ctx.fillStyle = stroke.color || '#1a1a2e'
        ctx.font = `${(stroke.lineWidth || 2.5) * 6}px "Inter", "Segoe UI", sans-serif`
        ctx.textBaseline = 'top'
        // Handle multiline text
        const lines = (stroke.content || '').split('\n')
        lines.forEach((line, i) => {
          ctx.fillText(line, stroke.x, stroke.y + (i * (stroke.lineWidth || 2.5) * 7.5))
        })
        ctx.restore()
        continue
      }
      if (!stroke.points || stroke.points.length < 2) continue
      ctx.save()
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
        ctx.lineWidth = stroke.width * 4
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = stroke.color || '#1a1a2e'
        ctx.lineWidth = stroke.width || 2.5
        ctx.globalAlpha = stroke.opacity || 1
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1]
        const curr = stroke.points[i]
        const cx = (prev.x + curr.x) / 2
        const cy = (prev.y + curr.y) / 2
        ctx.quadraticCurveTo(prev.x, prev.y, cx, cy)
      }
      ctx.stroke()
      ctx.restore()
    }
  }, [])

  // ── KEY FIX: size the canvas and redraw ONLY after PDF has rendered
  //    (viewportSize comes from FormViewer after pdfPage.render() completes)
  useEffect(() => {
    if (!viewportSize || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = viewportSize.width
    canvas.height = viewportSize.height
    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctxRef.current = ctx
    // Redraw saved strokes now that canvas has correct dimensions
    redrawAll(ctx, strokes)
  }, [viewportSize, strokes, redrawAll]) // eslint-disable-line react-hooks/exhaustive-deps
  // (strokes intentionally omitted — we only redraw on viewport change,
  //  live drawing is handled incrementally in pointer events)

  const onPointerDown = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const domX = e.clientX - rect.left
    const domY = e.clientY - rect.top
    const canvasX = domX * (canvas.width / rect.width)
    const canvasY = domY * (canvas.height / rect.height)

    if (tool === 'type') {
      if (activeText && activeText.content.trim()) {
        commitText()
      }
      setActiveText({ domX, domY, canvasX, canvasY, content: '' })
      return
    }

    if (e.pointerType === 'touch') return
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    isDrawing.current = true
    lastPoint.current = { x: canvasX, y: canvasY }
    const pressure = e.pressure > 0 ? e.pressure : 0.5
    const width = tool === 'eraser' ? lineWidth * 6 : lineWidth * (0.5 + pressure * 1.5)
    setCurrentStroke({ tool, color, width, opacity: tool === 'eraser' ? 1 : Math.max(0.3, pressure * 1.2), points: [{ x: canvasX, y: canvasY }] })
  }, [tool, color, lineWidth, activeText, commitText])

  const onPointerMove = useCallback((e) => {
    if (!isDrawing.current || !currentStroke) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const canvasPos = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    }
    const pressure = e.pressure > 0 ? e.pressure : 0.5
    const width = tool === 'eraser' ? lineWidth * 6 : lineWidth * (0.5 + pressure * 1.5)
    const ctx = ctxRef.current
    if (ctx && lastPoint.current) {
      ctx.save()
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = width
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.globalAlpha = Math.max(0.3, pressure * 1.2)
      }
      ctx.beginPath()
      const prev = lastPoint.current
      ctx.moveTo(prev.x, prev.y)
      ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + canvasPos.x) / 2, (prev.y + canvasPos.y) / 2)
      ctx.stroke()
      ctx.restore()
    }
    lastPoint.current = canvasPos
    setCurrentStroke(prev => ({ ...prev, points: [...prev.points, canvasPos] }))
  }, [isDrawing, currentStroke, tool, color, lineWidth])

  const onPointerUp = useCallback(() => {
    if (!isDrawing.current || !currentStroke) return
    isDrawing.current = false
    if (currentStroke.points.length > 1) {
      setStrokes(prev => [...prev, currentStroke])
      setSaved(false)
    }
    setCurrentStroke(null)
    lastPoint.current = null
  }, [isDrawing, currentStroke])

  const handleUndo = () => {
    setStrokes(prev => {
      const next = prev.slice(0, -1)
      redrawAll(ctxRef.current, next)
      return next
    })
    setSaved(false)
  }

  const handleClear = () => {
    if (!window.confirm('Clear all annotations on this page?')) return
    setStrokes([])
    const ctx = ctxRef.current
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setSaved(false)
  }

  const handleSave = async () => {
    let finalStrokes = [...strokes]
    
    // Commit any active text being typed before saving
    if (activeText && activeText.content.trim()) {
      const newText = {
        type: 'text',
        content: activeText.content,
        x: activeText.canvasX,
        y: activeText.canvasY,
        color: color,
        lineWidth: lineWidth,
      }
      finalStrokes = [...finalStrokes, newText]
      setStrokes(finalStrokes)
      setActiveText(null)
    }

    setSaving(true)
    try {
      await onSave(finalStrokes, 'in-progress')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert('Save failed: ' + e.message) } finally { setSaving(false) }
  }

  const COLORS = ['#1a1a2e', '#dc2626', '#2563eb', '#059669', '#b45309', '#7c3aed', '#0891b2']
  const WIDTHS = [1.5, 2.5, 4, 7]

  // Toolbar
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Sticky toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: '#fff', borderBottom: '1px solid var(--gray-100)', flexWrap: 'wrap', flexShrink: 0 }}>

        {/* Tool selector: pen always visible; eraser only for admin */}
        <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 8, padding: '0.25rem' }}>
          {allowDrawing && (
            <button onClick={() => setTool('pen')} title="Pen Tool" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', background: tool === 'pen' ? '#fff' : 'transparent', color: tool === 'pen' ? 'var(--primary-600)' : 'var(--gray-500)', boxShadow: tool === 'pen' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 150ms' }}>
              <Pen size={15} />
            </button>
          )}
          <button onClick={() => setTool('type')} title="Text Tool (Word-like typing)" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', background: tool === 'type' ? '#fff' : 'transparent', color: tool === 'type' ? 'var(--primary-600)' : 'var(--gray-500)', boxShadow: tool === 'type' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 150ms' }}>
            <Type size={16} />
          </button>
          {allowDrawing && (
            <button
              onClick={() => canErase && setTool('eraser')}
              title={canErase ? 'Eraser Tool' : 'Eraser locked — form has been saved. Admins can always erase.'}
              disabled={!canErase}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                width: canErase ? 36 : 54, height: 32, borderRadius: 6, border: 'none',
                cursor: canErase ? 'pointer' : 'not-allowed',
                background: tool === 'eraser' ? '#fff' : 'transparent',
                color: canErase ? (tool === 'eraser' ? 'var(--primary-600)' : 'var(--gray-500)') : 'var(--gray-300)',
                boxShadow: tool === 'eraser' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 150ms', opacity: canErase ? 1 : 0.6,
              }}
            >
              <Eraser size={15} />
              {!canErase && <Lock size={10} />}
            </button>
          )}
        </div>
        {/* Colors (pen only) */}
        {tool === 'pen' && (
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 2, transition: 'all 150ms', transform: color === c ? 'scale(1.3)' : 'scale(1)' }} />
            ))}
          </div>
        )}
        {/* Widths */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', marginLeft: '0.25rem' }}>
          {WIDTHS.map(w => (
            <button key={w} onClick={() => setLineWidth(w)} style={{ width: 32, height: 32, borderRadius: 7, border: '1.5px solid', borderColor: lineWidth === w ? 'var(--primary-500)' : 'var(--gray-200)', background: lineWidth === w ? 'var(--primary-50)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: Math.min(w * 3.5, 20), height: Math.min(w * 3.5, 20) / w * 1.5, background: tool === 'pen' ? color : '#94a3b8', borderRadius: 99 }} />
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleUndo}
            disabled={!canErase || strokes.length === 0}
            title={!canErase ? 'Locked after save' : 'Undo last stroke'}
            style={{ opacity: canErase ? 1 : 0.4 }}
          >
            <Undo2 size={14} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleClear}
            disabled={!canErase || strokes.length === 0}
            title={!canErase ? 'Locked after save' : 'Clear all strokes'}
            style={{ opacity: canErase ? 1 : 0.4 }}
          >
            <Trash2 size={14} />
          </button>
          <button className={`btn btn-sm ${saved ? 'btn-teal' : 'btn-primary'}`} onClick={handleSave} disabled={saving}>
            {saving ? <Loader size={13} className="spin" /> : saved ? <CheckCircle size={13} /> : <Save size={13} />}
            {saving ? ' Saving...' : saved ? ' Saved!' : ' Save'}
          </button>
        </div>
      </div>

      {/* Scrollable canvas area — 1fr grid row gives it all remaining height */}
      <div style={{ overflow: 'auto', background: '#1e293b', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
          {/* PDF layer */}
          <canvas id={`pdf-canvas-${pdfPage}`} style={{ display: 'block' }} />
          {/* Ink layer — exactly overlays the PDF canvas, no pointer events when type tool active */}
          <canvas
            ref={canvasRef}
            onPointerDown={tool !== 'type' ? onPointerDown : undefined}
            onPointerMove={tool !== 'type' ? onPointerMove : undefined}
            onPointerUp={tool !== 'type' ? onPointerUp : undefined}
            onPointerCancel={tool !== 'type' ? onPointerUp : undefined}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              cursor: tool === 'eraser' ? 'cell' : 'crosshair',
              touchAction: 'none',
              pointerEvents: tool === 'type' ? 'none' : 'auto',
            }}
          />

          {/* Transparent click-capture layer for type tool — sits above canvas */}
          {tool === 'type' && !activeText && (
            <div
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                cursor: 'text', zIndex: 10, background: 'transparent',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const domX = e.clientX - rect.left
                const domY = e.clientY - rect.top
                const canvas = canvasRef.current
                const canvasX = canvas ? domX * (canvas.width / rect.width) : domX
                const canvasY = canvas ? domY * (canvas.height / rect.height) : domY
                setActiveText({ domX, domY, canvasX, canvasY, content: '' })
              }}
            />
          )}

          {/* Floating Text Input — positioned at click location */}
          {activeText && (
            <div
              style={{
                position: 'absolute',
                top: activeText.domY,
                left: activeText.domX,
                zIndex: 1000,
              }}
            >
              <textarea
                ref={textInputRef}
                value={activeText.content}
                autoFocus
                onChange={e => setActiveText(prev => prev ? { ...prev, content: e.target.value } : prev)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { commitText(); e.preventDefault() }
                }}
                onBlur={() => {
                  // Small delay so clicking elsewhere on the PDF creates a NEW box
                  // rather than committing immediately and eating the next click
                  setTimeout(() => commitText(), 100)
                }}
                placeholder="Type here..."
                style={{
                  background: 'rgba(255,255,255,0.97)',
                  border: `2px solid ${color}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: color,
                  font: `400 15px "Segoe UI", "Inter", sans-serif`,
                  minWidth: '200px',
                  minHeight: '44px',
                  outline: 'none',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
                  display: 'block',
                  margin: 0,
                  resize: 'both',
                  lineHeight: 1.5,
                }}
              />
              <div style={{
                fontSize: '0.65rem', color: '#6b7280', marginTop: 4,
                textAlign: 'right', userSelect: 'none',
              }}>
                Click elsewhere or press Esc to place
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── FormViewer ───────────────────────────────────────────────────────────────
// Props:
//   formInstance  — { id, template_name, file_path, patient_name?, patient_id?, annotations, filled_by }
//   onClose       — () => void
//   onAnnotationsSaved? — (annotations, status) => void   called after each successful save
export default function FormViewer({ formInstance, onClose, onAnnotationsSaved }) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [fitScale, setFitScale] = useState(1.0)   // computed fit-to-width scale
  const [loadingPdf, setLoadingPdf] = useState(true)
  const [pdfError, setPdfError] = useState(null)
  const containerRef = useRef(null)
  // All annotations across all pages (with .page field)
  const [annotations, setAnnotations] = useState(
    Array.isArray(formInstance.annotations) ? formInstance.annotations : []
  )
  // Viewport size — set AFTER pdfPage.render() completes so InkCanvas
  // can size itself and redraw saved strokes at the right moment
  const [viewportSize, setViewportSize] = useState(null)

  // ── Read admin flag from auth context ────────────────────────────────────
  const { isAdmin } = useAuth()

  // canErase rule:
  //   - Admin: always can erase
  //   - Non-admin: can erase ONLY while the form has no saved annotations yet
  //     (i.e. blank/fresh form). Once saved data exists, eraser is locked.
  //     `annotations` is live state — updates after every Save, so this
  //     correctly locks the eraser the moment a non-admin saves for the first time.
  const canErase = isAdmin || annotations.length === 0


  const pdfUrl = `${SERVER_URL}${formInstance.file_path}`

  // ── Load PDF.js ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoadingPdf(true)
    setPdfError(null)
    import('pdfjs-dist').then(async (pdfjsLib) => {
      if (cancelled) return
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs', import.meta.url
      ).toString()
      try {
        const doc = await pdfjsLib.getDocument(pdfUrl).promise
        if (cancelled) return
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
      } catch (e) {
        if (!cancelled) setPdfError('Could not load PDF: ' + e.message)
      } finally {
        if (!cancelled) setLoadingPdf(false)
      }
    })
    return () => { cancelled = true }
  }, [pdfUrl])

  // ── Render current page ────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false
    setViewportSize(null) // hide ink canvas while PDF re-renders

    pdfDoc.getPage(page).then(pdfPage => {
      if (cancelled) return

      // On first page, compute a fit-to-width scale
      let renderScale = scale
      if (page === 1 && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const naturalViewport = pdfPage.getViewport({ scale: 1 })
        const computed = Math.max(0.5, Math.min(3, containerWidth / naturalViewport.width))
        // Only auto-fit on very first render (when scale is still default 1.0)
        if (scale === 1.0) {
          renderScale = computed
          setFitScale(computed)
          setScale(computed)
          return // will re-run with new scale
        }
        setFitScale(computed)
      }

      const viewport = pdfPage.getViewport({ scale: renderScale })
      const pdfCanvas = document.getElementById(`pdf-canvas-${page}`)
      if (!pdfCanvas) return

      pdfCanvas.width = viewport.width
      pdfCanvas.height = viewport.height

      const renderTask = pdfPage.render({ canvasContext: pdfCanvas.getContext('2d'), viewport })
      renderTask.promise.then(() => {
        if (cancelled) return
        setViewportSize({ width: viewport.width, height: viewport.height })
      }).catch(() => { })
    })
    return () => { cancelled = true }
  }, [pdfDoc, page, scale])

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async (strokes, status) => {
    // Merge this page's new strokes with other pages' saved strokes
    const otherPages = annotations.filter(s => s.page !== page)
    const thisPage = strokes.map(s => ({ ...s, page }))
    const merged = [...otherPages, ...thisPage]

    let updated;
    if (formInstance.type === 'discharge') {
      // Use discharge summaries API
      updated = await api.saveDischargeSummaryAnnotations(formInstance.id, {
        annotations: merged,
        status,
        filled_by: formInstance.filled_by || ''
      })
    } else {
      // Use standard patient forms API
      updated = await api.savePatientFormAnnotations(formInstance.id, {
        annotations: merged,
        status,
        filled_by: formInstance.filled_by || '',
      })
    }

    const saved = Array.isArray(updated.annotations) ? updated.annotations : merged
    setAnnotations(saved)
    if (onAnnotationsSaved) onAnnotationsSaved(saved, updated.status || status)
    return updated
  }

  // ── Download PDF with annotations baked in ───────────────────────────────
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!pdfDoc) return
    setDownloading(true)
    try {
      const { PDFDocument, rgb } = await import('pdf-lib')
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs', import.meta.url
      ).toString()

      // Re-load the raw PDF bytes so pdf-lib can embed pages
      const pdfBytes = await fetch(pdfUrl).then(r => r.arrayBuffer())
      const pdfLibDoc = await PDFDocument.load(pdfBytes)
      const pdfLibPages = pdfLibDoc.getPages()

      // For each page, render PDF + annotations to an offscreen canvas,
      // then embed as a hi-res PNG image stamp on the pdf-lib page
      const DOWNLOAD_SCALE = 2  // 2x = ~144dpi — crisp on screen + print

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const pdfPage = await pdfDoc.getPage(pageNum)
        const viewport = pdfPage.getViewport({ scale: DOWNLOAD_SCALE })

        // Off-screen canvas to render PDF page
        const offCanvas = document.createElement('canvas')
        offCanvas.width = viewport.width
        offCanvas.height = viewport.height
        const ctx = offCanvas.getContext('2d')
        await pdfPage.render({ canvasContext: ctx, viewport }).promise

        // Draw annotations for this page
        const pageAnns = annotations.filter(s => s.page === pageNum)
        for (const stroke of pageAnns) {
          if (stroke.type === 'text') {
            ctx.save()
            ctx.fillStyle = stroke.color || '#1a1a2e'
            const fontSize = (stroke.lineWidth || 2.5) * 6
            ctx.font = `${fontSize}px "Segoe UI", "Inter", sans-serif`
            ctx.textBaseline = 'top'
            const lines = (stroke.content || '').split('\n')
            lines.forEach((line, i) => {
              ctx.fillText(line, stroke.x, stroke.y + i * fontSize * 1.25)
            })
            ctx.restore()
          } else if (stroke.points && stroke.points.length > 1) {
            ctx.save()
            if (stroke.tool === 'eraser') {
              ctx.globalCompositeOperation = 'destination-out'
              ctx.lineWidth = stroke.width * 4
            } else {
              ctx.globalCompositeOperation = 'source-over'
              ctx.strokeStyle = stroke.color || '#1a1a2e'
              ctx.lineWidth = stroke.width || 2.5
              ctx.globalAlpha = stroke.opacity || 1
            }
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
            for (let i = 1; i < stroke.points.length; i++) {
              const prev = stroke.points[i - 1]
              const curr = stroke.points[i]
              ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2)
            }
            ctx.stroke()
            ctx.restore()
          }
        }

        // Embed the merged canvas as PNG on the pdf-lib page
        const pngBytes = await new Promise(resolve => offCanvas.toBlob(b => b.arrayBuffer().then(resolve), 'image/png'))
        const pngImage = await pdfLibDoc.embedPng(pngBytes)
        const libPage = pdfLibPages[pageNum - 1]
        const { width, height } = libPage.getSize()
        libPage.drawImage(pngImage, { x: 0, y: 0, width, height })
      }

      // Download the final PDF
      const finalBytes = await pdfLibDoc.save()
      const blob = new Blob([finalBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const name = formInstance.patient_name
        ? `${formInstance.template_name} - ${formInstance.patient_name}.pdf`
        : `${formInstance.template_name}.pdf`
      a.download = name.replace(/[/\\:*?"<>|]/g, '_')
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Download failed: ' + err.message)
      console.error(err)
    } finally {
      setDownloading(false)
    }
  }

  const pageAnnotations = annotations.filter(s => s.page === page)

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.25rem', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '1rem', flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '0.4rem 0.8rem', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem' }}>{formInstance.template_name}</div>
          {(formInstance.patient_name || formInstance.patient_id) && (
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
              Patient: {formInstance.patient_name || formInstance.patient_id}
            </div>
          )}
        </div>
        {/* Page navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={15} />
          </button>
          <span style={{ color: '#fff', fontSize: '0.875rem', minWidth: 70, textAlign: 'center' }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={15} />
          </button>
        </div>
        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <button onClick={() => setScale(s => Math.max(0.4, +(s - 0.25).toFixed(2)))}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ZoomOut size={14} />
          </button>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', minWidth: 44, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, +(s + 0.25).toFixed(2)))}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ZoomIn size={14} />
          </button>
          <button onClick={() => setScale(fitScale)} title="Fit to width"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
            <Maximize2 size={13} />
          </button>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </button>
        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading || annotations.length === 0}
          title={annotations.length === 0 ? 'Save annotations first, then download' : 'Download annotated PDF'}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: downloading ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.85)',
            border: 'none', borderRadius: 8, padding: '0.4rem 0.9rem',
            color: '#fff', cursor: annotations.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '0.825rem', fontWeight: 600, opacity: annotations.length === 0 ? 0.5 : 1,
            transition: 'all 150ms',
          }}
        >
          {downloading ? <Loader size={14} className="spin" /> : <Download size={14} />}
          {downloading ? ' Generating...' : ' Download PDF'}
        </button>
      </div>

      {/* Content — fills all remaining height; InkCanvas handles its own scroll */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1e293b' }}>
        {loadingPdf ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.4)' }}>
            <Loader size={28} className="spin" style={{ display: 'inline-block' }} />
            <span style={{ marginLeft: '0.75rem' }}>Loading PDF...</span>
          </div>
        ) : pdfError ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#f87171', flex: 1 }}>{pdfError}</div>
        ) : (
          <InkCanvas
            key={`${formInstance.id}-p${page}`}
            formId={formInstance.id}
            initialAnnotations={pageAnnotations}
            pdfPage={page}
            viewportSize={viewportSize}
            onSave={handleSave}
            canErase={canErase}
            allowDrawing={true}
            scale={scale}
          />
        )}
      </div>
    </div>
  )
}

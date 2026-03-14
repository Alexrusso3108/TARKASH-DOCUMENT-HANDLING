// src/components/FormViewer.jsx
// Shared annotatable PDF viewer used by Patients panel and PatientForms page

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Pen, Eraser, Undo2, Trash2, Save, CheckCircle, Loader,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Lock, Maximize2,
} from 'lucide-react'
import { api, SERVER_URL } from '../api'
import { useAuth } from '../context/AuthContext'

// ─── Ink Canvas ──────────────────────────────────────────────────────────────
// InkCanvas — canErase controls whether eraser/undo/clear tools are available
function InkCanvas({ formId, initialAnnotations, pdfPage, viewportSize, onSave, canErase }) {
  const canvasRef = useRef(null)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#1a1a2e')
  const [lineWidth, setLineWidth] = useState(2.5)
  const [strokes, setStrokes] = useState(initialAnnotations || [])
  const [currentStroke, setCurrentStroke] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const isDrawing = useRef(false)
  const lastPoint = useRef(null)
  const ctxRef = useRef(null)

  // ── Redraw all strokes on a ctx ──────────────────────────────────────────
  const redrawAll = useCallback((ctx, strokeList) => {
    if (!ctx || !canvasRef.current) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    for (const stroke of strokeList) {
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
  }, [viewportSize]) // eslint-disable-line react-hooks/exhaustive-deps
  // (strokes intentionally omitted — we only redraw on viewport change,
  //  live drawing is handled incrementally in pointer events)

  // ── Pointer helpers ───────────────────────────────────────────────────────
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }, [])

  const onPointerDown = useCallback((e) => {
    // Non-admin cannot use eraser even if tool state was set by other means
    if (e.pointerType === 'touch') return
    if (tool === 'eraser' && !canErase) return
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    isDrawing.current = true
    const pos = getPos(e)
    lastPoint.current = pos
    const pressure = e.pressure > 0 ? e.pressure : 0.5
    const width = tool === 'eraser' ? lineWidth * 6 : lineWidth * (0.5 + pressure * 1.5)
    setCurrentStroke({ tool, color, width, opacity: tool === 'eraser' ? 1 : Math.max(0.3, pressure * 1.2), points: [pos] })
  }, [tool, color, lineWidth, getPos])

  const onPointerMove = useCallback((e) => {
    if (!isDrawing.current || !currentStroke) return
    e.preventDefault()
    const pos = getPos(e)
    const pressure = e.pressure > 0 ? e.pressure : 0.5
    const width = tool === 'eraser' ? lineWidth * 6 : lineWidth * (0.5 + pressure * 1.5)
    const ctx = ctxRef.current
    if (ctx && lastPoint.current) {
      ctx.save()
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
        ctx.lineWidth = width
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.globalAlpha = Math.max(0.3, pressure * 1.2)
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      const prev = lastPoint.current
      ctx.moveTo(prev.x, prev.y)
      ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + pos.x) / 2, (prev.y + pos.y) / 2)
      ctx.stroke()
      ctx.restore()
    }
    lastPoint.current = pos
    setCurrentStroke(prev => ({ ...prev, points: [...prev.points, pos] }))
  }, [isDrawing, currentStroke, tool, color, lineWidth, getPos])

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
    setSaving(true)
    try {
      await onSave(strokes, 'in-progress')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert('Save failed: ' + e.message) } finally { setSaving(false) }
  }

  const COLORS = ['#1a1a2e', '#dc2626', '#2563eb', '#059669', '#b45309', '#7c3aed', '#0891b2']
  const WIDTHS = [1.5, 2.5, 4, 7]

  // Toolbar
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8f9fa' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: '#fff', borderBottom: '1px solid var(--gray-100)', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10 }}>

        {/* Tool selector: pen always visible; eraser only for admin */}
        <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 8, padding: '0.25rem' }}>
          <button onClick={() => setTool('pen')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', background: tool === 'pen' ? '#fff' : 'transparent', color: tool === 'pen' ? 'var(--primary-600)' : 'var(--gray-500)', boxShadow: tool === 'pen' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 150ms' }}>
            <Pen size={15} />
          </button>
          {canErase ? (
            <button onClick={() => setTool('eraser')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', background: tool === 'eraser' ? '#fff' : 'transparent', color: tool === 'eraser' ? 'var(--primary-600)' : 'var(--gray-500)', boxShadow: tool === 'eraser' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 150ms' }}>
              <Eraser size={15} />
            </button>
          ) : (
            /* Non-admin: show locked indicator instead of eraser */
            <div title="Only admins can erase content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 32, borderRadius: 6, color: 'var(--gray-300)', cursor: 'not-allowed' }}>
              <Lock size={13} />
            </div>
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
          {/* Undo & Clear: only visible to admin */}
          {canErase && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={handleUndo} disabled={strokes.length === 0}><Undo2 size={14} /></button>
              <button className="btn btn-secondary btn-sm" onClick={handleClear} disabled={strokes.length === 0}><Trash2 size={14} /></button>
            </>
          )}
          <button className={`btn btn-sm ${saved ? 'btn-teal' : 'btn-primary'}`} onClick={handleSave} disabled={saving}>
            {saving ? <Loader size={13} className="spin" /> : saved ? <CheckCircle size={13} /> : <Save size={13} />}
            {saving ? ' Saving...' : saved ? ' Saved!' : ' Save'}
          </button>
        </div>
      </div>
      {/* Canvas area — no padding, fills edge to edge */}
      <div style={{ position: 'relative', flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', background: '#1e293b' }}>
        <div style={{ position: 'relative', display: 'inline-block', minWidth: '100%' }}>
          {/* PDF layer */}
          <canvas id={`pdf-canvas-${pdfPage}`} style={{ display: 'block', width: '100%', background: '#fff' }} />
          {/* Ink layer */}
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
          />
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
        const containerWidth = containerRef.current.clientWidth - 32 // 16px padding each side
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

    const updated = await api.savePatientFormAnnotations(formInstance.id, {
      annotations: merged,
      status,
      filled_by: formInstance.filled_by || '',
    })
    const saved = Array.isArray(updated.annotations) ? updated.annotations : merged
    setAnnotations(saved)
    if (onAnnotationsSaved) onAnnotationsSaved(saved, updated.status || status)
    return updated
  }

  // Annotations for the current page only
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
      </div>

      {/* Content */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', background: '#1e293b' }}>
        {loadingPdf ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)' }}>
            <Loader size={28} className="spin" style={{ display: 'inline-block' }} />
            <span style={{ marginLeft: '0.75rem' }}>Loading PDF...</span>
          </div>
        ) : pdfError ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#f87171' }}>{pdfError}</div>
        ) : (
          <div style={{ width: viewportSize ? viewportSize.width : '100%', maxWidth: '100%', flexShrink: 0 }}>
            <InkCanvas
              key={`${formInstance.id}-p${page}`}
              formId={formInstance.id}
              initialAnnotations={pageAnnotations}
              pdfPage={page}
              viewportSize={viewportSize}
              onSave={handleSave}
              canErase={isAdmin}
            />
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import {
  Pen, Eraser, Undo2, Trash2, Save, CheckCircle, Loader,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Lock, Maximize2, Type, Download, ClipboardList, Hand
} from 'lucide-react'
import { api, SERVER_URL } from '../api'
import { useAuth } from '../context/AuthContext'

// ─── Ink Canvas ──────────────────────────────────────────────────────────────
// InkCanvas — canErase controls whether eraser/undo/clear tools are available
const InkCanvas = forwardRef(function InkCanvas({ formId, initialAnnotations, externalAnnotations, pdfPage, viewportSize, onSave, canErase, allowDrawing = true, scale = 1, onSwipeLeft, onSwipeRight, onDirtyChange, onPinchZoom }, ref) {
  const canvasRef = useRef(null)
  const protectedCanvasRef = useRef(null) // Separate layer for auto-filled patient data — immune to eraser
  const protectedCtxRef = useRef(null)
  const [tool, setTool] = useState(allowDrawing ? 'pen' : 'type')
  const [color, setColor] = useState('#1a1a2e')
  const [lineWidth, setLineWidth] = useState(2.5)
  const [strokes, setStrokes] = useState(initialAnnotations || [])
  const [currentStroke, setCurrentStroke] = useState(null)
  const currentStrokeRef = useRef(null) // Sync ref — always current, never stale in event handlers
  const activePointerType = useRef(null) // Track which pointer type is drawing (for palm rejection)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const isDrawing = useRef(false)
  const lastPoint = useRef(null)
  const startPoint = useRef(null) // for swipe detection
  const ctxRef = useRef(null)
  const [activeText, setActiveText] = useState(null) // {x, y, content}
  const textInputRef = useRef(null)
  const scrollContainerRef = useRef(null) // ref for pinch-to-zoom touch listeners

  // Notify parent whenever the canvas becomes dirty (unsaved) or clean (saved)
  useEffect(() => {
    if (onDirtyChange) onDirtyChange(!saved)
  }, [saved, onDirtyChange])

  // ── Pinch-to-zoom: non-passive touch listeners on the scroll container ────────
  // Must use addEventListener (not JSX) so we can call preventDefault() in touchmove.
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el || !onPinchZoom) return

    let lastDist = null

    const getPinchDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        lastDist = getPinchDist(e.touches)
      }
    }

    const onTouchMove = (e) => {
      if (e.touches.length !== 2 || lastDist === null) return
      // Stop browser from doing its own pinch-zoom / scroll during our gesture
      e.preventDefault()
      const newDist = getPinchDist(e.touches)
      if (newDist > 0 && lastDist > 0) {
        const ratio = newDist / lastDist
        onPinchZoom(ratio)
      }
      lastDist = newDist
    }

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) lastDist = null
    }

    el.addEventListener('touchstart',  onTouchStart, { passive: true })
    el.addEventListener('touchmove',   onTouchMove,  { passive: false }) // passive:false so preventDefault works
    el.addEventListener('touchend',    onTouchEnd,   { passive: true })
    el.addEventListener('touchcancel', onTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart',  onTouchStart)
      el.removeEventListener('touchmove',   onTouchMove)
      el.removeEventListener('touchend',    onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [onPinchZoom])

  // When parent injects auto-fill annotations, MERGE them (don't replace user strokes)
  useEffect(() => {
    if (externalAnnotations && externalAnnotations.length > 0) {
      setStrokes(prev => {
        const userStrokes = prev.filter(s => !s._autofilled)
        return [...userStrokes, ...externalAnnotations]
      })
      setSaved(false)
    }
  }, [externalAnnotations])

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

  // ── Redraw user strokes only (NEVER draws _autofilled — those live on protectedCanvas) ──
  // All stroke points are stored with xFrac/yFrac (0..1) so they render correctly
  // at ANY zoom level without distortion.
  const redrawAll = useCallback((ctx, strokeList) => {
    if (!ctx || !canvasRef.current) return
    const vw = viewportSize?.width || canvasRef.current.width
    const vh = viewportSize?.height || canvasRef.current.height
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    for (const stroke of strokeList) {
      // Auto-filled patient details are rendered on the protected canvas — never touch them here
      if (stroke._autofilled) continue
      if (stroke.type === 'text') {
        ctx.save()
        ctx.fillStyle = stroke.color || '#1a1a2e'
        const fontSize = (stroke.lineWidth || 2.7) * 6 * scale
        ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", sans-serif`
        ctx.textBaseline = stroke._baselineY ? 'alphabetic' : 'top'
        const px = stroke.xFrac != null ? stroke.xFrac * vw : stroke.x
        const py = stroke.yFrac != null ? stroke.yFrac * vh : stroke.y
        const lines = String(stroke.content || '').split('\n')
        lines.forEach((line, i) => ctx.fillText(line, px, py + (i * fontSize * 1.25)))
        ctx.restore()
        continue
      }
      if (!stroke.points || stroke.points.length < 2) continue
      ctx.save()
      // Resolve stroke width: scale the stored base width by current viewport
      // relative to the viewport at which the stroke was originally drawn.
      const storedVW = stroke.refVW || vw
      const widthScale = vw / storedVW
      const resolvedWidth = (stroke.width || 2.5) * widthScale
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
        ctx.lineWidth = resolvedWidth * 4
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = stroke.color || '#1a1a2e'
        ctx.lineWidth = resolvedWidth
        ctx.globalAlpha = 1
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      // Points are stored as fractions — resolve to current viewport coordinates
      const getX = (p) => (p.xFrac != null ? p.xFrac * vw : p.x)
      const getY = (p) => (p.yFrac != null ? p.yFrac * vh : p.y)
      ctx.beginPath()
      ctx.moveTo(getX(stroke.points[0]), getY(stroke.points[0]))
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1]
        const curr = stroke.points[i]
        const cx = (getX(prev) + getX(curr)) / 2
        const cy = (getY(prev) + getY(curr)) / 2
        ctx.quadraticCurveTo(getX(prev), getY(prev), cx, cy)
      }
      ctx.stroke()
      ctx.restore()
    }
  }, [viewportSize, scale])

  // ── Redraw ONLY auto-filled annotations onto the protected canvas ────────────
  // This canvas sits above the ink canvas with pointer-events:none.
  // The eraser (destination-out on the ink canvas) can NEVER reach it.
  const redrawProtected = useCallback((ctx, strokeList) => {
    if (!ctx || !protectedCanvasRef.current) return
    ctx.clearRect(0, 0, protectedCanvasRef.current.width, protectedCanvasRef.current.height)
    for (const stroke of strokeList) {
      if (!stroke._autofilled || stroke.type !== 'text') continue
      ctx.save()
      ctx.fillStyle = stroke.color || '#1a1a2e'
      const fontSize = (stroke.lineWidth || 2.7) * 6 * scale
      ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", sans-serif`
      ctx.textBaseline = stroke._baselineY ? 'alphabetic' : 'top'
      const vw = viewportSize?.width || 1
      const vh = viewportSize?.height || 1
      const px = stroke.xFrac != null ? stroke.xFrac * vw : stroke.x
      const py = stroke.yFrac != null ? stroke.yFrac * vh : stroke.y
      const lines = String(stroke.content || '').split('\n')
      const rightBoundary = stroke._maxXFrac != null ? stroke._maxXFrac * vw : vw
      const maxW = Math.max(20, rightBoundary - px - 4)
      lines.forEach((line, i) => ctx.fillText(line, px, py + (i * fontSize * 1.25), maxW))
      ctx.restore()
    }
  }, [viewportSize, scale])

  const dpr = useRef(window.devicePixelRatio || 1)

  // ── Size both canvases and redraw after PDF renders ─────────────────────────
  //    viewportSize comes from FormViewer after pdfPage.render() completes.
  //    Ink canvas: user strokes only. Protected canvas: auto-filled text only.
  useEffect(() => {
    if (!viewportSize || !canvasRef.current) return
    const ratio = window.devicePixelRatio || 1
    dpr.current = ratio

    // ── Ink canvas (user strokes + eraser) ──
    const canvas = canvasRef.current
    canvas.width = Math.floor(viewportSize.width * ratio)
    canvas.height = Math.floor(viewportSize.height * ratio)
    canvas.style.width = `${viewportSize.width}px`
    canvas.style.height = `${viewportSize.height}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctxRef.current = ctx
    redrawAll(ctx, strokes)

    // ── Protected canvas (auto-filled patient details — eraser cannot reach this) ──
    if (protectedCanvasRef.current) {
      const pCanvas = protectedCanvasRef.current
      pCanvas.width = Math.floor(viewportSize.width * ratio)
      pCanvas.height = Math.floor(viewportSize.height * ratio)
      pCanvas.style.width = `${viewportSize.width}px`
      pCanvas.style.height = `${viewportSize.height}px`
      const pCtx = pCanvas.getContext('2d')
      pCtx.setTransform(ratio, 0, 0, ratio, 0, 0)
      protectedCtxRef.current = pCtx
      redrawProtected(pCtx, strokes)
    }
  }, [viewportSize, strokes, redrawAll, redrawProtected])

  const onPointerDown = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Palm rejection: if a pen stroke is active, ignore touch (palm) events
    if (activePointerType.current === 'pen' && e.pointerType === 'touch') {
      e.preventDefault()
      return
    }

    const rect = canvas.getBoundingClientRect()
    // Guard: ensure viewportSize is ready
    if (!viewportSize) return

    // Map DOM coordinates back to fixed viewport units (independent of DPI)
    const canvasX = (e.clientX - rect.left) * (viewportSize.width / rect.width)
    const canvasY = (e.clientY - rect.top) * (viewportSize.height / rect.height)
    // Store fractions immediately — these remain stable across any zoom level change
    const xFrac = canvasX / viewportSize.width
    const yFrac = canvasY / viewportSize.height

    if (tool === 'hand') {
      // Hand tool allows for swiping/scrolling bubbling
      startPoint.current = { x: e.clientX, y: e.clientY, time: Date.now() }
      return
    }

    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    isDrawing.current = true
    activePointerType.current = e.pointerType
    lastPoint.current = { x: canvasX, y: canvasY }
    startPoint.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    
    // Stylus: use real pressure for WIDTH only (not opacity).
    // Opacity-based pressure is NOT used because the single-path redraw on save
    // cannot reproduce the compounding-alpha effect of live segment-by-segment drawing,
    // making saved strokes look faded. Width-only pressure gives consistent dark ink.
    const isStylus = e.pointerType === 'pen'
    const pressure = isStylus && e.pressure > 0 ? e.pressure : 1
    const width    = tool === 'eraser' ? lineWidth * 6 : lineWidth * (isStylus ? (0.5 + pressure * 1.5) : 1)
    const opacity  = 1  // always full opacity — matches how strokes look after redraw
    // Points include both pixel coords (for live drawing) and fractions (for zoom-stable redraw)
    const newStroke = {
      tool, color, width, opacity,
      refVW: viewportSize.width, // viewport width when stroke was started — used to scale width on redraw
      points: [{ x: canvasX, y: canvasY, xFrac, yFrac }]
    }
    currentStrokeRef.current = newStroke  // Set ref synchronously — available immediately in move events
    setCurrentStroke(newStroke)
  }, [tool, color, lineWidth, activeText, commitText, viewportSize])

  const onPointerMove = useCallback((e) => {
    // Use ref (not state) — state is async and may not have updated yet for fast stylus moves
    if (!isDrawing.current || !currentStrokeRef.current) return
    // Palm rejection: ignore touch events while pen is drawing
    if (activePointerType.current === 'pen' && e.pointerType === 'touch') return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    // Guard: ensure viewportSize is ready
    if (!viewportSize) return

    const px = (e.clientX - rect.left) * (viewportSize.width / rect.width)
    const py = (e.clientY - rect.top) * (viewportSize.height / rect.height)
    // Fractions — zoom-stable representation of this point
    const xFrac = px / viewportSize.width
    const yFrac = py / viewportSize.height
    const canvasPos = { x: px, y: py, xFrac, yFrac }

    // Stylus: pressure-sensitive WIDTH only. Mouse: fixed width. Both always full opacity.
    const isStylus = e.pointerType === 'pen'
    const pressure = isStylus && e.pressure > 0 ? e.pressure : 1
    const width    = tool === 'eraser' ? lineWidth * 6 : lineWidth * (isStylus ? (0.5 + pressure * 1.5) : 1)
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
        ctx.globalAlpha = 1  // always full opacity — matches redraw behaviour
      }
      ctx.beginPath()
      const prev = lastPoint.current
      ctx.moveTo(prev.x, prev.y)
      ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + px) / 2, (prev.y + py) / 2)
      ctx.stroke()
      ctx.restore()
    }
    lastPoint.current = canvasPos
    // Update the ref synchronously (for the next move event)
    currentStrokeRef.current = { ...currentStrokeRef.current, points: [...currentStrokeRef.current.points, canvasPos] }
    setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, canvasPos] } : prev)
  }, [isDrawing, tool, color, lineWidth, viewportSize])

  const onPointerUp = useCallback((e) => {
    // Palm rejection: only process pointer-up for the active drawing pointer type
    if (activePointerType.current && e.pointerType !== activePointerType.current) return

    if (startPoint.current) {
      const dx = e.clientX - startPoint.current.x
      const dy = e.clientY - startPoint.current.y
      const dt = Date.now() - startPoint.current.time
      // Flick detection: fast, horizontal, significant
      if (Math.abs(dx) > 100 && Math.abs(dy) < 80 && dt < 300) {
        if (dx < 0 && onSwipeLeft) onSwipeLeft()
        else if (dx > 0 && onSwipeRight) onSwipeRight()
        // If we detected a swipe, clear any accidental tiny stroke
        isDrawing.current = false
        currentStrokeRef.current = null
        setCurrentStroke(null)
        activePointerType.current = null
        startPoint.current = null
        return
      }
    }

    // Use ref (not state) — guarantees we always have the latest stroke data
    const finishedStroke = currentStrokeRef.current
    if (!isDrawing.current || !finishedStroke) return
    isDrawing.current = false
    activePointerType.current = null
    if (finishedStroke.points.length > 1) {
      setStrokes(prev => [...prev, finishedStroke])
      setSaved(false)
    }
    currentStrokeRef.current = null
    setCurrentStroke(null)
    lastPoint.current = null
    startPoint.current = null
  }, [isDrawing, onSwipeLeft, onSwipeRight])

  const handleUndo = () => {
    setStrokes(prev => {
      // Find the last user-added stroke (skip _autofilled) and remove only that one
      let lastUserIdx = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (!prev[i]._autofilled) { lastUserIdx = i; break }
      }
      if (lastUserIdx === -1) return prev // nothing to undo
      const next = [...prev.slice(0, lastUserIdx), ...prev.slice(lastUserIdx + 1)]
      redrawAll(ctxRef.current, next)
      return next
    })
    setSaved(false)
  }

  const handleClear = () => {
    if (!window.confirm('Clear all annotations on this page?')) return
    setStrokes(prev => {
      // Keep auto-filled patient data — only wipe user strokes from the ink canvas
      const protected_ = prev.filter(s => s._autofilled)
      const ctx = ctxRef.current
      if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      // Protected canvas already holds these — no need to redraw them here
      return protected_
    })
    setSaved(false)
  }

  const handleSave = async () => {
    let finalStrokes = [...strokes]
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Commit any active text being typed before saving
    if (activeText && activeText.content.trim()) {
      const newText = {
        type: 'text',
        content: activeText.content,
        x: activeText.canvasX,
        y: activeText.canvasY,
        xFrac: activeText.canvasX / canvas.width,
        yFrac: activeText.canvasY / canvas.height,
        color: color,
        lineWidth: lineWidth,
      }
      finalStrokes = [...finalStrokes, newText]
      setStrokes(finalStrokes)
      setActiveText(null)
    }

    // Normalize all strokes to fractions to ensure correct positioning during download
    // Points already carry xFrac/yFrac from draw time, so this is mostly a safety pass.
    const normalized = finalStrokes.map(s => {
      if (s.xFrac != null) return { ...s, refScale: scale } // Already normalized (auto-fill or prior draw)
      const res = { ...s, refScale: scale } // Store the screen-scale used when created
      
      const width = viewportSize?.width || 1
      const height = viewportSize?.height || 1

      if (s.type === 'text') {
        res.xFrac = s.x / width
        res.yFrac = s.y / height
      } else if (s.points) {
        // Ensure every point has fractions (they should already, but guard for legacy data)
        res.points = s.points.map(p => ({
          x: p.x, y: p.y,
          xFrac: p.xFrac ?? (p.x / width),
          yFrac: p.yFrac ?? (p.y / height)
        }))
      }
      return res
    })

    setSaving(true)
    try {
      await onSave(normalized, 'in-progress')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert('Save failed: ' + e.message) } finally { setSaving(false) }
  }

  // Expose save() to parent via ref (used by the form-switch confirmation dialog).
  // useCallback ensures the imperative handle is stable and not re-registered every render.
  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave])

  const COLORS = ['#1a1a2e', '#dc2626', '#2563eb', '#059669', '#b45309', '#7c3aed', '#0891b2']
  const WIDTHS = [1.5, 2.5, 4, 7]

  // Toolbar
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Sticky toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: '#fff', borderBottom: '1px solid var(--gray-100)', flexWrap: 'wrap', flexShrink: 0 }}>

        <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 8, padding: '0.25rem' }}>
          <button onClick={() => setTool('hand')} title="Hand Tool (Slide/Scroll)" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', background: tool === 'hand' ? '#fff' : 'transparent', color: tool === 'hand' ? 'var(--primary-600)' : 'var(--gray-500)', boxShadow: tool === 'hand' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 150ms' }}>
            <Hand size={15} />
          </button>
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

      {/* Canvas area — scrollable, PDF centered via margin:auto (alignItems:center breaks scroll) */}
      <div 
        ref={scrollContainerRef}
        className="pdf-scroll-container"
        style={{ 
          overflowX: 'hidden', 
          overflowY: 'auto', 
          background: '#1e293b', 
          display: 'flex', 
          flex: 1, 
          alignItems: 'flex-start',
          scrollbarWidth: 'auto',
          scrollbarColor: 'rgba(99, 102, 241, 0.75) rgba(30, 41, 59, 0.4)',
          touchAction: 'pan-y',  // 1-finger → native vertical scroll; 2-finger pinch → our handler
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0, margin: 'auto' }}>
          {/* PDF layer */}
          <canvas id={`pdf-canvas-${pdfPage}`} style={{ display: 'block' }} />
          {/* Ink layer — user strokes + eraser. Auto-filled text is NOT rendered here. */}
          <canvas
            ref={canvasRef}
            onPointerDown={tool !== 'type' ? onPointerDown : undefined}
            onPointerMove={tool !== 'type' ? onPointerMove : undefined}
            onPointerUp={tool !== 'type' ? onPointerUp : undefined}
            onPointerCancel={tool !== 'type' ? onPointerUp : undefined}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              cursor: tool === 'eraser' ? 'cell' : 'crosshair',
              touchAction: tool === 'hand' ? 'auto' : 'none',
              pointerEvents: tool === 'type' ? 'none' : 'auto',
            }}
          />
          {/* Protected canvas — auto-filled patient details rendered here.
               pointer-events:none means it never intercepts any input.
               zIndex:5 keeps it visually above the ink canvas so it's always visible.
               The eraser uses destination-out only on the ink canvas and can NEVER
               affect pixels on this separate element. */}
          <canvas
            ref={protectedCanvasRef}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              pointerEvents: 'none',
              zIndex: 5,
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
}) // ─── end InkCanvas ───────────────────────────────────────────────────────────

// ─── Smart PDF-aware Auto-fill ────────────────────────────────────────────────
// Field label aliases: we search the PDF text layer for these strings and place
// the patient value right after the found label, at the exact PDF coordinates.
// This works on ANY uploaded template — no hardcoded positions needed.
const FIELD_LABEL_MAP = [
  // { key: data key, aliases: strings to search in PDF text layer, side: 'right'|'below' }
  { key: 'patient_name',      aliases: ['patient name', 'name of patient', "patient's name", 'pt. name', 'pt name', 'name of the patient', 'patient'], side: 'right' },
  { key: 'age',               aliases: ['age', 'years', 'y/o', 'yrs', 'age (yrs)', 'age in years'],                                                       side: 'right' },
  { key: 'gender',            aliases: ['gender', 'sex', 'm/f', 'sex/gender'],                                                                            side: 'right' },
  { key: 'age_gender',        aliases: ['age / gender', 'age/gender', 'age & gender', 'age-gender', 'age / sex', 'age/sex'],                              side: 'right' },
  { key: 'reg_no',            aliases: ['reg no', 'reg. no', 'reg no.', 'uhid', 'mrd no', 'mr no', 'cr no', 'patient id', 'registration no', 'registration number', 'hosp. no', 'hosp no'], side: 'right' },
  { key: 'ip_no',             aliases: ['ip no', 'ip number', 'ipd no', 'inpatient no', 'admission no', 'ipn', 'ip/op no'],                               side: 'right' },
  { key: 'date_of_admission', aliases: ['date of admission', 'admission date', 'd.o.a', 'doa', 'admitted on', 'date of admit', 'date of admision'],       side: 'right' },
  { key: 'phone',             aliases: ['phone number', 'phone no', 'mobile no', 'contact no', 'mobile', 'phone', 'contact', 'mob no', 'mob', 'tel'],    side: 'right' },
  { key: 'consultant',        aliases: ['consultant', 'doctor', 'physician', 'attending doctor', 'consultant doctor', 'treating doctor', 'treating physician', 'surgeon', 'dr.'], side: 'right' },
  { key: 'room_bed',          aliases: ['room / bed', 'room/bed', 'bed no', 'bed number', 'ward / bed', 'room', 'bed', 'ward', 'room no', 'bed no.', 'ward/bed'], side: 'right' },
  { key: 'date_of_discharge', aliases: ['date of discharge', 'discharge date', 'd.o.d', 'dod', 'discharged on'],                                         side: 'right' },
  { key: 'department',        aliases: ['department', 'dept', 'dept.', 'specialty', 'speciality', 'unit', 'ward name'],                                   side: 'right' },
  { key: 'diagnosis',         aliases: ['diagnosis', 'final diagnosis', 'primary diagnosis', 'clinical diagnosis', 'provisional diagnosis', 'chief complaint', 'diag'], side: 'right' },
  { key: 'blood_group',       aliases: ['blood group', 'blood type', 'b/g', 'rh', 'blood grp', 'blood gp'],                                              side: 'right' },
  { key: 'address',           aliases: ['address', 'residence', 'residing at', 'addr'],                                                                   side: 'right' },
  { key: 'today_date',        aliases: ['date'],                                                                                                           side: 'right' },
]

// Build the patient value map from patientData
function buildPatientValues(patientData) {
  if (!patientData) return {}
  const p = patientData
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
  return {
    patient_name:      p.name || '',
    age:               p.age  || '',
    gender:            p.gender || '',
    age_gender:        [p.age ? `${p.age} Y` : '', p.gender].filter(Boolean).join(' / '),
    reg_no:            p.id || p.uhid || '',
    today_date:        new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    date_of_admission: formatDate(p.admitted_at),
    phone:            p.phone || '',
    consultant:       p.doctor_name || '',
    room_bed:         p.bed_id || p.room_bed || p.ward || '',
    ip_no:            p.ip_no || p.id || '',
    date_of_discharge: formatDate(p.discharged_at),
    department:       p.department || '',
    diagnosis:        p.diagnosis || p.notes || '',
    blood_group:      p.blood_group || '',
    address:          p.address || '',
  }
}

/**
 * Extracts text items with positions from a PDF page using PDF.js text layer.
 * Returns array of { text, x, y, width, height } in PDF user-space units,
 * where y=0 is the BOTTOM of the page (PDF coordinate system).
 */
async function extractTextItems(pdfPage) {
  const textContent = await pdfPage.getTextContent()
  const viewport = pdfPage.getViewport({ scale: 1 })
  const pageHeight = viewport.height

  return textContent.items.map(item => {
    // item.transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
    // translateX/Y are in PDF user space; Y is measured from BOTTOM in PDF, from TOP in canvas
    const [, , , , tx, ty] = item.transform
    const w = item.width
    const h = item.height || Math.abs(item.transform[3]) // font size
    return {
      text:   item.str.trim(),
      x:      tx,
      y:      ty,           // bottom-left of text in PDF space (y=0 at bottom)
      width:  w,
      height: h,
      // Pre-compute canvas-space fractions (y flipped: PDF bottom = canvas top)
      xFrac: tx / viewport.width,
      yFrac: (pageHeight - ty - h) / pageHeight,
    }
  }).filter(item => item.text.length > 0)
}

/**
 * Smart auto-fill: reads the PDF text layer to find exact label positions,
 * then places patient values right after each label. Works on any form template.
 */
async function buildSmartAutoAnnotations(pdfPage, patientData, pageNum = 1) {
  if (!patientData || !pdfPage) return []

  const values = buildPatientValues(patientData)
  const textItems = await extractTextItems(pdfPage)
  const viewport = pdfPage.getViewport({ scale: 1 })
  const pageW = viewport.width
  const pageH = viewport.height

  const annotations = []
  const usedKeys = new Set()
  const usedRowIndices = new Set() // prevent two fields from annotating the same PDF row

  // Group text items by approximate Y row (within 4pt tolerance) to reconstruct
  // multi-word labels that may be split across multiple text chunks
  const rowTolerance = 4 // points
  const rows = []
  for (const item of textItems) {
    const existingRow = rows.find(r => Math.abs(r.y - item.y) <= rowTolerance)
    if (existingRow) {
      existingRow.items.push(item)
      // Extend row bounding box
      existingRow.maxX = Math.max(existingRow.maxX, item.x + item.width)
    } else {
      rows.push({ y: item.y, items: [item], maxX: item.x + item.width })
    }
  }

  // For each row, concatenate all text chunks into one searchable string
  const rowTexts = rows.map(row => ({
    ...row,
    combined: row.items
      .slice()
      .sort((a, b) => a.x - b.x)
      .map(i => i.text)
      .join(' ')
      .toLowerCase(),
  }))

  for (const fieldDef of FIELD_LABEL_MAP) {
    if (usedKeys.has(fieldDef.key)) continue
    const value = values[fieldDef.key]
    if (!value) continue

    // Try each alias, longest first for specificity
    const aliases = [...fieldDef.aliases].sort((a, b) => b.length - a.length)
    let matched = null

    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase()
      for (let rowIdx = 0; rowIdx < rowTexts.length; rowIdx++) {
        if (usedRowIndices.has(rowIdx)) continue // skip rows already annotated
        const row = rowTexts[rowIdx]
        // Check if this row contains the alias
        if (row.combined.includes(aliasLower)) {
          // Find the rightmost item in this row as the label's right edge
          const sortedItems = [...row.items].sort((a, b) => a.x - b.x)
          // Find the specific item that contains or ends the matched alias text
          const labelItem = sortedItems.find(i =>
            i.text.toLowerCase().includes(aliasLower.split(' ').pop())
          ) || sortedItems[sortedItems.length - 1]

          matched = { row, labelItem, alias, rowIdx }
          break
        }
      }
      if (matched) break
    }

    if (!matched) continue
    usedKeys.add(fieldDef.key)
    usedRowIndices.add(matched.rowIdx) // mark this row as used

    const { row, labelItem } = matched

    // Place value to the RIGHT of the label, on the same baseline.
    // row.y  = text BASELINE in PDF space (y=0 at bottom of page).
    // We convert that baseline to a canvas-space fraction (y=0 at top of canvas)
    // and store _baselineY=true so redrawAll uses textBaseline='alphabetic' —
    // the same reference point as the PDF text, giving pixel-perfect alignment.
    const valueX   = labelItem.x + labelItem.width + 8  // 8pt gap after label
    const baseline = row.y                              // PDF baseline (from bottom)
    const canvasY  = pageH - baseline                   // canvas Y of baseline (from top)
    const xFrac    = valueX / pageW
    const yFrac    = canvasY / pageH

    // Skip if placement would go off the right edge of the page
    if (xFrac >= 0.98) continue

    // Calculate right boundary: distance from value X to end of row
    // so the text doesn't overflow past the right side of that cell.
    const nextItemX = row.items
      .filter(i => i.x > labelItem.x + labelItem.width)
      .sort((a, b) => a.x - b.x)[0]?.x
    const cellRightX = nextItemX ?? pageW
    const _maxXFrac = Math.min(0.99, cellRightX / pageW)

    annotations.push({
      type:        'text',
      content:     value,
      xFrac,
      yFrac,
      x: 0, y: 0,
      color:       '#1a1a2e',
      lineWidth:   2.5,
      page:        pageNum,
      _autofilled: true,
      _baselineY:  true,
      _label:      matched.alias,
      _maxXFrac,
    })
  }

  // ── Positional fallback ────────────────────────────────────────────────────
  // If patient_name wasn't matched (form has a blank rectangle with no text labels),
  // find the first clear vertical gap in the top 55% of the page and inject a
  // formatted patient card directly into that blank space.
  if (!usedKeys.has('patient_name') && values.patient_name) {
    // Place a "patient sticker" in the top-right corner where forms usually have white space.
    // The previous gap detection logic failed because logos/images don't have text layers.
    const insertY = 0.024;
    const startX = 0.515;

    const lines = [
      [
        values.patient_name && `Name: ${values.patient_name}`,
        values.age_gender   && `Age/Sex: ${values.age_gender}`,
      ].filter(Boolean),
      [
        values.reg_no      && `UHID: ${values.reg_no}${values.room_bed ? ` / Bed: ${values.room_bed}` : ''}`,
        values.today_date   && `Date: ${values.today_date}`,
      ].filter(Boolean),
      [
        values.consultant  && `Dr: ${values.consultant}`,
        values.department  && `Dept: ${values.department}${values.blood_group ? ` / B/G: ${values.blood_group}` : ''}`,
      ].filter(Boolean),
    ].filter(row => row.length > 0)

    // Two-column layout starting at page midpoint.
    // _maxXFrac gives each column a hard right boundary so text never overflows.
    const colGap = 0.185
    const adjStartX = 0.50
    // Col 0 ends just before col 1 starts; col 1 ends at 98% of page width.
    const colMaxXFrac = [adjStartX + colGap - 0.008, 0.98]
    lines.forEach((row, lineIdx) => {
      row.forEach((text, colIdx) => {
        annotations.push({
          type:        'text',
          content:     text,
          xFrac:       adjStartX + colIdx * colGap,
          yFrac:       insertY + lineIdx * 0.033,
          x: 0, y: 0,
          color:       '#1e3a5f',
          lineWidth:   1.5,
          page:        pageNum,
          _autofilled: true,
          _baselineY:  false,
          _label:      'fallback',
          _maxXFrac:   colMaxXFrac[colIdx] ?? 0.98,
          refScale:    1.0,
        })
      })
    })
  }

  return annotations
}

// ─── Patient Info Sidebar ─────────────────────────────────────────────────────
function PatientInfoSidebar({ patientData, onClose, onStampField }) {
  const p = patientData
  const fields = [
    { label: 'Patient Name',      value: p.name || '' },
    { label: 'Age / Gender',      value: [p.age ? `${p.age} yrs` : '', p.gender || ''].filter(Boolean).join(' / ') },
    { label: 'Reg No / ID',       value: p.id || '' },
    { label: 'Date of Admission', value: p.admitted_at ? new Date(p.admitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
    { label: 'Phone Number',      value: p.phone || '' },
    { label: 'Consultant',        value: p.doctor_name ? `Dr. ${p.doctor_name}` : '' },
    { label: 'Department',        value: p.department || '' },
    { label: 'Blood Group',       value: p.blood_group || '' },
    { label: 'Admission Type',    value: p.admission_type || '' },
    { label: 'Status',            value: p.status || '' },
  ].filter(f => f.value)

  const [copied, setCopied] = useState(null)
  const copyField = (val, idx) => {
    navigator.clipboard.writeText(val).catch(() => {})
    setCopied(idx)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div style={{
      width: 280, background: '#1e293b', borderLeft: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.04em' }}>📋 PATIENT DETAILS</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0 }}>✕</button>
      </div>
      {/* Avatar + name */}
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1rem', flexShrink: 0 }}>
          {(p.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{p.id}</div>
        </div>
      </div>
      {/* Fields */}
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {fields.map((f, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.6rem 0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{f.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#fff', fontWeight: 600 }}>{f.value}</div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => copyField(f.value, i)}
                  title="Copy to clipboard"
                  style={{ background: copied === i ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 5, padding: '0.2rem 0.4rem', color: copied === i ? '#10b981' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                >{copied === i ? '✓ Copied' : '📋'}</button>
                <button
                  onClick={() => onStampField(f.value)}
                  title="Click where you want to place this text on the PDF"
                  style={{ background: 'rgba(99,102,241,0.2)', border: 'none', borderRadius: 5, padding: '0.2rem 0.4rem', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700 }}
                >📌</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.5 }}>
          📋 Copy • 📌 Click to place on PDF
        </div>
      </div>
    </div>
  )
}

export default function FormViewer({ formInstance, allForms = [], patientData, onClose, onAnnotationsSaved, onSwitchForm }) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [fitScale, setFitScale] = useState(1.0)
  const [loadingPdf, setLoadingPdf] = useState(true)
  const [pdfError, setPdfError] = useState(null)
  const containerRef = useRef(null)
  const [annotations, setAnnotations] = useState([])
  const [viewportSize, setViewportSize] = useState(null)
  const [showInfoPanel, setShowInfoPanel] = useState(!!patientData && !allForms.length)
  const [showFormsQueue, setShowFormsQueue] = useState(false) // hidden by default, PDF fills screen
  const [pendingStamp, setPendingStamp] = useState(null)
  const inkCanvasRef = useRef(null)
  const fullScreenRef = useRef(null)
  const scaledForDocRef = useRef(null) // tracks which pdfDoc was used to compute current scale
  const [transitioning, setTransitioning] = useState(false)
  const [slideDir, setSlideDir] = useState(null) // 'left' | 'right' | null
  const swipeRef = useRef({ x: 0, y: 0, time: 0 })
  const [autoFilled, setAutoFilled] = useState(false)
  const autoFilledRef = useRef(false)
  const autoFilledPagesRef = useRef(new Set())
  // Save-before-navigate dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [pendingNavDir, setPendingNavDir] = useState(null)
  const [pendingNavAction, setPendingNavAction] = useState(null)
  const [dialogSaving, setDialogSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false) // true when InkCanvas has unsaved changes


  // Sync state whenever formInstance.id changes.
  // NOTE: do NOT reset pdfDoc here — if two forms share the same PDF file,
  // pdfUrl won't change so the PDF loader won't re-fire, leaving pdfDoc=null forever.
  // Resetting page/scale is enough to re-trigger the render effect.
  useEffect(() => {
    if (!formInstance) return
    setAnnotations(Array.isArray(formInstance.annotations) ? formInstance.annotations : [])
    setPage(1)
    setViewportSize(null)
    setScale(1.0)
    autoFilledRef.current = false
    autoFilledPagesRef.current = new Set()
    setAutoFilled(false)
    setIsDirty(false)
  }, [formInstance.id])

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
    let loadingTask = null   // PDF.js loading task (can be aborted)
    let loadedDoc = null     // track the document so we can destroy it if cancelled
    setLoadingPdf(true)
    setScale(1.0)            // force scale recomputation when a new PDF file loads
    setPdfError(null)
    import('pdfjs-dist').then(async (pdfjsLib) => {
      if (cancelled) return
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs', import.meta.url
      ).toString()
      try {
        loadingTask = pdfjsLib.getDocument(pdfUrl)
        const doc = await loadingTask.promise
        loadedDoc = doc
        if (cancelled) { doc.destroy(); return }  // destroy if no longer needed
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
      } catch (e) {
        if (!cancelled) setPdfError('Could not load PDF: ' + e.message)
      } finally {
        if (!cancelled) setLoadingPdf(false)
      }
    })
    return () => {
      cancelled = true
      // Abort the in-progress network/worker load so the PDF.js worker
      // doesn't accumulate orphaned operations and corrupt later loads.
      if (loadingTask) loadingTask.destroy().catch(() => {})
      if (loadedDoc)   loadedDoc.destroy().catch(() => {})
    }
  }, [pdfUrl])

  // ── Render current page ────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false
    let activeRenderTask = null  // track so we can cancel it in cleanup
    setViewportSize(null) // hide ink canvas while PDF re-renders

    pdfDoc.getPage(page).then(pdfPage => {
      if (cancelled) return

      // Use window dimensions for reliable measurement (clientWidth/Height can be 0
      // in flex containers at render time). Subtract fixed toolbar heights:
      //   top bar ~48px + annotation toolbar ~52px = ~100px total UI chrome.
      let renderScale = scale
      if (page === 1) {
        const naturalViewport = pdfPage.getViewport({ scale: 1 })
        const availW = window.innerWidth
        const availH = window.innerHeight - 100   // subtract toolbar chrome
        const scaleByWidth  = availW / naturalViewport.width
        const scaleByHeight = availH / naturalViewport.height
        const computed = Math.max(0.4, Math.min(3, Math.min(scaleByWidth, scaleByHeight) * 0.97))
        // Recompute if: first load (scale===1.0) OR pdfDoc changed (new PDF with different dims)
        if (scale === 1.0 || scaledForDocRef.current !== pdfDoc) {
          scaledForDocRef.current = pdfDoc
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

      activeRenderTask = pdfPage.render({ canvasContext: pdfCanvas.getContext('2d'), viewport })
      activeRenderTask.promise.then(async () => {
        if (cancelled) return
        setViewportSize({ width: viewport.width, height: viewport.height })
        // Smart auto-fill: run for EVERY page so patient details appear throughout the PDF.
        // Skip pages that have already been filled, or that have real (user) annotations.
        if (patientData && !autoFilledPagesRef.current.has(page)) {
          // Check if this page already has real saved annotations
          const hasRealAnnotationsOnPage = (current) =>
            current.some(a => !a._autofilled && a.page === page)
          try {
            const autoAnns = await buildSmartAutoAnnotations(pdfPage, patientData, page)
            if (!cancelled && autoAnns.length > 0) {
              setAnnotations(prev => {
                if (hasRealAnnotationsOnPage(prev)) return prev // don't clobber real data
                autoFilledPagesRef.current.add(page)
                autoFilledRef.current = true
                setAutoFilled(true)
                const clearPrev = prev.filter(a => !(a._autofilled && a.page === page))
                return [...clearPrev, ...autoAnns]
              })
            } else {
              // Even if no annotations were generated, mark page as processed
              autoFilledPagesRef.current.add(page)
            }
          } catch (err) {
            console.warn('[AutoFill] Smart auto-fill failed for page', page, err)
          }
        }
        }).catch((err) => {
          // RenderingCancelledException is expected on cleanup — ignore it silently.
          // Any other error should log for debugging.
          if (!cancelled && err?.name !== 'RenderingCancelledException') {
            console.warn('[FormViewer] PDF render error:', err)
          }
        })
      }).catch((err) => {
        if (!cancelled) console.warn('[FormViewer] getPage error:', err)
      })
    return () => {
      cancelled = true
      // Cancel the in-progress render so the PDF.js worker doesn't stay busy
      // with stale work after a page/form/scale switch.
      if (activeRenderTask) activeRenderTask.cancel()
    }
  }, [pdfDoc, page, scale])

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async (strokes, status) => {
    // Merge this page's new strokes with other pages' saved strokes
    const otherPages = annotations.filter(s => s.page !== page)
    const thisPage = strokes.map(s => ({ ...s, page }))
    const merged = [...otherPages, ...thisPage]

    let updated;
    if (formInstance.type === 'discharge') {
      updated = await api.saveDischargeSummaryAnnotations(formInstance.id, { annotations: merged, status, filled_by: formInstance.filled_by || '' })
    } else {
      updated = await api.savePatientFormAnnotations(formInstance.id, { annotations: merged, status, filled_by: formInstance.filled_by || '' })
    }

    const saved = Array.isArray(updated.annotations) ? updated.annotations : merged
    setAnnotations(saved)
    if (onAnnotationsSaved) onAnnotationsSaved(saved, updated.status || status)
    return updated
  }

  // ── Navigation (Page & Form) ─────────────────────────────────────────────
  // Run the actual slide animation + action
  const executeNavigate = useCallback((dir, action) => {
    setSlideDir(dir)
    setTransitioning(true)
    setIsDirty(false) // reset dirty on navigation
    setTimeout(() => {
      action()
      setSlideDir(dir === 'left' ? 'in-right' : 'in-left')
      setTimeout(() => {
        setSlideDir(null)
        setTransitioning(false)
      }, 280)
    }, 220)
  }, [])

  // Navigate: show save dialog whenever there are unsaved changes (page flip OR form switch)
  const navigate = useCallback((dir, action) => {
    if (transitioning) return
    if (isDirty) {
      setPendingNavDir(dir)
      setPendingNavAction(() => action)
      setShowSaveDialog(true)
      return
    }
    executeNavigate(dir, action)
  }, [transitioning, isDirty, executeNavigate])

  const goToNext = useCallback(() => {
    if (page < totalPages) {
      navigate('left', () => setPage(p => p + 1))
    } else if (allForms.length > 1 && onSwitchForm) {
      const idx = allForms.findIndex(f => f.id === formInstance.id)
      if (idx !== -1 && idx < allForms.length - 1) {
        navigate('left', () => onSwitchForm(allForms[idx + 1]))
      }
    }
  }, [page, totalPages, allForms, formInstance.id, onSwitchForm, navigate])

  const goToPrev = useCallback(() => {
    if (page > 1) {
      navigate('right', () => setPage(p => p - 1))
    } else if (allForms.length > 1 && onSwitchForm) {
      const idx = allForms.findIndex(f => f.id === formInstance.id)
      if (idx > 0) {
        navigate('right', () => onSwitchForm(allForms[idx - 1]))
      }
    }
  }, [page, allForms, formInstance.id, onSwitchForm, navigate])

  // ── Swipe Detection ────────────────────────────────────────────────────────
  const onPointerDown = (e) => {
    // Only track swipe for touch/pen that isn't a long press
    swipeRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
  }
  const onPointerUp = (e) => {
    const dx = e.clientX - swipeRef.current.x
    const dy = e.clientY - swipeRef.current.y
    const dt = Date.now() - swipeRef.current.time
    // Threshold: horizontal move > 140px, fast duration, mostly horizontal
    if (Math.abs(dx) > 140 && Math.abs(dy) < 90 && dt < 400) {
      if (dx < 0) goToNext()
      else goToPrev()
    }
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
          // DOWNLOAD_SCALE = 2. Screen-scale used when drawing = refScale (usually ~1.2)
          // Ratio ensures a 2px stroke on screen looks like a 2px equivalent on the Hi-Res PDF.
          const refScale = stroke.refScale || (stroke.xFrac != null ? 1 : 1.2 /* fallback */)
          const scaleRatio = DOWNLOAD_SCALE / refScale

          if (stroke.type === 'text') {
            ctx.save()
            ctx.fillStyle = stroke.color || '#1a1a2e'
            // Scaled font size relative to high-res download
            const baseFontSize = (stroke.lineWidth || 2.7) * 6
            const fontSize = baseFontSize * scaleRatio
            ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", sans-serif`
            ctx.textBaseline = stroke._baselineY ? 'alphabetic' : 'top'
            
            // Positioning via fractions (newly saved) or original px (fallback)
            const px = stroke.xFrac != null ? stroke.xFrac * offCanvas.width : stroke.x * scaleRatio
            const py = stroke.yFrac != null ? stroke.yFrac * offCanvas.height : stroke.y * scaleRatio
            
            const lines = String(stroke.content || '').split('\n')
            // Use per-annotation right boundary (_maxXFrac) when available, else canvas edge
            const dlBoundary = stroke._maxXFrac != null
              ? stroke._maxXFrac * offCanvas.width
              : offCanvas.width
            const dlMaxW = stroke._autofilled ? Math.max(20, dlBoundary - px - 4) : undefined
            lines.forEach((line, i) => {
              if (dlMaxW != null) {
                ctx.fillText(line, px, py + i * fontSize * 1.25, dlMaxW)
              } else {
                ctx.fillText(line, px, py + i * fontSize * 1.25)
              }
            })
            ctx.restore()
          } else if (stroke.points && stroke.points.length > 1) {
            ctx.save()
            const strokeWidth = (stroke.width || 2.5) * scaleRatio
            if (stroke.tool === 'eraser') {
              ctx.globalCompositeOperation = 'destination-out'
              ctx.lineWidth = strokeWidth * 4
            } else {
              ctx.globalCompositeOperation = 'source-over'
              ctx.strokeStyle = stroke.color || '#1a1a2e'
              ctx.lineWidth = strokeWidth
              ctx.globalAlpha = stroke.opacity || 1
            }
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            
            const getX = (p) => p.xFrac != null ? p.xFrac * offCanvas.width : p.x * scaleRatio
            const getY = (p) => p.yFrac != null ? p.yFrac * offCanvas.height : p.y * scaleRatio
            
            ctx.moveTo(getX(stroke.points[0]), getY(stroke.points[0]))
            for (let i = 1; i < stroke.points.length; i++) {
              const prev = stroke.points[i - 1]
              const curr = stroke.points[i]
              ctx.quadraticCurveTo(getX(prev), getY(prev), (getX(prev) + getX(curr)) / 2, (getY(prev) + getY(curr)) / 2)
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

  const toggleFullscreen = () => {
    if (!fullScreenRef.current) return
    if (!document.fullscreenElement) {
      fullScreenRef.current.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // ── Save-dialog handlers ────────────────────────────────────────────────────
  const handleDialogCancel = () => {
    setShowSaveDialog(false)
    setPendingNavAction(null)
    setPendingNavDir(null)
  }
  const handleDialogSkip = () => {
    const action = pendingNavAction
    const dir    = pendingNavDir
    setShowSaveDialog(false)
    setPendingNavAction(null)
    setPendingNavDir(null)
    executeNavigate(dir, action)
  }
  const handleDialogSave = async () => {
    if (!inkCanvasRef.current?.save) return handleDialogSkip()
    setDialogSaving(true)
    try {
      await inkCanvasRef.current.save()
    } catch (_) { /* save errors shown inside InkCanvas */ } finally {
      setDialogSaving(false)
    }
    const action = pendingNavAction
    const dir    = pendingNavDir
    setShowSaveDialog(false)
    setPendingNavAction(null)
    setPendingNavDir(null)
    executeNavigate(dir, action)
  }

  const pageAnnotations = annotations.filter(s => s.page === page)

  // Build info strip from patientData
  const infoStrip = patientData ? [
    patientData.name,
    patientData.age ? `${patientData.age}Y/${patientData.gender?.[0] || ''}` : null,
    patientData.id,
    patientData.doctor_name ? `Dr. ${patientData.doctor_name}` : null,
    patientData.department,
    patientData.phone,
  ].filter(Boolean).join('  ·  ') : null

  return (
    <div ref={fullScreenRef} style={{ position: 'fixed', inset: 0, background: '#0f172a', zIndex: 99999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Save-before-navigate confirmation dialog ───────────────────── */}
      {showSaveDialog && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 180ms ease',
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 20,
            padding: '2rem 2.25rem',
            maxWidth: 420, width: '100%',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
            animation: 'fadeInUp 220ms cubic-bezier(0.4,0,0.2,1)',
          }}>
            {/* Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(245,158,11,0.15)',
                border: '1.5px solid rgba(245,158,11,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem',
              }}>💾</div>
            </div>
            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                Save before continuing?
              </div>
            </div>
            {/* Subtitle */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.84rem', lineHeight: 1.6 }}>
                You have unsaved annotations on
              </div>
              <div style={{
                marginTop: '0.4rem', display: 'inline-block',
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 8, padding: '0.25rem 0.75rem',
                color: '#a5b4fc', fontWeight: 700, fontSize: '0.82rem',
              }}>
                📄 {formInstance.template_name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                Save now or your changes will be lost.
              </div>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {/* Save & Continue */}
              <button
                onClick={handleDialogSave}
                disabled={dialogSaving}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: 12, border: 'none',
                  background: dialogSaving
                    ? 'rgba(99,102,241,0.4)'
                    : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  cursor: dialogSaving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                  transition: 'all 150ms',
                }}
              >
                {dialogSaving
                  ? <><Loader size={15} className="spin" /> Saving...</>
                  : <><CheckCircle size={15} /> Save &amp; Continue</>
                }
              </button>
              {/* Skip & Continue */}
              <button
                onClick={handleDialogSkip}
                disabled={dialogSaving}
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: 12, border: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: '0.88rem',
                  cursor: dialogSaving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { if (!dialogSaving) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              >
                <ChevronRight size={15} /> Skip &amp; Continue
              </button>
              {/* Cancel */}
              <button
                onClick={handleDialogCancel}
                disabled={dialogSaving}
                style={{
                  width: '100%', padding: '0.6rem', borderRadius: 12, border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.35)', fontWeight: 500, fontSize: '0.85rem',
                  cursor: dialogSaving ? 'not-allowed' : 'pointer',
                  transition: 'color 150ms',
                }}
                onMouseEnter={e => { if (!dialogSaving) e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
              >
                ✕ Cancel — stay on this form
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 1rem', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '0.75rem', flexShrink: 0, flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '0.4rem 0.8rem', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back
        </button>

        {allForms.length > 1 && (
          <button
            onClick={() => setShowFormsQueue(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: showFormsQueue ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)',
              border: 'none', borderRadius: 8, padding: '0.4rem 0.75rem',
              color: showFormsQueue ? '#a5b4fc' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer', fontSize: '0.825rem', fontWeight: 600,
            }}
          >
            <ClipboardList size={15} /> All Forms ({allForms.length})
          </button>
        )}

        {/* Form title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formInstance.template_name}</div>
          {(formInstance.patient_name || formInstance.patient_id) && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
              {formInstance.patient_name || formInstance.patient_id}
            </div>
          )}
        </div>

        {/* Toggle patient info sidebar */}
        {patientData && (
          <button
            onClick={() => setShowInfoPanel(v => !v)}
            title="Patient Details"
            style={{ background: showInfoPanel ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 7, padding: '0 0.6rem', height: 32, cursor: 'pointer', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            📋 {patientData.name?.split(' ')[0]}
          </button>
        )}

        {/* Page navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={goToPrev} disabled={page <= 1}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={15} />
          </button>
          <span style={{ color: '#fff', fontSize: '0.875rem', minWidth: 70, textAlign: 'center' }}>Page {page} / {totalPages}</span>
          <button onClick={goToNext} disabled={page >= totalPages && (allForms.length <= 1 || allForms.findIndex(f => f.id === formInstance.id) >= allForms.length - 1)}
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
          <button onClick={toggleFullscreen} title="App Fullscreen"
            style={{ background: 'rgba(99,102,241,0.2)', border: 'none', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
            <Maximize2 size={14} />
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

      {/* Main content area: PDF + optional sidebars */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar: Forms Queue */}
        {showFormsQueue && allForms.length > 1 && (
          <div style={{
            width: 280, background: '#111827', borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', flexShrink: 0,
            animation: 'slideInRight 250ms ease reverse'
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Forms</span>
              <button onClick={() => setShowFormsQueue(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {allForms.map((f, i) => {
                  const isActive = f.id === formInstance.id
                  return (
                    <div
                      key={f.id}
                      onClick={() => onSwitchForm && onSwitchForm(f)}
                      style={{
                        padding: '0.875rem', borderRadius: 10, cursor: 'pointer',
                        background: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${isActive ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                        transition: 'all 150ms'
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: isActive ? 700 : 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
                        {i + 1}. {f.template_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.375rem', borderRadius: 4, background: f.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: f.status === 'completed' ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>
                          {f.status || 'blank'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
                          {f.updated_at ? new Date(f.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* PDF + Ink canvas area */}
        <div 
          ref={containerRef} 
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onWheel={(e) => {
            // Only intercept clearly horizontal trackpad swipes.
            // If the event has any significant vertical component, let the browser scroll natively.
            const absX = Math.abs(e.deltaX)
            const absY = Math.abs(e.deltaY)
            if (absX > absY && absX > 40 && !transitioning) {
              e.preventDefault()
              if (e.deltaX > 0) goToNext()
              else goToPrev()
            }
          }}
          style={{ 
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', 
            overflow: 'hidden',
            background: '#1e293b', position: 'relative',
            animation: slideDir === 'left'     ? 'slideOutLeft 220ms cubic-bezier(0.4,0,0.2,1) forwards'
                     : slideDir === 'right'    ? 'slideOutRight 220ms cubic-bezier(0.4,0,0.2,1) forwards'
                     : slideDir === 'in-right' ? 'slideInRight 280ms cubic-bezier(0.4,0,0.2,1) forwards'
                     : slideDir === 'in-left'  ? 'slideInLeft 280ms cubic-bezier(0.4,0,0.2,1) forwards'
                     : 'none',
          }}
        >
          {loadingPdf ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.4)' }}>
              <Loader size={28} className="spin" style={{ display: 'inline-block' }} />
              <span style={{ marginLeft: '0.75rem' }}>Loading PDF...</span>
            </div>
          ) : pdfError ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#f87171', flex: 1 }}>{pdfError}</div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
              <InkCanvas
                ref={inkCanvasRef}
                key={`${formInstance.id}-p${page}`}
                formId={formInstance.id}
                initialAnnotations={pageAnnotations}
                pdfPage={page}
                viewportSize={viewportSize}
                onSave={handleSave}
                canErase={canErase}
                allowDrawing={true}
                scale={scale}
                onSwipeLeft={goToNext}
                onSwipeRight={goToPrev}
                onDirtyChange={setIsDirty}
                externalAnnotations={autoFilled ? annotations.filter(s => s.page === page && s._autofilled) : undefined}
                onPinchZoom={(ratio) => setScale(s => {
                  const next = Math.max(0.4, Math.min(3, s * ratio))
                  return Math.round(next * 100) / 100  // round to 2dp to avoid float drift
                })}
              />
              
              {/* Pagination UI Arrows (Clickable on Laptop) */}
              <button 
                onClick={goToPrev}
                title="Previous Form/Page"
                style={{ position: 'sticky', top: '50%', left: 0, transform: 'translateY(-50%)', width: 44, height: 100, background: 'linear-gradient(90deg, rgba(0,0,0,0.3), transparent)', border: 'none', borderRadius: '0 12px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10, transition: 'all 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(90deg, rgba(99,102,241,0.4), transparent)'}
                onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0,0,0,0.3), transparent)'}
              ><ChevronLeft size={28} /></button>
              
              <button 
                onClick={goToNext}
                title="Next Form/Page"
                style={{ position: 'sticky', top: '50%', left: 'calc(100% - 44px)', transform: 'translateY(-50%)', width: 44, height: 100, background: 'linear-gradient(-90deg, rgba(0,0,0,0.3), transparent)', border: 'none', borderRadius: '12px 0 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10, transition: 'all 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(-90deg, rgba(99,102,241,0.4), transparent)'}
                onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(-90deg, rgba(0,0,0,0.3), transparent)'}
              ><ChevronRight size={28} /></button>
            </div>
          )}
        </div>

        {/* Patient Info Sidebar */}
        {showInfoPanel && patientData && (
          <PatientInfoSidebar
            patientData={patientData}
            onClose={() => setShowInfoPanel(false)}
            onStampField={(val) => {
              setPendingStamp(val)
              alert(`Now click on the PDF where you want to place: "${val}"`)
            }}
          />
        )}
      </div>
    </div>
  )
}

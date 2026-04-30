import { useRef, useState, useCallback, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { COMPONENT_DEFINITIONS } from '../engine/types'
import type { Terminal } from '../engine/types'
import type { WireType } from '../store/types'
import ComponentVisual from './ComponentVisual'
import './Canvas.css'

const WIRE_COLORS: Record<string, string> = {
  phase:  '#c0392b',
  neutre: '#2980b9',
  terre:  '#27ae60',
  signal: '#e67e22',
  marron: '#92400e',
  gris:   '#6b7280',
  noir:   '#475569',
  violet: '#7c3aed',
  orange: '#ea580c',
  blanc:  '#e2e8f0',
}

// Épaisseur des câbles selon la section (mm²)
const SECTION_WIDTH: Record<string, number> = {
  '3G1.5': 2.5, '5G1.5': 2.5,
  '3G2.5': 4.5, '5G2.5': 4.5,
  '3G6':   7.5, '5G6':   7.5,
}

function rotatePoint(px: number, py: number, cx: number, cy: number, deg: number): { x: number; y: number } {
  if (deg === 0) return { x: px, y: py }
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: cx + (px - cx) * cos - (py - cy) * sin,
    y: cy + (px - cx) * sin + (py - cy) * cos,
  }
}

function termPos(
  term: Terminal,
  w: number,
  h: number,
  allTerminals?: Terminal[]
): { x: number; y: number } {
  if (allTerminals) {
    const sameS = allTerminals.filter(t => t.side === term.side)
    if (sameS.length > 1) {
      const idx = sameS.indexOf(term)
      const t = (idx + 1) / (sameS.length + 1)
      switch (term.side) {
        case 'top':    return { x: w * t, y: 0 }
        case 'bottom': return { x: w * t, y: h }
        case 'left':   return { x: 0, y: h * t }
        case 'right':  return { x: w, y: h * t }
      }
    }
  }
  switch (term.side) {
    case 'top':    return { x: w / 2, y: 0 }
    case 'bottom': return { x: w / 2, y: h }
    case 'left':   return { x: 0, y: h / 2 }
    case 'right':  return { x: w, y: h / 2 }
  }
}

const TERM_FILL: Record<string, string> = {
  phase_in: '#ef4444', phase_out: '#ef4444',
  neutre_in: '#3b82f6', neutre_out: '#3b82f6', neutre_source: '#3b82f6',
  terre: '#22c55e', terre_source: '#22c55e',
  signal_in: '#f59e0b', signal_out: '#f59e0b',
  any: '#94a3b8',
  gaine_slot: '#a855f7',
}

const TERM_TO_WIRE: Record<string, WireType> = {
  phase_in: 'phase', phase_out: 'phase',
  neutre_in: 'neutre', neutre_out: 'neutre', neutre_source: 'neutre',
  terre: 'terre', terre_source: 'terre',
  signal_in: 'signal', signal_out: 'signal',
}

type ViewBox = { x: number; y: number; w: number; h: number }
const DEFAULT_VB: ViewBox = { x: 0, y: 0, w: 1600, h: 900 }

interface DragState    { compId: string; offsetX: number; offsetY: number }
interface WireStart    { compId: string; termId: string; x: number; y: number }
interface PanStart     { mx: number; my: number; origX: number; origY: number; origW: number; origH: number }
interface SnapTarget   { compId: string; termId: string; x: number; y: number }
interface PlanResize   { startX: number; startY: number; startW: number; startH: number; mode: 'both' | 'w' | 'h' }

const PLAN_OX = 50, PLAN_OY = 50  // origine du rectangle plan

const SNAP_RADIUS = 28  // SVG units — rayon magnétique des bornes

const Canvas = () => {
  const svgRef    = useRef<SVGSVGElement>(null)
  const viewBoxRef = useRef<ViewBox>(DEFAULT_VB)
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VB)
  useEffect(() => { viewBoxRef.current = viewBox }, [viewBox])

  const {
    components, wires, selectedElement,
    simMode, simResult, tool, activeWireType, mode,
    addComponent, addWire, selectElement, deselectElement,
    removeComponent, removeWire, updateComponent, setActiveWireType,
    openDerivationBox, planWidth, planHeight, setPlanSize,
  } = useEditorStore()

  const [mousePos,   setMousePos]   = useState({ x: 0, y: 0 })
  const [wireStart,  setWireStart]  = useState<WireStart | null>(null)
  const [drag,       setDrag]       = useState<DragState | null>(null)
  const [panStart,   setPanStart]   = useState<PanStart | null>(null)
  const [snapTarget, setSnapTarget] = useState<SnapTarget | null>(null)
  const [planResize, setPlanResize] = useState<PlanResize | null>(null)

  // Touche R : rotation 90° de la gaine/composant sélectionné
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (selectedElement?.type === 'component') {
        const comp = components.get(selectedElement.id)
        if (comp) {
          updateComponent(selectedElement.id, { rotation: ((comp.rotation ?? 0) + 90) % 360 })
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedElement, components, updateComponent])

  const getSVGCoords = useCallback((e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const vb = viewBoxRef.current
    return {
      x: vb.x + (e.clientX - rect.left) / rect.width * vb.w,
      y: vb.y + (e.clientY - rect.top)  / rect.height * vb.h,
    }
  }, [])

  // Zoom molette (non-passive)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const vb   = viewBoxRef.current
      const rect = svg.getBoundingClientRect()
      const mx   = vb.x + (e.clientX - rect.left) / rect.width  * vb.w
      const my   = vb.y + (e.clientY - rect.top)  / rect.height * vb.h
      const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85
      const newW = Math.max(320, Math.min(5000, vb.w * factor))
      const ratio = newW / vb.w
      const newH = vb.h * ratio
      const newVb = {
        x: mx - (mx - vb.x) * ratio,
        y: my - (my - vb.y) * ratio,
        w: newW, h: newH,
      }
      viewBoxRef.current = newVb
      setViewBox(newVb)
    }
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [])

  const handleSVGMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      const vb = viewBoxRef.current
      setPanStart({ mx: e.clientX, my: e.clientY, origX: vb.x, origY: vb.y, origW: vb.w, origH: vb.h })
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (panStart) {
        const svg  = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const newX = panStart.origX - (e.clientX - panStart.mx) * (panStart.origW / rect.width)
        const newY = panStart.origY - (e.clientY - panStart.my) * (panStart.origH / rect.height)
        const newVb = { ...viewBoxRef.current, x: newX, y: newY }
        viewBoxRef.current = newVb
        setViewBox(newVb)
        return
      }

      const pos = getSVGCoords(e)
      setMousePos(pos)

      // Redimensionnement du plan d'installation
      if (planResize) {
        const dx = pos.x - planResize.startX
        const dy = pos.y - planResize.startY
        const nw = planResize.mode !== 'h' ? planResize.startW + dx : planResize.startW
        const nh = planResize.mode !== 'w' ? planResize.startH + dy : planResize.startH
        setPlanSize(nw, nh)
        return
      }

      if (drag && tool === 'select') {
        updateComponent(drag.compId, {
          x: pos.x - drag.offsetX,
          y: pos.y - drag.offsetY,
        })
      }

      // Calcul snap magnétique
      if (tool === 'wire') {
        let nearest: SnapTarget | null = null
        let minDist = SNAP_RADIUS
        for (const [cid, comp] of components.entries()) {
          const def = (COMPONENT_DEFINITIONS as any)[comp.typeId]
          if (!def) continue
          const scale = comp.scale ?? 1
          const sw = def.w * scale
          const sh = def.h * scale
          for (const term of def.terminals as Terminal[]) {
            const tpr = termPos(term, sw, sh, def.terminals)
            const tp  = rotatePoint(tpr.x, tpr.y, sw / 2, sh / 2, comp.rotation ?? 0)
            const tx = comp.x + tp.x
            const ty = comp.y + tp.y
            const d  = Math.hypot(pos.x - tx, pos.y - ty)
            if (d < minDist) {
              minDist = d
              nearest = { compId: cid, termId: term.id, x: tx, y: ty }
            }
          }
        }
        setSnapTarget(nearest)
      } else if (snapTarget) {
        setSnapTarget(null)
      }
    },
    [drag, tool, getSVGCoords, updateComponent, panStart, components, snapTarget, planResize, setPlanSize]
  )

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setDrag(null)
    setPlanResize(null)
    if (e.button === 1) setPanStart(null)
  }, [])

  const handleSVGClick = useCallback(
    (e: React.MouseEvent) => {
      if (drag || panStart) return
      const target = e.target as SVGElement
      if (
        target === svgRef.current ||
        (target.tagName === 'rect' && target.getAttribute('fill')?.startsWith('url(#'))
      ) {
        deselectElement()
        if (tool === 'wire') setWireStart(null)
      }
    },
    [drag, panStart, deselectElement, tool]
  )

  const handleComponentMouseDown = useCallback(
    (e: React.MouseEvent, compId: string) => {
      if (e.button !== 0) return
      e.stopPropagation()
      if (tool === 'delete') { removeComponent(compId); return }
      if (tool === 'select') {
        selectElement('component', compId)
        const pos  = getSVGCoords(e)
        const comp = components.get(compId)
        if (comp) setDrag({ compId, offsetX: pos.x - comp.x, offsetY: pos.y - comp.y })
      }
    },
    [tool, removeComponent, selectElement, getSVGCoords, components]
  )

  // Double-clic sur boite_derivation → Among Us
  const handleComponentDblClick = useCallback(
    (e: React.MouseEvent, compId: string) => {
      e.stopPropagation()
      const comp = components.get(compId)
      if (comp?.typeId === 'boite_derivation') {
        openDerivationBox(compId)
      }
    },
    [components, openDerivationBox]
  )

  const handleTerminalClick = useCallback(
    (e: React.MouseEvent, compId: string, termId: string) => {
      e.stopPropagation()
      if (tool !== 'wire') return

      const comp  = components.get(compId)
      const def   = comp ? (COMPONENT_DEFINITIONS as any)[comp.typeId] : null
      const term  = def?.terminals.find((t: Terminal) => t.id === termId)
      const scale = comp?.scale ?? 1
      const sw    = def ? def.w * scale : 0
      const sh    = def ? def.h * scale : 0
      const tpr   = def && term ? termPos(term, sw, sh, def.terminals) : getSVGCoords(e)
      const tp    = def && term && comp
        ? rotatePoint((tpr as {x:number;y:number}).x, (tpr as {x:number;y:number}).y, sw / 2, sh / 2, comp.rotation ?? 0)
        : tpr
      const pos   = comp ? { x: comp.x + (tp as {x:number;y:number}).x, y: comp.y + (tp as {x:number;y:number}).y } : getSVGCoords(e)

      if (!wireStart) {
        if (term) {
          const autoType = TERM_TO_WIRE[term.type]
          if (autoType) setActiveWireType(autoType)
        }
        setWireStart({ compId, termId, x: pos.x, y: pos.y })
      } else {
        if (wireStart.compId === compId && wireStart.termId === termId) {
          setWireStart(null)
          return
        }
        addWire(wireStart.compId, wireStart.termId, compId, termId, activeWireType)
        setWireStart(null)
      }
    },
    [tool, wireStart, components, getSVGCoords, addWire, activeWireType, setActiveWireType]
  )

  // Clic SVG en mode fil : si snap actif, utiliser la borne snappée
  const handleSVGClickWire = useCallback(
    (e: React.MouseEvent) => {
      if (tool !== 'wire' || !snapTarget) return
      if (drag || panStart) return
      const target = e.target as SVGElement
      // S'assurer qu'on ne clique pas sur un composant ou terminal (déjà géré)
      if (target.closest('.comp-group') || target.closest('.term-group')) return
      handleTerminalClick(e, snapTarget.compId, snapTarget.termId)
    },
    [tool, snapTarget, drag, panStart, handleTerminalClick]
  )

  const handleWireClick = useCallback(
    (e: React.MouseEvent, wireId: string) => {
      e.stopPropagation()
      if (tool === 'delete') removeWire(wireId)
      else if (tool === 'select') selectElement('wire', wireId)
    },
    [tool, removeWire, selectElement]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const componentType = e.dataTransfer.getData('componentType')
      if (!componentType) return
      const pos = getSVGCoords(e)
      addComponent(componentType, pos.x, pos.y)
    },
    [getSVGCoords, addComponent]
  )

  const isPlan   = mode === 'plan'
  const zoomPct  = Math.round(DEFAULT_VB.w / viewBox.w * 100)
  const cursor   = planResize
    ? (planResize.mode === 'w' ? 'ew-resize' : planResize.mode === 'h' ? 'ns-resize' : 'nwse-resize')
    : panStart
      ? 'grabbing'
      : tool === 'wire'
        ? 'crosshair'
        : tool === 'delete'
          ? 'not-allowed'
          : 'default'

  // Position finale du fil preview (snappée ou curseur)
  const previewEnd = snapTarget
    ? { x: snapTarget.x, y: snapTarget.y }
    : mousePos

  return (
    <div className="canvas-container" onDragOver={handleDragOver} onDrop={handleDrop}>
      <svg
        ref={svgRef}
        className="canvas-svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleSVGMouseDown}
        onMouseLeave={() => { setPanStart(null) }}
        onClick={(e) => { handleSVGClick(e); handleSVGClickWire(e) }}
        style={{ cursor }}
      >
        <defs>
          <filter id="glow-energized" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-snap" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
          </pattern>
          <pattern id="plan-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#1e3a5f" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* ---- Fond ---- */}
        {isPlan ? (
          <>
            <rect x="-10000" y="-10000" width="30000" height="30000" fill="#06111f" />
            <rect x="-10000" y="-10000" width="30000" height="30000" fill="url(#plan-grid)" />
            <rect x={PLAN_OX} y={PLAN_OY} width={planWidth} height={planHeight}
              fill="none" stroke="#1d4ed8" strokeWidth="2" rx="6" strokeDasharray="10,5" />
            <text x={PLAN_OX + 12} y={PLAN_OY + 28} fill="#1d4ed8" fontSize="13"
              fontFamily="monospace" fontWeight="600" opacity="0.7">
              Plan d'installation — {planWidth}×{planHeight}
            </text>

            {/* Poignée coin bas-droit (W+H) */}
            <g style={{ cursor: 'nwse-resize' }}
              onMouseDown={(e) => { e.stopPropagation(); const p = getSVGCoords(e); setPlanResize({ startX: p.x, startY: p.y, startW: planWidth, startH: planHeight, mode: 'both' }) }}>
              <rect x={PLAN_OX + planWidth - 18} y={PLAN_OY + planHeight - 18} width={36} height={36}
                fill="rgba(29,78,216,0.15)" stroke="#1d4ed8" strokeWidth="1.5" rx="5" />
              <line x1={PLAN_OX + planWidth - 11} y1={PLAN_OY + planHeight - 3} x2={PLAN_OX + planWidth - 3} y2={PLAN_OY + planHeight - 11}
                stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" />
              <line x1={PLAN_OX + planWidth - 7} y1={PLAN_OY + planHeight - 3} x2={PLAN_OX + planWidth - 3} y2={PLAN_OY + planHeight - 7}
                stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            </g>

            {/* Poignée bord droit (W seul) */}
            <g style={{ cursor: 'ew-resize' }}
              onMouseDown={(e) => { e.stopPropagation(); const p = getSVGCoords(e); setPlanResize({ startX: p.x, startY: p.y, startW: planWidth, startH: planHeight, mode: 'w' }) }}>
              <rect x={PLAN_OX + planWidth - 14} y={PLAN_OY + planHeight / 2 - 22} width={28} height={44}
                fill="rgba(29,78,216,0.1)" stroke="#1d4ed8" strokeWidth="1" rx="4" />
              <line x1={PLAN_OX + planWidth - 4} y1={PLAN_OY + planHeight / 2 - 8} x2={PLAN_OX + planWidth - 4} y2={PLAN_OY + planHeight / 2 + 8}
                stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" />
              <line x1={PLAN_OX + planWidth - 4} y1={PLAN_OY + planHeight / 2 - 4} x2={PLAN_OX + planWidth + 4} y2={PLAN_OY + planHeight / 2}
                stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1={PLAN_OX + planWidth - 4} y1={PLAN_OY + planHeight / 2 + 4} x2={PLAN_OX + planWidth + 4} y2={PLAN_OY + planHeight / 2}
                stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Poignée bord bas (H seul) */}
            <g style={{ cursor: 'ns-resize' }}
              onMouseDown={(e) => { e.stopPropagation(); const p = getSVGCoords(e); setPlanResize({ startX: p.x, startY: p.y, startW: planWidth, startH: planHeight, mode: 'h' }) }}>
              <rect x={PLAN_OX + planWidth / 2 - 22} y={PLAN_OY + planHeight - 14} width={44} height={28}
                fill="rgba(29,78,216,0.1)" stroke="#1d4ed8" strokeWidth="1" rx="4" />
              <line x1={PLAN_OX + planWidth / 2 - 8} y1={PLAN_OY + planHeight - 4} x2={PLAN_OX + planWidth / 2 + 8} y2={PLAN_OY + planHeight - 4}
                stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" />
              <line x1={PLAN_OX + planWidth / 2 - 4} y1={PLAN_OY + planHeight - 4} x2={PLAN_OX + planWidth / 2} y2={PLAN_OY + planHeight + 4}
                stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1={PLAN_OX + planWidth / 2 + 4} y1={PLAN_OY + planHeight - 4} x2={PLAN_OX + planWidth / 2} y2={PLAN_OY + planHeight + 4}
                stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </>
        ) : (
          <>
            <rect x="-10000" y="-10000" width="30000" height="30000" fill="#0f172a" />
            <rect x="-10000" y="-10000" width="30000" height="30000" fill="url(#grid)" />
          </>
        )}

        {/* ---- Fils ---- */}
        {wires.map((wire) => {
          const fromComp = components.get(wire.fromCompId)
          const toComp   = components.get(wire.toCompId)
          if (!fromComp || !toComp) return null
          const fromDef = (COMPONENT_DEFINITIONS as any)[fromComp.typeId]
          const toDef   = (COMPONENT_DEFINITIONS as any)[toComp.typeId]
          if (!fromDef || !toDef) return null

          const fromTerm = fromDef.terminals.find((t: any) => t.id === wire.fromTermId)
          const toTerm   = toDef.terminals.find((t: any) => t.id === wire.toTermId)
          if (!fromTerm || !toTerm) return null

          const fromScale = fromComp.scale ?? 1
          const toScale   = toComp.scale ?? 1
          const fsw = fromDef.w * fromScale, fsh = fromDef.h * fromScale
          const tsw = toDef.w   * toScale,   tsh = toDef.h   * toScale
          const tp1r = termPos(fromTerm, fsw, fsh, fromDef.terminals)
          const tp2r = termPos(toTerm,   tsw, tsh, toDef.terminals)
          const tp1 = rotatePoint(tp1r.x, tp1r.y, fsw / 2, fsh / 2, fromComp.rotation ?? 0)
          const tp2 = rotatePoint(tp2r.x, tp2r.y, tsw / 2, tsh / 2, toComp.rotation   ?? 0)
          const p1  = { x: fromComp.x + tp1.x, y: fromComp.y + tp1.y }
          const p2  = { x: toComp.x   + tp2.x, y: toComp.y   + tp2.y }

          const dy   = p2.y - p1.y
          const bend = Math.min(Math.abs(dy) * 0.4 + 20, 80)
          const d    = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + bend} ${p2.x} ${p2.y - bend} ${p2.x} ${p2.y}`

          // Détection gaine (borne gaine_slot des deux côtés)
          const isGaine = fromTerm.type === 'gaine_slot' || toTerm.type === 'gaine_slot'

          const isEnergized = simMode && simResult?.energizedWires.has(wire.id)
          const isSelected  = selectedElement?.id === wire.id

          if (isGaine) {
            return (
              <g key={wire.id} className="wire" onClick={(e) => handleWireClick(e, wire.id)}>
                {/* Ombre extérieure */}
                <path d={d} stroke="#1e293b" strokeWidth={20}
                  fill="none" strokeLinecap="round" />
                {/* Corps gaine (tube gris) */}
                <path d={d} stroke={isSelected ? '#818cf8' : '#6b7280'} strokeWidth={16}
                  fill="none" strokeLinecap="round" />
                <path d={d} stroke={isSelected ? '#a5b4fc' : '#9ca3af'} strokeWidth={12}
                  fill="none" strokeLinecap="round" />
                {/* Conducteurs internes (bandes colorées dashed) */}
                <path d={d} stroke="#ef4444" strokeWidth={2.5}
                  fill="none" strokeLinecap="round" />
                <path d={d} stroke="#3b82f6" strokeWidth={2.5}
                  fill="none" strokeLinecap="round" strokeDasharray="4,12" strokeDashoffset="0" />
                <path d={d} stroke="#22c55e" strokeWidth={2.5}
                  fill="none" strokeLinecap="round" strokeDasharray="4,12" strokeDashoffset="8" />
                {/* Reflet */}
                <path d={d} stroke="rgba(255,255,255,0.12)" strokeWidth={5}
                  fill="none" strokeLinecap="round" />
              </g>
            )
          }

          // Fil standard : épaisseur selon section
          const baseW = wire.section ? (SECTION_WIDTH[wire.section] ?? 2.5) : 2.5
          const sw    = isSelected ? baseW + 2 : isEnergized ? baseW + 1 : baseW
          const color = WIRE_COLORS[wire.type] ?? '#888'
          const midX  = (p1.x + p2.x) / 2
          const midY  = (p1.y + p2.y) / 2

          return (
            <g key={wire.id} className="wire" onClick={(e) => handleWireClick(e, wire.id)}>
              {isSelected && (
                <path d={d} stroke="#60a5fa" strokeWidth={sw + 6}
                  fill="none" opacity="0.3" pointerEvents="none" />
              )}
              <path
                d={d}
                stroke={color}
                strokeWidth={sw}
                fill="none"
                strokeLinecap="round"
                cursor="pointer"
                className={isEnergized ? 'wire-energized' : undefined}
                filter={isEnergized ? 'url(#glow-energized)' : undefined}
              />
              {wire.section && (
                <>
                  <rect
                    x={midX - 18} y={midY - 7}
                    width={36} height={13}
                    fill="#0f172a" rx="2" opacity="0.9"
                    pointerEvents="none"
                  />
                  <text
                    x={midX} y={midY + 4}
                    textAnchor="middle"
                    fill={color} fontSize="8" fontFamily="monospace" fontWeight="bold"
                    pointerEvents="none"
                  >{wire.section}</text>
                </>
              )}
            </g>
          )
        })}

        {/* ---- Composants ---- */}
        {[...components.entries()]
          .sort(([, a], [, b]) => {
            const aBack = (COMPONENT_DEFINITIONS as any)[a.typeId]?.electricLogic === 'cabinet' ? -1 : 0
            const bBack = (COMPONENT_DEFINITIONS as any)[b.typeId]?.electricLogic === 'cabinet' ? -1 : 0
            return aBack - bBack
          })
          .map(([compId, comp]) => {
            const def = (COMPONENT_DEFINITIONS as any)[comp.typeId]
            if (!def) return null

            const scale = comp.scale ?? 1
            const sw    = def.w * scale
            const sh    = def.h * scale

            const isSelected  = selectedElement?.id === compId
            const isEnergized = simMode && simResult?.energizedComps.has(compId)
            const borderColor = isSelected ? '#60a5fa' : isEnergized ? '#10b981' : '#475569'
            const borderWidth = isSelected ? 2.5 : 1.5
            const bgColor     = isEnergized ? '#1a4731' : '#1e293b'

            const rotation = comp.rotation ?? 0

            return (
              <g
                key={compId}
                className="comp-group"
                transform={`translate(${comp.x}, ${comp.y}) rotate(${rotation}, ${sw / 2}, ${sh / 2})`}
                filter={isEnergized ? 'url(#glow-energized)' : undefined}
                style={{ cursor: tool === 'select' ? 'grab' : tool === 'delete' ? 'not-allowed' : 'default' }}
                onMouseDown={(e) => handleComponentMouseDown(e, compId)}
                onDoubleClick={(e) => handleComponentDblClick(e, compId)}
              >
                <rect
                  width={sw} height={sh}
                  fill={bgColor} stroke={borderColor}
                  strokeWidth={borderWidth} rx="3"
                />
                <ComponentVisual
                  typeId={comp.typeId}
                  def={scale === 1 ? def : { ...def, w: sw, h: sh }}
                  state={comp.state}
                  isEnergized={isEnergized}
                />

                {/* Label — visible seulement si sélectionné */}
                {isSelected && (
                  <text
                    x={sw / 2} y={sh + 13}
                    textAnchor="middle"
                    fill={isEnergized ? '#6ee7b7' : '#60a5fa'}
                    fontSize="9" fontFamily="monospace"
                    pointerEvents="none"
                  >
                    {comp.label || def.label}{def.electricLogic === 'conduit' ? '  [R=rotation]' : ''}
                  </text>
                )}

                {/* Bornes */}
                {(def.terminals as Terminal[]).map((term) => {
                  const { x: tcx, y: tcy } = termPos(term, sw, sh, def.terminals)
                  const isActive = wireStart?.compId === compId && wireStart?.termId === term.id
                  const isSnap   = snapTarget?.compId === compId && snapTarget?.termId === term.id
                  const isGaineT = term.type === 'gaine_slot'

                  let lx = tcx, ly = tcy
                  let anchor: 'middle' | 'start' | 'end' = 'middle'
                  if (term.side === 'top')         { ly -= 8 }
                  else if (term.side === 'bottom') { ly += 10 }
                  else if (term.side === 'left')   { lx -= 6; anchor = 'end' }
                  else                             { lx += 6; anchor = 'start' }

                  const fill   = isActive ? '#facc15' : (TERM_FILL[term.type] ?? '#94a3b8')
                  const radius = isSnap
                    ? 11
                    : isActive
                      ? 8
                      : tool === 'wire'
                        ? (isGaineT ? 8 : 7)
                        : (isGaineT ? 6 : 5)

                  return (
                    <g key={term.id} className="term-group">
                      {/* Halo magnétique */}
                      {isSnap && (
                        <circle
                          cx={tcx} cy={tcy} r={18}
                          fill="none" stroke="#facc15" strokeWidth="1.5"
                          opacity="0.7" filter="url(#glow-snap)"
                          pointerEvents="none"
                        />
                      )}
                      <circle
                        cx={tcx} cy={tcy}
                        r={radius}
                        fill={isSnap ? '#facc15' : fill}
                        stroke={isActive || isSnap ? '#92400e' : isGaineT ? '#7e22ce' : '#1e293b'}
                        strokeWidth={isGaineT ? 2 : 1.5}
                        cursor={tool === 'wire' ? 'crosshair' : 'default'}
                        onClick={(e) => handleTerminalClick(e, compId, term.id)}
                        style={{ transition: 'r 0.1s' }}
                      />
                      {/* Losange pour gaine_slot */}
                      {isGaineT && !isActive && !isSnap && (
                        <path
                          d={`M ${tcx} ${tcy - radius * 0.7} L ${tcx + radius * 0.7} ${tcy} L ${tcx} ${tcy + radius * 0.7} L ${tcx - radius * 0.7} ${tcy} Z`}
                          fill="#a855f7" opacity="0.4"
                          pointerEvents="none"
                        />
                      )}
                      {/* Label borne */}
                      {(tool === 'wire' || isSelected) && (
                        <text
                          x={lx} y={ly}
                          textAnchor={anchor}
                          fill={isGaineT ? '#c084fc' : '#94a3b8'}
                          fontSize="7" fontFamily="monospace"
                          pointerEvents="none"
                        >
                          {isGaineT ? 'G' : term.id}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}

        {/* Indicateur snap cible */}
        {snapTarget && tool === 'wire' && !wireStart && (
          <circle
            cx={snapTarget.x} cy={snapTarget.y} r={14}
            fill="rgba(250, 204, 21, 0.15)"
            stroke="#facc15" strokeWidth="1.5"
            strokeDasharray="3,3"
            pointerEvents="none"
          />
        )}

        {/* Prévisualisation fil */}
        {wireStart && tool === 'wire' && (
          <>
            <line
              x1={wireStart.x} y1={wireStart.y}
              x2={previewEnd.x} y2={previewEnd.y}
              stroke={WIRE_COLORS[activeWireType] ?? '#e67e22'}
              strokeWidth="2.5" strokeDasharray="8,5" opacity="0.8"
              pointerEvents="none"
            />
            {snapTarget && (
              <circle
                cx={snapTarget.x} cy={snapTarget.y} r={10}
                fill="rgba(250, 204, 21, 0.25)"
                stroke="#facc15" strokeWidth="2"
                pointerEvents="none"
              />
            )}
          </>
        )}
      </svg>

      {/* HUD overlay */}
      <div className="canvas-hud">
        <button
          className="hud-reset"
          onClick={() => {
            viewBoxRef.current = DEFAULT_VB
            setViewBox(DEFAULT_VB)
          }}
          title="Réinitialiser la vue"
        >
          ↺ {zoomPct}%
        </button>
        <span className="hud-coords">
          {Math.round(mousePos.x)}, {Math.round(mousePos.y)}
        </span>
      </div>
    </div>
  )
}

export default Canvas

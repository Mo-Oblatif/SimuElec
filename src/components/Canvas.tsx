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
}

const TERM_TO_WIRE: Record<string, WireType> = {
  phase_in: 'phase', phase_out: 'phase',
  neutre_in: 'neutre', neutre_out: 'neutre', neutre_source: 'neutre',
  terre: 'terre', terre_source: 'terre',
  signal_in: 'signal', signal_out: 'signal',
}

type ViewBox = { x: number; y: number; w: number; h: number }
const DEFAULT_VB: ViewBox = { x: 0, y: 0, w: 1600, h: 900 }

interface DragState { compId: string; offsetX: number; offsetY: number }
interface WireStart { compId: string; termId: string; x: number; y: number }
interface PanStart { mx: number; my: number; origX: number; origY: number; origW: number; origH: number }

const Canvas = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const viewBoxRef = useRef<ViewBox>(DEFAULT_VB)
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VB)
  useEffect(() => { viewBoxRef.current = viewBox }, [viewBox])

  const {
    components, wires, selectedElement,
    simMode, simResult, tool, activeWireType, mode,
    addComponent, addWire, selectElement, deselectElement,
    removeComponent, removeWire, updateComponent, setActiveWireType,
  } = useEditorStore()

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [wireStart, setWireStart] = useState<WireStart | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [panStart, setPanStart] = useState<PanStart | null>(null)

  const getSVGCoords = useCallback((e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const vb = viewBoxRef.current
    return {
      x: vb.x + (e.clientX - rect.left) / rect.width * vb.w,
      y: vb.y + (e.clientY - rect.top) / rect.height * vb.h,
    }
  }, [])

  // Wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const vb = viewBoxRef.current
      const rect = svg.getBoundingClientRect()
      const mx = vb.x + (e.clientX - rect.left) / rect.width * vb.w
      const my = vb.y + (e.clientY - rect.top) / rect.height * vb.h
      const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85
      const newW = Math.max(320, Math.min(5000, vb.w * factor))
      const ratio = newW / vb.w
      const newH = vb.h * ratio
      const newX = mx - (mx - vb.x) * ratio
      const newY = my - (my - vb.y) * ratio
      const newVb = { x: newX, y: newY, w: newW, h: newH }
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
        const svg = svgRef.current
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
      if (drag && tool === 'select') {
        updateComponent(drag.compId, {
          x: pos.x - drag.offsetX,
          y: pos.y - drag.offsetY,
        })
      }
    },
    [drag, tool, getSVGCoords, updateComponent, panStart]
  )

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setDrag(null)
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
        const pos = getSVGCoords(e)
        const comp = components.get(compId)
        if (comp) setDrag({ compId, offsetX: pos.x - comp.x, offsetY: pos.y - comp.y })
      }
    },
    [tool, removeComponent, selectElement, getSVGCoords, components]
  )

  const handleTerminalClick = useCallback(
    (e: React.MouseEvent, compId: string, termId: string) => {
      e.stopPropagation()
      if (tool !== 'wire') return

      const comp = components.get(compId)
      const def = comp ? COMPONENT_DEFINITIONS[comp.typeId] : null
      const term = def?.terminals.find(t => t.id === termId)
      const scale = comp?.scale ?? 1
      const sw = def ? def.w * scale : 0
      const sh = def ? def.h * scale : 0
      const tp = def && term ? termPos(term, sw, sh, def.terminals) : getSVGCoords(e)
      const pos = comp ? { x: comp.x + (tp as any).x, y: comp.y + (tp as any).y } : getSVGCoords(e)

      if (!wireStart) {
        if (term) {
          const autoType = TERM_TO_WIRE[term.type]
          if (autoType) setActiveWireType(autoType)
        }
        setWireStart({ compId, termId, x: (pos as any).x, y: (pos as any).y })
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

  const isPlan = mode === 'plan'
  const zoomPct = Math.round(DEFAULT_VB.w / viewBox.w * 100)
  const cursor = panStart ? 'grabbing' : tool === 'wire' ? 'crosshair' : tool === 'delete' ? 'not-allowed' : 'default'

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
        onClick={handleSVGClick}
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
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
          </pattern>
          <pattern id="plan-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#1e3a5f" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* ---- Background (infinite) ---- */}
        {isPlan ? (
          <>
            <rect x="-10000" y="-10000" width="30000" height="30000" fill="#06111f" />
            <rect x="-10000" y="-10000" width="30000" height="30000" fill="url(#plan-grid)" />
            <rect x="50" y="50" width="1500" height="800"
              fill="none" stroke="#1d4ed8" strokeWidth="2" rx="6" strokeDasharray="10,5" />
            <text x="62" y="78" fill="#1d4ed8" fontSize="13" fontFamily="monospace"
              fontWeight="600" opacity="0.7">Plan d'installation</text>
          </>
        ) : (
          <>
            <rect x="-10000" y="-10000" width="30000" height="30000" fill="#0f172a" />
            <rect x="-10000" y="-10000" width="30000" height="30000" fill="url(#grid)" />
          </>
        )}

        {/* ---- Wires ---- */}
        {wires.map((wire) => {
          const fromComp = components.get(wire.fromCompId)
          const toComp   = components.get(wire.toCompId)
          if (!fromComp || !toComp) return null
          const fromDef = COMPONENT_DEFINITIONS[fromComp.typeId]
          const toDef   = COMPONENT_DEFINITIONS[toComp.typeId]
          if (!fromDef || !toDef) return null

          const fromTerm = fromDef.terminals.find((t: any) => t.id === wire.fromTermId)
          const toTerm   = toDef.terminals.find((t: any) => t.id === wire.toTermId)
          if (!fromTerm || !toTerm) return null

          const fromScale = fromComp.scale ?? 1
          const toScale   = toComp.scale ?? 1
          const tp1 = termPos(fromTerm, fromDef.w * fromScale, fromDef.h * fromScale, fromDef.terminals)
          const tp2 = termPos(toTerm,   toDef.w * toScale,   toDef.h * toScale,   toDef.terminals)
          const p1  = { x: fromComp.x + tp1.x, y: fromComp.y + tp1.y }
          const p2  = { x: toComp.x   + tp2.x, y: toComp.y   + tp2.y }

          const dy = p2.y - p1.y
          const bend = Math.min(Math.abs(dy) * 0.4 + 20, 80)
          const color = WIRE_COLORS[wire.type] ?? '#888'
          const isEnergized = simMode && simResult?.energizedWires.has(wire.id)
          const isSelected  = selectedElement?.id === wire.id
          const sw = isSelected ? 4 : isEnergized ? 3.5 : 2.5
          const d = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + bend} ${p2.x} ${p2.y - bend} ${p2.x} ${p2.y}`

          const midX = (p1.x + p2.x) / 2
          const midY = (p1.y + p2.y) / 2

          return (
            <g key={wire.id} className="wire" onClick={(e) => handleWireClick(e, wire.id)}>
              {isSelected && (
                <path d={d} stroke="#60a5fa" strokeWidth={8} fill="none" opacity="0.3" pointerEvents="none" />
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
                    x={midX - 16} y={midY - 6}
                    width={32} height={11}
                    fill="#0f172a" rx="2" opacity="0.85"
                    pointerEvents="none"
                  />
                  <text
                    x={midX} y={midY + 3}
                    textAnchor="middle"
                    fill={color} fontSize="8" fontFamily="monospace" fontWeight="bold"
                    pointerEvents="none"
                  >{wire.section}</text>
                </>
              )}
            </g>
          )
        })}

        {/* ---- Components (cabinets drawn first so they stay behind) ---- */}
        {[...components.entries()]
          .sort(([, a], [, b]) => {
            const aBack = COMPONENT_DEFINITIONS[a.typeId]?.electricLogic === 'cabinet' ? -1 : 0
            const bBack = COMPONENT_DEFINITIONS[b.typeId]?.electricLogic === 'cabinet' ? -1 : 0
            return aBack - bBack
          })
          .map(([compId, comp]) => {
          const def = COMPONENT_DEFINITIONS[comp.typeId]
          if (!def) return null

          const scale = comp.scale ?? 1
          const sw = def.w * scale
          const sh = def.h * scale

          const isSelected  = selectedElement?.id === compId
          const isEnergized = simMode && simResult?.energizedComps.has(compId)
          const borderColor = isSelected ? '#60a5fa' : isEnergized ? '#10b981' : '#475569'
          const borderWidth = isSelected ? 2.5 : 1.5
          const bgColor     = isEnergized ? '#1a4731' : '#1e293b'

          return (
            <g
              key={compId}
              transform={`translate(${comp.x}, ${comp.y})`}
              filter={isEnergized ? 'url(#glow-energized)' : undefined}
              style={{ cursor: tool === 'select' ? 'grab' : tool === 'delete' ? 'not-allowed' : 'default' }}
              onMouseDown={(e) => handleComponentMouseDown(e, compId)}
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
              {/* Label — masqué en mode Plan */}
              {!isPlan && (
                <text
                  x={sw / 2} y={sh + 13}
                  textAnchor="middle"
                  fill={isEnergized ? '#6ee7b7' : '#94a3b8'}
                  fontSize="9" fontFamily="monospace"
                  pointerEvents="none"
                >
                  {comp.label || def.label}
                </text>
              )}

              {/* Terminals */}
              {def.terminals.map((term) => {
                const { x: tcx, y: tcy } = termPos(term, sw, sh, def.terminals)
                const isActive = wireStart?.compId === compId && wireStart?.termId === term.id

                let lx = tcx, ly = tcy
                let anchor: 'middle' | 'start' | 'end' = 'middle'
                if (term.side === 'top')         { ly -= 8 }
                else if (term.side === 'bottom') { ly += 10 }
                else if (term.side === 'left')   { lx -= 6; anchor = 'end' }
                else                             { lx += 6; anchor = 'start' }

                return (
                  <g key={term.id}>
                    <circle
                      cx={tcx} cy={tcy}
                      r={tool === 'wire' ? 7 : 6}
                      fill={isActive ? '#facc15' : (TERM_FILL[term.type] ?? '#94a3b8')}
                      stroke={isActive ? '#92400e' : '#1e293b'}
                      strokeWidth="1.5"
                      cursor={tool === 'wire' ? 'crosshair' : 'default'}
                      onClick={(e) => handleTerminalClick(e, compId, term.id)}
                      style={{ transition: 'r 0.1s' }}
                    />
                    {(tool === 'wire' || isSelected) && (
                      <text
                        x={lx} y={ly}
                        textAnchor={anchor}
                        fill="#94a3b8" fontSize="7" fontFamily="monospace"
                        pointerEvents="none"
                      >
                        {term.id}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Wire preview */}
        {wireStart && tool === 'wire' && (
          <line
            x1={wireStart.x} y1={wireStart.y}
            x2={mousePos.x}  y2={mousePos.y}
            stroke={WIRE_COLORS[activeWireType] ?? '#e67e22'}
            strokeWidth="2.5" strokeDasharray="8,5" opacity="0.8"
            pointerEvents="none"
          />
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
          title="Réinitialiser la vue (molette pour zoomer, clic milieu pour déplacer)"
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

import { useRef, useEffect, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { COMPONENT_DEFINITIONS } from '../engine/types'
import './Canvas.css'

const Canvas = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { components, wires, selectedElement, simMode, simResult, tool, activeWireType, addComponent, selectElement, deselectElement, addWire } =
    useEditorStore()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [wireStart, setWireStart] = useState<{ compId: string; termId: string; x: number; y: number } | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect()
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as SVGElement
      
      // Handle terminal clicks in wire mode
      if (tool === 'wire' && target.tagName === 'circle') {
        const termId = target.getAttribute('data-terminal')
        const compId = target.getAttribute('data-comp-id')
        
        if (termId && compId) {
          const rect = svg!.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top

          if (!wireStart) {
            // Start wire
            setWireStart({ compId, termId, x, y })
          } else if (wireStart.compId !== compId || wireStart.termId !== termId) {
            // Complete wire
            addWire(wireStart.compId, wireStart.termId, compId, termId, activeWireType)
            setWireStart(null)
          }
        }
        return
      }

      // Handle component selection in select mode
      if (tool === 'select' && target.classList.contains('component-rect')) {
        const compId = target.getAttribute('data-id')
        if (compId) {
          selectElement('component', compId)
        }
      } else if (tool === 'select') {
        deselectElement()
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      const componentType = e.dataTransfer?.getData('componentType')
      if (componentType) {
        const rect = svg.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        addComponent(componentType, x, y)
      }
    }

    svg.addEventListener('mousemove', handleMouseMove)
    svg.addEventListener('click', handleClick)
    svg.addEventListener('dragover', handleDragOver)
    svg.addEventListener('drop', handleDrop)

    return () => {
      svg.removeEventListener('mousemove', handleMouseMove)
      svg.removeEventListener('click', handleClick)
      svg.removeEventListener('dragover', handleDragOver)
      svg.removeEventListener('drop', handleDrop)
    }
  }, [selectElement, deselectElement, addComponent, addWire, tool, activeWireType, components, wireStart])

  return (
    <div className="canvas-container">
      <svg
        ref={svgRef}
        className="canvas-svg"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="glow-phase">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-neutre">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-terre">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-energized">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="1600" height="900" fill="url(#grid)" />

        {/* Wires first (so they appear behind components) */}
        {wires.map((wire) => {
          const fromComp = components.get(wire.fromCompId)
          const toComp = components.get(wire.toCompId)

          if (!fromComp || !toComp) return null

          const fromDef = COMPONENT_DEFINITIONS[fromComp.typeId]
          const toDef = COMPONENT_DEFINITIONS[toComp.typeId]

          if (!fromDef || !toDef) return null

          const fromTerm = fromDef.terminals.find((t) => t.id === wire.fromTermId)
          const toTerm = toDef.terminals.find((t) => t.id === wire.toTermId)

          if (!fromTerm || !toTerm) return null

          const p1 = {
            x: fromComp.x + (fromTerm.rx ?? 0.5) * fromDef.w,
            y: fromComp.y + (fromTerm.ry ?? 0.5) * fromDef.h,
          }

          const p2 = {
            x: toComp.x + (toTerm.rx ?? 0.5) * toDef.w,
            y: toComp.y + (toTerm.ry ?? 0.5) * toDef.h,
          }

          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const bend = Math.min(dist * 0.3, 80)

          const wireColors: Record<string, string> = {
            phase: '#c0392b',
            neutre: '#2980b9',
            terre: '#27ae60',
            signal: '#e67e22',
          }

          const color = wireColors[wire.type] || '#888'
          const isEnergized = simMode && simResult && simResult.energizedWires.has(wire.id)
          const strokeWidth = selectedElement?.id === wire.id ? 4 : isEnergized ? 3 : 2
          const filterId = isEnergized ? `glow-${wire.type}` : undefined

          return (
            <g key={wire.id} className="wire" onClick={() => selectElement('wire', wire.id)}>
              <path
                d={`M ${p1.x} ${p1.y} Q ${p1.x} ${p1.y + bend} ${p2.x} ${p2.y}`}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                cursor="pointer"
                filter={filterId}
              />
              {selectedElement?.id === wire.id && (
                <path
                  d={`M ${p1.x} ${p1.y} Q ${p1.x} ${p1.y + bend} ${p2.x} ${p2.y}`}
                  stroke="#60a5fa"
                  strokeWidth={6}
                  fill="none"
                  opacity="0.3"
                  pointerEvents="none"
                />
              )}
            </g>
          )
        })}

        {/* Components */}
        {components.map(([compId, comp]) => {
          const def = COMPONENT_DEFINITIONS[comp.typeId]
          if (!def) return null

          const isSelected = selectedElement?.id === compId
          const isEnergized = simMode && simResult && simResult.energizedComps.has(compId)
          const bgColor = isEnergized ? '#4a7c59' : '#2d3561'
          const borderColor = isSelected ? '#60a5fa' : isEnergized ? '#10b981' : '#4a5490'
          const borderWidth = isSelected ? 3 : 2
          const filter = isEnergized ? 'url(#glow-energized)' : undefined

          return (
            <g key={compId} transform={`translate(${comp.x}, ${comp.y})`}>
              {/* Component background */}
              <rect
                className="component-rect"
                data-id={compId}
                width={def.w}
                height={def.h}
                fill={bgColor}
                stroke={borderColor}
                strokeWidth={borderWidth}
                rx="2"
                cursor="pointer"
                filter={filter}
              />

              {/* Terminals */}
              {def.terminals.map((term, idx) => (
                <circle
                  key={term.id}
                  data-terminal={term.id}
                  data-comp-id={compId}
                  cx={(term.rx ?? 0.5) * def.w}
                  cy={(term.ry ?? 0.5) * def.h}
                  r="4"
                  fill="#cbd5e1"
                  stroke="#1e293b"
                  strokeWidth="1"
                  cursor={tool === 'wire' ? 'crosshair' : 'default'}
                />
              ))}

              {/* Label */}
              <text
                x={def.w / 2}
                y={def.h / 2 + 4}
                textAnchor="middle"
                fill={isEnergized ? '#d1fae5' : '#f1f5f9'}
                fontSize="10"
                fontWeight="500"
              >
                {comp.label || def.label}
              </text>
            </g>
          )
        })}

        {/* Wire preview while drawing */}
        {wireStart && tool === 'wire' && (
          <line
            x1={wireStart.x}
            y1={wireStart.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#e67e22"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.7"
            pointerEvents="none"
          />
        )}

        {/* Coordinates display */}
        <text x="10" y="25" fill="#94a3b8" fontSize="12" fontFamily="monospace">
          {Math.round(mousePos.x)} , {Math.round(mousePos.y)}
        </text>
      </svg>
    </div>
  )
}

export default Canvas

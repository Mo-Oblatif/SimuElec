import { useState, useMemo, useRef, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { COMPONENT_DEFINITIONS } from '../engine/types'
import './DerivationBox.css'

type CondType = 'phase' | 'neutre' | 'terre' | 'noir' | 'gris'

interface SelectedConductor {
  gaineId: string
  type: CondType
}

const COND_COLOR: Record<CondType, string> = {
  phase:  '#92400e',
  neutre: '#3b82f6',
  terre:  '#22c55e',
  noir:   '#64748b',
  gris:   '#94a3b8',
}
const COND_LABEL: Record<CondType, string> = {
  phase:  'L1',
  neutre: 'N',
  terre:  'PE',
  noir:   'L2',
  gris:   'L3',
}

const CONDUCTORS_3G: CondType[] = ['phase', 'neutre', 'terre']
const CONDUCTORS_5G: CondType[] = ['phase', 'noir', 'gris', 'neutre', 'terre']

function getConductors(section: string): CondType[] {
  return section.startsWith('5G') ? CONDUCTORS_5G : CONDUCTORS_3G
}

// ---- Layout SVG ----
const CX = 350, CY = 270, R_BOX = 120
const EXT_DIST   = R_BOX + 52   // centre → extrémité du tube
const SIDE_GAP   = 60           // écart entre 2 gaines sur le même côté

function gaineExtPos(side: string, idxOnSide: number, totalOnSide: number): { ex: number; ey: number } {
  const off = (idxOnSide - (totalOnSide - 1) / 2) * SIDE_GAP
  switch (side) {
    case 'top':    return { ex: CX + off,        ey: CY - EXT_DIST }
    case 'bottom': return { ex: CX + off,        ey: CY + EXT_DIST }
    case 'right':  return { ex: CX + EXT_DIST,   ey: CY + off }
    case 'left':   return { ex: CX - EXT_DIST,   ey: CY + off }
    default:       return { ex: CX,              ey: CY - EXT_DIST }
  }
}

function boxEdgeDir(ex: number, ey: number): { x: number; y: number } {
  const dx = ex - CX, dy = ey - CY
  const d  = Math.hypot(dx, dy) || 1
  return { x: CX + (dx / d) * R_BOX, y: CY + (dy / d) * R_BOX }
}

function sideSpread(side: string): [number, number] {
  return side === 'top' || side === 'bottom' ? [20, 0] : [0, 20]
}

function condPos(
  ex: number, ey: number, spread: [number, number],
  ci: number, total: number
): { x: number; y: number } {
  const off = ci - (total - 1) / 2
  return { x: ex + off * spread[0], y: ey + off * spread[1] }
}

function connPath(
  ex1: number, ey1: number, sp1: [number, number], i1: number, t1: number,
  ex2: number, ey2: number, sp2: [number, number], i2: number, t2: number
): string {
  const p1 = condPos(ex1, ey1, sp1, i1, t1)
  const p2 = condPos(ex2, ey2, sp2, i2, t2)
  const cp1x = p1.x + (CX - p1.x) * 0.58
  const cp1y = p1.y + (CY - p1.y) * 0.58
  const cp2x = p2.x + (CX - p2.x) * 0.58
  const cp2y = p2.y + (CY - p2.y) * 0.58
  return `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
}

// ---- Composant ----

const GAINE_TERM_IDS = new Set(['g1','g2','g3','g4','g5','g6','g7'])

const DerivationBox = () => {
  const {
    derivationBoxOpen, closeDerivationBox,
    components, wires,
    gaineConnections, addGaineConnection, removeGaineConnection,
    updateComponent,
  } = useEditorStore()

  const [selected, setSelected] = useState<SelectedConductor | null>(null)
  const [editingGaineId, setEditingGaineId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingGaineId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingGaineId])

  const boxId = derivationBoxOpen
  if (!boxId) return null

  const boxDef = (COMPONENT_DEFINITIONS as any)['boite_derivation']

  const connectedGaines = useMemo(() => {
    const raw = wires
      .filter(w => {
        if (w.fromCompId === boxId) return GAINE_TERM_IDS.has(w.fromTermId)
        if (w.toCompId   === boxId) return GAINE_TERM_IDS.has(w.toTermId)
        return false
      })
      .map(w => {
        const isFromBox  = w.fromCompId === boxId
        // Utiliser l'ID du fil comme identifiant unique de la gaine
        // (un même composant peut avoir plusieurs gaines vers la boîte)
        const gaineId    = w.id
        const gaineCompId = isFromBox ? w.toCompId : w.fromCompId
        const boxTermId  = isFromBox ? w.fromTermId : w.toTermId
        const boxTerm    = boxDef?.terminals.find((t: any) => t.id === boxTermId)
        const gaineComp  = components.get(gaineCompId)
        const gaineDef   = gaineComp ? (COMPONENT_DEFINITIONS as any)[gaineComp.typeId] : null
        // Priorité : section du fil > section de la définition du composant > défaut 3G1.5
        const section    = (w.section as string) || (gaineDef?.section as string) || '3G1.5'
        const compLabel  = gaineComp?.label || gaineDef?.label || ''
        const label      = compLabel || 'Gaine'
        return {
          gaineId,
          gaineCompId,
          side:       (boxTerm?.side ?? 'top') as string,
          label,
          section,
          conductors: getConductors(section),
        }
      })

    // Compte par côté
    const sideCount: Record<string, number> = {}
    raw.forEach(g => { sideCount[g.side] = (sideCount[g.side] ?? 0) + 1 })

    // Index par côté et calcul des positions
    const sideIdx: Record<string, number> = {}
    return raw.map(g => {
      if (sideIdx[g.side] === undefined) sideIdx[g.side] = 0
      const idxOnSide   = sideIdx[g.side]++
      const totalOnSide = sideCount[g.side]
      const { ex, ey }  = gaineExtPos(g.side, idxOnSide, totalOnSide)
      const spread      = sideSpread(g.side)
      return { ...g, ex, ey, spread }
    })
  }, [boxId, wires, components, boxDef])

  const connections = gaineConnections.get(boxId) ?? []

  const commitRename = () => {
    if (!editingGaineId) return
    const gaine = connectedGaines.find(g => g.gaineId === editingGaineId)
    if (gaine && editLabel.trim()) {
      updateComponent(gaine.gaineCompId, { label: editLabel.trim() })
    }
    setEditingGaineId(null)
  }

  const handleConductorClick = (gaineId: string, type: CondType) => {
    if (!selected) {
      setSelected({ gaineId, type })
      return
    }
    if (selected.gaineId === gaineId && selected.type === type) {
      setSelected(null)
      return
    }
    const existingConn = connections.find(
      c =>
        (c.fromGaineId === selected.gaineId && c.fromType === selected.type) ||
        (c.toGaineId   === selected.gaineId && c.toType   === selected.type)
    )
    if (existingConn) removeGaineConnection(boxId, existingConn.id)

    addGaineConnection(boxId, {
      fromGaineId: selected.gaineId,
      fromType:    selected.type,
      toGaineId:   gaineId,
      toType:      type,
    })
    setSelected(null)
  }

  const isConductorConnected = (gaineId: string, type: CondType) =>
    connections.some(
      c =>
        (c.fromGaineId === gaineId && c.fromType === type) ||
        (c.toGaineId   === gaineId && c.toType   === type)
    )

  const isCorrectConnection = (conn: (typeof connections)[0]) =>
    conn.fromType === conn.toType

  const allCorrect = connections.length > 0 && connections.every(isCorrectConnection)

  return (
    <div className="deriv-overlay" onClick={closeDerivationBox}>
      <div className="deriv-modal" onClick={e => e.stopPropagation()}>

        <div className="deriv-header">
          <span className="deriv-title">Boîte de dérivation — connexions internes</span>
          <div className="deriv-status">
            {connections.length === 0 && (
              <span className="deriv-hint">Cliquez un conducteur pour commencer</span>
            )}
            {connections.length > 0 && allCorrect && (
              <span className="deriv-ok">Connexions correctes</span>
            )}
            {connections.length > 0 && !allCorrect && (
              <span className="deriv-warn">Vérifiez les couleurs !</span>
            )}
          </div>
          <button className="deriv-close" onClick={closeDerivationBox}>✕</button>
        </div>

        {connectedGaines.length === 0 ? (
          <div className="deriv-empty">
            <p>Aucune gaine connectée à cette boîte.</p>
            <p className="deriv-hint">
              En mode Fil, reliez la borne <strong>G</strong> (violette) d'une gaine
              à la borne <strong>G</strong> de la boîte.
            </p>
          </div>
        ) : (
          <svg className="deriv-svg" viewBox="0 0 700 540">
            <defs>
              <radialGradient id="box-bg" cx="50%" cy="50%">
                <stop offset="0%"   stopColor="#1e3a5f" />
                <stop offset="100%" stopColor="#0c1a2e" />
              </radialGradient>
              <filter id="glow-sel" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Fond boîte */}
            <circle cx={CX} cy={CY} r={R_BOX + 8}
              fill="#0a1628" stroke="#1e3a5f" strokeWidth="3" />
            <circle cx={CX} cy={CY} r={R_BOX}
              fill="url(#box-bg)" stroke="#2d5a8e" strokeWidth="1.5" />
            <text x={CX} y={CY - 8} textAnchor="middle"
              fill="#3b82f6" fontSize="11" fontFamily="monospace" opacity="0.6">
              DÉRIVATION
            </text>
            <text x={CX} y={CY + 8} textAnchor="middle"
              fill="#64748b" fontSize="9" fontFamily="monospace">
              {connectedGaines.length} gaine{connectedGaines.length > 1 ? 's' : ''}
            </text>

            {/* Connexions internes */}
            {connections.map(conn => {
              const fromG = connectedGaines.find(g => g.gaineId === conn.fromGaineId)
              const toG   = connectedGaines.find(g => g.gaineId === conn.toGaineId)
              if (!fromG || !toG) return null
              const i1 = fromG.conductors.indexOf(conn.fromType as CondType)
              const i2 = toG.conductors.indexOf(conn.toType as CondType)
              if (i1 < 0 || i2 < 0) return null
              const correct = isCorrectConnection(conn)
              const color   = correct ? COND_COLOR[conn.fromType as CondType] : '#f59e0b'
              return (
                <path
                  key={conn.id}
                  d={connPath(
                    fromG.ex, fromG.ey, fromG.spread, i1, fromG.conductors.length,
                    toG.ex,   toG.ey,   toG.spread,   i2, toG.conductors.length
                  )}
                  stroke={color}
                  strokeWidth={correct ? 2.5 : 2}
                  fill="none"
                  strokeDasharray={correct ? 'none' : '4,3'}
                  opacity={0.85}
                  strokeLinecap="round"
                />
              )
            })}

            {/* Gaines connectées */}
            {connectedGaines.map(gaine => {
              const edge    = boxEdgeDir(gaine.ex, gaine.ey)
              const isHoriz = gaine.side === 'top' || gaine.side === 'bottom'
              const total   = gaine.conductors.length
              const isEditing = editingGaineId === gaine.gaineId

              // Positions du label et du bouton renommer
              const labelX = isHoriz
                ? gaine.ex
                : gaine.ex + (gaine.side === 'left' ? -12 : 12)
              const labelY = isHoriz
                ? gaine.ey + (gaine.side === 'top' ? -22 : 24)
                : gaine.ey
              const labelAnchor: 'middle' | 'start' | 'end' = isHoriz
                ? 'middle'
                : gaine.side === 'left' ? 'end' : 'start'

              // Position foreignObject pour l'input de renommage
              const foW = 130
              const foH = 22
              const foX = isHoriz
                ? gaine.ex - foW / 2
                : gaine.side === 'left'
                  ? gaine.ex - 14 - foW
                  : gaine.ex + 14
              const foY = isHoriz
                ? gaine.ey + (gaine.side === 'top' ? -22 - foH + 2 : 14)
                : gaine.ey - foH / 2

              return (
                <g key={gaine.gaineId}>
                  {/* Tube gaine */}
                  <line x1={edge.x} y1={edge.y} x2={gaine.ex} y2={gaine.ey}
                    stroke="#9ca3af" strokeWidth="16" strokeLinecap="round" />
                  <line x1={edge.x} y1={edge.y} x2={gaine.ex} y2={gaine.ey}
                    stroke="#374151" strokeWidth="12" strokeLinecap="round" />

                  {/* Label gaine — clic pour renommer */}
                  {isEditing ? (
                    <foreignObject x={foX} y={foY} width={foW} height={foH}>
                      {/* @ts-ignore */}
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editLabel}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditLabel(e.target.value)
                        }
                        onBlur={commitRename}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') { e.stopPropagation(); commitRename() }
                          if (e.key === 'Escape') { e.stopPropagation(); setEditingGaineId(null) }
                        }}
                        style={{
                          width: '100%',
                          background: '#0f1e30',
                          color: '#e2e8f0',
                          border: '1px solid #3b82f6',
                          borderRadius: '3px',
                          fontSize: '9px',
                          padding: '2px 5px',
                          fontFamily: 'monospace',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </foreignObject>
                  ) : (
                    <g
                      style={{ cursor: 'text' }}
                      onClick={() => {
                        setEditingGaineId(gaine.gaineId)
                        setEditLabel(gaine.label)
                      }}
                    >
                      {/* Zone cliquable invisible élargie */}
                      <rect
                        x={isHoriz ? gaine.ex - 65 : gaine.side === 'left' ? gaine.ex - 14 - 130 : gaine.ex + 14}
                        y={labelY - 10}
                        width={130} height={16}
                        fill="transparent"
                      />
                      <text
                        x={labelX} y={labelY}
                        textAnchor={labelAnchor}
                        fill={isEditing ? '#60a5fa' : '#94a3b8'}
                        fontSize="8.5" fontFamily="monospace"
                      >
                        {gaine.label}
                      </text>
                      <text
                        x={isHoriz
                          ? gaine.ex + (labelAnchor === 'middle' ? 0 : 0)
                          : gaine.side === 'left' ? gaine.ex - 12 : gaine.ex + 12}
                        y={labelY + 11}
                        textAnchor={labelAnchor}
                        fill="#475569"
                        fontSize="7.5" fontFamily="monospace"
                      >
                        {gaine.section} · ✎
                      </text>
                    </g>
                  )}

                  {/* Conducteurs */}
                  {gaine.conductors.map((ctype, ci) => {
                    const pos    = condPos(gaine.ex, gaine.ey, gaine.spread, ci, total)
                    const midX   = gaine.ex + (ci - (total - 1) / 2) * gaine.spread[0] * 0.4
                    const midY   = gaine.ey + (ci - (total - 1) / 2) * gaine.spread[1] * 0.4
                    const color  = COND_COLOR[ctype]
                    const isSel  = selected?.gaineId === gaine.gaineId && selected.type === ctype
                    const isConn = isConductorConnected(gaine.gaineId, ctype)

                    return (
                      <g key={ctype}
                        className="cond-circle"
                        onClick={() => handleConductorClick(gaine.gaineId, ctype)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Fil conducteur depuis le tube */}
                        <line
                          x1={midX} y1={midY} x2={pos.x} y2={pos.y}
                          stroke={color} strokeWidth="2.5"
                          strokeLinecap="round" opacity="0.7"
                        />
                        {/* Halo sélection */}
                        {isSel && (
                          <circle cx={pos.x} cy={pos.y} r={17}
                            fill="none" stroke="#facc15" strokeWidth="2"
                            filter="url(#glow-sel)" opacity="0.8" />
                        )}
                        {/* Cercle conducteur */}
                        <circle
                          cx={pos.x} cy={pos.y}
                          r={isSel ? 13 : isConn ? 11 : 10}
                          fill={color}
                          stroke={isSel ? '#facc15' : isConn ? '#fff' : '#1e293b'}
                          strokeWidth={isSel ? 2.5 : 1.5}
                          opacity={isSel ? 1 : 0.9}
                        />
                        {/* Label */}
                        <text
                          x={pos.x} y={pos.y + 4}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          {COND_LABEL[ctype]}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {/* Anneau pulsant sur le conducteur sélectionné */}
            {selected && (() => {
              const sg = connectedGaines.find(g => g.gaineId === selected.gaineId)
              if (!sg) return null
              const ci  = sg.conductors.indexOf(selected.type)
              if (ci < 0) return null
              const pos = condPos(sg.ex, sg.ey, sg.spread, ci, sg.conductors.length)
              return (
                <circle cx={pos.x} cy={pos.y} r={16}
                  fill="none" stroke="#facc15" strokeWidth="2"
                  strokeDasharray="4,3" opacity="0.9" />
              )
            })()}
          </svg>
        )}

        {/* Légende */}
        <div className="deriv-legend">
          {CONDUCTORS_3G.map(c => (
            <span key={c} className="deriv-legend-item">
              <span className="deriv-dot" style={{ background: COND_COLOR[c] }} />
              {c === 'phase' ? 'L1' : c === 'neutre' ? 'N' : 'PE'}
            </span>
          ))}
          <span className="deriv-legend-item">
            <span className="deriv-dot" style={{ background: COND_COLOR.noir }} />
            L2 (noir)
          </span>
          <span className="deriv-legend-item">
            <span className="deriv-dot" style={{ background: COND_COLOR.gris, border: '1px solid #475569' }} />
            L3 (gris)
          </span>
          <span className="deriv-legend-item deriv-hint">✎ cliquer le nom pour renommer</span>
          {connections.length > 0 && (
            <button
              className="deriv-clear"
              onClick={() => {
                connections.forEach(c => removeGaineConnection(boxId, c.id))
                setSelected(null)
              }}
            >
              Tout effacer
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export default DerivationBox

import { useMemo } from 'react'
import { useEditorStore } from '../store/editorStore'
import { COMPONENT_DEFINITIONS } from '../engine/types'
import type { Terminal, ComponentDef } from '../engine/types'
import type { WireType } from '../store/types'
import ComponentVisual from './ComponentVisual'

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

const SCHEMA_CATEGORY_ORDER = ['cabinet', 'protection', 'relay', 'busbar', 'control']
const PLAN_CATEGORY_ORDER   = ['load', 'control', 'junction']

const CATEGORY_LABELS: Record<string, string> = {
  cabinet:    'Armoire / Tableau',
  protection: 'Protections',
  load:       'Luminaires / Charges',
  busbar:     'Borniers',
  relay:      'Relais',
  control:    'Commandes',
  junction:   'Jonctions',
}

const WIRE_TYPES: Array<{ value: WireType; label: string; color: string }> = [
  { value: 'phase',  label: 'Phase (L)',   color: '#c0392b' },
  { value: 'neutre', label: 'Neutre (N)',  color: '#2980b9' },
  { value: 'terre',  label: 'Terre (PE)',  color: '#27ae60' },
  { value: 'marron', label: 'Marron (L)',  color: '#92400e' },
  { value: 'noir',   label: 'Noir (L2)',   color: '#475569' },
  { value: 'gris',   label: 'Gris (L3)',   color: '#6b7280' },
  { value: 'violet', label: 'Violet',      color: '#7c3aed' },
  { value: 'orange', label: 'Orange',      color: '#ea580c' },
  { value: 'blanc',  label: 'Blanc',       color: '#e2e8f0' },
  { value: 'signal', label: 'Signal',      color: '#e67e22' },
]

const Palette = () => {
  const { addComponent, addNotification, tool, activeWireType, setActiveWireType, mode } =
    useEditorStore()

  const isPlan     = mode === 'plan'
  const isTraining = mode === 'training'

  const categories = useMemo(() => {
    const cats: Record<string, Array<{ typeId: string; def: ComponentDef }>> = {}

    Object.entries(COMPONENT_DEFINITIONS).forEach(([typeId, def]) => {
      const sm = (def as any).showInMode as string | undefined

      let visible: boolean
      if (isPlan) {
        visible = sm === 'plan' || sm === 'plan-training' || sm === 'both'
      } else if (isTraining) {
        visible = sm !== 'plan'
      } else {
        // sandbox (Tableau)
        visible = sm !== 'plan' && sm !== 'plan-training'
      }

      if (!visible) return
      if (!cats[def.category]) cats[def.category] = []
      cats[def.category].push({ typeId, def })
    })
    return cats
  }, [isPlan, isTraining])

  const categoryOrder = isPlan ? PLAN_CATEGORY_ORDER : SCHEMA_CATEGORY_ORDER
  const orderedCats = [
    ...categoryOrder.filter(c => categories[c]),
    ...Object.keys(categories).filter(c => !categoryOrder.includes(c)),
  ].filter(c => categories[c])

  const handleDragStart = (e: React.DragEvent, typeId: string) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('componentType', typeId)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h4>{isPlan ? "Plan d'installation" : isTraining ? 'Entraînement' : 'Tableau électrique'}</h4>
        <p className="hint">Glisser ou double-clic</p>
      </div>

      {orderedCats.map((category) => (
        <div key={category} className="sidebar-section">
          <h4>{CATEGORY_LABELS[category] ?? category}</h4>
          <div className="palette-grid">
            {(categories[category] ?? []).map(({ typeId, def }) => (
              <div
                key={typeId}
                className="palette-item"
                draggable
                onDragStart={(e) => handleDragStart(e, typeId)}
                onDoubleClick={() => {
                  addComponent(typeId, 200 + Math.random() * 400, 150 + Math.random() * 300)
                  addNotification('success', `${def.label} ajouté`)
                }}
                title={`${def.label} — glisser ou double-clic`}
              >
                <svg
                  width={Math.min(40, def.w * 1.6)}
                  height={Math.min(48, def.h * 1.0)}
                  viewBox={`-1 -1 ${def.w + 2} ${def.h + 2}`}
                >
                  <rect width={def.w} height={def.h} fill="#22263a" stroke="#3d4460" rx="2" />
                  <ComponentVisual
                    typeId={typeId}
                    def={def}
                    state={def.defaultState}
                    isEnergized={false}
                  />
                  {def.terminals.map((term) => {
                    const { x, y } = termPos(term, def.w, def.h, def.terminals)
                    return <circle key={term.id} cx={x} cy={y} r="2" fill="#8892a4" />
                  })}
                </svg>
                <span>{def.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Sélecteur de fil */}
      <div className="sidebar-section" style={{ marginTop: 'auto' }}>
        <h4>Couleur du fil</h4>
        <div className="wire-types">
          {WIRE_TYPES.map(({ value, label, color }) => (
            <button
              key={value}
              className={`wire-type-btn ${activeWireType === value ? 'active' : ''}`}
              onClick={() => {
                setActiveWireType(value)
                if (tool !== 'wire') useEditorStore.getState().setTool('wire')
              }}
            >
              <span className="wire-swatch" style={{ background: color, border: value === 'blanc' ? '1px solid #475569' : 'none' }} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default Palette

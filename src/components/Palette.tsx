import { useMemo } from 'react'
import { useEditorStore } from '../store/editorStore'
import { COMPONENT_DEFINITIONS } from '../engine/types'
import './Palette.css'

const Palette = () => {
  const { addComponent, addNotification } = useEditorStore()

  const categories = useMemo(() => {
    const cats: Record<string, typeof COMPONENT_DEFINITIONS[keyof typeof COMPONENT_DEFINITIONS][]> = {}

    Object.entries(COMPONENT_DEFINITIONS).forEach(([typeId, def]) => {
      if (!cats[def.category]) {
        cats[def.category] = []
      }
      cats[def.category].push(def)
    })

    return cats
  }, [])

  const handleDragStart = (e: React.DragEvent, typeId: string) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('componentType', typeId)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const typeId = e.dataTransfer.getData('componentType')
    if (typeId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      addComponent(typeId, x, y)
      addNotification('success', `Composant ${typeId} ajouté`)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  return (
    <aside className="sidebar" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="sidebar-section">
        <h3>📦 Composants</h3>
        <p className="hint">Glissez-déposez sur le canvas</p>
      </div>

      {Object.entries(categories).map(([category, components]) => (
        <div key={category} className="sidebar-section">
          <h4>
            {category === 'protection' && '⚡ Protections'}
            {category === 'load' && '💡 Charges'}
            {category === 'busbar' && '📍 Borniers'}
            {category === 'relay' && '🔄 Relais'}
            {category === 'control' && '🔘 Contrôle'}
          </h4>

          <div className="palette-grid">
            {components.map((def) => {
              const typeId = Object.entries(COMPONENT_DEFINITIONS).find(
                ([_, d]) => d === def
              )?.[0]

              if (!typeId) return null

              return (
                <div
                  key={typeId}
                  className="palette-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, typeId)}
                  title={def.label}
                >
                  <div className="palette-preview">
                    <svg width="40" height="50" viewBox={`0 0 ${def.w} ${def.h}`}>
                      <rect width={def.w} height={def.h} fill="#2d3561" stroke="#4a5490" />
                      {def.terminals.map((term) => (
                        <circle
                          key={term.id}
                          cx={(term.rx ?? 0.5) * def.w}
                          cy={(term.ry ?? 0.5) * def.h}
                          r="2"
                          fill="#cbd5e1"
                        />
                      ))}
                    </svg>
                  </div>
                  <span>{def.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </aside>
  )
}

export default Palette

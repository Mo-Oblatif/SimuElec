import { useEditorStore } from '../store/editorStore'
import { COMPONENT_DEFINITIONS } from '../engine/types'
import './Properties.css'

const Properties = () => {
  const { selectedElement, components, wires, updateComponent, removeComponent, removeWire } =
    useEditorStore()

  if (!selectedElement) {
    return (
      <div className="properties-panel">
        <div className="properties-empty">
          <p>Sélectionnez un élément pour voir ses propriétés</p>
        </div>
      </div>
    )
  }

  if (selectedElement.type === 'component') {
    const comp = components.get(selectedElement.id)
    if (!comp) return null

    const def = COMPONENT_DEFINITIONS[comp.typeId]
    if (!def) return null

    return (
      <div className="properties-panel">
        <div className="property-section">
          <h3>⚙️ Propriétés</h3>
        </div>

        <div className="property-section">
          <label className="property-label">Type</label>
          <div className="property-value">{def.label}</div>
        </div>

        <div className="property-section">
          <label className="property-label">ID</label>
          <div className="property-value property-code">{comp.id}</div>
        </div>

        <div className="property-section">
          <label className="property-label">Position</label>
          <div className="property-grid">
            <div>
              <small>X:</small>
              <input
                type="number"
                value={Math.round(comp.x)}
                onChange={(e) =>
                  updateComponent(comp.id, { x: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <small>Y:</small>
              <input
                type="number"
                value={Math.round(comp.y)}
                onChange={(e) =>
                  updateComponent(comp.id, { y: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </div>

        <div className="property-section">
          <label className="property-label">Étiquette</label>
          <input
            type="text"
            value={comp.label}
            onChange={(e) => updateComponent(comp.id, { label: e.target.value })}
            placeholder="Ex: Éclairage salon"
          />
        </div>

        {def.states && def.states.length > 0 && (
          <div className="property-section">
            <label className="property-label">État</label>
            <select
              value={comp.state}
              onChange={(e) => updateComponent(comp.id, { state: e.target.value })}
            >
              {def.states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="property-section">
          <label className="property-label">Terminaux</label>
          <div className="terminals-list">
            {def.terminals.map((term) => (
              <div key={term.id} className="terminal-item">
                <span className="terminal-id">{term.id}</span>
                <span className="terminal-type">{term.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="property-section">
          <button
            onClick={() => removeComponent(comp.id)}
            className="btn-delete"
            style={{ width: '100%' }}
          >
            🗑 Supprimer
          </button>
        </div>
      </div>
    )
  }

  if (selectedElement.type === 'wire') {
    const wire = wires.find((w) => w.id === selectedElement.id)
    if (!wire) return null

    const fromComp = components.get(wire.fromCompId)
    const toComp = components.get(wire.toCompId)

    return (
      <div className="properties-panel">
        <div className="property-section">
          <h3>⚙️ Propriétés du fil</h3>
        </div>

        <div className="property-section">
          <label className="property-label">Type</label>
          <select
            value={wire.type}
            onChange={(e) => {
              removeWire(wire.id)
              // TODO: ajouter nouveau fil avec nouveau type
            }}
          >
            <option value="phase">Phase (Rouge)</option>
            <option value="neutre">Neutre (Bleu)</option>
            <option value="terre">Terre (Vert)</option>
            <option value="signal">Signal (Orange)</option>
          </select>
        </div>

        <div className="property-section">
          <label className="property-label">Connexion</label>
          <div className="property-value property-code" style={{ fontSize: '12px' }}>
            {fromComp?.label || wire.fromCompId}:{wire.fromTermId}
            <br />→
            <br />
            {toComp?.label || wire.toCompId}:{wire.toTermId}
          </div>
        </div>

        <div className="property-section">
          <button
            onClick={() => removeWire(wire.id)}
            className="btn-delete"
            style={{ width: '100%' }}
          >
            🗑 Supprimer
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default Properties

import { useEditorStore } from '../store/editorStore'
import { COMPONENT_DEFINITIONS } from '../engine/types'
import type { WireType, CableSection } from '../store/types'

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

const WIRE_OPTIONS: Array<{ value: WireType; label: string }> = [
  { value: 'phase',  label: 'Phase — rouge' },
  { value: 'neutre', label: 'Neutre — bleu' },
  { value: 'terre',  label: 'Terre — vert/jaune' },
  { value: 'marron', label: 'Marron (L1)' },
  { value: 'noir',   label: 'Noir (L2)' },
  { value: 'gris',   label: 'Gris (L3)' },
  { value: 'violet', label: 'Violet' },
  { value: 'orange', label: 'Orange' },
  { value: 'blanc',  label: 'Blanc' },
  { value: 'signal', label: 'Signal — orange' },
]

const LEGEND_COLORS = [
  { type: 'phase',  label: 'Phase' },
  { type: 'neutre', label: 'Neutre' },
  { type: 'terre',  label: 'Terre' },
  { type: 'signal', label: 'Signal' },
]

const Properties = () => {
  const {
    selectedElement, components, wires,
    updateComponent, removeComponent,
    removeWire, updateWire,
    simMode, simResult,
  } = useEditorStore()

  // ---- Empty state ----
  if (!selectedElement) {
    return (
      <aside className="properties-panel">
        <div className="panel-section">
          <h4>Propriétés</h4>
          <p className="hint-text">Sélectionnez un élément</p>
        </div>

        <div className="panel-section">
          <h4>Légende</h4>
          <div className="legend">
            {LEGEND_COLORS.map(({ type, label }) => (
              <div key={type} className="legend-item">
                <span className="legend-dot" style={{ background: WIRE_COLORS[type] }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h4>Navigation</h4>
          <div className="help-keys">
            {[
              ['Molette', 'Zoom'],
              ['Clic mil.', 'Déplacer'],
              ['↺', 'Reset vue'],
            ].map(([key, label]) => (
              <div key={key} className="help-row">
                <kbd>{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h4>Raccourcis</h4>
          <div className="help-keys">
            {[
              ['S', 'Sélection'],
              ['W', 'Fil'],
              ['Del', 'Supprimer'],
              ['Ctrl+Z', 'Annuler'],
              ['F5', 'Simuler'],
            ].map(([key, label]) => (
              <div key={key} className="help-row">
                <kbd>{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  // ---- Component selected ----
  if (selectedElement.type === 'component') {
    const comp = components.get(selectedElement.id)
    if (!comp) return null
    const def = COMPONENT_DEFINITIONS[comp.typeId]
    if (!def) return null
    const isEnergized = simMode && simResult?.energizedComps.has(comp.id)
    const scale = comp.scale ?? 1

    return (
      <aside className="properties-panel">
        <div className="panel-section">
          <h4>Composant</h4>
          <div className="prop-row">
            <span className="prop-label">Type</span>
            <span className="prop-value">{def.label}</span>
          </div>
          {isEnergized && (
            <div className="prop-row">
              <span className="prop-label">Sim</span>
              <span className="prop-badge badge-green">Alimenté</span>
            </div>
          )}
        </div>

        <div className="panel-section">
          <h4>Position</h4>
          <div className="prop-input-row">
            <label>
              X
              <input
                type="number"
                value={Math.round(comp.x)}
                onChange={(e) => updateComponent(comp.id, { x: parseFloat(e.target.value) || 0 })}
              />
            </label>
            <label>
              Y
              <input
                type="number"
                value={Math.round(comp.y)}
                onChange={(e) => updateComponent(comp.id, { y: parseFloat(e.target.value) || 0 })}
              />
            </label>
          </div>
        </div>

        <div className="panel-section">
          <h4>Taille — {Math.round(scale * 100)}%</h4>
          <input
            type="range"
            min={0.5} max={3} step={0.05}
            value={scale}
            onChange={(e) => updateComponent(comp.id, { scale: parseFloat(e.target.value) })}
            style={{ width: '100%', marginTop: 4 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
            <span>50%</span><span>100%</span><span>200%</span><span>300%</span>
          </div>
        </div>

        <div className="panel-section">
          <h4>Étiquette</h4>
          <input
            type="text"
            value={comp.label}
            onChange={(e) => updateComponent(comp.id, { label: e.target.value })}
            placeholder="Ex : Éclairage salon"
            style={{ width: '100%' }}
          />
        </div>

        {def.states && def.states.length > 1 && (
          <div className="panel-section">
            <h4>État</h4>
            <select
              value={comp.state}
              onChange={(e) => updateComponent(comp.id, { state: e.target.value })}
              style={{ width: '100%' }}
            >
              {(def.states as string[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <div className="panel-section">
          <h4>Terminaux</h4>
          <div className="terminal-list">
            {(def.terminals as Array<{ id: string; type: string; side: string }>).map((term) => (
              <div key={term.id} className="terminal-item">
                <span className="terminal-id">{term.id}</span>
                <span className="terminal-type">{term.side}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <button className="prop-btn danger" onClick={() => removeComponent(comp.id)}>
            Supprimer
          </button>
        </div>
      </aside>
    )
  }

  // ---- Wire selected ----
  if (selectedElement.type === 'wire') {
    const wire = wires.find((w) => w.id === selectedElement.id)
    if (!wire) return null
    const fromComp = components.get(wire.fromCompId)
    const toComp = components.get(wire.toCompId)
    const isEnergized = simMode && simResult?.energizedWires.has(wire.id)

    return (
      <aside className="properties-panel">
        <div className="panel-section">
          <h4>Fil</h4>
          {isEnergized && (
            <div className="prop-row">
              <span className="prop-label">Sim</span>
              <span className="prop-badge badge-green">Sous tension</span>
            </div>
          )}
          <div className="prop-row">
            <span className="prop-label">Type</span>
            <span
              className="prop-badge"
              style={{ background: `${WIRE_COLORS[wire.type] ?? '#888'}22`, color: WIRE_COLORS[wire.type] ?? '#888' }}
            >
              {wire.type}
            </span>
          </div>
        </div>

        <div className="panel-section">
          <h4>Type de fil</h4>
          <select
            value={wire.type}
            onChange={(e) => updateWire(wire.id, { type: e.target.value as WireType })}
            style={{ width: '100%' }}
          >
            {WIRE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="panel-section">
          <h4>Section du câble</h4>
          <select
            value={wire.section ?? ''}
            onChange={(e) => updateWire(wire.id, { section: (e.target.value || undefined) as CableSection | undefined })}
            style={{ width: '100%' }}
          >
            <option value="">— Non définie —</option>
            <option value="3G1.5">3G 1,5 mm² — éclairage</option>
            <option value="3G2.5">3G 2,5 mm² — prises 20A</option>
            <option value="3G6">3G 6 mm² — cuisson / 32A</option>
            <option value="5G1.5">5G 1,5 mm² — triphasé léger</option>
            <option value="5G2.5">5G 2,5 mm² — triphasé 20A</option>
          </select>
        </div>

        <div className="panel-section">
          <h4>Connexion</h4>
          <div className="prop-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {fromComp?.label || wire.fromCompId.slice(-6)} : {wire.fromTermId}
            </code>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>→</span>
            <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {toComp?.label || wire.toCompId.slice(-6)} : {wire.toTermId}
            </code>
          </div>
        </div>

        <div className="panel-section">
          <button className="prop-btn danger" onClick={() => removeWire(wire.id)}>
            Supprimer
          </button>
        </div>
      </aside>
    )
  }

  return null
}

export default Properties

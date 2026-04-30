import { useEditorStore } from '../store/editorStore'
import { COMPONENT_DEFINITIONS } from '../engine/types'
import './Toolbar.css'

const Toolbar = () => {
  const {
    tool,
    setTool,
    activeWireType,
    setActiveWireType,
    simMode,
    exitSimMode,
    runSimulation,
    undo,
    redo,
    clear,
    addNotification,
  } = useEditorStore()

  return (
    <div className="toolbar">
      {/* Selection Mode */}
      <button
        className={`toolbar-btn ${tool === 'select' ? 'active' : ''}`}
        onClick={() => setTool('select')}
        title="Sélection (S)"
      >
        ◆ Sélectionner
      </button>

      {/* Wire Mode */}
      <button
        className={`toolbar-btn ${tool === 'wire' ? 'active' : ''}`}
        onClick={() => setTool('wire')}
        title="Tracer un fil (W)"
      >
        ∿ Fil
      </button>

      {/* Wire Type Selector */}
      {tool === 'wire' && (
        <select
          value={activeWireType}
          onChange={(e) => setActiveWireType(e.target.value as any)}
          className="toolbar-select"
        >
          <option value="phase">Phase (Rouge)</option>
          <option value="neutre">Neutre (Bleu)</option>
          <option value="terre">Terre (Vert)</option>
          <option value="signal">Signal (Orange)</option>
        </select>
      )}

      {/* Delete Mode */}
      <button
        className={`toolbar-btn ${tool === 'delete' ? 'active' : ''}`}
        onClick={() => setTool('delete')}
        title="Supprimer (D)"
      >
        🗑 Supprimer
      </button>

      <div className="toolbar-divider" />

      {/* Undo/Redo */}
      <button onClick={() => undo()} className="toolbar-btn" title="Annuler (Ctrl+Z)">
        ↶ Annuler
      </button>
      <button onClick={() => redo()} className="toolbar-btn" title="Refaire (Ctrl+Y)">
        ↷ Refaire
      </button>

      <div className="toolbar-divider" />

      {/* Simulate */}
      <button
        onClick={() => {
          runSimulation()
          addNotification('success', 'Simulation lancée')
        }}
        className="toolbar-btn btn-simulate"
        title="Lancer simulation"
      >
        ▶ Simuler
      </button>

      {simMode && (
        <button
          onClick={() => exitSimMode()}
          className="toolbar-btn btn-danger"
          title="Quitter mode simulation"
        >
          ⊗ Quitter
        </button>
      )}

      <div className="toolbar-divider" />

      {/* Clear */}
      <button
        onClick={() => {
          if (window.confirm('Êtes-vous sûr de vouloir tout effacer ?')) {
            clear()
            addNotification('info', 'Circuit effacé')
          }
        }}
        className="toolbar-btn btn-danger"
        title="Effacer tout"
      >
        🗑 Effacer tout
      </button>
    </div>
  )
}

export default Toolbar

import { useEditorStore } from './store/editorStore'
import { EXERCISES } from './engine/exercises'
import Canvas from './components/Canvas'
import Palette from './components/Palette'
import Properties from './components/Properties'
import ExercisePanel from './components/ExercisePanel'
import ExerciseSelector from './components/ExerciseSelector'
import Notifications from './components/Notifications'
import DerivationBox from './components/DerivationBox'
import './App.css'

function App() {
  const {
    mode, setMode,
    tool, setTool,
    undo, redo,
    simMode, runSimulation, exitSimMode,
    clear, addNotification,
    components, wires,
    exportJSON, importJSON,
    showExerciseSelector, openExerciseSelector,
    derivationBoxOpen,
    planWidth, planHeight, setPlanSize,
  } = useEditorStore()

  const handleSimulate = () => {
    if (simMode) {
      exitSimMode()
    } else {
      runSimulation()
      addNotification('info', 'Simulation lancée')
    }
  }

  const handleClear = () => {
    if (window.confirm('Effacer tout le circuit ?')) {
      clear()
      addNotification('info', 'Circuit effacé')
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (!Array.isArray(data.components) || !Array.isArray(data.wires)) {
            throw new Error('Format invalide')
          }
          importJSON(data)
          addNotification('success', `Importé : ${data.components.length} composants, ${data.wires.length} fils`)
        } catch {
          addNotification('error', 'Fichier invalide — vérifiez le format JSON')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleExport = () => {
    const data = exportJSON()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = mode === 'plan' ? 'plan.json' : 'circuit.json'
    a.click()
    URL.revokeObjectURL(url)
    addNotification('success', 'Exporté')
  }

  const isPlan = mode === 'plan'
  const canSimulate = !isPlan

  return (
    <div className="app">
      {/* ---- HEADER ---- */}
      <header className="app-header">
        <div className="logo">⚡ SimuElec</div>

        <nav className="mode-nav">
          <button
            className={`mode-btn ${mode === 'sandbox' ? 'active' : ''}`}
            onClick={() => setMode('sandbox')}
          >
            Tableau
          </button>
          <button
            className={`mode-btn ${mode === 'plan' ? 'active' : ''}`}
            onClick={() => setMode('plan')}
          >
            Plan
          </button>
          <button
            className={`mode-btn ${mode === 'training' ? 'active' : ''}`}
            onClick={openExerciseSelector}
          >
            Entraînement
          </button>
        </nav>

        <div className="header-actions">
          {canSimulate && (
            <button
              className={`btn-simulate ${simMode ? 'active' : ''}`}
              onClick={handleSimulate}
              title={simMode ? 'Quitter simulation' : 'Lancer simulation (F5)'}
            >
              {simMode ? '⊗ Quitter sim' : '▶ Simuler'}
            </button>
          )}
          <button className="btn-icon" onClick={handleImport} title="Importer JSON">
            📂
          </button>
          <button className="btn-icon" onClick={handleExport} title="Exporter JSON">
            💾
          </button>
          <button className="btn-icon" onClick={handleClear} title="Effacer tout">
            🗑
          </button>
        </div>
      </header>

      {/* ---- WORKSPACE ---- */}
      <div className="workspace">
        <Palette />

        <div className="canvas-area">
          {/* Mini toolbar */}
          <div className="canvas-toolbar">
            <div className="tool-group">
              <button
                className={`tool-btn ${tool === 'select' ? 'active' : ''}`}
                onClick={() => setTool('select')}
                title="Sélection [S]"
              >◆</button>
              <button
                className={`tool-btn ${tool === 'wire' ? 'active' : ''}`}
                onClick={() => setTool('wire')}
                title="Tracer fil [W]"
              >∿</button>
              <button
                className={`tool-btn danger ${tool === 'delete' ? 'active' : ''}`}
                onClick={() => setTool('delete')}
                title="Supprimer [Del]"
              >✕</button>
            </div>

            <div className="tool-group">
              <button className="tool-btn" onClick={undo} title="Annuler [Ctrl+Z]">↶</button>
              <button className="tool-btn" onClick={redo} title="Refaire [Ctrl+Y]">↷</button>
            </div>

            <div className="tool-group">
              <span className="zoom-level">
                {components.size} comp · {wires.length} fils
              </span>
            </div>

            {isPlan && (
              <div className="tool-group" style={{ marginLeft: 'auto', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Plan :</span>
                <input
                  type="number"
                  value={planWidth}
                  min={400} max={6000} step={50}
                  onChange={e => setPlanSize(Number(e.target.value) || planWidth, planHeight)}
                  style={{ width: 64, fontSize: 10, background: '#1e293b', color: '#cbd5e1',
                    border: '1px solid #334155', borderRadius: 4, padding: '2px 4px' }}
                  title="Largeur du plan (px)"
                />
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>×</span>
                <input
                  type="number"
                  value={planHeight}
                  min={200} max={4000} step={50}
                  onChange={e => setPlanSize(planWidth, Number(e.target.value) || planHeight)}
                  style={{ width: 64, fontSize: 10, background: '#1e293b', color: '#cbd5e1',
                    border: '1px solid #334155', borderRadius: 4, padding: '2px 4px' }}
                  title="Hauteur du plan (px)"
                />
              </div>
            )}

            {mode === 'training' && (
              <div className="tool-group" style={{ marginLeft: 'auto' }}>
                <span style={{ fontSize: 10, color: 'var(--accent)', fontStyle: 'italic' }}>
                  Mode Entraînement · {EXERCISES.length} exercices
                </span>
              </div>
            )}
          </div>

          <Canvas />

          {mode === 'training' && <ExercisePanel />}
        </div>

        <Properties />
      </div>

      {/* Exercise selector modal */}
      {showExerciseSelector && <ExerciseSelector />}

      {/* Boîte de dérivation — Among Us */}
      {derivationBoxOpen && <DerivationBox />}

      <Notifications />
    </div>
  )
}

export default App

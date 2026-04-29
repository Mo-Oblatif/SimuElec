import { useEditorStore } from './store/editorStore'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import Palette from './components/Palette'
import Properties from './components/Properties'
import './App.css'

function App() {
  const { mode, notifications } = useEditorStore()

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">⚡ SimuÉlec</div>
        <nav className="mode-nav">
          <button className={`mode-btn ${mode === 'sandbox' ? 'active' : ''}`}>
            Mode Libre
          </button>
          <button className={`mode-btn ${mode === 'training' ? 'active' : ''}`}>
            Entraînement
          </button>
        </nav>
      </header>

      <div className="workspace">
        <Palette />
        <Canvas />
        <Properties />
      </div>

      <Toolbar />

      {/* Notifications */}
      <div className="notifications">
        {notifications.map((notif) => (
          <div key={notif.id} className={`notification notification-${notif.type}`}>
            {notif.message}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App

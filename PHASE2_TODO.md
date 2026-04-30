# 🎯 PHASE 2 - Guide d'action (React + SVG)

## 📋 Checklist d'implémentation

### Étape 1 : Setup initial (30 min)

- [ ] Installer les dépendances
  ```bash
  npm install
  ```

- [ ] Créer structure TypeScript
  ```bash
  mkdir -p src/types
  touch tsconfig.json vite.config.ts
  ```

- [ ] Créer `tsconfig.json` minimal
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "useDefineForClassFields": true,
      "jsx": "react-jsx",
      "module": "ESNext",
      "lib": ["ES2020", "DOM"],
      "moduleResolution": "bundler",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true
    }
  }
  ```

- [ ] Créer `vite.config.ts`
  ```typescript
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  
  export default defineConfig({
    plugins: [react()],
    server: {
      port: 3000,
    },
  })
  ```

---

### Étape 2 : App React minimal (45 min)

**À créer :**

```
src/
├── main.tsx                 # Point d'entrée
├── App.tsx                  # Composant principal
├── App.css                  # Styles
├── types/
│   └── index.ts             # Types TypeScript
├── engine/                  # (déjà créé en JS)
├── store/
│   ├── editorStore.ts       # Convertir de .js
│   └── types.ts             # Types du store
├── components/
│   ├── Canvas.tsx           # Rendu SVG (nouvelle)
│   ├── Toolbar.tsx          # Barre d'outils
│   ├── Palette.tsx          # Palette latérale
│   └── Properties.tsx       # Panneau propriétés
└── index.html               # Page HTML
```

**`src/main.tsx`**
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**`src/App.tsx`** (minimal)
```typescript
import { useState } from 'react'
import { useEditorStore } from './store/editorStore'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import Palette from './components/Palette'
import Properties from './components/Properties'

function App() {
  const { components, wires } = useEditorStore()

  return (
    <div className="app">
      <header className="header">
        <div className="logo">⚡ SimuÉlec</div>
      </header>

      <div className="workspace">
        <Palette />
        <Canvas />
        <Properties />
      </div>

      <Toolbar />
    </div>
  )
}

export default App
```

**`src/index.html`**
```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SimuÉlec — Simulateur Tableau Électrique</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### Étape 3 : Zustand Store en TypeScript (30 min)

**`src/store/types.ts`**
```typescript
export interface Component {
  id: string
  typeId: string
  x: number
  y: number
  state: string
  label: string
}

export interface Wire {
  id: string
  fromCompId: string
  fromTermId: string
  toCompId: string
  toTermId: string
  type: 'phase' | 'neutre' | 'terre' | 'signal'
}

export interface EditorState {
  // Données
  components: Map<string, Component>
  wires: Wire[]
  selectedElement: { type: 'component' | 'wire'; id: string } | null

  // Actions
  addComponent: (typeId: string, x: number, y: number) => void
  addWire: (fromCompId: string, fromTermId: string, toCompId: string, toTermId: string, wireType?: string) => void
  removeComponent: (id: string) => void
  removeWire: (id: string) => void
  // ... etc
}
```

**`src/store/editorStore.ts`** (convertir de .js)
```typescript
import { create } from 'zustand'
import type { EditorState, Component, Wire } from './types'

export const useEditorStore = create<EditorState>((set, get) => ({
  // ... copier du fichier .js et adapter
}))
```

---

### Étape 4 : Composant Canvas SVG (1-2h)

**`src/components/Canvas.tsx`**
```typescript
import { useEditorStore } from '../store/editorStore'
import { useEffect, useRef } from 'react'

export default function Canvas() {
  const { components, wires } = useEditorStore()
  const svgRef = useRef<SVGSVGElement>(null)

  return (
    <div className="canvas-container">
      <svg
        ref={svgRef}
        className="canvas"
        viewBox="0 0 1200 600"
        onMouseMove={(e) => {
          // Interactions
        }}
        onMouseUp={() => {
          // Fin drag
        }}
      >
        {/* Rendu des fils */}
        {wires.map((wire) => (
          <g key={wire.id} className="wire">
            {/* Bezier path */}
          </g>
        ))}

        {/* Rendu des composants */}
        {components.map(([id, comp]) => (
          <g key={id} className="component" transform={`translate(${comp.x}, ${comp.y})`}>
            {/* Rendu selon typeId */}
          </g>
        ))}
      </svg>
    </div>
  )
}
```

**Fonctionnalités minimales :**
- [ ] Afficher composants en SVG (rectangles + labels)
- [ ] Afficher fils en SVG (bezier curves)
- [ ] Drag&drop des composants
- [ ] Sélection au clic
- [ ] Coloration des fils selon le type (phase/neutre/terre)

---

### Étape 5 : Intégrer le moteur (45 min)

**Dans `src/store/editorStore.ts`**, ajouter action `runSimulation` :

```typescript
runSimulation: () => set((state) => {
  const SimulationEngine = require('../engine/simulator')
  const engine = new SimulationEngine(state.components, state.wires)
  const result = engine.simulate()
  
  return {
    simResult: result,
    simMode: true,
  }
}),
```

**Dans `<Canvas />`, utiliser le résultat :**
```typescript
const { simResult, simMode } = useEditorStore()

// Colorer les fils énergisés
const wireColor = simResult?.energizedWires.has(wire.id) 
  ? '#ffff00' // Glow
  : WIRE_COLORS[wire.type]

// Mettre un halo sur les composants énergisés
const compGlow = simResult?.energizedComps.has(comp.id) 
  ? 'filter: drop-shadow(0 0 8px #ffff00)'
  : 'none'
```

---

### Étape 6 : Composants basiques (1h)

**`src/components/Toolbar.tsx`**
- Boutons : Select, Wire, Delete, Undo, Redo, Simulate, Save, Load, Clear

**`src/components/Palette.tsx`**
- Grille de composants disponibles
- Drag from palette to canvas

**`src/components/Properties.tsx`**
- Afficher/éditer propriétés du composant sélectionné
- Buttons pour toggler state (open/closed, etc.)

---

## 📊 Progression estimée

| Étape | Complexité | Temps | État |
|-------|-----------|-------|------|
| Setup initial | ⭐ | 30 min | 📋 À faire |
| App React minimal | ⭐⭐ | 45 min | 📋 À faire |
| Zustand TypeScript | ⭐ | 30 min | 📋 À faire |
| Canvas SVG | ⭐⭐⭐ | 1-2h | 📋 À faire |
| Intégration engine | ⭐⭐ | 45 min | 📋 À faire |
| Composants basiques | ⭐⭐ | 1h | 📋 À faire |
| **TOTAL** | | **4-5h** | |

---

## 🧪 Tests à chaque étape

```bash
# Étape 1-2: Vérifier que React démarre
npm run dev

# Étape 3: Vérifier que Zustand fonctionne
# Dans console du navigateur: window.__ZUSTAND_DEBUG__

# Étape 4: Vérifier le rendu SVG
# Visualiser les composants à l'écran

# Étape 5: Vérifier le moteur
npm run test:engine

# Étape 6: Tester les interactions
```

---

## 💡 Tips pour la migration

✅ **Faire petits commits réguliers**
```bash
git add .
git commit -m "feat: add React bootstrap"
```

✅ **Tester au fur et à mesure**
- Chaque composant React testé isolé d'abord
- Puis connecté au store
- Puis connecté à l'engine

✅ **Garder l'ancien code**
- Ne pas supprimer js/*.js
- Continuer à utiliser data.js comme référence
- Migrer progressivement

❌ **Ne pas recommencer la logique**
- Réutiliser types.js, simulator.js
- Juste adapter les imports

---

## 🎯 Définition du succès (Phase 2)

Quand cette checklist sera complète :

- ✅ React app démarre sans erreurs
- ✅ Page affiche canvas vide
- ✅ Peut ajouter composants via palette
- ✅ Peut connecter avec des fils
- ✅ Peut lancer une simulation
- ✅ Les composants énergisés s'illuminent
- ✅ Drag&drop fonctionne
- ✅ Undo/Redo fonctionne

**À ce moment : Phase 2 = ✅ DONE**

---

## ❓ Questions avant de commencer ?

- Voulez-vous TypeScript ou rester en JS ?
- Vite ou Webpack ?
- Tests avec Vitest ou Jest ?
- Styles : CSS modules, Tailwind, ou autre ?

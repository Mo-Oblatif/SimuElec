# 📐 Refactorisation en cours : Architecture React + Zustand + SVG

## ✅ Étape 1 : Infrastructure créée

### Structure créée (src/)
```
src/
├── engine/              # Moteur de simulation (LOGIQUE PURE)
│   ├── types.js         # Types fondamentaux + définitions de composants
│   ├── graph.js         # Classe Graph (nodes/edges) - Testable
│   └── simulator.js     # SimulationEngine - Moteur pur sans dépendance UI
├── store/               # État global (Zustand)
│   └── editorStore.js   # Zustand store - Source unique de vérité
└── components/          # Composants React (à créer dans la suite)
    ├── Canvas.tsx       # Rendu SVG (à remplacer Canvas)
    ├── Palette.tsx
    ├── Properties.tsx
    └── ...
```

---

## 🔑 Architecture imposée

### 1️⃣ **Moteur de simulation (Pure Logic)**
- ✅ **Aucune dépendance UI** → Peut être testé indépendamment
- ✅ **Structure de graphe** → `nodes = terminaux des composants`, `edges = fils`
- ✅ **SimulationEngine** → Prend en entrée components + wires, retourne résultat

**Exemple d'utilisation :**
```javascript
const engine = new SimulationEngine(components, wires);
const result = engine.simulate();
// result = {
//   energizedNodes: Set,
//   energizedComps: Set,
//   energizedWires: Set,
//   loads: [...],
//   errors: [...],
//   warnings: [...]
// }
```

### 2️⃣ **Zustand Store (Single Source of Truth)**
- ✅ Gère : composants, fils, sélection, mode UI, undo/redo
- ✅ Appelle le moteur de simulation quand nécessaire
- ✅ Pas de React inside → Compatible avec vanilla JS

**Exemple d'utilisation :**
```javascript
const store = useEditorStore(); // Hook React (après conversion)
store.addComponent('disjoncteur16', x, y);
store.runSimulation(); // Appelle le moteur
```

### 3️⃣ **Interface React (Consomme le store)**
- ✅ Utilise hooks uniquement (useState, useCallback, etc.)
- ✅ Affiche les données du store
- ✅ Appelle les actions du store au clic

**Exemple :**
```tsx
function Canvas() {
  const { components, wires, simResult } = useEditorStore();
  
  return <svg>{/* Rendre composants + fils en SVG */}</svg>;
}
```

---

## 📋 Prochaines étapes

### Phase 2 : Migration Progressive

**2.1 - Ajouter React & Zustand au projet**
- [ ] `npm init` + `package.json` avec React 18, Zustand, build tool (Vite/Webpack)
- [ ] `tsconfig.json` pour TypeScript (optionnel mais recommandé)
- [ ] Convertir `editorStore.js` → `editorStore.ts`

**2.2 - Créer App.tsx de base**
- [ ] Bootstrap React
- [ ] Connecter Zustand au premier composant
- [ ] Tester un simple add/remove de composant

**2.3 - Remplacer Canvas → SVG**
- [ ] Créer composant React `<Canvas />` avec rendu SVG
- [ ] Migrer la logique de rendu du canvas (Editor.js) vers React
- [ ] Tester drag&drop, sélection sur SVG

**2.4 - Intégrer le moteur de simulation**
- [ ] Appeler `SimulationEngine` depuis `runSimulation()` du store
- [ ] Tester que la simulation fonctionne
- [ ] Afficher les résultats (composants énergisés, erreurs)

**2.5 - Migrer le reste progressivement**
- [ ] Palette latérale
- [ ] Barre d'outils
- [ ] Propriétés
- [ ] Modales
- [ ] Exercices

---

## 🔄 Changements par rapport à l'ancien code

### Ce qui a CHANGÉ

| Avant | Après |
|-------|-------|
| Classes JS pures (Editor, Component, Wire) | Composants React + Zustand |
| Logique UI + métier mélangée | Séparation nette: Engine (pur) + UI |
| Canvas 2D pour tout | SVG pour les connexions, React pour UI |
| État dans Editor | State centralisé dans Zustand |
| Pas de structure graphe formelle | Graph.js avec BFS/DFS formels |

### Ce qui RESTE compatible

✅ Tous les composants existants (data.js)
✅ La logique de simulation (Circuit.js → SimulationEngine)
✅ Les couleurs, labels, définitions

### Ce qui a DISPARU (à supprimer)

❌ `js/App.js` (remplacé par App.tsx)
❌ `js/Editor.js` (logique → Zustand + React)
❌ `js/Component.js` (données → Zustand)
❌ `js/Wire.js` (données → Zustand)

**Ces fichiers restent comme référence mais ne seront plus utilisés.**

---

## 🧪 Moteur prêt pour tests

Le SimulationEngine est **complètement testable** :

```javascript
// Test exemple (Jest/Mocha)
describe('SimulationEngine', () => {
  test('should energize lamp when phase and neutre connected', () => {
    const components = new Map([
      ['comp1', { id: 'comp1', typeId: 'disjoncteur16', state: 'closed', x: 0, y: 0 }],
      ['comp2', { id: 'comp2', typeId: 'lampe', state: 'off', x: 100, y: 0 }],
    ]);

    const wires = [
      {
        id: 'w1',
        fromCompId: 'comp1', fromTermId: 't_out',
        toCompId: 'comp2', toTermId: 'ph',
        type: 'phase'
      }
    ];

    const engine = new SimulationEngine(components, wires);
    const result = engine.simulate();

    expect(result.loads[0].powered).toBe(true);
  });
});
```

---

## 📌 À faire maintenant

1. Confirmer que vous voulez procéder avec React + TypeScript (ou rester en JS)
2. Vous voulez que je crée le `package.json` et la structure complète ?
3. Devons-nous tester le moteur de simulation en isolation d'abord ?

**Status**: Architecture de base ✅ | Prêt pour React setup →

/**
 * src/store/editorStore.js
 * Store Zustand - Source unique de vérité pour l'état de l'application
 * Gère: composants, fils, état simulation, mode UI, etc.
 */

// Note: Pour maintenant en JS vanilla. À convertir en .ts + imports React quand React sera set up

const createEditorStore = (set, get) => ({
  // ============================================================
  // ÉTAT DU CIRCUIT
  // ============================================================
  components: new Map(), // id → {id, typeId, x, y, state, label}
  wires: [], // Array de {id, fromCompId, fromTermId, toCompId, toTermId, type}
  selectedElement: null, // {type: 'component'|'wire', id}

  addComponent: (typeId, x, y) => set((state) => {
    const id = generateId('comp');
    const newComponents = new Map(state.components);
    newComponents.set(id, {
      id,
      typeId,
      x,
      y,
      state: 'default', // Sera remplacé par defaultState du type
      label: '',
    });
    return { components: newComponents };
  }),

  updateComponent: (componentId, updates) => set((state) => {
    const newComponents = new Map(state.components);
    const comp = newComponents.get(componentId);
    if (comp) {
      newComponents.set(componentId, { ...comp, ...updates });
    }
    return { components: newComponents };
  }),

  removeComponent: (componentId) => set((state) => {
    const newComponents = new Map(state.components);
    newComponents.delete(componentId);
    
    // Supprimer aussi les fils connectés
    const newWires = state.wires.filter(w => 
      w.fromCompId !== componentId && w.toCompId !== componentId
    );

    return { 
      components: newComponents,
      wires: newWires,
      selectedElement: null,
    };
  }),

  // ============================================================
  // GESTION DES FILS
  // ============================================================
  addWire: (fromCompId, fromTermId, toCompId, toTermId, wireType = 'phase') => 
    set((state) => {
      const id = generateId('wire');
      const newWire = {
        id,
        fromCompId,
        fromTermId,
        toCompId,
        toTermId,
        type: wireType,
      };
      return { wires: [...state.wires, newWire] };
    }),

  removeWire: (wireId) => set((state) => ({
    wires: state.wires.filter(w => w.id !== wireId),
    selectedElement: null,
  })),

  // ============================================================
  // SÉLECTION
  // ============================================================
  selectElement: (type, id) => set((state) => {
    const selected = { type, id };
    return { selectedElement: selected };
  }),

  deselectElement: () => set({ selectedElement: null }),

  // ============================================================
  // SIMULATION
  // ============================================================
  simResult: null, // Résultat dernier simulation
  simMode: false,

  runSimulation: () => set((state) => {
    // Importer le moteur de simulation
    // const SimulationEngine = require('../engine/simulator');
    // const engine = new SimulationEngine(state.components, state.wires);
    // const result = engine.simulate();
    
    // Pour l'instant, mock
    const result = {
      energizedNodes: new Set(),
      energizedComps: new Set(),
      energizedWires: new Set(),
      loads: [],
      errors: [],
      warnings: [],
    };

    return {
      simResult: result,
      simMode: true,
    };
  }),

  exitSimMode: () => set({ simMode: false }),

  // ============================================================
  // UNDO/REDO
  // ============================================================
  history: [],
  historyIndex: -1,

  saveToHistory: () => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({
      components: new Map(state.components),
      wires: [...state.wires],
    });
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      return {
        components: new Map(snapshot.components),
        wires: [...snapshot.wires],
        historyIndex: newIndex,
        selectedElement: null,
      };
    }
    return state;
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      return {
        components: new Map(snapshot.components),
        wires: [...snapshot.wires],
        historyIndex: newIndex,
        selectedElement: null,
      };
    }
    return state;
  }),

  // ============================================================
  // MODE UI
  // ============================================================
  tool: 'select', // 'select' | 'wire' | 'delete'
  activeWireType: 'phase', // 'phase' | 'neutre' | 'terre' | 'signal'
  mode: 'sandbox', // 'sandbox' | 'training'

  setTool: (tool) => set({ tool }),
  setActiveWireType: (type) => set({ activeWireType: type }),
  setMode: (mode) => set({ mode }),

  // ============================================================
  // CANVAS/VIEWPORT
  // ============================================================
  zoom: 1,
  panX: 0,
  panY: 0,

  setZoom: (zoom) => set({ zoom }),
  setPan: (x, y) => set({ panX: x, panY: y }),

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  notifications: [], // Array de {id, type, message, duration}

  addNotification: (type, message, duration = 3000) => set((state) => {
    const id = generateId('notif');
    const notif = { id, type, message, duration };
    
    const newNotifications = [...state.notifications, notif];
    
    // Auto-remove après duration
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter(n => n.id !== id),
        }));
      }, duration);
    }

    return { notifications: newNotifications };
  }),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id),
  })),

  // ============================================================
  // EXPORT/IMPORT
  // ============================================================
  exportJSON: () => {
    const state = get();
    return {
      components: Array.from(state.components.values()),
      wires: state.wires,
    };
  },

  importJSON: (data) => set({
    components: new Map(data.components.map(c => [c.id, c])),
    wires: data.wires,
  }),

  clear: () => set({
    components: new Map(),
    wires: [],
    selectedElement: null,
    simResult: null,
    simMode: false,
    history: [],
    historyIndex: -1,
  }),
});

// Helper pour générer IDs
function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  createEditorStore,
  generateId,
};

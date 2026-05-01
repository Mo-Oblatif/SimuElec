/**
 * src/store/editorStore.ts
 * Store Zustand - Source unique de vérité pour l'application
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { runSimulationService } from '../services/simulationService'
import { EXERCISES } from '../engine/exercises'
import type { EditorState, Component, Wire, Notification, WireType, CableSection, ConductorConnection } from './types'

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

function snapshotHistory(state: EditorState) {
  const newHistory = [
    ...state.history.slice(0, state.historyIndex + 1),
    { components: new Map(state.components), wires: [...state.wires] },
  ]
  return { history: newHistory, historyIndex: newHistory.length - 1 }
}

export const useEditorStore = create<EditorState>()(persist((set, get) => ({
  // ============================================================
  // ÉTAT DU CIRCUIT
  // ============================================================
  components: new Map(),
  wires: [],
  selectedElement: null,

  addComponent: (typeId: string, x: number, y: number) =>
    set((state) => {
      const hist = snapshotHistory(state)
      const id = generateId('comp')
      const newComponents = new Map(state.components)
      const scale = state.lastScale !== 1 ? state.lastScale : undefined
      newComponents.set(id, { id, typeId, x, y, state: 'default', label: '', ...(scale ? { scale } : {}) })
      return { components: newComponents, ...hist }
    }),

  updateComponent: (id: string, updates: Partial<Component>) =>
    set((state) => {
      const newComponents = new Map(state.components)
      const comp = newComponents.get(id)
      if (comp) newComponents.set(id, { ...comp, ...updates })
      const extra = updates.scale !== undefined ? { lastScale: updates.scale } : {}
      return { components: newComponents, ...extra }
    }),

  removeComponent: (componentId: string) =>
    set((state) => {
      const hist = snapshotHistory(state)
      const newComponents = new Map(state.components)
      newComponents.delete(componentId)
      // Fils supprimés (pour nettoyer les connexions gaine par wireId)
      const removedWireIds = new Set(
        state.wires
          .filter(w => w.fromCompId === componentId || w.toCompId === componentId)
          .map(w => w.id)
      )
      const newWires = state.wires.filter(
        (w) => w.fromCompId !== componentId && w.toCompId !== componentId
      )
      // Nettoyer les connexions gaine : par boxId (si la boîte est supprimée)
      // et par wireId (gaineId = wire.id depuis la refonte)
      const newGaineConnections = new Map(state.gaineConnections)
      newGaineConnections.delete(componentId)
      for (const [boxId, conns] of newGaineConnections.entries()) {
        const filtered = conns.filter(
          c => !removedWireIds.has(c.fromGaineId) && !removedWireIds.has(c.toGaineId)
        )
        if (filtered.length !== conns.length) newGaineConnections.set(boxId, filtered)
      }
      return {
        components: newComponents,
        wires: newWires,
        selectedElement: null,
        gaineConnections: newGaineConnections,
        ...hist,
      }
    }),

  // ============================================================
  // GESTION DES FILS
  // ============================================================
  addWire: (
    fromCompId: string,
    fromTermId: string,
    toCompId: string,
    toTermId: string,
    wireType = 'phase'
  ) =>
    set((state) => {
      const hist = snapshotHistory(state)
      const id = generateId('wire')
      const newWire: Wire = {
        id, fromCompId, fromTermId, toCompId, toTermId,
        type: wireType as WireType,
      }
      return { wires: [...state.wires, newWire], ...hist }
    }),

  removeWire: (wireId: string) =>
    set((state) => {
      const hist = snapshotHistory(state)
      // Nettoyer les connexions gaine qui référencent ce fil comme gaineId
      const newGaineConnections = new Map(state.gaineConnections)
      for (const [boxId, conns] of newGaineConnections.entries()) {
        const filtered = conns.filter(
          c => c.fromGaineId !== wireId && c.toGaineId !== wireId
        )
        if (filtered.length !== conns.length) newGaineConnections.set(boxId, filtered)
      }
      return {
        wires: state.wires.filter((w) => w.id !== wireId),
        selectedElement: null,
        gaineConnections: newGaineConnections,
        ...hist,
      }
    }),

  updateWire: (wireId: string, updates: { type?: WireType; section?: CableSection }) =>
    set((state) => ({
      wires: state.wires.map((w) => (w.id === wireId ? { ...w, ...updates } : w)),
    })),

  // ============================================================
  // SÉLECTION
  // ============================================================
  selectElement: (type: 'component' | 'wire', id: string) =>
    set({ selectedElement: { type, id } }),

  deselectElement: () => set({ selectedElement: null }),

  // ============================================================
  // SIMULATION
  // ============================================================
  simResult: null,
  simMode: false,

  runSimulation: () =>
    set((state) => {
      const result = runSimulationService(state.components, state.wires)
      return { simResult: result, simMode: true }
    }),

  exitSimMode: () => set({ simMode: false }),

  // ============================================================
  // UNDO/REDO
  // ============================================================
  history: [],
  historyIndex: -1,

  saveToHistory: () =>
    set((state) => {
      const hist = snapshotHistory(state)
      return hist
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1
        const snapshot = state.history[newIndex]
        return {
          components: new Map(snapshot.components),
          wires: [...snapshot.wires],
          historyIndex: newIndex,
          selectedElement: null,
        }
      }
      return state
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1
        const snapshot = state.history[newIndex]
        return {
          components: new Map(snapshot.components),
          wires: [...snapshot.wires],
          historyIndex: newIndex,
          selectedElement: null,
        }
      }
      return state
    }),

  // ============================================================
  // MODE UI
  // ============================================================
  tool: 'select',
  activeWireType: 'marron' as WireType,
  lastScale: 1,
  setLastScale: (scale: number) => set({ lastScale: scale }),
  mode: 'sandbox',
  _schemaSnapshot: null,
  _planComponents: new Map(),
  _planWires: [],

  setTool: (tool: 'select' | 'wire' | 'delete') => set({ tool }),
  setActiveWireType: (type: WireType) => set({ activeWireType: type }),

  setMode: (newMode: 'sandbox' | 'plan' | 'training') => {
    const state = get()
    if (newMode === state.mode) return

    if (newMode === 'plan') {
      set({
        _schemaSnapshot: { components: new Map(state.components), wires: [...state.wires] },
        components: new Map(state._planComponents),
        wires: [...state._planWires],
        mode: 'plan',
        selectedElement: null,
        simMode: false,
        exerciseFeedback: null,
        history: [],
        historyIndex: -1,
      })
    } else if (state.mode === 'plan') {
      const schema = state._schemaSnapshot ?? { components: new Map(), wires: [] }
      set({
        _planComponents: new Map(state.components),
        _planWires: [...state.wires],
        components: new Map(schema.components),
        wires: [...schema.wires],
        mode: newMode,
        selectedElement: null,
        simMode: false,
        history: [],
        historyIndex: -1,
      })
    } else {
      set({ mode: newMode })
    }
  },

  // ============================================================
  // VIEWPORT
  // ============================================================
  zoom: 1,
  panX: 0,
  panY: 0,
  setZoom: (zoom: number) => set({ zoom }),
  setPan: (x: number, y: number) => set({ panX: x, panY: y }),

  // ---- Plan d'installation ----
  planWidth: 1500,
  planHeight: 800,
  setPlanSize: (w: number, h: number) => set({ planWidth: Math.max(400, w), planHeight: Math.max(200, h) }),

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  notifications: [],

  addNotification: (type, message, duration = 3000) =>
    set((state) => {
      const id = generateId('notif')
      const notif: Notification = { id, type, message, duration }
      const newNotifications = [...state.notifications, notif]
      if (duration > 0) {
        setTimeout(() => {
          set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }))
        }, duration)
      }
      return { notifications: newNotifications }
    }),

  removeNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  // ============================================================
  // EXERCICES
  // ============================================================
  exerciseIndex: 0,
  exerciseScore: 0,
  exerciseFeedback: null,
  showExerciseSelector: false,

  openExerciseSelector: () => set({ showExerciseSelector: true }),
  closeExerciseSelector: () => set({ showExerciseSelector: false }),

  startExercise: (index: number) => {
    const ex = EXERCISES[Math.max(0, Math.min(index, EXERCISES.length - 1))]
    if (!ex) return
    const newComponents = new Map<string, Component>()
    let x = 100, y = 120
    for (const typeId of ex.requiredComponents) {
      const id = generateId('comp')
      newComponents.set(id, { id, typeId, x, y, state: 'default', label: '' })
      x += 160
      if (x > 900) { x = 100; y += 160 }
    }
    set({
      components: newComponents,
      wires: [],
      selectedElement: null,
      simResult: null,
      simMode: false,
      exerciseIndex: index,
      exerciseScore: 0,
      exerciseFeedback: null,
      mode: 'training',
      history: [],
      historyIndex: -1,
    })
  },

  validateExercise: () => {
    const state = get()
    const ex = EXERCISES[state.exerciseIndex]
    if (!ex) return
    const result = ex.checkFn(state.components, state.wires)
    const feedback = [
      ...result.ok.map((o) => ({ msg: o.msg, ok: true })),
      ...result.errors.map((e) => ({ msg: e.msg, ok: false })),
    ]
    set({ exerciseScore: result.score, exerciseFeedback: feedback })
    const { addNotification } = get() as EditorState
    if (result.score === 100) {
      addNotification('success', `Parfait ! Score : 100/100`)
    } else {
      addNotification(result.score > 50 ? 'warning' : 'error', `Score : ${result.score}/100 — Corrigez les erreurs.`)
    }
  },

  nextExercise: () => {
    const { exerciseIndex, startExercise } = get() as EditorState
    if (exerciseIndex < EXERCISES.length - 1) {
      startExercise(exerciseIndex + 1)
    } else {
      const { addNotification } = get() as EditorState
      addNotification('success', 'Formation terminée ! Bravo.')
      set({ mode: 'sandbox', exerciseFeedback: null })
    }
  },

  exitTraining: () =>
    set({
      mode: 'sandbox',
      exerciseFeedback: null,
      components: new Map(),
      wires: [],
      selectedElement: null,
      simResult: null,
      simMode: false,
    }),

  // ============================================================
  // EXPORT/IMPORT
  // ============================================================
  exportJSON: () => {
    const state = get()
    return {
      components: Array.from(state.components.values()),
      wires: state.wires,
    }
  },

  importJSON: (data) =>
    set({
      components: new Map(data.components.map((c) => [c.id, c])),
      wires: data.wires,
    }),

  clear: () =>
    set({
      components: new Map(),
      wires: [],
      selectedElement: null,
      simResult: null,
      simMode: false,
      history: [],
      historyIndex: -1,
    }),

  // ============================================================
  // BOÎTE DE DÉRIVATION (Among Us)
  // ============================================================
  derivationBoxOpen: null,
  gaineConnections: new Map(),

  openDerivationBox: (boxId: string) =>
    set({ derivationBoxOpen: boxId }),

  closeDerivationBox: () =>
    set({ derivationBoxOpen: null }),

  addGaineConnection: (boxId: string, conn: Omit<ConductorConnection, 'id'>) =>
    set((state) => {
      const id = generateId('gc')
      const existing = state.gaineConnections.get(boxId) ?? []
      // Supprimer toute connexion existante depuis le même conducteur source
      const filtered = existing.filter(
        c => !(c.fromGaineId === conn.fromGaineId && c.fromType === conn.fromType)
      )
      const newMap = new Map(state.gaineConnections)
      newMap.set(boxId, [...filtered, { ...conn, id }])
      return { gaineConnections: newMap }
    }),

  removeGaineConnection: (boxId: string, connId: string) =>
    set((state) => {
      const existing = state.gaineConnections.get(boxId) ?? []
      const newMap = new Map(state.gaineConnections)
      newMap.set(boxId, existing.filter(c => c.id !== connId))
      return { gaineConnections: newMap }
    }),
}),
{
  name: 'simuElec-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    comps:        Array.from(state.components.entries()),
    wires:        state.wires,
    planComps:    Array.from(state._planComponents.entries()),
    planWires:    state._planWires,
    schemaComps:  state._schemaSnapshot
      ? Array.from(state._schemaSnapshot.components.entries())
      : null,
    schemaWires:  state._schemaSnapshot?.wires ?? null,
    gaineConns:   Array.from(state.gaineConnections.entries()),
    mode:         state.mode,
    planWidth:    state.planWidth,
    planHeight:   state.planHeight,
  }),
  merge: (persisted: any, current: EditorState): EditorState => ({
    ...current,
    components:       new Map(persisted.comps     ?? []),
    wires:            persisted.wires             ?? [],
    _planComponents:  new Map(persisted.planComps ?? []),
    _planWires:       persisted.planWires         ?? [],
    _schemaSnapshot:  persisted.schemaComps ? {
      components: new Map(persisted.schemaComps),
      wires:      persisted.schemaWires ?? [],
    } : null,
    gaineConnections: new Map(persisted.gaineConns ?? []),
    mode:             persisted.mode ?? 'sandbox',
    planWidth:        persisted.planWidth  ?? 1500,
    planHeight:       persisted.planHeight ?? 800,
  }),
}))

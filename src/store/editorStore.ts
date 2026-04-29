/**
 * src/store/editorStore.ts
 * Store Zustand - Source unique de vérité pour l'application
 */

import { create } from 'zustand'
import type { EditorState, Component, Wire, Notification } from './types'

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // ============================================================
  // ÉTAT DU CIRCUIT
  // ============================================================
  components: new Map(),
  wires: [],
  selectedElement: null,

  addComponent: (typeId: string, x: number, y: number) =>
    set((state) => {
      const id = generateId('comp')
      const newComponents = new Map(state.components)
      newComponents.set(id, {
        id,
        typeId,
        x,
        y,
        state: 'default',
        label: '',
      })
      return { components: newComponents }
    }),

  updateComponent: (id: string, updates: Partial<Component>) =>
    set((state) => {
      const newComponents = new Map(state.components)
      const comp = newComponents.get(id)
      if (comp) {
        newComponents.set(id, { ...comp, ...updates })
      }
      return { components: newComponents }
    }),

  removeComponent: (componentId: string) =>
    set((state) => {
      const newComponents = new Map(state.components)
      newComponents.delete(componentId)

      const newWires = state.wires.filter(
        (w) => w.fromCompId !== componentId && w.toCompId !== componentId
      )

      return {
        components: newComponents,
        wires: newWires,
        selectedElement: null,
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
      const id = generateId('wire')
      const newWire: Wire = {
        id,
        fromCompId,
        fromTermId,
        toCompId,
        toTermId,
        type: wireType as any,
      }
      return { wires: [...state.wires, newWire] }
    }),

  removeWire: (wireId: string) =>
    set((state) => ({
      wires: state.wires.filter((w) => w.id !== wireId),
      selectedElement: null,
    })),

  // ============================================================
  // SÉLECTION
  // ============================================================
  selectElement: (type: 'component' | 'wire', id: string) =>
    set({
      selectedElement: { type, id },
    }),

  deselectElement: () =>
    set({
      selectedElement: null,
    }),

  // ============================================================
  // SIMULATION
  // ============================================================
  simResult: null,
  simMode: false,

  runSimulation: () =>
    set((state) => {
      // Import dynamique du service de simulation
      const { runSimulationService } = require('../services/simulationService')
      const result = runSimulationService(state.components, state.wires)

      return {
        simResult: result,
        simMode: true,
      }
    }),

  exitSimMode: () => set({ simMode: false }),

  // ============================================================
  // UNDO/REDO
  // ============================================================
  history: [],
  historyIndex: -1,

  saveToHistory: () =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push({
        components: new Map(state.components),
        wires: [...state.wires],
      })
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
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
  activeWireType: 'phase',
  mode: 'sandbox',

  setTool: (tool: 'select' | 'wire' | 'delete') => set({ tool }),
  setActiveWireType: (type: 'phase' | 'neutre' | 'terre' | 'signal') =>
    set({ activeWireType: type }),
  setMode: (mode: 'sandbox' | 'training') => set({ mode }),

  // ============================================================
  // VIEWPORT
  // ============================================================
  zoom: 1,
  panX: 0,
  panY: 0,

  setZoom: (zoom: number) => set({ zoom }),
  setPan: (x: number, y: number) => set({ panX: x, panY: y }),

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
          set((s) => ({
            notifications: s.notifications.filter((n) => n.id !== id),
          }))
        }, duration)
      }

      return { notifications: newNotifications }
    }),

  removeNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

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
}))

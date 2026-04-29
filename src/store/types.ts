/**
 * src/store/types.ts
 * Types TypeScript pour le store Zustand
 */

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

export interface SimulationResult {
  energizedNodes: Set<string>
  energizedComps: Set<string>
  energizedWires: Set<string>
  loads: Array<{
    componentId: string
    type: string
    phaseEnergized: boolean
    neutreEnergized: boolean
    terreEnergized: boolean
    powered: boolean
  }>
  errors: Array<{ type: string; message: string; severity: string }>
  warnings: Array<{ type: string; message: string; severity: string }>
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration: number
}

export interface EditorState {
  // ---- Données circuit ----
  components: Map<string, Component>
  wires: Wire[]
  selectedElement: { type: 'component' | 'wire'; id: string } | null
  
  // ---- Actions composants ----
  addComponent: (typeId: string, x: number, y: number) => void
  updateComponent: (id: string, updates: Partial<Component>) => void
  removeComponent: (id: string) => void
  
  // ---- Actions fils ----
  addWire: (
    fromCompId: string,
    fromTermId: string,
    toCompId: string,
    toTermId: string,
    wireType?: string
  ) => void
  removeWire: (wireId: string) => void
  
  // ---- Sélection ----
  selectElement: (type: 'component' | 'wire', id: string) => void
  deselectElement: () => void
  
  // ---- Simulation ----
  simResult: SimulationResult | null
  simMode: boolean
  runSimulation: () => void
  exitSimMode: () => void
  
  // ---- Undo/Redo ----
  history: Array<{ components: Map<string, Component>; wires: Wire[] }>
  historyIndex: number
  saveToHistory: () => void
  undo: () => void
  redo: () => void
  
  // ---- Mode UI ----
  tool: 'select' | 'wire' | 'delete'
  activeWireType: 'phase' | 'neutre' | 'terre' | 'signal'
  mode: 'sandbox' | 'training'
  setTool: (tool: 'select' | 'wire' | 'delete') => void
  setActiveWireType: (type: 'phase' | 'neutre' | 'terre' | 'signal') => void
  setMode: (mode: 'sandbox' | 'training') => void
  
  // ---- Viewport ----
  zoom: number
  panX: number
  panY: number
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  
  // ---- Notifications ----
  notifications: Notification[]
  addNotification: (
    type: 'success' | 'error' | 'info' | 'warning',
    message: string,
    duration?: number
  ) => void
  removeNotification: (id: string) => void
  
  // ---- Export/Import ----
  exportJSON: () => { components: Component[]; wires: Wire[] }
  importJSON: (data: { components: Component[]; wires: Wire[] }) => void
  clear: () => void
}

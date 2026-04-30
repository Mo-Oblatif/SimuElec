/**
 * src/store/types.ts
 * Types TypeScript pour le store Zustand
 */

export type WireType =
  | 'phase' | 'neutre' | 'terre' | 'signal'
  | 'marron' | 'gris' | 'noir' | 'violet' | 'orange' | 'blanc'

export interface Component {
  id: string
  typeId: string
  x: number
  y: number
  state: string
  label: string
  scale?: number
  rotation?: number
}

export type CableSection = '3G1.5' | '3G2.5' | '3G6' | '5G1.5' | '5G2.5' | '5G6'

export interface Wire {
  id: string
  fromCompId: string
  fromTermId: string
  toCompId: string
  toTermId: string
  type: WireType
  section?: CableSection
}

/** Connexion entre deux conducteurs à l'intérieur d'une boîte de dérivation */
export interface ConductorConnection {
  id: string
  fromGaineId: string
  fromType: 'phase' | 'neutre' | 'terre' | 'noir' | 'gris'
  toGaineId: string
  toType: 'phase' | 'neutre' | 'terre' | 'noir' | 'gris'
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
  updateWire: (wireId: string, updates: { type?: WireType; section?: CableSection }) => void

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
  activeWireType: WireType
  lastScale: number
  setLastScale: (scale: number) => void
  mode: 'sandbox' | 'plan' | 'training'
  setTool: (tool: 'select' | 'wire' | 'delete') => void
  setActiveWireType: (type: WireType) => void
  setMode: (mode: 'sandbox' | 'plan' | 'training') => void
  // Workspaces séparés schema / plan
  _schemaSnapshot: { components: Map<string, Component>; wires: Wire[] } | null
  _planComponents: Map<string, Component>
  _planWires: Wire[]

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

  // ---- Exercices ----
  exerciseIndex: number
  exerciseScore: number
  exerciseFeedback: Array<{ msg: string; ok: boolean }> | null
  showExerciseSelector: boolean
  startExercise: (index: number) => void
  validateExercise: () => void
  nextExercise: () => void
  exitTraining: () => void
  openExerciseSelector: () => void
  closeExerciseSelector: () => void

  // ---- Export/Import ----
  exportJSON: () => { components: Component[]; wires: Wire[] }
  importJSON: (data: { components: Component[]; wires: Wire[] }) => void
  clear: () => void

  // ---- Boîte de dérivation (Among Us) ----
  derivationBoxOpen: string | null
  gaineConnections: Map<string, ConductorConnection[]>
  openDerivationBox: (boxId: string) => void
  closeDerivationBox: () => void
  addGaineConnection: (boxId: string, conn: Omit<ConductorConnection, 'id'>) => void
  removeGaineConnection: (boxId: string, connId: string) => void
}

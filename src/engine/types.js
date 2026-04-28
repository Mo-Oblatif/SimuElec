/**
 * src/engine/types.js
 * Types fondamentaux du moteur de simulation (logique pure)
 * Aucune dépendance à React, Canvas ou UI
 */

// ============================================================
// TYPES DE DONNÉES GÉNÉRIQUES
// ============================================================

/**
 * Un nœud du graphe (terminal d'un composant)
 * @typedef {Object} GraphNode
 * @property {string} id - 'componentId:terminalId'
 * @property {string} componentId
 * @property {string} terminalId
 * @property {string} type - 'phase_in' | 'phase_out' | 'neutre_in' | 'neutre_out' | 'terre' | 'signal_in' | 'signal_out' | 'any'
 */

/**
 * Une arête du graphe (fil électrique)
 * @typedef {Object} GraphEdge
 * @property {string} id
 * @property {string} fromNodeId - 'componentId:terminalId'
 * @property {string} toNodeId - 'componentId:terminalId'
 * @property {string} type - 'phase' | 'neutre' | 'terre' | 'signal'
 */

/**
 * Un composant électrique dans le circuit
 * @typedef {Object} ComponentData
 * @property {string} id
 * @property {string} typeId - 'disjoncteur16', 'lampe', etc.
 * @property {number} x - Position X en canvas
 * @property {number} y - Position Y en canvas
 * @property {string} state - 'closed' | 'open' | 'tripped' | etc.
 * @property {string} label - Étiquette personnalisée
 */

/**
 * Résultat d'une simulation
 * @typedef {Object} SimulationResult
 * @property {Set<string>} energizedNodes - Set de 'componentId:terminalId'
 * @property {Set<string>} energizedComps - Set de componentIds
 * @property {Array<Object>} loads - [{componentId, phaseEnergized, neutreEnergized}]
 * @property {Array<Object>} errors - [{type, message, severity}]
 * @property {Array<Object>} warnings - [{type, message, severity}]
 */

// ============================================================
// COULEURS ÉLECTRIQUES
// ============================================================

const WIRE_COLORS = {
  phase: '#c0392b',
  neutre: '#2980b9',
  terre: '#27ae60',
  signal: '#e67e22',
};

const WIRE_COLORS_GLOW = {
  phase: '#ff6b6b',
  neutre: '#74b9ff',
  terre: '#55efc4',
  signal: '#fd9644',
};

// ============================================================
// DÉFINITIONS DE COMPOSANTS (extraites de data.js)
// ============================================================

const COMPONENT_DEFINITIONS = {
  // Protections
  disjoncteur16: {
    label: 'Disjoncteur 16A',
    category: 'protection',
    w: 18,
    h: 72,
    amperage: 16,
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    terminals: [
      { id: 't_in', type: 'phase_in', side: 'top' },
      { id: 't_out', type: 'phase_out', side: 'bottom' },
    ],
    electricLogic: 'breaker',
  },

  disjoncteur20: {
    label: 'Disjoncteur 20A',
    category: 'protection',
    w: 18,
    h: 72,
    amperage: 20,
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    terminals: [
      { id: 't_in', type: 'phase_in', side: 'top' },
      { id: 't_out', type: 'phase_out', side: 'bottom' },
    ],
    electricLogic: 'breaker',
  },

  disjoncteur32: {
    label: 'Disjoncteur 32A',
    category: 'protection',
    w: 18,
    h: 72,
    amperage: 32,
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    terminals: [
      { id: 't_in', type: 'phase_in', side: 'top' },
      { id: 't_out', type: 'phase_out', side: 'bottom' },
    ],
    electricLogic: 'breaker',
  },

  differentiel: {
    label: 'Interrupteur Différentiel 30mA',
    category: 'protection',
    w: 36,
    h: 72,
    amperage: 40,
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    terminals: [
      { id: 'ph_in', type: 'phase_in', side: 'top' },
      { id: 'ph_out', type: 'phase_out', side: 'bottom' },
      { id: 'n_in', type: 'neutre_in', side: 'top' },
      { id: 'n_out', type: 'neutre_out', side: 'bottom' },
    ],
    electricLogic: 'differential',
  },

  telerupteur: {
    label: 'Télérupteur',
    category: 'relay',
    w: 36,
    h: 72,
    states: ['closed', 'open'],
    defaultState: 'open',
    terminals: [
      { id: 'a1', type: 'signal_in', side: 'left' },
      { id: 'a2', type: 'signal_in', side: 'left' },
      { id: '11', type: 'phase_out', side: 'bottom' },
      { id: '14', type: 'phase_out', side: 'bottom' },
    ],
    electricLogic: 'relay',
  },

  // Charges
  lampe: {
    label: 'Lampe',
    category: 'load',
    w: 20,
    h: 20,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph', type: 'phase_in', side: 'top' },
      { id: 'n', type: 'neutre_in', side: 'bottom' },
    ],
    electricLogic: 'lamp',
  },

  prise: {
    label: 'Prise',
    category: 'load',
    w: 20,
    h: 20,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph', type: 'phase_in', side: 'top' },
      { id: 'n', type: 'neutre_in', side: 'bottom' },
      { id: 'pe', type: 'terre', side: 'right' },
    ],
    electricLogic: 'socket',
  },

  // Borniers/Sources
  bornier_neutre: {
    label: 'Bornier Neutre',
    category: 'busbar',
    w: 40,
    h: 60,
    states: ['fixed'],
    defaultState: 'fixed',
    terminals: [
      { id: 'n_main', type: 'neutre_source', side: 'left' },
      { id: 'n1', type: 'neutre_out', side: 'right' },
      { id: 'n2', type: 'neutre_out', side: 'right' },
      { id: 'n3', type: 'neutre_out', side: 'right' },
      { id: 'n4', type: 'neutre_out', side: 'right' },
      { id: 'n5', type: 'neutre_out', side: 'right' },
    ],
    electricLogic: 'busbar',
  },

  bornier_terre: {
    label: 'Bornier Terre',
    category: 'busbar',
    w: 40,
    h: 60,
    states: ['fixed'],
    defaultState: 'fixed',
    terminals: [
      { id: 'pe_main', type: 'terre_source', side: 'left' },
      { id: 'pe1', type: 'terre', side: 'right' },
      { id: 'pe2', type: 'terre', side: 'right' },
      { id: 'pe3', type: 'terre', side: 'right' },
      { id: 'pe4', type: 'terre', side: 'right' },
      { id: 'pe5', type: 'terre', side: 'right' },
    ],
    electricLogic: 'busbar',
  },

  bouton: {
    label: 'Bouton',
    category: 'control',
    w: 20,
    h: 20,
    states: ['unpressed', 'pressed'],
    defaultState: 'unpressed',
    terminals: [
      { id: 'in', type: 'signal_in', side: 'left' },
      { id: 'out', type: 'signal_out', side: 'right' },
    ],
    electricLogic: 'pushbutton',
  },
};

module.exports = {
  WIRE_COLORS,
  WIRE_COLORS_GLOW,
  COMPONENT_DEFINITIONS,
};

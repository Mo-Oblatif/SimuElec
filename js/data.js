/**
 * data.js — Définitions des types de composants électriques
 * Chaque type décrit : dimensions, bornes, apparence, logique électrique.
 */

'use strict';

/* ---- Couleurs des fils ---- */
const WIRE_COLORS = {
  phase:  '#c0392b',
  neutre: '#2980b9',
  terre:  '#27ae60',
  signal: '#e67e22',
};

const WIRE_COLORS_GLOW = {
  phase:  '#ff6b6b',
  neutre: '#74b9ff',
  terre:  '#55efc4',
  signal: '#fd9644',
};

/* ---- Définition des types de terminaux ---- */
// type: 'phase_in' | 'phase_out' | 'neutre_in' | 'neutre_out' | 'terre' | 'signal_in' | 'signal_out' | 'any'
// side: 'top' | 'bottom' | 'left' | 'right'
// x, y : position relative (0..1) dans la boîte du composant

const COMPONENT_TYPES = {

  /* ===== DISJONCTEUR 16A (1 module) ===== */
  disjoncteur16: {
    label: 'Disjoncteur 16A',
    category: 'protection',
    slotWidth: 1,   // nombre de modules DIN
    w: 18, h: 72,   // px sur le canvas (unités abstraites)
    color: '#2d3561',
    borderColor: '#4a5490',
    amperage: 16,
    terminals: [
      { id: 't_in',  label: '1', side: 'top',    rx: 0.5, ry: 0.05, type: 'phase_in',  wireTypes: ['phase'] },
      { id: 't_out', label: '2', side: 'bottom', rx: 0.5, ry: 0.95, type: 'phase_out', wireTypes: ['phase'] },
    ],
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    toggleable: true,
    description: 'Protège un circuit contre les surcharges et courts-circuits. 16A pour éclairage.',
    electricLogic: 'breaker',
  },

  /* ===== DISJONCTEUR 20A ===== */
  disjoncteur20: {
    label: 'Disjoncteur 20A',
    category: 'protection',
    slotWidth: 1, w: 18, h: 72,
    color: '#2d3561', borderColor: '#4a5490',
    amperage: 20,
    terminals: [
      { id: 't_in',  label: '1', side: 'top',    rx: 0.5, ry: 0.05, type: 'phase_in',  wireTypes: ['phase'] },
      { id: 't_out', label: '2', side: 'bottom', rx: 0.5, ry: 0.95, type: 'phase_out', wireTypes: ['phase'] },
    ],
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    toggleable: true,
    description: 'Protège les circuits de prises de courant. 20A.',
    electricLogic: 'breaker',
  },

  /* ===== DISJONCTEUR 32A ===== */
  disjoncteur32: {
    label: 'Disjoncteur 32A',
    category: 'protection',
    slotWidth: 1, w: 18, h: 72,
    color: '#2d3561', borderColor: '#4a5490',
    amperage: 32,
    terminals: [
      { id: 't_in',  label: '1', side: 'top',    rx: 0.5, ry: 0.05, type: 'phase_in',  wireTypes: ['phase'] },
      { id: 't_out', label: '2', side: 'bottom', rx: 0.5, ry: 0.95, type: 'phase_out', wireTypes: ['phase'] },
    ],
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    toggleable: true,
    description: 'Protège les gros appareils (four, lave-linge). 32A.',
    electricLogic: 'breaker',
  },

  /* ===== INTERRUPTEUR DIFFÉRENTIEL 30mA (2 modules) ===== */
  differentiel: {
    label: 'Inter. Différentiel 30mA',
    category: 'protection',
    slotWidth: 2, w: 36, h: 72,
    color: '#1e3d2f', borderColor: '#2d6e52',
    amperage: 40,
    sensitivity: 30, // mA
    terminals: [
      { id: 'ph_in',  label: 'L',  side: 'top',    rx: 0.3, ry: 0.05, type: 'phase_in',  wireTypes: ['phase'] },
      { id: 'n_in',   label: 'N',  side: 'top',    rx: 0.7, ry: 0.05, type: 'neutre_in', wireTypes: ['neutre'] },
      { id: 'ph_out', label: 'L\'',side: 'bottom', rx: 0.3, ry: 0.95, type: 'phase_out', wireTypes: ['phase'] },
      { id: 'n_out',  label: 'N\'',side: 'bottom', rx: 0.7, ry: 0.95, type: 'neutre_out',wireTypes: ['neutre'] },
    ],
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    toggleable: true,
    description: 'Protection différentielle 30mA. Détecte les fuites à la terre.',
    electricLogic: 'differential',
  },

  /* ===== TÉLÉRUPTEUR (2 modules) ===== */
  telerupteur: {
    label: 'Télérupteur',
    category: 'command',
    slotWidth: 2, w: 36, h: 72,
    color: '#3d2b1e', borderColor: '#7a5538',
    terminals: [
      { id: 'a1', label: 'A1', side: 'top',    rx: 0.25, ry: 0.05, type: 'phase_in',   wireTypes: ['phase'], isCoil: true },
      { id: 'a2', label: 'A2', side: 'top',    rx: 0.75, ry: 0.05, type: 'neutre_in',  wireTypes: ['neutre'], isCoil: true },
      { id: '11', label: '11', side: 'bottom', rx: 0.25, ry: 0.95, type: 'phase_in',   wireTypes: ['phase', 'signal'] },
      { id: '14', label: '14', side: 'bottom', rx: 0.75, ry: 0.95, type: 'phase_out',  wireTypes: ['phase', 'signal'] },
    ],
    states: ['open', 'closed'],
    defaultState: 'open',
    toggleable: false, // commandé par bouton
    description: 'Commande à distance d\'un circuit d\'éclairage. Bobine A1/A2, contacts 11/14.',
    electricLogic: 'relay',
    hasCoil: true,
  },

  /* ===== BOUTON POUSSOIR ===== */
  bouton: {
    label: 'Bouton poussoir',
    category: 'command',
    slotWidth: 0, w: 40, h: 40, // libre (pas sur rail DIN)
    color: '#2c2c3e', borderColor: '#4a4a6e',
    terminals: [
      { id: 'in',  label: '1', side: 'left',  rx: 0.05, ry: 0.5, type: 'signal_in',  wireTypes: ['phase', 'signal'] },
      { id: 'out', label: '2', side: 'right', rx: 0.95, ry: 0.5, type: 'signal_out', wireTypes: ['phase', 'signal'] },
    ],
    states: ['released', 'pressed'],
    defaultState: 'released',
    toggleable: true,
    description: 'Bouton poussoir NO (normalement ouvert). Ferme brièvement le circuit.',
    electricLogic: 'pushbutton',
    momentary: true,
  },

  /* ===== LAMPE ===== */
  lampe: {
    label: 'Point lumineux',
    category: 'load',
    slotWidth: 0, w: 48, h: 48,
    color: '#2a2a1a', borderColor: '#5a5a2a',
    terminals: [
      { id: 'ph', label: 'L', side: 'left',  rx: 0.05, ry: 0.3, type: 'phase_in',  wireTypes: ['phase'] },
      { id: 'n',  label: 'N', side: 'left',  rx: 0.05, ry: 0.7, type: 'neutre_in', wireTypes: ['neutre'] },
    ],
    states: ['off', 'on'],
    defaultState: 'off',
    toggleable: false,
    description: 'Point lumineux (ampoule). S\'allume quand L et N sont sous tension.',
    electricLogic: 'lamp',
    power: 60, // W
  },

  /* ===== PRISE ===== */
  prise: {
    label: 'Prise 16A',
    category: 'load',
    slotWidth: 0, w: 48, h: 48,
    color: '#1a1a2a', borderColor: '#3a3a5a',
    terminals: [
      { id: 'ph', label: 'L',  side: 'left',   rx: 0.05, ry: 0.25, type: 'phase_in',  wireTypes: ['phase'] },
      { id: 'n',  label: 'N',  side: 'left',   rx: 0.05, ry: 0.5,  type: 'neutre_in', wireTypes: ['neutre'] },
      { id: 'pe', label: 'PE', side: 'left',   rx: 0.05, ry: 0.75, type: 'terre',     wireTypes: ['terre'] },
    ],
    states: ['inactive', 'active'],
    defaultState: 'inactive',
    toggleable: false,
    description: 'Prise de courant 16A (2P+T). Nécessite L, N et PE.',
    electricLogic: 'socket',
    power: 3680,
  },

  /* ===== BORNIER NEUTRE ===== */
  bornier_neutre: {
    label: 'Bornier neutre',
    category: 'busbar',
    slotWidth: 0, w: 80, h: 18,
    color: '#1a2a3a', borderColor: '#2980b9',
    terminals: [
      { id: 'main', label: 'N', side: 'left',  rx: 0.02, ry: 0.5, type: 'neutre_source', wireTypes: ['neutre'], isSource: true },
      { id: 'n1',   label: '',  side: 'bottom', rx: 0.2,  ry: 0.95, type: 'neutre_out', wireTypes: ['neutre'] },
      { id: 'n2',   label: '',  side: 'bottom', rx: 0.35, ry: 0.95, type: 'neutre_out', wireTypes: ['neutre'] },
      { id: 'n3',   label: '',  side: 'bottom', rx: 0.5,  ry: 0.95, type: 'neutre_out', wireTypes: ['neutre'] },
      { id: 'n4',   label: '',  side: 'bottom', rx: 0.65, ry: 0.95, type: 'neutre_out', wireTypes: ['neutre'] },
      { id: 'n5',   label: '',  side: 'bottom', rx: 0.8,  ry: 0.95, type: 'neutre_out', wireTypes: ['neutre'] },
    ],
    states: ['active'],
    defaultState: 'active',
    toggleable: false,
    description: 'Rangée de neutres. Distribue le conducteur neutre.',
    electricLogic: 'busbar',
    busbarType: 'neutre',
  },

  /* ===== BORNIER TERRE ===== */
  bornier_terre: {
    label: 'Bornier terre (PE)',
    category: 'busbar',
    slotWidth: 0, w: 80, h: 18,
    color: '#1a2a1a', borderColor: '#27ae60',
    terminals: [
      { id: 'main', label: 'PE', side: 'left',  rx: 0.02, ry: 0.5, type: 'terre_source', wireTypes: ['terre'], isSource: true },
      { id: 'pe1',  label: '',   side: 'bottom', rx: 0.2,  ry: 0.95, type: 'terre', wireTypes: ['terre'] },
      { id: 'pe2',  label: '',   side: 'bottom', rx: 0.35, ry: 0.95, type: 'terre', wireTypes: ['terre'] },
      { id: 'pe3',  label: '',   side: 'bottom', rx: 0.5,  ry: 0.95, type: 'terre', wireTypes: ['terre'] },
      { id: 'pe4',  label: '',   side: 'bottom', rx: 0.65, ry: 0.95, type: 'terre', wireTypes: ['terre'] },
      { id: 'pe5',  label: '',   side: 'bottom', rx: 0.8,  ry: 0.95, type: 'terre', wireTypes: ['terre'] },
    ],
    states: ['active'],
    defaultState: 'active',
    toggleable: false,
    description: 'Rangée de terres (PE). Distribue le conducteur de protection.',
    electricLogic: 'busbar',
    busbarType: 'terre',
  },
};

/* ---- Source principale (peigne / barre de phase) ---- */
// Représente la barre de phase alimentant l'ensemble du tableau
const SOURCE_PHASE_ID = '__source_phase__';
const SOURCE_NEUTRE_ID = '__source_neutre__';

/* ---- Règles de compatibilité des bornes ---- */
function terminalsCompatible(t1Type, t2Type) {
  const out = new Set(['phase_out', 'neutre_out', 'terre', 'signal_out', 'neutre_source', 'terre_source']);
  const inp = new Set(['phase_in', 'neutre_in', 'terre', 'signal_in', 'any']);
  // Une sortie peut se connecter à une entrée
  if (out.has(t1Type) && inp.has(t2Type)) return true;
  if (out.has(t2Type) && inp.has(t1Type)) return true;
  // Sources
  if (t1Type === 'neutre_source' || t2Type === 'neutre_source') return true;
  if (t1Type === 'terre_source' || t2Type === 'terre_source') return true;
  return false;
}

/* ---- Génère un ID unique ---- */
let _idCounter = 1;
function generateId(prefix = 'c') {
  return `${prefix}_${Date.now()}_${_idCounter++}`;
}

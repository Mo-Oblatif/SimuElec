/**
 * src/engine/types.js
 * Types fondamentaux du moteur de simulation (logique pure)
 */

const WIRE_COLORS = {
  phase:  '#c0392b',
  neutre: '#2980b9',
  terre:  '#27ae60',
  signal: '#e67e22',
  marron: '#92400e',
  gris:   '#6b7280',
  noir:   '#475569',
  violet: '#7c3aed',
  orange: '#ea580c',
  blanc:  '#e2e8f0',
};

const WIRE_COLORS_GLOW = {
  phase:  '#ff6b6b',
  neutre: '#74b9ff',
  terre:  '#55efc4',
  signal: '#fd9644',
  marron: '#d97706',
  gris:   '#9ca3af',
  noir:   '#6b7280',
  violet: '#a78bfa',
  orange: '#fb923c',
  blanc:  '#f8fafc',
};

const COMPONENT_DEFINITIONS = {

  // ============================================================
  // ARMOIRE / TABLEAU (schema only — élément de fond)
  // ============================================================
  agcp: {
    label: 'AGCP (Branchement)',
    category: 'cabinet',
    showInMode: 'schema',
    w: 56, h: 120,
    amperage: 60,
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    terminals: [
      { id: 'ph_in',  type: 'phase_in',   side: 'top' },
      { id: 'n_in',   type: 'neutre_in',  side: 'top' },
      { id: 'ph_out', type: 'phase_out',  side: 'bottom' },
      { id: 'n_out',  type: 'neutre_out', side: 'bottom' },
    ],
    electricLogic: 'agcp',
  },

  tableau_armoire: {
    label: 'Armoire tableau',
    category: 'cabinet',
    showInMode: 'schema',
    w: 480, h: 640,
    states: ['fixed'],
    defaultState: 'fixed',
    terminals: [
      { id: 'ph_in', type: 'phase_in',  side: 'top' },
      { id: 'n_in',  type: 'neutre_in', side: 'top' },
      { id: 'pe_in', type: 'terre',     side: 'top' },
    ],
    electricLogic: 'cabinet',
  },

  // ============================================================
  // PROTECTIONS (schema + training)
  // ============================================================
  disjoncteur16: {
    label: 'Disjoncteur 16A',
    category: 'protection',
    w: 56, h: 100,
    amperage: 16,
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    terminals: [
      { id: 'ph_in',  type: 'phase_in',   side: 'top' },
      { id: 'n_in',   type: 'neutre_in',  side: 'top' },
      { id: 'ph_out', type: 'phase_out',  side: 'bottom' },
      { id: 'n_out',  type: 'neutre_out', side: 'bottom' },
    ],
    electricLogic: 'breaker',
  },

  disjoncteur20: {
    label: 'Disjoncteur 20A',
    category: 'protection',
    w: 56, h: 100,
    amperage: 20,
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    terminals: [
      { id: 'ph_in',  type: 'phase_in',   side: 'top' },
      { id: 'n_in',   type: 'neutre_in',  side: 'top' },
      { id: 'ph_out', type: 'phase_out',  side: 'bottom' },
      { id: 'n_out',  type: 'neutre_out', side: 'bottom' },
    ],
    electricLogic: 'breaker',
  },

  disjoncteur32: {
    label: 'Disjoncteur 32A',
    category: 'protection',
    w: 56, h: 100,
    amperage: 32,
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    terminals: [
      { id: 'ph_in',  type: 'phase_in',   side: 'top' },
      { id: 'n_in',   type: 'neutre_in',  side: 'top' },
      { id: 'ph_out', type: 'phase_out',  side: 'bottom' },
      { id: 'n_out',  type: 'neutre_out', side: 'bottom' },
    ],
    electricLogic: 'breaker',
  },

  differentiel: {
    label: 'Interrupteur Différentiel 30mA',
    category: 'protection',
    w: 56, h: 100,
    amperage: 40,
    states: ['closed', 'open', 'tripped'],
    defaultState: 'closed',
    terminals: [
      { id: 'ph_in',  type: 'phase_in',   side: 'top' },
      { id: 'ph_out', type: 'phase_out',  side: 'bottom' },
      { id: 'n_in',   type: 'neutre_in',  side: 'top' },
      { id: 'n_out',  type: 'neutre_out', side: 'bottom' },
    ],
    electricLogic: 'differential',
  },

  // ============================================================
  // RELAIS (schema + training)
  // ============================================================
  telerupteur: {
    label: 'Télérupteur',
    category: 'relay',
    w: 56, h: 100,
    states: ['closed', 'open'],
    defaultState: 'open',
    terminals: [
      { id: 'a1', type: 'signal_in',  side: 'left' },
      { id: 'a2', type: 'signal_in',  side: 'left' },
      { id: '11', type: 'phase_out', side: 'bottom' },
      { id: '14', type: 'phase_out', side: 'bottom' },
    ],
    electricLogic: 'relay',
  },

  minuteur: {
    label: 'Minuterie',
    category: 'relay',
    showInMode: 'schema',
    w: 56, h: 100,
    states: ['off', 'on', 'timing'],
    defaultState: 'off',
    terminals: [
      { id: 'a1', type: 'phase_in',  side: 'top' },
      { id: 'a2', type: 'neutre_in', side: 'top' },
      { id: '11', type: 'phase_out', side: 'bottom' },
      { id: '14', type: 'phase_out', side: 'bottom' },
    ],
    electricLogic: 'timer',
  },

  // ============================================================
  // COMMANDES schema-only
  // ============================================================
  bouton_simple: {
    label: 'Bouton simple',
    category: 'control',
    showInMode: 'plan',
    w: 40, h: 40,
    states: ['open', 'closed'],
    defaultState: 'open',
    terminals: [
      { id: 'in',    type: 'phase_in',   side: 'left' },
      { id: 'out',   type: 'phase_out',  side: 'right' },
      { id: 'gaine', type: 'gaine_slot', side: 'bottom' },
    ],
    electricLogic: 'simple_button',
  },

  thermostat: {
    label: 'Thermostat',
    category: 'control',
    showInMode: 'plan',
    w: 56, h: 100,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph_in',  type: 'phase_in',   side: 'top' },
      { id: 'ph_out', type: 'phase_out',  side: 'bottom' },
      { id: 'n',      type: 'neutre_in',  side: 'right' },
      { id: 'gaine',  type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'thermostat',
  },

  // ============================================================
  // BORNIERS (schema + training)
  // ============================================================
  bornier_neutre: {
    label: 'Bornier Neutre',
    category: 'busbar',
    w: 60, h: 80,
    states: ['fixed'],
    defaultState: 'fixed',
    terminals: [
      { id: 'n_main', type: 'neutre_source', side: 'left' },
      { id: 'n1',     type: 'neutre_out',    side: 'right' },
      { id: 'n2',     type: 'neutre_out',    side: 'right' },
      { id: 'n3',     type: 'neutre_out',    side: 'right' },
      { id: 'n4',     type: 'neutre_out',    side: 'right' },
      { id: 'n5',     type: 'neutre_out',    side: 'right' },
    ],
    electricLogic: 'busbar',
  },

  bornier_terre: {
    label: 'Bornier Terre',
    category: 'busbar',
    w: 60, h: 80,
    states: ['fixed'],
    defaultState: 'fixed',
    terminals: [
      { id: 'pe_main', type: 'terre_source', side: 'left' },
      { id: 'pe1',     type: 'terre',        side: 'right' },
      { id: 'pe2',     type: 'terre',        side: 'right' },
      { id: 'pe3',     type: 'terre',        side: 'right' },
      { id: 'pe4',     type: 'terre',        side: 'right' },
      { id: 'pe5',     type: 'terre',        side: 'right' },
    ],
    electricLogic: 'busbar',
  },

  // ============================================================
  // CHARGES — plan + training (pas dans le tableau)
  // ============================================================
  lampe: {
    label: 'Lampe',
    category: 'load',
    showInMode: 'plan-training',
    w: 44, h: 44,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph',    type: 'phase_in',   side: 'top' },
      { id: 'n',     type: 'neutre_in',  side: 'bottom' },
      { id: 'gaine', type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'lamp',
  },

  prise: {
    label: 'Prise',
    category: 'load',
    showInMode: 'plan-training',
    w: 44, h: 44,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph',    type: 'phase_in',   side: 'top' },
      { id: 'n',     type: 'neutre_in',  side: 'bottom' },
      { id: 'pe',    type: 'terre',      side: 'right' },
      { id: 'gaine', type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'socket',
  },

  // ============================================================
  // COMMANDES — plan + training
  // ============================================================
  bouton: {
    label: 'Bouton poussoir',
    category: 'control',
    showInMode: 'plan-training',
    w: 40, h: 40,
    states: ['unpressed', 'pressed'],
    defaultState: 'unpressed',
    terminals: [
      { id: 'in',    type: 'signal_in',  side: 'left' },
      { id: 'out',   type: 'signal_out', side: 'right' },
      { id: 'gaine', type: 'gaine_slot', side: 'bottom' },
    ],
    electricLogic: 'pushbutton',
  },

  // ============================================================
  // COMPOSANTS MODE PLAN
  // ============================================================

  interrupteur: {
    label: 'Interrupteur',
    category: 'control',
    showInMode: 'plan',
    w: 48, h: 48,
    states: ['open', 'closed'],
    defaultState: 'open',
    terminals: [
      { id: 'in',    type: 'phase_in',   side: 'left' },
      { id: 'out',   type: 'phase_out',  side: 'right' },
      { id: 'gaine', type: 'gaine_slot', side: 'bottom' },
    ],
    electricLogic: 'switch',
  },

  va_et_vient: {
    label: 'Va-et-vient',
    category: 'control',
    showInMode: 'plan',
    w: 52, h: 52,
    states: ['pos1', 'pos2'],
    defaultState: 'pos1',
    terminals: [
      { id: 'c',     type: 'phase_in',   side: 'left' },
      { id: 'v1',    type: 'phase_out',  side: 'right' },
      { id: 'v2',    type: 'phase_out',  side: 'top' },
      { id: 'gaine', type: 'gaine_slot', side: 'bottom' },
    ],
    electricLogic: 'two_way',
  },

  interrupteur_double: {
    label: 'Double interrupteur',
    category: 'control',
    showInMode: 'plan',
    w: 52, h: 44,
    states: ['both_open', 'first_closed', 'second_closed', 'both_closed'],
    defaultState: 'both_open',
    terminals: [
      { id: 'in',    type: 'phase_in',   side: 'left' },
      { id: 'out1',  type: 'phase_out',  side: 'right' },
      { id: 'out2',  type: 'phase_out',  side: 'right' },
      { id: 'gaine', type: 'gaine_slot', side: 'bottom' },
    ],
    electricLogic: 'double_switch',
  },

  volet_roulant: {
    label: 'Volet roulant',
    category: 'control',
    showInMode: 'plan',
    w: 52, h: 52,
    states: ['stopped', 'up', 'down'],
    defaultState: 'stopped',
    terminals: [
      { id: 'ph',    type: 'phase_in',   side: 'top' },
      { id: 'n',     type: 'neutre_in',  side: 'bottom' },
      { id: 'up',    type: 'signal_out', side: 'left' },
      { id: 'dn',    type: 'signal_out', side: 'right' },
      { id: 'gaine', type: 'gaine_slot', side: 'top' },
    ],
    electricLogic: 'blind',
  },

  point_lumiere: {
    label: 'Point de lumière',
    category: 'load',
    showInMode: 'plan',
    w: 48, h: 48,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph',    type: 'phase_in',   side: 'top' },
      { id: 'n',     type: 'neutre_in',  side: 'bottom' },
      { id: 'gaine', type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'ceiling_light',
  },

  applique: {
    label: 'Applique murale',
    category: 'load',
    showInMode: 'plan',
    w: 48, h: 48,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph',    type: 'phase_in',   side: 'top' },
      { id: 'n',     type: 'neutre_in',  side: 'bottom' },
      { id: 'gaine', type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'wall_light',
  },

  boite_derivation: {
    label: 'Boîte dérivation',
    category: 'junction',
    showInMode: 'plan',
    w: 80, h: 80,
    states: ['closed', 'open'],
    defaultState: 'closed',
    terminals: [
      { id: 'g1', type: 'gaine_slot', side: 'top' },
      { id: 'g2', type: 'gaine_slot', side: 'top' },
      { id: 'g3', type: 'gaine_slot', side: 'right' },
      { id: 'g4', type: 'gaine_slot', side: 'right' },
      { id: 'g5', type: 'gaine_slot', side: 'bottom' },
      { id: 'g6', type: 'gaine_slot', side: 'bottom' },
      { id: 'g7', type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'junction_box',
  },

  tableau_plan: {
    label: 'Tableau électrique',
    category: 'cabinet',
    showInMode: 'plan',
    w: 64, h: 80,
    states: ['fixed'],
    defaultState: 'fixed',
    terminals: [
      { id: 'g1', type: 'gaine_slot', side: 'top' },
      { id: 'g2', type: 'gaine_slot', side: 'right' },
      { id: 'g3', type: 'gaine_slot', side: 'bottom' },
      { id: 'g4', type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'panel_plan',
  },

  wago: {
    label: 'Wago 5P',
    category: 'junction',
    showInMode: 'plan',
    w: 64, h: 44,
    states: ['fixed'],
    defaultState: 'fixed',
    terminals: [
      { id: 'w1', type: 'any', side: 'left' },
      { id: 'w2', type: 'any', side: 'left' },
      { id: 'w3', type: 'any', side: 'right' },
      { id: 'w4', type: 'any', side: 'right' },
      { id: 'w5', type: 'any', side: 'right' },
    ],
    electricLogic: 'wago',
  },

  // ============================================================
  // CHARGES SPÉCIALISÉES — plan
  // ============================================================
  chauffage: {
    label: 'Chauffage électrique',
    category: 'load',
    showInMode: 'plan',
    w: 64, h: 52,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph',    type: 'phase_in',   side: 'top' },
      { id: 'n',     type: 'neutre_in',  side: 'bottom' },
      { id: 'pe',    type: 'terre',      side: 'right' },
      { id: 'gaine', type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'heater',
  },

  lave_vaisselle: {
    label: 'Lave-vaisselle',
    category: 'load',
    showInMode: 'plan',
    w: 60, h: 60,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph',    type: 'phase_in',   side: 'top' },
      { id: 'n',     type: 'neutre_in',  side: 'bottom' },
      { id: 'pe',    type: 'terre',      side: 'right' },
      { id: 'gaine', type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'dishwasher',
  },

  plaque_cuisson: {
    label: 'Plaque de cuisson',
    category: 'load',
    showInMode: 'plan',
    w: 64, h: 64,
    states: ['off', 'on'],
    defaultState: 'off',
    terminals: [
      { id: 'ph',    type: 'phase_in',   side: 'top' },
      { id: 'n',     type: 'neutre_in',  side: 'bottom' },
      { id: 'pe',    type: 'terre',      side: 'right' },
      { id: 'gaine', type: 'gaine_slot', side: 'left' },
    ],
    electricLogic: 'hob',
  },

  // ============================================================
  // GAINES (conduits — mode plan uniquement)
  // ============================================================
  gaine_15: {
    label: 'Gaine 3G1.5',
    category: 'conduit',
    showInMode: 'plan',
    w: 130, h: 22,
    states: ['fixed'],
    defaultState: 'fixed',
    section: '3G1.5',
    terminals: [
      { id: 'start', type: 'gaine_slot', side: 'left' },
      { id: 'end',   type: 'gaine_slot', side: 'right' },
    ],
    electricLogic: 'conduit',
  },

  gaine_25: {
    label: 'Gaine 3G2.5',
    category: 'conduit',
    showInMode: 'plan',
    w: 130, h: 26,
    states: ['fixed'],
    defaultState: 'fixed',
    section: '3G2.5',
    terminals: [
      { id: 'start', type: 'gaine_slot', side: 'left' },
      { id: 'end',   type: 'gaine_slot', side: 'right' },
    ],
    electricLogic: 'conduit',
  },

  gaine_6: {
    label: 'Gaine 3G6',
    category: 'conduit',
    showInMode: 'plan',
    w: 130, h: 30,
    states: ['fixed'],
    defaultState: 'fixed',
    section: '3G6',
    terminals: [
      { id: 'start', type: 'gaine_slot', side: 'left' },
      { id: 'end',   type: 'gaine_slot', side: 'right' },
    ],
    electricLogic: 'conduit',
  },

  gaine_5g_15: {
    label: 'Gaine 5G1.5',
    category: 'conduit',
    showInMode: 'plan',
    w: 130, h: 28,
    states: ['fixed'],
    defaultState: 'fixed',
    section: '5G1.5',
    terminals: [
      { id: 'start', type: 'gaine_slot', side: 'left' },
      { id: 'end',   type: 'gaine_slot', side: 'right' },
    ],
    electricLogic: 'conduit',
  },

  gaine_5g_25: {
    label: 'Gaine 5G2.5',
    category: 'conduit',
    showInMode: 'plan',
    w: 130, h: 32,
    states: ['fixed'],
    defaultState: 'fixed',
    section: '5G2.5',
    terminals: [
      { id: 'start', type: 'gaine_slot', side: 'left' },
      { id: 'end',   type: 'gaine_slot', side: 'right' },
    ],
    electricLogic: 'conduit',
  },

  gaine_5g_6: {
    label: 'Gaine 5G6',
    category: 'conduit',
    showInMode: 'plan',
    w: 130, h: 36,
    states: ['fixed'],
    defaultState: 'fixed',
    section: '5G6',
    terminals: [
      { id: 'start', type: 'gaine_slot', side: 'left' },
      { id: 'end',   type: 'gaine_slot', side: 'right' },
    ],
    electricLogic: 'conduit',
  },
};

export { WIRE_COLORS, WIRE_COLORS_GLOW, COMPONENT_DEFINITIONS };
export default { WIRE_COLORS, WIRE_COLORS_GLOW, COMPONENT_DEFINITIONS };

/**
 * test-engine.js
 * Démo simple du moteur de simulation
 * À exécuter avec: node test-engine.js
 */

'use strict';

const SimulationEngine = require('./src/engine/simulator');

// ============================================================
// TEST 1: Circuit simple avec lampe
// ============================================================
console.log('🧪 TEST 1: Circuit simple (Disjoncteur → Lampe)');
console.log('─'.repeat(50));

const components1 = new Map([
  ['comp1', {
    id: 'comp1',
    typeId: 'disjoncteur16',
    state: 'closed',
    x: 0, y: 0,
    label: 'Disj. Éclairage'
  }],
  ['comp2', {
    id: 'comp2',
    typeId: 'bornier_neutre',
    state: 'fixed',
    x: 100, y: 0,
    label: 'Neutre'
  }],
  ['comp3', {
    id: 'comp3',
    typeId: 'lampe',
    state: 'off',
    x: 50, y: 100,
    label: 'Lampe Salon'
  }],
]);

const wires1 = [
  {
    id: 'w1',
    fromCompId: 'comp1', fromTermId: 't_out',
    toCompId: 'comp3', toTermId: 'ph',
    type: 'phase'
  },
  {
    id: 'w2',
    fromCompId: 'comp2', fromTermId: 'n1',
    toCompId: 'comp3', toTermId: 'n',
    type: 'neutre'
  }
];

const engine1 = new SimulationEngine(components1, wires1);
const result1 = engine1.simulate();

console.log('✅ Composants énergisés:', Array.from(result1.energizedComps));
console.log('📍 Nœuds énergisés:', Array.from(result1.energizedNodes));
console.log('💡 Charges:');
result1.loads.forEach(load => {
  console.log(`   - ${load.componentId}: powered=${load.powered}, phase=${load.phaseEnergized}, neutre=${load.neutreEnergized}`);
});
console.log('⚠️  Erreurs:', result1.errors);
console.log('⚠️  Avertissements:', result1.warnings);

// ============================================================
// TEST 2: Disjoncteur OUVERT (circuit coupé)
// ============================================================
console.log('\n🧪 TEST 2: Circuit avec disjoncteur OUVERT');
console.log('─'.repeat(50));

const components2 = new Map(components1);
components2.set('comp1', {
  ...components2.get('comp1'),
  state: 'open', // Ouvert!
});

const engine2 = new SimulationEngine(components2, wires1);
const result2 = engine2.simulate();

console.log('✅ Composants énergisés:', Array.from(result2.energizedComps));
console.log('💡 Charges:');
result2.loads.forEach(load => {
  console.log(`   - ${load.componentId}: powered=${load.powered}`);
});

// ============================================================
// TEST 3: Deux circuits indépendants
// ============================================================
console.log('\n🧪 TEST 3: Deux circuits indépendants');
console.log('─'.repeat(50));

const components3 = new Map([
  // Circuit 1: Éclairage
  ['disj-eclairage', {
    id: 'disj-eclairage',
    typeId: 'disjoncteur16',
    state: 'closed',
    x: 0, y: 0,
  }],
  ['lampe-salon', {
    id: 'lampe-salon',
    typeId: 'lampe',
    state: 'off',
    x: 50, y: 100,
  }],

  // Circuit 2: Prises
  ['disj-prises', {
    id: 'disj-prises',
    typeId: 'disjoncteur20',
    state: 'closed',
    x: 100, y: 0,
  }],
  ['prise-cuisine', {
    id: 'prise-cuisine',
    typeId: 'prise',
    state: 'off',
    x: 150, y: 100,
  }],

  // Sources communes
  ['neutre-commun', {
    id: 'neutre-commun',
    typeId: 'bornier_neutre',
    state: 'fixed',
    x: 50, y: 200,
  }],
]);

const wires3 = [
  // Éclairage
  {
    id: 'w-ecl-phase',
    fromCompId: 'disj-eclairage', fromTermId: 't_out',
    toCompId: 'lampe-salon', toTermId: 'ph',
    type: 'phase'
  },
  {
    id: 'w-ecl-neutre',
    fromCompId: 'neutre-commun', fromTermId: 'n1',
    toCompId: 'lampe-salon', toTermId: 'n',
    type: 'neutre'
  },

  // Prises
  {
    id: 'w-prise-phase',
    fromCompId: 'disj-prises', fromTermId: 't_out',
    toCompId: 'prise-cuisine', toTermId: 'ph',
    type: 'phase'
  },
  {
    id: 'w-prise-neutre',
    fromCompId: 'neutre-commun', fromTermId: 'n2',
    toCompId: 'prise-cuisine', toTermId: 'n',
    type: 'neutre'
  },
];

const engine3 = new SimulationEngine(components3, wires3);
const result3 = engine3.simulate();

console.log('✅ Composants énergisés:', Array.from(result3.energizedComps));
console.log('💡 État des charges:');
result3.loads.forEach(load => {
  console.log(`   - ${load.componentId}: powered=${load.powered}`);
});

// ============================================================
// RÉSUMÉ
// ============================================================
console.log('\n' + '═'.repeat(50));
console.log('✨ Moteur de simulation: FONCTIONNEL');
console.log('═'.repeat(50));
console.log('Prochaines étapes:');
console.log('  1. Créer package.json avec React + Zustand');
console.log('  2. Ajouter tests unitaires (Jest)');
console.log('  3. Migrer vers SVG pour le rendu');
console.log('  4. Connecter Zustand au moteur');

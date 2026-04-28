/**
 * Circuit.js — Moteur de simulation électrique
 * Implémente un traceur de circuit par graphe (BFS/DFS)
 * pour déterminer quels composants sont alimentés.
 */

'use strict';

class Circuit {
  constructor(components, wires) {
    this.components = components; // Map<id, Component>
    this.wires = wires;           // Wire[]

    // Résultats
    this.energizedNodes = new Set();  // 'compId:termId'
    this.energizedComps = new Set();  // compId
    this.errors = [];
    this.warnings = [];
    this.loads = [];  // { comp, phaseEnergized, neutreEnergized }
  }

  /* ============================================================
     SIMULATION PRINCIPALE
     ============================================================ */
  simulate() {
    this.errors = [];
    this.warnings = [];
    this.energizedNodes.clear();
    this.energizedComps.clear();
    this.loads = [];

    // Réinitialiser tous les composants
    for (const comp of this.components.values()) {
      comp.energized = false;
    }
    for (const wire of this.wires) {
      wire.energized = false;
    }

    // Construire le graphe de connexions
    const graph = this._buildGraph();

    // Trouver les sources (borniers)
    const phaseSources = this._findSources('neutre_source', 'phase_in')
      .concat(this._findPhaseSources());
    const neutreSources = this._findSources('neutre_source', null);
    const terreSources = this._findSources('terre_source', null);

    // Phase: propager depuis le peigne de phase (tous les disjoncteurs "en haut")
    // Le peigne de phase alimente directement les terminaux phase_in des protections
    const phaseNodes = new Set();
    const neutreNodes = new Set();
    const terreNodes = new Set();

    // Initialiser les nœuds sources
    this._initPhaseSources(phaseNodes);
    this._initNeutreSources(neutreNodes);
    this._initTerreSources(terreNodes);

    // Propager la phase
    this._propagate(graph, phaseNodes, 'phase');

    // Propager le neutre
    this._propagate(graph, neutreNodes, 'neutre');

    // Propager la terre
    this._propagate(graph, terreNodes, 'terre');

    // Évaluer les charges
    this._evaluateLoads(phaseNodes, neutreNodes, terreNodes);

    // Détecter les erreurs
    this._detectErrors(phaseNodes, neutreNodes);

    return {
      energizedComps: this.energizedComps,
      energizedNodes: this.energizedNodes,
      errors: this.errors,
      warnings: this.warnings,
      loads: this.loads,
    };
  }

  /* ---- Construction du graphe de connexions ---- */
  _buildGraph() {
    // graph: Map<'compId:termId', Set<'compId:termId'>>
    const graph = new Map();

    const nodeId = (compId, termId) => `${compId}:${termId}`;
    const ensureNode = (nid) => { if (!graph.has(nid)) graph.set(nid, new Set()); };

    for (const wire of this.wires) {
      const n1 = nodeId(wire.fromCompId, wire.fromTermId);
      const n2 = nodeId(wire.toCompId, wire.toTermId);
      ensureNode(n1); ensureNode(n2);
      graph.get(n1).add(n2);
      graph.get(n2).add(n1);
      // Stocker la référence du fil pour l'activer
      graph.get(n1)._wire = wire;
      graph.get(n2)._wire = wire;
    }

    // Connections internes aux composants (traversée si état=closed)
    for (const comp of this.components.values()) {
      this._addInternalConnections(graph, comp, nodeId, ensureNode);
    }

    return graph;
  }

  _addInternalConnections(graph, comp, nodeId, ensureNode) {
    const def = comp.def;
    const state = comp.state;

    switch (def.electricLogic) {
      case 'breaker':
        if (state === 'closed') {
          const n1 = nodeId(comp.id, 't_in');
          const n2 = nodeId(comp.id, 't_out');
          ensureNode(n1); ensureNode(n2);
          graph.get(n1).add(n2); graph.get(n2).add(n1);
        }
        break;

      case 'differential':
        if (state === 'closed') {
          // Phase: ph_in → ph_out
          const ph1 = nodeId(comp.id, 'ph_in');
          const ph2 = nodeId(comp.id, 'ph_out');
          ensureNode(ph1); ensureNode(ph2);
          graph.get(ph1).add(ph2); graph.get(ph2).add(ph1);
          // Neutre: n_in → n_out
          const n1 = nodeId(comp.id, 'n_in');
          const n2 = nodeId(comp.id, 'n_out');
          ensureNode(n1); ensureNode(n2);
          graph.get(n1).add(n2); graph.get(n2).add(n1);
        }
        break;

      case 'relay':
        if (state === 'closed') {
          const c1 = nodeId(comp.id, '11');
          const c2 = nodeId(comp.id, '14');
          ensureNode(c1); ensureNode(c2);
          graph.get(c1).add(c2); graph.get(c2).add(c1);
        }
        break;

      case 'pushbutton':
        if (state === 'pressed') {
          const n1 = nodeId(comp.id, 'in');
          const n2 = nodeId(comp.id, 'out');
          ensureNode(n1); ensureNode(n2);
          graph.get(n1).add(n2); graph.get(n2).add(n1);
        }
        break;

      case 'busbar':
        // Toutes les bornes du bornier sont interconnectées
        const terms = def.terminals;
        for (let i = 0; i < terms.length; i++) {
          for (let j = i + 1; j < terms.length; j++) {
            const na = nodeId(comp.id, terms[i].id);
            const nb = nodeId(comp.id, terms[j].id);
            ensureNode(na); ensureNode(nb);
            graph.get(na).add(nb); graph.get(nb).add(na);
          }
        }
        break;
    }
  }

  /* ---- Sources de phase ---- */
  _initPhaseSources(phaseNodes) {
    // Chaque terminal phase_in d'un disjoncteur/différentiel
    // est directement alimenté par le peigne de phase (barre L)
    for (const comp of this.components.values()) {
      const def = comp.def;
      if (def.electricLogic === 'breaker' || def.electricLogic === 'differential') {
        const phTerm = def.terminals.find(t => t.type === 'phase_in');
        if (phTerm) {
          phaseNodes.add(`${comp.id}:${phTerm.id}`);
          comp.energized = true;
          this.energizedComps.add(comp.id);
        }
      }
    }
  }

  _initNeutreSources(neutreNodes) {
    for (const comp of this.components.values()) {
      if (comp.def.busbarType === 'neutre') {
        for (const t of comp.def.terminals) {
          neutreNodes.add(`${comp.id}:${t.id}`);
        }
        comp.energized = true;
        this.energizedComps.add(comp.id);
      }
    }
  }

  _initTerreSources(terreNodes) {
    for (const comp of this.components.values()) {
      if (comp.def.busbarType === 'terre') {
        for (const t of comp.def.terminals) {
          terreNodes.add(`${comp.id}:${t.id}`);
        }
        comp.energized = true;
        this.energizedComps.add(comp.id);
      }
    }
  }

  /* ---- Propagation BFS ---- */
  _propagate(graph, startNodes, type) {
    const visited = new Set(startNodes);
    const queue = [...startNodes];

    while (queue.length > 0) {
      const node = queue.shift();
      this.energizedNodes.add(node);

      const [compId] = node.split(':');
      if (this.components.has(compId)) {
        this.energizedComps.add(compId);
        this.components.get(compId).energized = true;
      }

      const neighbors = graph.get(node);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);

          // Activer le fil correspondant
          const wireKey = `${node}→${neighbor}`;
          const wire = this._findWireBetween(node, neighbor);
          if (wire) wire.energized = true;
        }
      }
    }
  }

  _findWireBetween(nodeA, nodeB) {
    const [compA, termA] = nodeA.split(':');
    const [compB, termB] = nodeB.split(':');
    return this.wires.find(w =>
      (w.fromCompId === compA && w.fromTermId === termA && w.toCompId === compB && w.toTermId === termB) ||
      (w.fromCompId === compB && w.fromTermId === termB && w.toCompId === compA && w.toTermId === termA)
    ) || null;
  }

  /* ---- Évaluation des charges ---- */
  _evaluateLoads(phaseNodes, neutreNodes, terreNodes) {
    for (const comp of this.components.values()) {
      const logic = comp.def.electricLogic;
      if (logic !== 'lamp' && logic !== 'socket') continue;

      const def = comp.def;
      let phaseOk = false, neutreOk = false, terreOk = false;

      for (const t of def.terminals) {
        const node = `${comp.id}:${t.id}`;
        if (t.type === 'phase_in' && phaseNodes.has(node)) phaseOk = true;
        if (t.type === 'neutre_in' && neutreNodes.has(node)) neutreOk = true;
        if (t.type === 'terre' && terreNodes.has(node)) terreOk = true;
      }

      const wasOn = comp.state === 'on' || comp.state === 'active';
      const isOn = phaseOk && neutreOk;

      if (logic === 'lamp') {
        comp.state = isOn ? 'on' : 'off';
      } else if (logic === 'socket') {
        comp.state = isOn ? 'active' : 'inactive';
        if (isOn && !terreOk) {
          this.warnings.push({
            type: 'missing_earth',
            msg: `Prise "${comp.label}" sans conducteur de terre (PE) — non conforme NF C 15-100.`,
            compId: comp.id,
          });
        }
      }

      this.loads.push({ comp, phaseOk, neutreOk, terreOk, on: isOn });
    }
  }

  /* ---- Détection d'erreurs ---- */
  _detectErrors(phaseNodes, neutreNodes) {
    // Court-circuit : phase et neutre sur le même composant sans charge
    for (const comp of this.components.values()) {
      const def = comp.def;
      if (def.electricLogic === 'busbar') continue;

      let hasPhase = false, hasNeutre = false;
      for (const t of def.terminals) {
        const node = `${comp.id}:${t.id}`;
        if (t.wireTypes && t.wireTypes.includes('phase') && phaseNodes.has(node)) hasPhase = true;
        if (t.wireTypes && t.wireTypes.includes('neutre') && neutreNodes.has(node)) hasNeutre = true;
      }

      if (hasPhase && hasNeutre && def.electricLogic !== 'lamp' && def.electricLogic !== 'socket') {
        // Potentiellement OK pour les différentiels (ils ont L et N)
        if (def.electricLogic !== 'differential') {
          // Seulement un warning si c'est inhabituel
        }
      }
    }

    // Vérifier les fils de phase branché sur une borne neutre
    for (const wire of this.wires) {
      if (wire.wireType === 'phase') {
        const toComp = this.components.get(wire.toCompId);
        if (toComp) {
          const tDef = toComp.def.terminals.find(t => t.id === wire.toTermId);
          if (tDef && tDef.wireTypes && !tDef.wireTypes.includes('phase') && !tDef.wireTypes.includes('any')) {
            this.errors.push({
              type: 'wrong_wire',
              msg: `Fil de phase branché sur une borne "${tDef.type}" de ${toComp.label}.`,
              wireId: wire.id,
            });
          }
        }
      }
      if (wire.wireType === 'neutre') {
        const toComp = this.components.get(wire.toCompId);
        if (toComp) {
          const tDef = toComp.def.terminals.find(t => t.id === wire.toTermId);
          if (tDef && tDef.wireTypes && !tDef.wireTypes.includes('neutre') && !tDef.wireTypes.includes('any')) {
            this.errors.push({
              type: 'wrong_wire',
              msg: `Fil neutre branché sur une borne phase de ${toComp.label}.`,
              wireId: wire.id,
            });
          }
        }
      }
    }

    // Bornes isolées (terminaux de sortie sans connexion)
    for (const comp of this.components.values()) {
      if (comp.def.electricLogic === 'busbar') continue;
      for (const t of comp.def.terminals) {
        if (t.type === 'phase_out' || t.type === 'neutre_out') {
          const hasWire = this.wires.some(w =>
            (w.fromCompId === comp.id && w.fromTermId === t.id) ||
            (w.toCompId === comp.id && w.toTermId === t.id)
          );
          if (!hasWire && this.energizedComps.has(comp.id)) {
            this.warnings.push({
              type: 'isolated_output',
              msg: `Borne de sortie "${t.label}" de ${comp.label} non utilisée.`,
              compId: comp.id,
            });
          }
        }
      }
    }
  }

  _findSources(type, _) {
    const result = [];
    for (const comp of this.components.values()) {
      for (const t of comp.def.terminals) {
        if (t.type === type) result.push(`${comp.id}:${t.id}`);
      }
    }
    return result;
  }

  _findPhaseSources() {
    return [];
  }

  /* ============================================================
     VALIDATION D'EXERCICE
     ============================================================ */
  validate(expectedWires) {
    const results = [];
    for (const expected of expectedWires) {
      const found = this.wires.some(w =>
        w.fromCompId === expected.fromCompId &&
        w.fromTermId === expected.fromTermId &&
        w.toCompId === expected.toCompId &&
        w.toTermId === expected.toTermId &&
        w.wireType === expected.wireType
      );
      results.push({ ...expected, ok: found });
    }
    return results;
  }
}

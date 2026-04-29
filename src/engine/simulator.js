/**
 * src/engine/simulator.js
 * Moteur de simulation électrique - Logique pure, testable
 * Utilise le Graph pour propager l'alimentation
 */

'use strict';

const Graph = require('./graph');
const { COMPONENT_DEFINITIONS } = require('./types');

class SimulationEngine {
  /**
   * @param {Map<string, ComponentData>} components - Map id → {id, typeId, state}
   * @param {Array<WireData>} wires - Array de {id, fromCompId, fromTermId, toCompId, toTermId, type}
   * @param {Object} options - {hasPhaseSource: bool, hasNeutreSource: bool, hasTerrSource: bool}
   */
  constructor(components, wires, options = {}) {
    this.components = components;
    this.wires = wires;
    this.options = {
      hasPhaseSource: options.hasPhaseSource !== false,
      hasNeutreSource: options.hasNeutreSource !== false,
      hasTerreSource: options.hasTerreSource !== false,
    };

    this.result = {
      energizedNodes: new Set(),
      energizedComps: new Set(),
      energizedWires: new Set(),
      loads: [],
      errors: [],
      warnings: [],
    };
  }

  /**
   * Lancer la simulation
   * @returns {SimulationResult}
   */
  simulate() {
    // Réinitialiser
    this.result = {
      energizedNodes: new Set(),
      energizedComps: new Set(),
      energizedWires: new Set(),
      loads: [],
      errors: [],
      warnings: [],
    };

    // Construire le graphe
    const graph = this._buildGraph();
    if (!graph) {
      this.result.errors.push({
        type: 'INVALID_GRAPH',
        message: 'Le circuit est invalide',
        severity: 'error',
      });
      return this.result;
    }

    // Initialiser les nœuds sources
    const phaseSources = this._findPhaseSource();
    const neutreSources = this._findNeutreSource();
    const terreSources = this._findTerreSource();

    // Vérifier que les sources existent
    if (phaseSources.length === 0 && this.options.hasPhaseSource) {
      this.result.errors.push({
        type: 'NO_PHASE_SOURCE',
        message: 'Aucun peigne de phase détecté',
        severity: 'error',
      });
    }

    // Propager l'alimentation
    // Filtrer les sources pour ne garder que celles qui existent dans le graphe
    const phaseNodes = new Set(phaseSources.filter(nodeId => graph.nodes.has(nodeId)));
    const neutreNodes = new Set(neutreSources.filter(nodeId => graph.nodes.has(nodeId)));
    const terreNodes = new Set(terreSources.filter(nodeId => graph.nodes.has(nodeId)));

    this._propagate(graph, phaseNodes, 'phase');
    this._propagate(graph, neutreNodes, 'neutre');
    this._propagate(graph, terreNodes, 'terre');

    // Marquer les wires énergisés
    this._markEnergizedWires(graph, phaseNodes, neutreNodes, terreNodes);

    // Évaluer les charges
    this._evaluateLoads(graph, phaseNodes, neutreNodes, terreNodes);

    // Détecter les erreurs/avertissements
    this._detectErrors(graph, phaseNodes, neutreNodes);

    return this.result;
  }

  // ============================================================
  // CONSTRUCTION DU GRAPHE
  // ============================================================

  _buildGraph() {
    const graph = new Graph();

    // Ajouter tous les nœuds (terminaux des composants)
    for (const [compId, comp] of this.components) {
      const def = COMPONENT_DEFINITIONS[comp.typeId];
      if (!def) {
        this.result.warnings.push({
          type: 'UNKNOWN_COMPONENT',
          message: `Type de composant inconnu: ${comp.typeId}`,
          severity: 'warning',
        });
        continue;
      }

      for (const term of def.terminals) {
        const nodeId = `${compId}:${term.id}`;
        graph.addNode(nodeId, term.type);
      }
    }

    // Ajouter tous les fils (arêtes)
    for (const wire of this.wires) {
      const fromNodeId = `${wire.fromCompId}:${wire.fromTermId}`;
      const toNodeId = `${wire.toCompId}:${wire.toTermId}`;

      if (!graph.addEdge(wire.id, fromNodeId, toNodeId, wire.type)) {
        this.result.warnings.push({
          type: 'INVALID_WIRE',
          message: `Fil invalide: ${wire.id}`,
          severity: 'warning',
        });
      }
    }

    // Ajouter les connexions internes des composants (si fermés/ON)
    for (const [compId, comp] of this.components) {
      const def = COMPONENT_DEFINITIONS[comp.typeId];
      if (!def) continue;

      const internalEdges = this._getInternalEdges(compId, comp.typeId, comp.state);
      for (const edge of internalEdges) {
        const fromNodeId = `${compId}:${edge.from}`;
        const toNodeId = `${compId}:${edge.to}`;
        graph.addEdge(`internal-${compId}-${edge.from}-${edge.to}`, fromNodeId, toNodeId, edge.type);
      }
    }

    return graph;
  }

  /**
   * Déterminer les connexions internes d'un composant selon son état
   */
  _getInternalEdges(compId, typeId, state) {
    const edges = [];

    switch (typeId) {
      case 'disjoncteur16':
      case 'disjoncteur20':
      case 'disjoncteur32':
        if (state === 'closed') {
          edges.push({ from: 't_in', to: 't_out', type: 'phase' });
        }
        break;

      case 'differentiel':
        if (state === 'closed') {
          edges.push(
            { from: 'ph_in', to: 'ph_out', type: 'phase' },
            { from: 'n_in', to: 'n_out', type: 'neutre' }
          );
        }
        break;

      case 'telerupteur':
        if (state === 'closed') {
          edges.push({ from: '11', to: '14', type: 'phase' });
        }
        break;

      case 'bouton':
        if (state === 'pressed') {
          edges.push({ from: 'in', to: 'out', type: 'signal' });
        }
        break;

      case 'bornier_neutre':
      case 'bornier_terre':
        // Tous les terminaux interconnectés
        const def = COMPONENT_DEFINITIONS[typeId];
        if (def) {
          const termIds = def.terminals.map(t => t.id);
          for (let i = 0; i < termIds.length; i++) {
            for (let j = i + 1; j < termIds.length; j++) {
              edges.push({
                from: termIds[i],
                to: termIds[j],
                type: typeId === 'bornier_neutre' ? 'neutre' : 'terre',
              });
            }
          }
        }
        break;

      case 'lampe':
      case 'prise':
      case 'bouton':
        // Aucune connexion interne (ce sont des charges ou des contrôles)
        break;
    }

    return edges;
  }

  // ============================================================
  // SOURCES D'ALIMENTATION
  // ============================================================

  _findPhaseSource() {
    // Le peigne de phase alimente tous les phase_in des disjoncteurs
    const phaseIn = [];
    for (const [compId, comp] of this.components) {
      const def = COMPONENT_DEFINITIONS[comp.typeId];
      if (!def) continue;

      for (const term of def.terminals) {
        if (term.type === 'phase_in') {
          phaseIn.push(`${compId}:${term.id}`);
        }
      }
    }
    return phaseIn;
  }

  _findNeutreSource() {
    // Les borniers neutre sont des sources
    const neutreOut = [];
    for (const [compId, comp] of this.components) {
      if (comp.typeId === 'bornier_neutre') {
        const def = COMPONENT_DEFINITIONS['bornier_neutre'];
        // Tous les terminaux neutre du bornier
        for (const term of def.terminals) {
          if (term.type === 'neutre_source' || term.type === 'neutre_out') {
            neutreOut.push(`${compId}:${term.id}`);
          }
        }
      }
    }
    return neutreOut;
  }

  _findTerreSource() {
    // Les borniers terre sont des sources
    const terreOut = [];
    for (const [compId, comp] of this.components) {
      if (comp.typeId === 'bornier_terre') {
        const def = COMPONENT_DEFINITIONS['bornier_terre'];
        // Tous les terminaux terre du bornier
        for (const term of def.terminals) {
          if (term.type === 'terre_source' || term.type === 'terre') {
            terreOut.push(`${compId}:${term.id}`);
          }
        }
      }
    }
    return terreOut;
  }

  // ============================================================
  // PROPAGATION
  // ============================================================

  _propagate(graph, sourceNodes, wireType) {
    const shouldTraverse = (currentNodeId, targetNodeId, wireEdgeType) => {
      // Ne tracer que si le type de fil correspond
      if (wireEdgeType !== wireType) return false;

      // TODO: Vérifier les compatibilités de terminaux
      return true;
    };

    const energized = graph.bfs(sourceNodes, shouldTraverse);

    // IMPORTANT: Mettre à jour l'ensemble source avec tous les nœuds énergisés
    for (const nodeId of energized) {
      sourceNodes.add(nodeId);
      this.result.energizedNodes.add(nodeId);
      const [compId] = nodeId.split(':');
      this.result.energizedComps.add(compId);
    }
  }

  /**
   * Marquer les wires énergisés
   */
  _markEnergizedWires(graph, phaseNodes, neutreNodes, terreNodes) {
    for (const wire of this.wires) {
      const fromNodeId = `${wire.fromCompId}:${wire.fromTermId}`;
      const toNodeId = `${wire.toCompId}:${wire.toTermId}`;

      let energized = false;
      if (wire.type === 'phase' && phaseNodes.has(fromNodeId) && phaseNodes.has(toNodeId)) {
        energized = true;
      } else if (wire.type === 'neutre' && neutreNodes.has(fromNodeId) && neutreNodes.has(toNodeId)) {
        energized = true;
      } else if (wire.type === 'terre' && terreNodes.has(fromNodeId) && terreNodes.has(toNodeId)) {
        energized = true;
      }

      if (energized) {
        this.result.energizedWires.add(wire.id);
      }
    }
  }

  // ============================================================
  // ÉVALUATION DES CHARGES
  // ============================================================

  _evaluateLoads(graph, phaseNodes, neutreNodes, terreNodes) {
    for (const [compId, comp] of this.components) {
      const def = COMPONENT_DEFINITIONS[comp.typeId];
      if (!def || def.category !== 'load') continue;

      const load = {
        componentId: compId,
        type: comp.typeId,
        phaseEnergized: false,
        neutreEnergized: false,
        terreEnergized: false,
        powered: false,
      };

      // Vérifier si phase ET neutre sont présents
      for (const term of def.terminals) {
        const nodeId = `${compId}:${term.id}`;

        if (term.type === 'phase_in' && phaseNodes.has(nodeId)) {
          load.phaseEnergized = true;
        }
        if (term.type === 'neutre_in' && neutreNodes.has(nodeId)) {
          load.neutreEnergized = true;
        }
        if (term.type === 'terre' && terreNodes.has(nodeId)) {
          load.terreEnergized = true;
        }
      }

      // Une charge est alimentée si elle a phase ET neutre
      load.powered = load.phaseEnergized && load.neutreEnergized;
      this.result.loads.push(load);
    }
  }

  // ============================================================
  // DÉTECTION D'ERREURS
  // ============================================================

  _detectErrors(graph, phaseNodes, neutreNodes) {
    // TODO: Implémenter détection d'erreurs
    // - Court-circuit (phase directement au neutre)
    // - Surcharge (trop de charges sur un circuit)
    // - Absence de terre sur prises
    // - etc.
  }
}

module.exports = SimulationEngine;

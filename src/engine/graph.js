/**
 * src/engine/graph.js
 * Gestion de la structure de graphe (nodes/edges) - Logique pure, testable
 * Format: nodes = composants, edges = fils
 */

class Graph {
  constructor() {
    // Map<nodeId, Set<edgeId>>
    this.adjacencyList = new Map();
    
    // Map<nodeId, GraphNode>
    this.nodes = new Map();
    
    // Map<edgeId, GraphEdge>
    this.edges = new Map();
  }

  /**
   * Ajouter un nœud (terminal d'un composant)
   * @param {string} nodeId - Format: 'componentId:terminalId'
   * @param {string} terminalType - 'phase_in', 'phase_out', 'neutre_in', etc.
   */
  addNode(nodeId, terminalType) {
    if (!this.nodes.has(nodeId)) {
      this.nodes.set(nodeId, {
        id: nodeId,
        type: terminalType,
      });
      this.adjacencyList.set(nodeId, new Set());
    }
  }

  /**
   * Ajouter une arête (fil électrique)
   * @param {string} edgeId
   * @param {string} fromNodeId - 'componentId:terminalId'
   * @param {string} toNodeId - 'componentId:terminalId'
   * @param {string} wireType - 'phase', 'neutre', 'terre', 'signal'
   */
  addEdge(edgeId, fromNodeId, toNodeId, wireType) {
    if (!this.nodes.has(fromNodeId) || !this.nodes.has(toNodeId)) {
      console.warn(`addEdge: un des nœuds n'existe pas (${fromNodeId} → ${toNodeId})`);
      return false;
    }

    if (!this.edges.has(edgeId)) {
      this.edges.set(edgeId, {
        id: edgeId,
        from: fromNodeId,
        to: toNodeId,
        type: wireType,
      });

      // Ajouter l'arête aux deux listes d'adjacence (bidirectionnel)
      this.adjacencyList.get(fromNodeId).add(edgeId);
      this.adjacencyList.get(toNodeId).add(edgeId);
    }
    return true;
  }

  /**
   * Supprimer un nœud et toutes ses arêtes
   */
  removeNode(nodeId) {
    const edges = this.adjacencyList.get(nodeId);
    if (!edges) return;

    // Supprimer toutes les arêtes connectées
    for (const edgeId of edges) {
      this.edges.delete(edgeId);
    }

    this.nodes.delete(nodeId);
    this.adjacencyList.delete(nodeId);

    // Nettoyer les références dans les autres nœuds
    for (const otherEdges of this.adjacencyList.values()) {
      for (const edgeId of edges) {
        otherEdges.delete(edgeId);
      }
    }
  }

  /**
   * Supprimer une arête
   */
  removeEdge(edgeId) {
    const edge = this.edges.get(edgeId);
    if (!edge) return;

    this.adjacencyList.get(edge.from).delete(edgeId);
    this.adjacencyList.get(edge.to).delete(edgeId);
    this.edges.delete(edgeId);
  }

  /**
   * Obtenir tous les nœuds voisins (via arêtes)
   * @returns {Array<{edgeId, targetNodeId, wireType}>}
   */
  getNeighbors(nodeId) {
    const edgeIds = this.adjacencyList.get(nodeId);
    if (!edgeIds) return [];

    const neighbors = [];
    for (const edgeId of edgeIds) {
      const edge = this.edges.get(edgeId);
      if (!edge) continue;

      const targetNodeId = edge.from === nodeId ? edge.to : edge.from;
      neighbors.push({
        edgeId,
        targetNodeId,
        wireType: edge.type,
      });
    }
    return neighbors;
  }

  /**
   * Parcours BFS depuis un ensemble de nœuds sources
   * @param {Set<string>} sourceNodeIds
   * @param {Function} shouldTraverse - (currentNodeId, targetNodeId, wireType, componentLogic) => boolean
   * @returns {Set<string>} Tous les nœuds atteints
   */
  bfs(sourceNodeIds, shouldTraverse, componentLogic = null) {
    const visited = new Set();
    const queue = Array.from(sourceNodeIds);

    // Initialiser la queue avec les sources
    for (const nodeId of sourceNodeIds) {
      if (this.nodes.has(nodeId)) {
        visited.add(nodeId);
      }
    }

    while (queue.length > 0) {
      const currentNodeId = queue.shift();
      const neighbors = this.getNeighbors(currentNodeId);

      for (const { targetNodeId, wireType } of neighbors) {
        if (visited.has(targetNodeId)) continue;

        // Vérifier si on doit traverser cette arête
        const shouldContinue = shouldTraverse 
          ? shouldTraverse(currentNodeId, targetNodeId, wireType, componentLogic)
          : true;

        if (!shouldContinue) continue;

        visited.add(targetNodeId);
        queue.push(targetNodeId);
      }
    }

    return visited;
  }

  /**
   * DFS avec callback pour exploration personnalisée
   */
  dfs(startNodeId, callback, visited = new Set()) {
    if (visited.has(startNodeId)) return;
    visited.add(startNodeId);

    const node = this.nodes.get(startNodeId);
    if (node) callback(node, visited);

    const neighbors = this.getNeighbors(startNodeId);
    for (const { targetNodeId } of neighbors) {
      this.dfs(targetNodeId, callback, visited);
    }
  }

  /**
   * Déterminer le type de connexion entre deux nœuds
   */
  getEdgesBetween(nodeId1, nodeId2) {
    const edges1 = this.adjacencyList.get(nodeId1) || new Set();
    const result = [];

    for (const edgeId of edges1) {
      const edge = this.edges.get(edgeId);
      if ((edge.from === nodeId1 && edge.to === nodeId2) ||
          (edge.from === nodeId2 && edge.to === nodeId1)) {
        result.push(edge);
      }
    }
    return result;
  }

  /**
   * Exporter le graphe en format JSON (pour sérialisation)
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  /**
   * Importer depuis JSON
   */
  static fromJSON(data) {
    const graph = new Graph();
    
    for (const node of data.nodes) {
      graph.addNode(node.id, node.type);
    }
    
    for (const edge of data.edges) {
      graph.addEdge(edge.id, edge.from, edge.to, edge.type);
    }
    
    return graph;
  }
}

export default Graph;

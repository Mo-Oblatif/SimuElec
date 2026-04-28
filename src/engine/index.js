/**
 * src/engine/index.js
 * Export public du moteur de simulation
 */

const Graph = require('./graph');
const SimulationEngine = require('./simulator');
const { COMPONENT_DEFINITIONS, WIRE_COLORS, WIRE_COLORS_GLOW } = require('./types');

module.exports = {
  Graph,
  SimulationEngine,
  COMPONENT_DEFINITIONS,
  WIRE_COLORS,
  WIRE_COLORS_GLOW,
};

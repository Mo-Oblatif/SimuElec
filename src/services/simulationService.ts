/**
 * src/services/simulationService.ts
 * Service qui connecte le moteur de simulation avec Zustand
 */

// @ts-ignore - Importing JS modules
import SimulationEngine from '../engine/simulator'
import type { Component, Wire, SimulationResult } from '../store/types'

export const runSimulationService = (
  components: Map<string, Component>,
  wires: Wire[]
): SimulationResult => {
  try {
    const engine = new SimulationEngine(components, wires)
    const result = engine.simulate()

    return {
      energizedNodes: result.energizedNodes,
      energizedComps: result.energizedComps,
      energizedWires: result.energizedWires,
      loads: result.loads,
      errors: result.errors,
      warnings: result.warnings,
    }
  } catch (error) {
    console.error('Simulation error:', error)
    return {
      energizedNodes: new Set(),
      energizedComps: new Set(),
      energizedWires: new Set(),
      loads: [],
      errors: [
        {
          type: 'SIMULATION_ERROR',
          message: `Erreur lors de la simulation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          severity: 'error',
        },
      ],
      warnings: [],
    }
  }
}

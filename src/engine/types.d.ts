export interface Terminal {
  id: string
  type: string
  side: 'top' | 'bottom' | 'left' | 'right'
}

export interface ComponentDef {
  label: string
  category: 'protection' | 'relay' | 'load' | 'busbar' | 'control' | 'junction' | 'cabinet'
  showInMode?: 'schema' | 'plan' | 'both' | 'plan-training'
  w: number
  h: number
  amperage?: number
  states: string[]
  defaultState: string
  terminals: Terminal[]
  electricLogic: string
}

export const WIRE_COLORS: Record<string, string>
export const WIRE_COLORS_GLOW: Record<string, string>
export const COMPONENT_DEFINITIONS: Record<string, ComponentDef>

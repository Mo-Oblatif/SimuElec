import type { ComponentDef } from '../engine/types'

interface Props {
  typeId: string
  def: ComponentDef
  state: string
  isEnergized?: boolean
}

const ComponentVisual = ({ typeId, def, state, isEnergized = false }: Props) => {
  const cx = def.w / 2
  const cy = def.h / 2

  switch (def.electricLogic) {

    /* ---- breaker ---- */
    case 'breaker': {
      const closed = state !== 'open' && state !== 'tripped'
      const tripped = state === 'tripped'
      const barColor = tripped ? '#ef4444' : closed ? '#22c55e' : '#6b7280'
      const bipolar = def.terminals.length > 2
      if (bipolar) {
        return (
          <>
            <rect x={def.w * 0.18} y={def.h * 0.12} width={7} height={def.h * 0.48}
              fill={barColor} rx="1.5" pointerEvents="none" />
            <rect x={def.w * 0.60} y={def.h * 0.12} width={7} height={def.h * 0.48}
              fill={barColor} rx="1.5" pointerEvents="none" />
            <circle cx={def.w * 0.26} cy={def.h * 0.08} r={3}
              fill={barColor} pointerEvents="none" />
            <circle cx={def.w * 0.72} cy={def.h * 0.08} r={3}
              fill={barColor} pointerEvents="none" />
            <rect x={def.w * 0.25} y={def.h * 0.62} width={def.w * 0.5} height={def.h * 0.1}
              fill={closed ? '#22c55e' : '#ef4444'} rx="2" pointerEvents="none" />
            <text x={cx} y={def.h * 0.84} textAnchor="middle"
              fill="#94a3b8" fontSize={def.h * 0.09} fontFamily="monospace" fontWeight="bold"
              pointerEvents="none">{(def as any).amperage}A</text>
          </>
        )
      }
      return (
        <>
          <rect x={cx - 4} y={def.h * 0.12} width={8} height={def.h * 0.62}
            fill={barColor} rx="1.5" pointerEvents="none" />
          <rect x={cx - 9} y={def.h * 0.36} width={18} height={def.h * 0.18}
            fill={closed ? '#4ade80' : '#9ca3af'} rx="2.5" pointerEvents="none" />
          <circle cx={cx} cy={def.h * 0.08} r={3.5}
            fill={barColor} pointerEvents="none" />
          <text x={cx} y={def.h * 0.93} textAnchor="middle"
            fill="#cbd5e1" fontSize={def.h * 0.1} fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">{(def as any).amperage}A</text>
        </>
      )
    }

    /* ---- differential ---- */
    case 'differential': {
      const closed = state !== 'open' && state !== 'tripped'
      const tripped = state === 'tripped'
      const barColor = tripped ? '#ef4444' : closed ? '#22c55e' : '#6b7280'
      return (
        <>
          <rect x={def.w * 0.18} y={def.h * 0.12} width={7} height={def.h * 0.48}
            fill={barColor} rx="1.5" pointerEvents="none" />
          <rect x={def.w * 0.60} y={def.h * 0.12} width={7} height={def.h * 0.48}
            fill={barColor} rx="1.5" pointerEvents="none" />
          <circle cx={def.w * 0.26} cy={def.h * 0.08} r={3}
            fill={barColor} pointerEvents="none" />
          <circle cx={def.w * 0.72} cy={def.h * 0.08} r={3}
            fill={barColor} pointerEvents="none" />
          <rect x={def.w * 0.25} y={def.h * 0.64} width={def.w * 0.5} height={def.h * 0.1}
            fill="#fbbf24" rx="2" pointerEvents="none" />
          <text x={cx} y={def.h * 0.72} textAnchor="middle"
            fill="#1e293b" fontSize={def.h * 0.07} fontFamily="sans-serif" fontWeight="bold"
            pointerEvents="none">TEST</text>
          <text x={cx} y={def.h * 0.84} textAnchor="middle"
            fill="#94a3b8" fontSize={def.h * 0.08} fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">30mA</text>
          <text x={cx} y={def.h * 0.94} textAnchor="middle"
            fill="#cbd5e1" fontSize={def.h * 0.09} fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">{(def as any).amperage}A</text>
        </>
      )
    }

    /* ---- lamp ---- */
    case 'lamp': {
      const on = isEnergized
      const r = Math.min(def.w, def.h) * 0.34
      return (
        <>
          {on && <circle cx={cx} cy={cy} r={r * 2.3}
            fill="rgba(255,230,100,0.18)" pointerEvents="none" />}
          <circle cx={cx} cy={cy} r={r}
            fill={on ? '#fef3c7' : '#374151'}
            stroke={on ? '#fbbf24' : '#6b7280'} strokeWidth="1.5" />
          <line x1={cx - r*0.55} y1={cy - r*0.55} x2={cx + r*0.55} y2={cy + r*0.55}
            stroke={on ? '#d97706' : '#4b5563'} strokeWidth="1.5" pointerEvents="none" />
          <line x1={cx + r*0.55} y1={cy - r*0.55} x2={cx - r*0.55} y2={cy + r*0.55}
            stroke={on ? '#d97706' : '#4b5563'} strokeWidth="1.5" pointerEvents="none" />
        </>
      )
    }

    /* ---- socket ---- */
    case 'socket': {
      const active = isEnergized
      return (
        <>
          <rect x={4} y={4} width={def.w - 8} height={def.h - 8}
            fill={active ? '#1e3a5f' : '#263244'}
            stroke={active ? '#3b82f6' : '#475569'}
            strokeWidth="1.5" rx="5" />
          <ellipse cx={cx - 5} cy={cy - 4} rx={2.5} ry={3.5}
            fill={active ? '#1e40af' : '#1e293b'} />
          <ellipse cx={cx + 5} cy={cy - 4} rx={2.5} ry={3.5}
            fill={active ? '#1e40af' : '#1e293b'} />
          <rect x={cx - 2} y={cy + 3} width={4} height={6}
            fill={active ? '#22c55e' : '#4b5563'} rx="1" />
        </>
      )
    }

    /* ---- busbar ---- */
    case 'busbar': {
      const isNeutre = typeId === 'bornier_neutre'
      const color = isNeutre ? '#2980b9' : '#27ae60'
      const rightTerms = def.terminals.filter(t => t.side === 'right')
      const total = rightTerms.length
      return (
        <>
          <rect x={1} y={1} width={def.w - 2} height={def.h - 2}
            fill={color + '28'} rx="2" />
          <text x={8} y={def.h / 2 + 5} fill={color}
            fontSize={def.h * 0.2} fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">
            {isNeutre ? 'N' : 'PE'}
          </text>
          {rightTerms.map((t, i) => {
            const ty = (def.h / (total + 1)) * (i + 1)
            return (
              <rect key={t.id} x={def.w - 4} y={ty - 4} width={7} height={8}
                fill={color} rx="1" pointerEvents="none" />
            )
          })}
        </>
      )
    }

    /* ---- relay ---- */
    case 'relay': {
      const closed = state === 'closed'
      return (
        <>
          <rect x={5} y={5} width={def.w - 10} height={def.h * 0.3}
            fill="#241a10" stroke="#7a5538" strokeWidth="1" rx="2" />
          <text x={cx} y={def.h * 0.22} textAnchor="middle"
            fill="#a0845c" fontSize={def.h * 0.08} fontFamily="sans-serif"
            pointerEvents="none">Bobine</text>
          <line x1={cx} y1={def.h * 0.37} x2={cx} y2={def.h * 0.52}
            stroke={closed ? '#f59e0b' : '#4b5563'}
            strokeWidth="1.5" strokeDasharray="2,2" pointerEvents="none" />
          <rect x={cx - 7} y={def.h * 0.52} width={14} height={def.h * 0.3}
            fill={closed ? '#166534' : '#374151'} rx="2" />
          <text x={cx} y={def.h * 0.74} textAnchor="middle"
            fill={closed ? '#4ade80' : '#9ca3af'} fontSize={def.h * 0.14}
            pointerEvents="none">{closed ? '●' : '○'}</text>
        </>
      )
    }

    /* ---- pushbutton ---- */
    case 'pushbutton': {
      const pressed = state === 'pressed'
      const r = Math.min(def.w, def.h) * 0.36
      return (
        <>
          <circle cx={cx} cy={cy} r={r}
            fill={pressed ? '#1d4ed8' : '#374151'}
            stroke={pressed ? '#60a5fa' : '#6b7280'} strokeWidth="2" />
          <circle cx={cx} cy={cy} r={r * 0.35}
            fill={pressed ? '#bfdbfe' : '#9ca3af'} />
        </>
      )
    }

    /* ---- thermostat ---- */
    case 'thermostat': {
      const active = state === 'on'
      return (
        <>
          <rect x={5} y={5} width={def.w - 10} height={def.h * 0.33}
            fill="#1a2236" stroke="#3b5998" strokeWidth="1" rx="2" />
          <line x1={cx} y1={10} x2={cx} y2={def.h * 0.3}
            stroke="#94a3b8" strokeWidth="2" pointerEvents="none" />
          <circle cx={cx} cy={def.h * 0.34} r={4.5}
            fill={active ? '#ef4444' : '#64748b'} />
          <text x={cx + 7} y={def.h * 0.22}
            fill="#7090b8" fontSize={def.h * 0.09} fontFamily="monospace"
            pointerEvents="none">°C</text>
          <circle cx={cx} cy={def.h * 0.57} r={def.h * 0.13}
            fill="#1e293b" stroke={active ? '#ef4444' : '#475569'} strokeWidth="1.5" />
          {[0,60,120,180,240,300].map(a => {
            const rad = (a - 90) * Math.PI / 180
            const R = def.h * 0.13
            return <line key={a}
              x1={cx + (R - 3) * Math.cos(rad)} y1={def.h * 0.57 + (R - 3) * Math.sin(rad)}
              x2={cx + R * Math.cos(rad)} y2={def.h * 0.57 + R * Math.sin(rad)}
              stroke={active ? '#fca5a5' : '#334155'} strokeWidth="1" pointerEvents="none" />
          })}
          <line x1={cx} y1={def.h * 0.57}
            x2={cx + (def.h * 0.1) * Math.cos((active ? 120 : -30) * Math.PI / 180)}
            y2={def.h * 0.57 + (def.h * 0.1) * Math.sin((active ? 120 : -30) * Math.PI / 180)}
            stroke={active ? '#ef4444' : '#64748b'} strokeWidth="2" strokeLinecap="round"
            pointerEvents="none" />
          <rect x={cx - 5} y={def.h * 0.74} width={10} height={def.h * 0.1}
            fill={active ? '#ef4444' : '#374151'} rx="1" />
          <text x={cx} y={def.h * 0.94} textAnchor="middle"
            fill="#cbd5e1" fontSize={def.h * 0.08} fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">THERM</text>
        </>
      )
    }

    /* ---- timer ---- */
    case 'timer': {
      const active = state === 'on' || state === 'timing'
      const ry = def.h * 0.28
      const r = def.h * 0.2
      return (
        <>
          <circle cx={cx} cy={ry} r={r}
            fill="#1e293b" stroke="#7c3aed" strokeWidth="1.5" />
          {[0, 90, 180, 270].map(a => {
            const rad = (a - 90) * Math.PI / 180
            return <line key={a}
              x1={cx + (r - 4) * Math.cos(rad)} y1={ry + (r - 4) * Math.sin(rad)}
              x2={cx + r * Math.cos(rad)} y2={ry + r * Math.sin(rad)}
              stroke="#6d28d9" strokeWidth="1.5" pointerEvents="none" />
          })}
          <line x1={cx} y1={ry} x2={cx} y2={ry - r * 0.7}
            stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" pointerEvents="none" />
          <line x1={cx} y1={ry}
            x2={cx + r * 0.5 * Math.cos(30 * Math.PI / 180)}
            y2={ry + r * 0.5 * Math.sin(30 * Math.PI / 180)}
            stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" pointerEvents="none" />
          <rect x={cx - 7} y={def.h * 0.54} width={14} height={def.h * 0.28}
            fill={active ? '#312e81' : '#374151'} rx="2" />
          <text x={cx} y={def.h * 0.74} textAnchor="middle"
            fill={active ? '#a78bfa' : '#9ca3af'} fontSize={def.h * 0.14}
            pointerEvents="none">{active ? '●' : '○'}</text>
          <text x={cx} y={def.h * 0.94} textAnchor="middle"
            fill="#cbd5e1" fontSize={def.h * 0.08} fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">MIN</text>
        </>
      )
    }

    /* ---- switch (interrupteur) ---- */
    case 'switch': {
      const closed = state === 'closed'
      const lx = def.w * 0.18
      const rx2 = def.w * 0.82
      return (
        <>
          <circle cx={lx} cy={cy} r={3.5} fill="#94a3b8" />
          <circle cx={rx2} cy={cy} r={3.5}
            fill={closed ? '#22c55e' : '#94a3b8'} />
          <line
            x1={lx} y1={cy}
            x2={rx2} y2={closed ? cy : cy - def.h * 0.3}
            stroke={closed ? '#22c55e' : '#f87171'}
            strokeWidth="3" strokeLinecap="round" />
          <text x={cx} y={def.h - 4} textAnchor="middle"
            fill={closed ? '#22c55e' : '#f87171'} fontSize={def.h * 0.14} fontFamily="monospace"
            pointerEvents="none">{closed ? 'I' : 'O'}</text>
        </>
      )
    }

    /* ---- two_way (va-et-vient) ---- */
    case 'two_way': {
      const pos1 = state !== 'pos2'
      const lx = def.w * 0.16
      const offset = def.h * 0.25
      return (
        <>
          <circle cx={lx} cy={cy} r={3.5} fill="#94a3b8" />
          <circle cx={def.w * 0.84} cy={cy - offset} r={3.5} fill="#f59e0b" />
          <circle cx={def.w * 0.84} cy={cy + offset} r={3.5} fill="#f59e0b" />
          <line
            x1={lx} y1={cy}
            x2={def.w * 0.84} y2={pos1 ? cy - offset : cy + offset}
            stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
          <text x={cx} y={def.h - 3} textAnchor="middle"
            fill="#f59e0b" fontSize={def.h * 0.12} fontFamily="monospace"
            pointerEvents="none">V/V</text>
        </>
      )
    }

    /* ---- double_switch ---- */
    case 'double_switch': {
      const st1 = state === 'first_closed' || state === 'both_closed'
      const st2 = state === 'second_closed' || state === 'both_closed'
      const h2 = def.h / 2 - 3
      return (
        <>
          <rect x={3} y={3} width={def.w - 6} height={h2}
            fill={st1 ? '#166534' : '#1e293b'}
            stroke={st1 ? '#22c55e' : '#475569'} strokeWidth="1.5" rx="3" />
          <circle cx={cx} cy={3 + h2 / 2} r={h2 * 0.22}
            fill={st1 ? '#22c55e' : '#6b7280'} pointerEvents="none" />
          <rect x={3} y={def.h / 2 + 1} width={def.w - 6} height={h2}
            fill={st2 ? '#166534' : '#1e293b'}
            stroke={st2 ? '#22c55e' : '#475569'} strokeWidth="1.5" rx="3" />
          <circle cx={cx} cy={def.h / 2 + 1 + h2 / 2} r={h2 * 0.22}
            fill={st2 ? '#22c55e' : '#6b7280'} pointerEvents="none" />
        </>
      )
    }

    /* ---- blind (volet roulant) ---- */
    case 'blind': {
      const isUp = state === 'up'
      const isDown = state === 'down'
      const barCount = 4
      const frameTop = 6, frameH = def.h * 0.55
      const slotH = (frameH - 4) / barCount
      return (
        <>
          {/* Window frame */}
          <rect x={6} y={frameTop} width={def.w - 12} height={frameH}
            fill="#162032" stroke="#3b82f6" strokeWidth="1.5" rx="3" />
          {/* Slats */}
          {Array.from({ length: barCount }).map((_, i) => (
            <rect key={i}
              x={8} y={frameTop + 2 + i * slotH}
              width={def.w - 16} height={slotH - 2}
              fill={isUp || isDown ? '#60a5fa' : '#334155'}
              rx="1" pointerEvents="none" />
          ))}
          {/* Buttons row */}
          <rect x={6} y={def.h * 0.65} width={(def.w - 14) / 2} height={def.h * 0.26}
            fill={isUp ? '#166534' : '#1e293b'}
            stroke={isUp ? '#22c55e' : '#475569'} strokeWidth="1" rx="2" />
          <text
            x={6 + (def.w - 14) / 4} y={def.h * 0.65 + def.h * 0.16}
            textAnchor="middle" fill={isUp ? '#22c55e' : '#6b7280'}
            fontSize={def.h * 0.14} pointerEvents="none">▲</text>
          <rect x={def.w / 2 + 1} y={def.h * 0.65} width={(def.w - 14) / 2} height={def.h * 0.26}
            fill={isDown ? '#166534' : '#1e293b'}
            stroke={isDown ? '#22c55e' : '#475569'} strokeWidth="1" rx="2" />
          <text
            x={def.w / 2 + 1 + (def.w - 14) / 4} y={def.h * 0.65 + def.h * 0.16}
            textAnchor="middle" fill={isDown ? '#22c55e' : '#6b7280'}
            fontSize={def.h * 0.14} pointerEvents="none">▼</text>
        </>
      )
    }

    /* ---- ceiling_light ---- */
    case 'ceiling_light': {
      const on = isEnergized
      const r = Math.min(def.w, def.h) * 0.36
      return (
        <>
          {on && <circle cx={cx} cy={cy} r={r * 2.2}
            fill="rgba(255,240,100,0.2)" pointerEvents="none" />}
          <circle cx={cx} cy={cy} r={r}
            fill={on ? '#fffde7' : '#1e3a5f'}
            stroke={on ? '#fbbf24' : '#3b82f6'} strokeWidth="1.5" />
          {[0, 45, 90, 135].map(a => {
            const rad = a * Math.PI / 180
            return <line key={a}
              x1={cx - r * 0.82 * Math.cos(rad)} y1={cy - r * 0.82 * Math.sin(rad)}
              x2={cx + r * 0.82 * Math.cos(rad)} y2={cy + r * 0.82 * Math.sin(rad)}
              stroke={on ? '#d97706' : '#3b82f6'} strokeWidth="1.5"
              pointerEvents="none" />
          })}
        </>
      )
    }

    /* ---- wall_light ---- */
    case 'wall_light': {
      const on = isEnergized
      const r = Math.min(def.w, def.h) * 0.33
      const wallY = def.h - 6
      return (
        <>
          {on && <circle cx={cx} cy={wallY - r * 0.5} r={r * 2}
            fill="rgba(255,240,100,0.15)" pointerEvents="none" />}
          <line x1={cx - r - 4} y1={wallY} x2={cx + r + 4} y2={wallY}
            stroke={on ? '#fbbf24' : '#3b82f6'} strokeWidth="3"
            strokeLinecap="round" pointerEvents="none" />
          <path
            d={`M ${cx - r} ${wallY} A ${r} ${r} 0 0 1 ${cx + r} ${wallY}`}
            fill={on ? '#fffde7' : '#1e3a5f'}
            stroke={on ? '#fbbf24' : '#3b82f6'} strokeWidth="1.5" />
          <line x1={cx} y1={wallY - r} x2={cx} y2={wallY}
            stroke={on ? '#d97706' : '#3b82f6'} strokeWidth="1.5" pointerEvents="none" />
          <line x1={cx - r * 0.65} y1={wallY - r * 0.5}
            x2={cx + r * 0.65} y2={wallY - r * 0.5}
            stroke={on ? '#d97706' : '#3b82f6'} strokeWidth="1.5" pointerEvents="none" />
        </>
      )
    }

    /* ---- junction_box ---- */
    case 'junction_box': {
      return (
        <>
          <rect x={4} y={4} width={def.w - 8} height={def.h - 8}
            fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5" rx="6" />
          <line x1={10} y1={10} x2={def.w - 10} y2={def.h - 10}
            stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" pointerEvents="none" />
          <line x1={def.w - 10} y1={10} x2={10} y2={def.h - 10}
            stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" pointerEvents="none" />
          <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />
        </>
      )
    }

    /* ---- wago ---- */
    case 'wago': {
      const leftTerms = def.terminals.filter(t => t.side === 'left')
      const rightTerms = def.terminals.filter(t => t.side === 'right')
      return (
        <>
          <rect x={2} y={2} width={def.w - 4} height={def.h - 4}
            fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" rx="2" />
          {leftTerms.map((_, i) => {
            const ty = (def.h / (leftTerms.length + 1)) * (i + 1)
            return <rect key={i} x={4} y={ty - 5} width={8} height={9}
              fill="#f59e0b" rx="1" pointerEvents="none" />
          })}
          {rightTerms.map((_, i) => {
            const ty = (def.h / (rightTerms.length + 1)) * (i + 1)
            return <rect key={i} x={def.w - 12} y={ty - 5} width={8} height={9}
              fill="#f59e0b" rx="1" pointerEvents="none" />
          })}
          <text x={cx} y={cy + 3} textAnchor="middle"
            fill="#fcd34d" fontSize={def.h * 0.14} fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">WAGO</text>
        </>
      )
    }

    /* ---- heater (chauffage électrique) ---- */
    case 'heater': {
      const on = isEnergized
      const finCount = 5
      const finW = (def.w - 16) / finCount
      return (
        <>
          <rect x={4} y={4} width={def.w - 8} height={def.h - 8}
            fill={on ? '#431407' : '#1e293b'}
            stroke={on ? '#f97316' : '#475569'} strokeWidth="1.5" rx="4" />
          {Array.from({ length: finCount }).map((_, i) => (
            <rect key={i}
              x={8 + i * finW} y={8}
              width={finW - 3} height={def.h * 0.55}
              fill={on ? '#c2410c' : '#334155'} rx="1" />
          ))}
          <text x={cx} y={def.h - 7} textAnchor="middle"
            fill={on ? '#fb923c' : '#64748b'} fontSize={def.h * 0.12} fontFamily="monospace"
            pointerEvents="none">{on ? '~~~' : 'CHAUF'}</text>
        </>
      )
    }

    /* ---- dishwasher (lave-vaisselle) ---- */
    case 'dishwasher': {
      const on = isEnergized
      return (
        <>
          <rect x={4} y={4} width={def.w - 8} height={def.h - 8}
            fill={on ? '#0c2a4a' : '#1e293b'}
            stroke={on ? '#3b82f6' : '#475569'} strokeWidth="1.5" rx="4" />
          {/* Door handle */}
          <rect x={cx - 12} y={def.h * 0.15} width={24} height={4}
            fill={on ? '#60a5fa' : '#4b5563'} rx="2" />
          {/* Spray arm */}
          <line x1={8} y1={cy} x2={def.w - 8} y2={cy}
            stroke={on ? '#60a5fa' : '#334155'} strokeWidth="2" />
          <circle cx={cx} cy={cy} r={4}
            fill={on ? '#3b82f6' : '#1e293b'}
            stroke={on ? '#93c5fd' : '#4b5563'} strokeWidth="1.5" />
          {[45, 135, 225, 315].map(a => {
            const rad = a * Math.PI / 180
            return <line key={a}
              x1={cx + 8 * Math.cos(rad)} y1={cy + 8 * Math.sin(rad)}
              x2={cx + 14 * Math.cos(rad)} y2={cy + 14 * Math.sin(rad)}
              stroke={on ? '#93c5fd' : '#334155'} strokeWidth="1.5" />
          })}
          <text x={cx} y={def.h - 6} textAnchor="middle"
            fill={on ? '#93c5fd' : '#64748b'} fontSize={def.h * 0.1} fontFamily="monospace"
            pointerEvents="none">LV</text>
        </>
      )
    }

    /* ---- hob (plaque de cuisson) ---- */
    case 'hob': {
      const on = isEnergized
      const burners = [
        { x: def.w * 0.28, y: def.h * 0.30, r: def.w * 0.16 },
        { x: def.w * 0.72, y: def.h * 0.30, r: def.w * 0.13 },
        { x: def.w * 0.28, y: def.h * 0.72, r: def.w * 0.13 },
        { x: def.w * 0.72, y: def.h * 0.72, r: def.w * 0.16 },
      ]
      return (
        <>
          <rect x={3} y={3} width={def.w - 6} height={def.h - 6}
            fill={on ? '#1a0a00' : '#0f172a'}
            stroke={on ? '#dc2626' : '#475569'} strokeWidth="1.5" rx="5" />
          {burners.map((b, i) => (
            <g key={i}>
              <circle cx={b.x} cy={b.y} r={b.r}
                fill="none"
                stroke={on ? '#ef4444' : '#334155'} strokeWidth="2.5" />
              <circle cx={b.x} cy={b.y} r={b.r * 0.45}
                fill={on ? '#dc2626' : '#1e293b'} />
            </g>
          ))}
        </>
      )
    }

    /* ---- agcp (coupure générale biphasée) ---- */
    case 'agcp': {
      const closed = state !== 'open' && state !== 'tripped'
      const tripped = state === 'tripped'
      const barColor = tripped ? '#ef4444' : closed ? '#22c55e' : '#6b7280'
      return (
        <>
          {/* Two poles */}
          <rect x={def.w * 0.18} y={def.h * 0.10} width={7} height={def.h * 0.44}
            fill={barColor} rx="1.5" pointerEvents="none" />
          <rect x={def.w * 0.60} y={def.h * 0.10} width={7} height={def.h * 0.44}
            fill={barColor} rx="1.5" pointerEvents="none" />
          <circle cx={def.w * 0.26} cy={def.h * 0.07} r={3}
            fill={barColor} pointerEvents="none" />
          <circle cx={def.w * 0.72} cy={def.h * 0.07} r={3}
            fill={barColor} pointerEvents="none" />
          {/* Handle */}
          <rect x={def.w * 0.22} y={def.h * 0.56} width={def.w * 0.56} height={def.h * 0.12}
            fill={closed ? '#22c55e' : '#ef4444'} rx="2" pointerEvents="none" />
          {/* Label */}
          <text x={cx} y={def.h * 0.76} textAnchor="middle"
            fill="#fbbf24" fontSize={def.h * 0.08} fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">AGCP</text>
          <text x={cx} y={def.h * 0.87} textAnchor="middle"
            fill="#94a3b8" fontSize={def.h * 0.075} fontFamily="monospace"
            pointerEvents="none">{(def as any).amperage}A</text>
          <text x={cx} y={def.h * 0.96} textAnchor="middle"
            fill="#64748b" fontSize={def.h * 0.065} fontFamily="monospace"
            pointerEvents="none">EDF</text>
        </>
      )
    }

    /* ---- simple_button (interrupteur bascule) ---- */
    case 'simple_button': {
      const closed = state === 'closed'
      return (
        <>
          <rect x={4} y={4} width={def.w - 8} height={def.h - 8}
            fill={closed ? '#166534' : '#1e293b'}
            stroke={closed ? '#22c55e' : '#475569'}
            strokeWidth="1.5" rx="4" />
          {/* Rocker */}
          <rect
            x={def.w * 0.25} y={closed ? def.h * 0.52 : def.h * 0.16}
            width={def.w * 0.5} height={def.h * 0.32}
            fill={closed ? '#22c55e' : '#6b7280'} rx="3" />
          <text x={cx} y={def.h - 5} textAnchor="middle"
            fill={closed ? '#22c55e' : '#9ca3af'} fontSize={def.h * 0.18} fontFamily="monospace"
            pointerEvents="none">{closed ? 'I' : 'O'}</text>
        </>
      )
    }

    /* ---- cabinet (armoire / tableau électrique) ---- */
    case 'cabinet': {
      const railY1 = def.h * 0.20
      const railY2 = def.h * 0.50
      const railY3 = def.h * 0.80
      return (
        <>
          {/* Outer enclosure */}
          <rect x={2} y={2} width={def.w - 4} height={def.h - 4}
            fill="#0f172a" stroke="#334155" strokeWidth="3" rx="6" />
          {/* Inner door area */}
          <rect x={10} y={10} width={def.w - 20} height={def.h - 20}
            fill="#111827" stroke="#1e3a5f" strokeWidth="1.5" rx="4" />
          {/* DIN rails */}
          {[railY1, railY2, railY3].map((ry, i) => (
            <g key={i}>
              <rect x={18} y={ry - 4} width={def.w - 36} height={8}
                fill="#1e293b" stroke="#475569" strokeWidth="1" rx="1" />
              <rect x={18} y={ry - 2} width={def.w - 36} height={4}
                fill="#334155" rx="0.5" />
            </g>
          ))}
          {/* Label plate */}
          <rect x={def.w * 0.25} y={def.h * 0.03} width={def.w * 0.5} height={def.h * 0.07}
            fill="#1e293b" stroke="#475569" strokeWidth="1" rx="2" />
          <text x={cx} y={def.h * 0.075} textAnchor="middle"
            fill="#94a3b8" fontSize={def.h * 0.045} fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">TABLEAU</text>
        </>
      )
    }

    /* ---- conduit (gaine technique) ---- */
    case 'conduit': {
      const section = (def as any).section as string | undefined
      const is5G    = section?.startsWith('5G') ?? false
      const tubeY   = def.h * 0.15
      const tubeH   = def.h * 0.7
      const stripes = is5G ? [
        { color: '#ef4444' }, // L1 phase
        { color: '#475569' }, // L2 noir
        { color: '#9ca3af' }, // L3 gris
        { color: '#3b82f6' }, // neutre
        { color: '#22c55e' }, // terre
      ] : [
        { color: '#ef4444' }, // phase
        { color: '#3b82f6' }, // neutre
        { color: '#22c55e' }, // terre
      ]
      const stripeH  = tubeH / (stripes.length + 2)
      const stripeGap = (tubeH - stripes.length * stripeH) / (stripes.length + 1)
      return (
        <>
          {/* Ombre extérieure */}
          <rect x={0} y={tubeY + 2} width={def.w} height={tubeH}
            fill="#1e293b" rx="4" />
          {/* Corps principal */}
          <rect x={0} y={tubeY} width={def.w} height={tubeH}
            fill="#4b5563" stroke="#6b7280" strokeWidth="1" rx="4" />
          {/* Reflet haut */}
          <rect x={2} y={tubeY + 2} width={def.w - 4} height={tubeH * 0.25}
            fill="#9ca3af" rx="2" opacity="0.35" />
          {/* Conducteurs visibles à gauche */}
          {stripes.map((s, i) => (
            <rect key={`l${i}`}
              x={3} y={tubeY + stripeGap + i * (stripeH + stripeGap)}
              width={10} height={stripeH}
              fill={s.color} rx="1.5" opacity="0.9" />
          ))}
          {/* Conducteurs visibles à droite */}
          {stripes.map((s, i) => (
            <rect key={`r${i}`}
              x={def.w - 13} y={tubeY + stripeGap + i * (stripeH + stripeGap)}
              width={10} height={stripeH}
              fill={s.color} rx="1.5" opacity="0.9" />
          ))}
          {/* Section label au centre */}
          {section && (
            <text x={def.w / 2} y={def.h / 2 + 3}
              textAnchor="middle"
              fill="#e2e8f0" fontSize={Math.min(def.h * 0.38, 10)}
              fontFamily="monospace" fontWeight="bold"
              pointerEvents="none">
              {section}
            </text>
          )}
        </>
      )
    }

    /* ---- panel_plan (tableau électrique — vue plan) ---- */
    case 'panel_plan': {
      const nRows = 3
      const rowArea = def.h - 28
      const rowH    = rowArea / nRows - 3
      const cols    = 4
      const colW    = (def.w - 20) / cols
      return (
        <>
          {/* Boîtier extérieur */}
          <rect x={2} y={2} width={def.w - 4} height={def.h - 4}
            fill="#0c1a2e" stroke="#334155" strokeWidth="2.5" rx="5" />
          {/* Porte intérieure */}
          <rect x={6} y={14} width={def.w - 12} height={def.h - 22}
            fill="#111827" stroke="#1e3a5f" strokeWidth="1" rx="3" />
          {/* Rangées de disjoncteurs */}
          {Array.from({ length: nRows }).map((_, ri) => {
            const rowY = 17 + ri * (rowH + 3)
            return (
              <g key={ri}>
                {/* Rail DIN */}
                <rect x={8} y={rowY + rowH * 0.48} width={def.w - 16} height={3}
                  fill="#334155" rx="0.5" />
                {/* Disjoncteurs miniatures */}
                {Array.from({ length: cols }).map((_, ci) => (
                  <g key={ci}>
                    <rect
                      x={9 + ci * colW} y={rowY}
                      width={colW - 2} height={rowH}
                      fill="#1e293b" stroke="#475569" strokeWidth="0.5" rx="1.5"
                    />
                    <rect
                      x={10 + ci * colW} y={rowY + rowH * 0.55}
                      width={colW - 4} height={rowH * 0.28}
                      fill="#22c55e" opacity="0.7" rx="1"
                    />
                  </g>
                ))}
              </g>
            )
          })}
          {/* Étiquette */}
          <rect x={8} y={3} width={def.w - 16} height={10}
            fill="#1e293b" stroke="#334155" strokeWidth="0.5" rx="1.5" />
          <text x={cx} y={10} textAnchor="middle"
            fill="#94a3b8" fontSize="6.5" fontFamily="monospace" fontWeight="bold"
            pointerEvents="none">TABLEAU</text>
        </>
      )
    }

    default:
      return null
  }
}

export default ComponentVisual

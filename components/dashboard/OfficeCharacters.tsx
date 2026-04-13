'use client'

/**
 * Simplified animated SVG characters for each Hogwarts agent.
 * Cartoon faces with blink, look-side, and mouth-talk CSS animations.
 * Avatar prop retained for interface compatibility but faces are now drawn.
 */

import type { ReactNode } from 'react'

interface CharProps {
  avatar: string      // kept for interface compat — faces are drawn, not photos
  isWalking: boolean
  status: 'online' | 'working' | 'in-meeting' | 'away'
}

function sc(s: string) {
  if (s === 'online') return '#4ade80'
  if (s === 'working') return '#fbbf24'
  if (s === 'in-meeting') return '#60a5fa'
  return '#4b5563'
}

// ── Shared animated cartoon face ─────────────────────────────────────────────
// Handles: blink (.eyelid-l/r), eye-look (.pupils), mouth-talk, head-bob
function Face({
  cx, cy, r, skin = '#f5c894', status, over,
}: {
  cx: number; cy: number; r: number; skin?: string
  status: string; over?: ReactNode
}) {
  const ey  = cy - r * 0.11           // eye y
  const ew  = r * 0.26                // eye white radius
  const ep  = r * 0.13                // pupil radius
  const elx = cx - r * 0.33           // left eye x
  const erx = cx + r * 0.33           // right eye x
  const ny  = cy + r * 0.19           // nose y
  const my  = cy + r * 0.44           // mouth y

  return (
    <g className="head-bob">
      {/* Head */}
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.06} fill={skin} />

      {/* Eye whites */}
      <circle cx={elx} cy={ey} r={ew} fill="white" />
      <circle cx={erx} cy={ey} r={ew} fill="white" />

      {/* Pupils — animated to look side to side */}
      <g className="pupils">
        <circle cx={elx} cy={ey} r={ep} fill="#1c1917" />
        <circle cx={erx} cy={ey} r={ep} fill="#1c1917" />
        {/* Shine */}
        <circle cx={elx + ep * 0.4} cy={ey - ep * 0.35} r={ep * 0.28} fill="white" />
        <circle cx={erx + ep * 0.4} cy={ey - ep * 0.35} r={ep * 0.28} fill="white" />
      </g>

      {/* Eyelids — animated to blink */}
      <ellipse className="eyelid eyelid-l" cx={elx} cy={ey} rx={ew + 0.6} ry={ew + 0.6} fill={skin} />
      <ellipse className="eyelid eyelid-r" cx={erx} cy={ey} rx={ew + 0.6} ry={ew + 0.6} fill={skin} />

      {/* Nose */}
      <circle cx={cx} cy={ny} r={r * 0.07} fill="#a06040" opacity="0.45" />

      {/* Mouth */}
      {status === 'in-meeting' ? (
        <ellipse
          className="mouth-talking"
          cx={cx} cy={my}
          rx={r * 0.29} ry={r * 0.17}
          fill="#6b2a1c"
        />
      ) : (
        <path
          d={`M${cx - r * 0.26},${my} Q${cx},${my + r * 0.17} ${cx + r * 0.26},${my}`}
          fill="none" stroke="#a06040" strokeWidth="1.1" strokeLinecap="round" opacity="0.65"
        />
      )}

      {/* Optional over-face extras (glasses, scar, etc.) */}
      {over}
    </g>
  )
}

// ─── DUMBLEDORE ───────────────────────────────────────────────────────────────
// Tall purple robes, mortarboard, white beard, staff
export function DumbledoreCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="58" height="112" viewBox="0 0 58 112" className={isWalking ? 'agent-walking' : ''}>
      {/* Mortarboard */}
      <rect x="14" y="6" width="30" height="4" rx="2" fill="#4c1d95" />
      <rect x="19" y="10" width="20" height="10" rx="2" fill="#5b21b6" />
      <line x1="43" y1="7" x2="47" y2="14" stroke="#a78bfa" strokeWidth="1.5" />
      <circle cx="47" cy="15" r="2.5" fill="#a78bfa" />
      {/* Beard */}
      <ellipse cx="29" cy="42" rx="10" ry="7" fill="#f1f5f9" opacity="0.95" />
      {/* Face */}
      <Face cx={29} cy={26} r={13} status={status} />
      {/* Body */}
      <rect x="18" y="40" width="22" height="50" rx="4" fill="#6d28d9" className="char-body" />
      <rect x="27" y="40" width="5" height="50" rx="2" fill="#7c3aed" opacity="0.25" />
      {/* Left arm */}
      <g className="arm-left">
        <rect x="8"  y="42" width="10" height="22" rx="4" fill="#5b21b6" />
        <circle cx="12" cy="65" r="4" fill="#f5c894" />
      </g>
      {/* Right arm */}
      <g className="arm-right">
        <rect x="40" y="42" width="10" height="22" rx="4" fill="#5b21b6" />
        <circle cx="47" cy="65" r="4" fill="#f5c894" />
      </g>
      {/* Staff */}
      <rect x="49" y="22" width="3" height="68" rx="1.5" fill="#c4b5fd" />
      <circle cx="50.5" cy="21" r="5" fill="#7c3aed" />
      <circle cx="50.5" cy="21" r="2.5" fill="#ddd6fe" />
      {/* Legs */}
      <g className="leg-left">
        <rect x="17" y="86" width="12" height="22" rx="4" fill="#4c1d95" />
        <rect x="16" y="104" width="13" height="5" rx="2" fill="#312e81" />
      </g>
      <g className="leg-right">
        <rect x="30" y="86" width="12" height="22" rx="4" fill="#4c1d95" />
        <rect x="29" y="104" width="13" height="5" rx="2" fill="#312e81" />
      </g>
      {/* Status ring */}
      <circle cx="29" cy="26" r="15" fill="none" stroke={sc(status)} strokeWidth="2" opacity="0.85" />
    </svg>
  )
}

// ─── HERMIONE ────────────────────────────────────────────────────────────────
// Brown curly hair, Gryffindor uniform, book
export function HermioneCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="52" height="100" viewBox="0 0 52 100" className={isWalking ? 'agent-walking' : ''}>
      {/* Hair */}
      <ellipse cx="11" cy="22" rx="8"  ry="11" fill="#92400e" />
      <ellipse cx="41" cy="22" rx="8"  ry="11" fill="#92400e" />
      <ellipse cx="26" cy="14" rx="13" ry="8"  fill="#78350f" />
      {/* Face */}
      <Face cx={26} cy={24} r={12} status={status} />
      {/* Collar */}
      <path d="M20,37 L26,43 L32,37" fill="none" stroke="#e5e7eb" strokeWidth="2" />
      {/* Tie */}
      <polygon points="24,38 28,38 27,50 25,50" fill="#dc2626" />
      <line x1="25.5" y1="41" x2="26.5" y2="41" stroke="#fbbf24" strokeWidth="1" />
      <line x1="25.5" y1="44" x2="26.5" y2="44" stroke="#fbbf24" strokeWidth="1" />
      {/* Body */}
      <rect x="17" y="39" width="18" height="38" rx="3" fill="#1c1917" className="char-body" />
      <rect x="17" y="39" width="5"  height="38" rx="2" fill="#292524" opacity="0.6" />
      <rect x="30" y="39" width="5"  height="38" rx="2" fill="#292524" opacity="0.6" />
      {/* Left arm + book */}
      <g className="arm-left">
        <rect x="8" y="41" width="9" height="20" rx="4" fill="#1c1917" />
        <circle cx="11" cy="62" r="3.5" fill="#e2c4a0" />
        <rect x="2" y="58" width="12" height="15" rx="1.5" fill="#854d0e" />
        <rect x="2" y="58" width="2.5" height="15" rx="1"   fill="#92400e" />
        <line x1="6" y1="63" x2="13" y2="63" stroke="#fbbf24" strokeWidth="0.7" />
        <line x1="6" y1="66" x2="13" y2="66" stroke="#fbbf24" strokeWidth="0.7" />
      </g>
      {/* Right arm */}
      <g className="arm-right">
        <rect x="35" y="41" width="9" height="20" rx="4" fill="#1c1917" />
        <circle cx="41" cy="62" r="3.5" fill="#e2c4a0" />
      </g>
      {/* Legs */}
      <g className="leg-left">
        <rect x="17" y="73" width="10" height="24" rx="4" fill="#1c1917" />
        <rect x="16" y="93" width="11" height="5"  rx="2" fill="#0c0a09" />
      </g>
      <g className="leg-right">
        <rect x="27" y="73" width="10" height="24" rx="4" fill="#1c1917" />
        <rect x="26" y="93" width="11" height="5"  rx="2" fill="#0c0a09" />
      </g>
      {/* Status ring */}
      <circle cx="26" cy="24" r="14" fill="none" stroke={sc(status)} strokeWidth="2" opacity="0.85" />
    </svg>
  )
}

// ─── HARRY ────────────────────────────────────────────────────────────────────
// Messy dark hair, round glasses, lightning scar, wand
export function HarryCharacter({ isWalking, status }: CharProps) {
  const glasses = (
    <>
      <circle cx="23" cy="24" r="5.5" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
      <circle cx="31" cy="24" r="5.5" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1="28.5" y1="24" x2="25.5" y2="24" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1="17.5" y1="23" x2="14"   y2="22" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1="36.5" y1="23" x2="40"   y2="22" stroke="#9ca3af" strokeWidth="1.5" />
    </>
  )
  return (
    <svg width="54" height="102" viewBox="0 0 54 102" className={isWalking ? 'agent-walking' : ''}>
      {/* Messy hair */}
      <ellipse cx="27" cy="16" rx="14" ry="10" fill="#1c1917" />
      <ellipse cx="14" cy="20" rx="6"  ry="8"  fill="#1c1917" />
      <ellipse cx="40" cy="20" rx="6"  ry="8"  fill="#1c1917" />
      {/* Face + glasses overlay */}
      <Face cx={27} cy={25} r={12} status={status} over={glasses} />
      {/* Lightning scar */}
      <path d="M27,15 L25,19 L28,19 L26,24" stroke="#ef4444" strokeWidth="1.2" fill="none" opacity="0.65" />
      {/* Scarf */}
      <rect x="20" y="38" width="14" height="5" rx="2" fill="#dc2626" />
      <rect x="22" y="38" width="2"  height="5" fill="#fbbf24" opacity="0.8" />
      <rect x="26" y="38" width="2"  height="5" fill="#fbbf24" opacity="0.8" />
      <rect x="30" y="38" width="2"  height="5" fill="#fbbf24" opacity="0.8" />
      {/* Body */}
      <rect x="18" y="42" width="18" height="38" rx="3" fill="#1c1917" className="char-body" />
      <rect x="24" y="42" width="6"  height="38" rx="2" fill="#7f1d1d" opacity="0.45" />
      {/* Left arm */}
      <g className="arm-left">
        <rect x="9" y="44" width="9" height="20" rx="4" fill="#1c1917" />
        <circle cx="12" cy="65" r="3.5" fill="#f5c894" />
      </g>
      {/* Right arm + wand */}
      <g className="arm-right">
        <rect x="36" y="44" width="9" height="20" rx="4" fill="#1c1917" />
        <circle cx="43" cy="65" r="3.5" fill="#f5c894" />
        <line x1="46" y1="60" x2="53" y2="52" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="54" cy="51" r="2" fill="#fbbf24" opacity="0.9" />
      </g>
      {/* Legs */}
      <g className="leg-left">
        <rect x="18" y="76" width="10" height="23" rx="4" fill="#111827" />
        <rect x="17" y="95" width="11" height="5"  rx="2" fill="#030712" />
      </g>
      <g className="leg-right">
        <rect x="29" y="76" width="10" height="23" rx="4" fill="#111827" />
        <rect x="28" y="95" width="11" height="5"  rx="2" fill="#030712" />
      </g>
      {/* Status ring */}
      <circle cx="27" cy="25" r="14" fill="none" stroke={sc(status)} strokeWidth="2" opacity="0.85" />
    </svg>
  )
}

// ─── RON ──────────────────────────────────────────────────────────────────────
// Lanky, huge orange-red hair, freckles, wand
export function RonCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="50" height="108" viewBox="0 0 50 108" className={isWalking ? 'agent-walking' : ''}>
      {/* Big red hair */}
      <ellipse cx="25" cy="13" rx="16" ry="12" fill="#c2410c" />
      <ellipse cx="10" cy="19" rx="8"  ry="10" fill="#ea580c" />
      <ellipse cx="40" cy="19" rx="8"  ry="10" fill="#ea580c" />
      {/* Face */}
      <Face cx={25} cy={26} r={12} status={status} />
      {/* Freckles */}
      <circle cx="20"  cy="29"  r="1.2" fill="#92400e" opacity="0.5" />
      <circle cx="22"  cy="31.5" r="1"  fill="#92400e" opacity="0.5" />
      <circle cx="28"  cy="29"  r="1.2" fill="#92400e" opacity="0.5" />
      <circle cx="30"  cy="31.5" r="1"  fill="#92400e" opacity="0.5" />
      {/* Lanky body */}
      <rect x="17" y="40" width="16" height="26" rx="3" fill="#1c1917" className="char-body" />
      {/* Gryffindor patch */}
      <rect x="18" y="42" width="7" height="7" rx="1" fill="#dc2626" />
      <path d="M19,43 L21.5,47 L24,43" fill="#fbbf24" />
      {/* Long arms */}
      <g className="arm-left">
        <rect x="5" y="42" width="11" height="24" rx="4" fill="#1c1917" />
        <circle cx="9" cy="67" r="4" fill="#e2c4a0" />
      </g>
      <g className="arm-right">
        <rect x="34" y="42" width="11" height="24" rx="4" fill="#1c1917" />
        <circle cx="41" cy="67" r="4" fill="#e2c4a0" />
        <line x1="44" y1="63" x2="50" y2="55" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="50.5" cy="54" r="2" fill="#fde68a" opacity="0.85" />
      </g>
      {/* Long lanky legs */}
      <g className="leg-left">
        <rect x="16" y="62" width="11" height="30" rx="4" fill="#111827" />
        <rect x="15" y="88" width="12" height="5"  rx="2" fill="#030712" />
      </g>
      <g className="leg-right">
        <rect x="28" y="62" width="11" height="30" rx="4" fill="#111827" />
        <rect x="27" y="88" width="12" height="5"  rx="2" fill="#030712" />
      </g>
      {/* Status ring */}
      <circle cx="25" cy="26" r="14" fill="none" stroke={sc(status)} strokeWidth="2" opacity="0.85" />
    </svg>
  )
}

// ─── McGONAGALL ───────────────────────────────────────────────────────────────
// Tall pointy hat, strict emerald trim, goblet
export function McGonagallCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="52" height="118" viewBox="0 0 52 118" className={isWalking ? 'agent-walking' : ''}>
      {/* Pointy witch hat */}
      <polygon points="26,2 17,24 35,24" fill="#111827" />
      <ellipse cx="26" cy="24" rx="12" ry="4" fill="#1f2937" />
      <rect x="14" y="21" width="24" height="4" rx="1.5" fill="#059669" />
      {/* Hair bun */}
      <ellipse cx="26" cy="33" rx="8" ry="5" fill="#4b5563" />
      <circle  cx="26" cy="31" r="3" fill="#374151" />
      {/* Face (slightly older tone) */}
      <Face cx={26} cy={40} r={12} skin="#ddb896" status={status} />
      {/* Brooch */}
      <circle cx="26" cy="54" r="3.5" fill="#065f46" />
      <circle cx="26" cy="54" r="1.8" fill="#6ee7b7" />
      {/* Slim body */}
      <rect x="18" y="53" width="16" height="40" rx="3" fill="#111827" className="char-body" />
      <line x1="26" y1="53" x2="26" y2="93" stroke="#059669" strokeWidth="1.5" opacity="0.55" />
      {/* Left arm + goblet */}
      <g className="arm-left">
        <rect x="9"  y="55" width="9" height="20" rx="4" fill="#111827" />
        <circle cx="12" cy="76" r="3.5" fill="#d1d5db" />
        <path d="M4,73 L10,73 L9,83 L5,83 Z" fill="#d97706" />
        <ellipse cx="7" cy="73" rx="3.5" ry="1.5" fill="#fbbf24" />
        <rect x="4.5" y="83" width="4.5" height="2" rx="1" fill="#b45309" />
      </g>
      {/* Right arm */}
      <g className="arm-right">
        <rect x="34" y="55" width="9" height="20" rx="4" fill="#111827" />
        <circle cx="40" cy="76" r="3.5" fill="#d1d5db" />
      </g>
      {/* Slim legs */}
      <g className="leg-left">
        <rect x="17" y="89" width="10" height="26" rx="4" fill="#0f172a" />
        <rect x="16" y="111" width="11" height="5"  rx="2" fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="28" y="89" width="10" height="26" rx="4" fill="#0f172a" />
        <rect x="27" y="111" width="11" height="5"  rx="2" fill="#020617" />
      </g>
      {/* Status ring */}
      <circle cx="26" cy="40" r="14" fill="none" stroke={sc(status)} strokeWidth="2" opacity="0.85" />
    </svg>
  )
}

// ─── SNAPE ────────────────────────────────────────────────────────────────────
// Long dark curtain hair, wide black billowing robes, arms crossed, pale skin
export function SnapeCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="58" height="105" viewBox="0 0 58 105" className={isWalking ? 'agent-walking' : ''}>
      {/* Curtain hair */}
      <rect x="13" y="14" width="8"  height="32" rx="4" fill="#1c1917" />
      <rect x="37" y="14" width="8"  height="32" rx="4" fill="#1c1917" />
      <ellipse cx="29" cy="15" rx="15" ry="10" fill="#111827" />
      {/* Face — pale */}
      <Face cx={29} cy={25} r={12} skin="#d4bfae" status={status} />
      {/* High collar */}
      <path d="M21,38 L29,44 L37,38 Q33,35 29,35 Q25,35 21,38 Z" fill="#1e293b" />
      {/* Wide billowing body */}
      <path d="M18,41 L11,98 L47,98 L40,41 Z" fill="#0f172a" className="char-body" />
      <path d="M24,41 L19,98 L29,98 L28,41 Z" fill="#1e293b" opacity="0.4" />
      {/* Arms crossed — signature Snape pose */}
      <g className="arm-left">
        <path d="M18,44 C13,50 14,58 18,64 C22,67 29,64 33,61 C28,58 22,54 20,47 Z" fill="#111827" />
        <circle cx="18" cy="65" r="3.5" fill="#b8a89a" />
      </g>
      <g className="arm-right">
        <path d="M40,44 C45,50 44,58 40,64 C36,67 29,64 25,61 C30,58 36,54 38,47 Z" fill="#0f172a" />
        <circle cx="40" cy="65" r="3.5" fill="#b8a89a" />
      </g>
      {/* Legs */}
      <g className="leg-left">
        <rect x="17" y="90" width="11" height="22" rx="4" fill="#0f172a" />
        <rect x="16" y="108" width="12" height="4"  rx="2" fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="30" y="90" width="11" height="22" rx="4" fill="#0f172a" />
        <rect x="29" y="108" width="12" height="4"  rx="2" fill="#020617" />
      </g>
      {/* Status ring */}
      <circle cx="29" cy="25" r="14" fill="none" stroke={sc(status)} strokeWidth="2" opacity="0.85" />
    </svg>
  )
}

// ─── HAGRID ───────────────────────────────────────────────────────────────────
// HUGE — 1.6× wider, wild brown hair, enormous beard, big coat, lantern
export function HagridCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="80" height="116" viewBox="0 0 80 116" className={isWalking ? 'agent-walking' : ''}>
      {/* Wild enormous hair */}
      <ellipse cx="40" cy="18" rx="28" ry="20" fill="#44403c" />
      <ellipse cx="14" cy="26" rx="15" ry="18" fill="#57534e" />
      <ellipse cx="66" cy="26" rx="15" ry="18" fill="#57534e" />
      {/* Face — warmer/ruddier tone */}
      <Face cx={40} cy={30} r={15} skin="#c8845c" status={status} />
      {/* Big bushy beard */}
      <ellipse cx="40" cy="51" rx="13" ry="9" fill="#57534e" />
      {/* Enormous coat */}
      <path d="M20,50 L13,103 L67,103 L60,50 Z" fill="#78350f" className="char-body" />
      <path d="M32,50 L35,68 L40,62 L45,68 L48,50 Z" fill="#92400e" opacity="0.65" />
      {/* Giant left arm + lantern */}
      <g className="arm-left">
        <path d="M20,54 L9,82 L18,86 L25,60 Z" fill="#7c2d12" />
        <circle cx="11" cy="85" r="5" fill="#c8845c" />
        <rect x="2"  y="82" width="10" height="14" rx="2"   fill="#854d0e" />
        <rect x="3"  y="83" width="8"  height="12" rx="1.5" fill="#fde68a" opacity="0.55" />
        <line x1="7" y1="80" x2="7" y2="82" stroke="#a16207" strokeWidth="1.5" />
      </g>
      {/* Giant right arm */}
      <g className="arm-right">
        <path d="M60,54 L71,82 L62,86 L55,60 Z" fill="#7c2d12" />
        <circle cx="69" cy="85" r="5" fill="#c8845c" />
      </g>
      {/* Large legs */}
      <g className="leg-left">
        <rect x="20" y="96" width="18" height="24" rx="5" fill="#44403c" />
        <rect x="19" y="116" width="19" height="6"  rx="3" fill="#1c1917" />
      </g>
      <g className="leg-right">
        <rect x="42" y="96" width="18" height="24" rx="5" fill="#44403c" />
        <rect x="41" y="116" width="19" height="6"  rx="3" fill="#1c1917" />
      </g>
      {/* Status ring */}
      <circle cx="40" cy="30" r="17" fill="none" stroke={sc(status)} strokeWidth="2.5" opacity="0.85" />
    </svg>
  )
}

'use client'

/**
 * Pixel-art top-down RPG sprites — one per Hogwarts agent.
 *
 * Each character uses a tiny integer viewBox rendered at 3× scale
 * (e.g. 16×26 grid → 48×78 px) with shapeRendering="crispEdges"
 * so every rect stays sharp like a retro game sprite.
 *
 * CSS animation hooks (same as before):
 *   .leg-left / .leg-right  – walking swing
 *   .arm-left / .arm-right  – arm swing
 *   .char-body              – gentle bob
 *   .eyelid .eyelid-l/r     – blink (scaleY 0→1)
 *   .mouth-talking          – talking (scaleY oscillate)
 */

interface CharProps {
  avatar:    string          // kept for interface compatibility — not used
  isWalking: boolean
  status:    'online' | 'working' | 'in-meeting' | 'away'
}

function sc(s: string) {
  if (s === 'online')     return '#4ade80'
  if (s === 'working')    return '#fbbf24'
  if (s === 'in-meeting') return '#60a5fa'
  return '#4b5563'
}

// Shared SVG props for crisp pixel rendering
const PX = {
  shapeRendering: 'crispEdges' as const,
  style: { imageRendering: 'pixelated' } as React.CSSProperties,
}

const SKIN   = '#f4c591'   // warm
const SKIN_P = '#e2cdb8'   // pale  (Snape)
const SKIN_R = '#c88050'   // ruddy (Hagrid)

// ─── DUMBLEDORE ────────────────────────────────────────────────────────────────
// Mortarboard, white hair/beard, purple wizard robes, glowing staff
export function DumbledoreCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* mortarboard brim */}
      <rect x="2"  y="1" width="14" height="2" fill="#2d1b6b" />
      {/* mortarboard crown */}
      <rect x="5"  y="0" width="8"  height="4" fill="#4c1d95" />
      {/* tassel */}
      <rect x="12" y="0" width="1"  height="5" fill="#a78bfa" />
      <rect x="12" y="4" width="3"  height="2" fill="#a78bfa" />

      {/* white hair — sides */}
      <rect x="2"  y="3" width="3"  height="6" fill="#e2e8f0" />
      <rect x="13" y="3" width="3"  height="6" fill="#e2e8f0" />

      {/* face */}
      <rect x="4"  y="4" width="10" height="8" fill={SKIN} className="char-body" />
      {/* left eye + eyelid */}
      <rect x="6"  y="6" width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="6"  y="6" width="2"  height="2" fill={SKIN} />
      {/* right eye + eyelid */}
      <rect x="10" y="6" width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="10" y="6" width="2"  height="2" fill={SKIN} />
      {/* nose */}
      <rect x="8"  y="8" width="2"  height="1" fill="#c8905a" opacity="0.55" />
      {/* mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="10" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="10" width="4" height="1" fill="#b07040" opacity="0.7" />}

      {/* white beard */}
      <rect x="4"  y="11" width="10" height="4" fill="#f1f5f9" />
      <rect x="5"  y="14" width="8"  height="2" fill="#e2e8f0" />

      {/* purple robe body */}
      <rect x="4"  y="15" width="10" height="8" fill="#6d28d9" className="char-body" />
      <rect x="8"  y="15" width="2"  height="8" fill="#7c3aed" opacity="0.30" />

      {/* left arm */}
      <g className="arm-left">
        <rect x="2"  y="15" width="2" height="6" fill="#5b21b6" />
        <rect x="2"  y="21" width="2" height="2" fill={SKIN} />
      </g>
      {/* right arm + staff */}
      <g className="arm-right">
        <rect x="14" y="15" width="2" height="6" fill="#5b21b6" />
        <rect x="14" y="21" width="2" height="2" fill={SKIN} />
        <rect x="16" y="7"  width="2" height="16" fill="#c4b5fd" />
        <rect x="15" y="5"  width="4" height="3"  fill="#7c3aed" />
        <rect x="16" y="5"  width="2" height="2"  fill="#ddd6fe" />
      </g>

      {/* legs */}
      <g className="leg-left">
        <rect x="4"  y="23" width="4" height="5" fill="#4c1d95" />
        <rect x="4"  y="27" width="5" height="1" fill="#312e81" />
      </g>
      <g className="leg-right">
        <rect x="10" y="23" width="4" height="5" fill="#4c1d95" />
        <rect x="9"  y="27" width="5" height="1" fill="#312e81" />
      </g>

      {/* status ring */}
      <circle cx="9" cy="14" r="8" fill="none" stroke={sc(status)} strokeWidth="0.6" opacity="0.9" />
    </svg>
  )
}

// ─── HERMIONE ──────────────────────────────────────────────────────────────────
// Wide curly brown hair, Gryffindor tie, dark uniform, book in hand
export function HermioneCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="48" height="78" viewBox="0 0 16 26"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* curly hair — wider than face */}
      <rect x="1"  y="1"  width="14" height="5" fill="#92400e" />
      <rect x="0"  y="3"  width="2"  height="7" fill="#92400e" />
      <rect x="14" y="3"  width="2"  height="7" fill="#92400e" />
      <rect x="2"  y="1"  width="12" height="2" fill="#a05018" />   {/* highlight */}

      {/* face */}
      <rect x="3"  y="5"  width="10" height="8" fill={SKIN} className="char-body" />
      <rect x="5"  y="7"  width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5"  y="7"  width="2"  height="2" fill={SKIN} />
      <rect x="9"  y="7"  width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="9"  y="7"  width="2"  height="2" fill={SKIN} />
      <rect x="7"  y="9"  width="2"  height="1" fill="#c8905a" opacity="0.5" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="6" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="6" y="11" width="4" height="1" fill="#b07040" opacity="0.7" />}

      {/* collar + Gryffindor tie */}
      <rect x="5"  y="13" width="6"  height="1" fill="#e5e7eb" />
      <rect x="7"  y="13" width="2"  height="6" fill="#dc2626" />
      <rect x="7"  y="14" width="2"  height="1" fill="#fbbf24" opacity="0.9" />
      <rect x="7"  y="16" width="2"  height="1" fill="#fbbf24" opacity="0.9" />

      {/* dark uniform body */}
      <rect x="3"  y="13" width="10" height="8" fill="#1c1917" className="char-body" />

      {/* left arm + book */}
      <g className="arm-left">
        <rect x="1"  y="13" width="2" height="6" fill="#1c1917" />
        <rect x="1"  y="19" width="2" height="2" fill={SKIN} />
        <rect x="-2" y="18" width="4" height="5" fill="#854d0e" />
        <rect x="-2" y="18" width="1" height="5" fill="#a05018" />
        <rect x="0"  y="20" width="1" height="1" fill="#fbbf24" opacity="0.7" />
        <rect x="0"  y="22" width="1" height="1" fill="#fbbf24" opacity="0.7" />
      </g>
      {/* right arm */}
      <g className="arm-right">
        <rect x="13" y="13" width="2" height="6" fill="#1c1917" />
        <rect x="13" y="19" width="2" height="2" fill={SKIN} />
      </g>

      {/* legs */}
      <g className="leg-left">
        <rect x="3"  y="21" width="4" height="5" fill="#1c1917" />
        <rect x="3"  y="25" width="4" height="1" fill="#0c0a09" />
      </g>
      <g className="leg-right">
        <rect x="9"  y="21" width="4" height="5" fill="#1c1917" />
        <rect x="9"  y="25" width="4" height="1" fill="#0c0a09" />
      </g>

      {/* status ring */}
      <circle cx="8" cy="13" r="7" fill="none" stroke={sc(status)} strokeWidth="0.6" opacity="0.9" />
    </svg>
  )
}

// ─── HARRY ─────────────────────────────────────────────────────────────────────
// Spiky dark hair, pixel glasses, lightning scar, Gryffindor scarf, wand
export function HarryCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="48" height="78" viewBox="0 0 16 26"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* messy dark hair */}
      <rect x="3"  y="0"  width="10" height="4" fill="#1c1917" />
      <rect x="2"  y="2"  width="12" height="3" fill="#1c1917" />
      <rect x="1"  y="3"  width="2"  height="4" fill="#1c1917" />
      <rect x="13" y="3"  width="2"  height="4" fill="#1c1917" />
      <rect x="5"  y="0"  width="3"  height="1" fill="#374151" />   {/* highlight */}

      {/* face */}
      <rect x="3"  y="4"  width="10" height="8" fill={SKIN} className="char-body" />
      {/* lightning scar */}
      <rect x="7"  y="4"  width="1"  height="1" fill="#ef4444" opacity="0.75" />
      <rect x="8"  y="5"  width="1"  height="1" fill="#ef4444" opacity="0.75" />
      <rect x="7"  y="6"  width="1"  height="1" fill="#ef4444" opacity="0.75" />
      {/* pixel glasses frames */}
      <rect x="4"  y="6"  width="4"  height="3" fill="none" stroke="#9ca3af" strokeWidth="1" />
      <rect x="8"  y="6"  width="4"  height="3" fill="none" stroke="#9ca3af" strokeWidth="1" />
      {/* eyes inside glasses */}
      <rect x="5"  y="7"  width="2"  height="1" fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5" y="7" width="2" height="1" fill={SKIN} />
      <rect x="9"  y="7"  width="2"  height="1" fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="9" y="7" width="2" height="1" fill={SKIN} />
      {/* mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="6" y="10" width="4" height="2" fill="#7c2d12" />
        : <rect x="6" y="10" width="4" height="1" fill="#b07040" opacity="0.7" />}

      {/* Gryffindor scarf — red/gold stripes */}
      <rect x="4"  y="12" width="8"  height="2" fill="#dc2626" />
      <rect x="4"  y="12" width="1"  height="2" fill="#fbbf24" />
      <rect x="6"  y="12" width="1"  height="2" fill="#fbbf24" />
      <rect x="8"  y="12" width="1"  height="2" fill="#fbbf24" />
      <rect x="10" y="12" width="1"  height="2" fill="#fbbf24" />

      {/* dark robe body */}
      <rect x="3"  y="13" width="10" height="8" fill="#1c1917" className="char-body" />
      <rect x="6"  y="13" width="4"  height="8" fill="#7f1d1d" opacity="0.35" />

      {/* left arm */}
      <g className="arm-left">
        <rect x="1"  y="13" width="2" height="6" fill="#1c1917" />
        <rect x="1"  y="19" width="2" height="2" fill={SKIN} />
      </g>
      {/* right arm + wand */}
      <g className="arm-right">
        <rect x="13" y="13" width="2" height="6" fill="#1c1917" />
        <rect x="13" y="19" width="2" height="2" fill={SKIN} />
        <rect x="15" y="16" width="1" height="8" fill="#92400e" />
        <rect x="15" y="15" width="2" height="2" fill="#fbbf24" opacity="0.8" />
      </g>

      {/* legs */}
      <g className="leg-left">
        <rect x="3"  y="21" width="4" height="5" fill="#111827" />
        <rect x="3"  y="25" width="4" height="1" fill="#030712" />
      </g>
      <g className="leg-right">
        <rect x="9"  y="21" width="4" height="5" fill="#111827" />
        <rect x="9"  y="25" width="4" height="1" fill="#030712" />
      </g>

      {/* status ring */}
      <circle cx="8" cy="13" r="7" fill="none" stroke={sc(status)} strokeWidth="0.6" opacity="0.9" />
    </svg>
  )
}

// ─── RON ───────────────────────────────────────────────────────────────────────
// Extra-wide orange hair, freckles, tall lanky frame, wand
export function RonCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="90" viewBox="0 0 18 30"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* huge orange hair */}
      <rect x="1"  y="0"  width="16" height="5" fill="#c2410c" />
      <rect x="0"  y="2"  width="2"  height="8" fill="#ea580c" />
      <rect x="16" y="2"  width="2"  height="8" fill="#ea580c" />
      <rect x="3"  y="0"  width="12" height="2" fill="#fb923c" />   {/* highlight */}

      {/* face */}
      <rect x="4"  y="5"  width="10" height="8" fill={SKIN} className="char-body" />
      {/* freckles */}
      <rect x="5"  y="9"  width="1"  height="1" fill="#92400e" opacity="0.55" />
      <rect x="7"  y="10" width="1"  height="1" fill="#92400e" opacity="0.55" />
      <rect x="11" y="9"  width="1"  height="1" fill="#92400e" opacity="0.55" />
      <rect x="12" y="10" width="1"  height="1" fill="#92400e" opacity="0.55" />
      {/* eyes */}
      <rect x="6"  y="7"  width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="6"  y="7"  width="2"  height="2" fill={SKIN} />
      <rect x="10" y="7"  width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="10" y="7"  width="2"  height="2" fill={SKIN} />
      <rect x="8"  y="9"  width="2"  height="1" fill="#c8905a" opacity="0.5" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="11" width="4" height="1" fill="#b07040" opacity="0.7" />}

      {/* Gryffindor patch */}
      <rect x="5"  y="16" width="4"  height="4" fill="#dc2626" />
      <rect x="6"  y="16" width="2"  height="4" fill="#fbbf24" opacity="0.55" />

      {/* dark uniform — taller/lankier body */}
      <rect x="4"  y="14" width="10" height="11" fill="#1c1917" className="char-body" />

      {/* long arms */}
      <g className="arm-left">
        <rect x="2"  y="14" width="2" height="8" fill="#1c1917" />
        <rect x="2"  y="22" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="14" y="14" width="2" height="8" fill="#1c1917" />
        <rect x="14" y="22" width="2" height="2" fill={SKIN} />
        {/* wand */}
        <rect x="16" y="18" width="1" height="9" fill="#78350f" />
        <rect x="16" y="17" width="2" height="2" fill="#fde68a" opacity="0.8" />
      </g>

      {/* long lanky legs */}
      <g className="leg-left">
        <rect x="4"  y="25" width="4" height="5" fill="#111827" />
        <rect x="4"  y="29" width="5" height="1" fill="#030712" />
      </g>
      <g className="leg-right">
        <rect x="10" y="25" width="4" height="5" fill="#111827" />
        <rect x="9"  y="29" width="5" height="1" fill="#030712" />
      </g>

      {/* status ring */}
      <circle cx="9" cy="14" r="8" fill="none" stroke={sc(status)} strokeWidth="0.6" opacity="0.9" />
    </svg>
  )
}

// ─── McGONAGALL ────────────────────────────────────────────────────────────────
// Tall stacked pointed hat, grey bun, dark robes, emerald trim, goblet
export function McGonagallCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="48" height="102" viewBox="0 0 16 34"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* pointy hat — stacked pixel rows */}
      <rect x="7"  y="0"  width="2"  height="2" fill="#0f172a" />
      <rect x="6"  y="2"  width="4"  height="2" fill="#0f172a" />
      <rect x="5"  y="4"  width="6"  height="2" fill="#111827" />
      <rect x="4"  y="6"  width="8"  height="2" fill="#1f2937" />
      <rect x="2"  y="8"  width="12" height="2" fill="#0f172a" />   {/* brim */}
      <rect x="3"  y="8"  width="10" height="1" fill="#059669" />   {/* green band */}

      {/* grey hair — peeks out sides */}
      <rect x="2"  y="9"  width="2"  height="4" fill="#4b5563" />
      <rect x="12" y="9"  width="2"  height="4" fill="#4b5563" />

      {/* face (slightly older skin tone) */}
      <rect x="3"  y="11" width="10" height="8" fill="#ddb896" className="char-body" />
      <rect x="5"  y="13" width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5"  y="13" width="2"  height="2" fill="#ddb896" />
      <rect x="9"  y="13" width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="9"  y="13" width="2"  height="2" fill="#ddb896" />
      <rect x="7"  y="15" width="2"  height="1" fill="#a08060" opacity="0.55" />
      {/* stern thin mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="6" y="17" width="4" height="2" fill="#7c2d12" />
        : <rect x="6" y="17" width="4" height="1" fill="#a08060" opacity="0.8" />}

      {/* emerald brooch */}
      <rect x="7"  y="20" width="2"  height="2" fill="#065f46" />
      <rect x="7"  y="20" width="2"  height="2" fill="#6ee7b7" opacity="0.55" />

      {/* dark body — emerald centre line */}
      <rect x="3"  y="19" width="10" height="9" fill="#111827" className="char-body" />
      <rect x="7"  y="19" width="2"  height="9" fill="#059669" opacity="0.35" />

      {/* left arm + goblet */}
      <g className="arm-left">
        <rect x="1"  y="19" width="2" height="7" fill="#111827" />
        <rect x="1"  y="26" width="2" height="2" fill="#d1d5db" />
        <rect x="-2" y="25" width="4" height="5" fill="#d97706" />
        <rect x="-2" y="25" width="4" height="1" fill="#fbbf24" />
      </g>
      {/* right arm */}
      <g className="arm-right">
        <rect x="13" y="19" width="2" height="7" fill="#111827" />
        <rect x="13" y="26" width="2" height="2" fill="#d1d5db" />
      </g>

      {/* legs */}
      <g className="leg-left">
        <rect x="3"  y="28" width="4" height="6" fill="#0f172a" />
        <rect x="3"  y="33" width="4" height="1" fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="9"  y="28" width="4" height="6" fill="#0f172a" />
        <rect x="9"  y="33" width="4" height="1" fill="#020617" />
      </g>

      {/* status ring */}
      <circle cx="8" cy="19" r="7" fill="none" stroke={sc(status)} strokeWidth="0.6" opacity="0.9" />
    </svg>
  )
}

// ─── SNAPE ─────────────────────────────────────────────────────────────────────
// Long dark curtain hair, pale face, wide billowing black robes, arms crossed
export function SnapeCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="60" height="84" viewBox="0 0 20 28"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* curtain hair — long on sides */}
      <rect x="4"  y="0"  width="12" height="4" fill="#111827" />
      <rect x="3"  y="2"  width="3"  height="10" fill="#1c1917" />
      <rect x="14" y="2"  width="3"  height="10" fill="#1c1917" />

      {/* face — pale */}
      <rect x="5"  y="4"  width="10" height="8" fill={SKIN_P} className="char-body" />
      <rect x="7"  y="6"  width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="7"  y="6"  width="2"  height="2" fill={SKIN_P} />
      <rect x="11" y="6"  width="2"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2"  height="2" fill={SKIN_P} />
      <rect x="9"  y="8"  width="2"  height="1" fill="#9a7a6a" opacity="0.5" />
      {/* thin stern mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="8" y="10" width="4" height="2" fill="#7c2d12" />
        : <rect x="8" y="10" width="4" height="1" fill="#806050" opacity="0.8" />}

      {/* high collar */}
      <rect x="7"  y="12" width="6"  height="2" fill="#1e293b" />

      {/* wide billowing robe */}
      <rect x="2"  y="13" width="16" height="10" fill="#0f172a" className="char-body" />
      <rect x="4"  y="13" width="3"  height="10" fill="#1e293b" opacity="0.45" />

      {/* arms — signature crossed pose */}
      <g className="arm-left">
        <rect x="0"  y="13" width="2" height="7" fill="#111827" />
        <rect x="0"  y="20" width="2" height="2" fill="#b8a89a" />
      </g>
      <g className="arm-right">
        <rect x="18" y="13" width="2" height="7" fill="#0f172a" />
        <rect x="18" y="20" width="2" height="2" fill="#b8a89a" />
      </g>

      {/* legs */}
      <g className="leg-left">
        <rect x="3"  y="23" width="5" height="5" fill="#0f172a" />
        <rect x="3"  y="27" width="5" height="1" fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="12" y="23" width="5" height="5" fill="#0f172a" />
        <rect x="12" y="27" width="5" height="1" fill="#020617" />
      </g>

      {/* status ring */}
      <circle cx="10" cy="13" r="8" fill="none" stroke={sc(status)} strokeWidth="0.6" opacity="0.9" />
    </svg>
  )
}

// ─── HAGRID ─────────────────────────────────────────────────────────────────────
// Huge — 1.5× scale, wild bushy brown hair, enormous beard, coat, lantern
export function HagridCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="72" height="96" viewBox="0 0 24 32"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* enormous wild hair */}
      <rect x="2"  y="0"  width="20" height="7"  fill="#44403c" />
      <rect x="0"  y="2"  width="4"  height="10" fill="#57534e" />
      <rect x="20" y="2"  width="4"  height="10" fill="#57534e" />
      <rect x="4"  y="0"  width="16" height="3"  fill="#6b7280" opacity="0.4" />

      {/* big ruddy face */}
      <rect x="5"  y="6"  width="14" height="10" fill={SKIN_R} className="char-body" />
      {/* eyes */}
      <rect x="7"  y="8"  width="3"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="7"  y="8"  width="3"  height="2" fill={SKIN_R} />
      <rect x="14" y="8"  width="3"  height="2" fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="14" y="8"  width="3"  height="2" fill={SKIN_R} />
      <rect x="10" y="10" width="4"  height="2" fill="#a06040" opacity="0.45" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="9" y="13" width="6" height="3" fill="#7c2d12" />
        : <rect x="9" y="13" width="6" height="1" fill="#b07040" opacity="0.7" />}

      {/* giant bushy beard */}
      <rect x="4"  y="14" width="16" height="6"  fill="#57534e" />
      <rect x="5"  y="18" width="14" height="3"  fill="#44403c" />

      {/* enormous brown coat */}
      <rect x="2"  y="19" width="20" height="8"  fill="#78350f" className="char-body" />
      <rect x="8"  y="19" width="8"  height="8"  fill="#92400e" opacity="0.35" />

      {/* giant left arm + lantern */}
      <g className="arm-left">
        <rect x="0"  y="19" width="2" height="8" fill="#7c2d12" />
        <rect x="0"  y="27" width="2" height="3" fill={SKIN_R} />
        <rect x="-4" y="27" width="5" height="6" fill="#854d0e" />
        <rect x="-3" y="28" width="3" height="4" fill="#fde68a" opacity="0.55" />
        <rect x="-1" y="25" width="1" height="3" fill="#a16207" />
      </g>
      {/* giant right arm */}
      <g className="arm-right">
        <rect x="22" y="19" width="2" height="8" fill="#7c2d12" />
        <rect x="22" y="27" width="2" height="3" fill={SKIN_R} />
      </g>

      {/* big legs */}
      <g className="leg-left">
        <rect x="3"  y="27" width="7" height="5" fill="#44403c" />
        <rect x="3"  y="31" width="8" height="1" fill="#1c1917" />
      </g>
      <g className="leg-right">
        <rect x="14" y="27" width="7" height="5" fill="#44403c" />
        <rect x="13" y="31" width="8" height="1" fill="#1c1917" />
      </g>

      {/* status ring */}
      <circle cx="12" cy="19" r="10" fill="none" stroke={sc(status)} strokeWidth="0.8" opacity="0.9" />
    </svg>
  )
}

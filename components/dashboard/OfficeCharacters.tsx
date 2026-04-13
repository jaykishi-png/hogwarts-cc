'use client'

/**
 * Pixel-art top-down RPG sprites — one per Hogwarts agent.
 *
 * Each character uses a tiny integer viewBox rendered at 3-4× scale
 * with shapeRendering="crispEdges" for sharp retro-game look.
 *
 * Proportions: large head (~45% height), compact body (~30%), short legs (~25%)
 * All key features use 2×2 pixel blocks minimum for crisp visibility.
 *
 * CSS animation hooks:
 *   .leg-left / .leg-right  – walking swing
 *   .arm-left / .arm-right  – arm swing
 *   .char-body              – gentle bob
 *   .eyelid .eyelid-l/r     – blink (scaleY 0→1)
 *   .mouth-talking          – talking (scaleY oscillate)
 */

interface CharProps {
  avatar:    string          // kept for interface compatibility
  isWalking: boolean
  status:    'online' | 'working' | 'in-meeting' | 'away'
}

// Shared SVG props for crisp pixel rendering
const PX = {
  shapeRendering: 'crispEdges' as const,
  style: { imageRendering: 'pixelated' } as React.CSSProperties,
}

const SKIN   = '#f8c880'   // warm golden
const SKIN_P = '#e8d8c0'   // pale  (Snape)
const SKIN_R = '#d08855'   // ruddy (Hagrid)

// ─── DUMBLEDORE ────────────────────────────────────────────────────────────────
// Pointed wizard hat, flowing white beard, vivid purple robes, glowing staff
export function DumbledoreCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="60" height="90" viewBox="0 0 20 30"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* tall pointed wizard hat */}
      <rect x="8"  y="0"  width="4"  height="2"  fill="#5b21b6" />
      <rect x="6"  y="2"  width="8"  height="2"  fill="#6d28d9" />
      <rect x="4"  y="4"  width="12" height="2"  fill="#7c3aed" />
      <rect x="2"  y="6"  width="16" height="2"  fill="#6d28d9" />  {/* brim */}
      <rect x="3"  y="6"  width="14" height="1"  fill="#a78bfa" />  {/* brim highlight */}
      {/* tassel */}
      <rect x="14" y="0"  width="2"  height="7"  fill="#c4b5fd" />
      <rect x="14" y="6"  width="4"  height="2"  fill="#c4b5fd" />

      {/* white fluffy hair — sides peek out */}
      <rect x="1"  y="7"  width="4"  height="6"  fill="#f1f5f9" />
      <rect x="15" y="7"  width="4"  height="6"  fill="#f1f5f9" />
      <rect x="2"  y="7"  width="2"  height="3"  fill="#e2e8f0" />

      {/* big face */}
      <rect x="4"  y="7"  width="12" height="8"  fill={SKIN} className="char-body" />
      {/* left eye 2×2 + eyelid */}
      <rect x="6"  y="9"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="6"  y="9"  width="2"  height="2"  fill={SKIN} />
      {/* right eye 2×2 + eyelid */}
      <rect x="12" y="9"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="12" y="9"  width="2"  height="2"  fill={SKIN} />
      {/* star-like glasses hint */}
      <rect x="5"  y="9"  width="4"  height="3"  fill="none" stroke="#a0a0c0" strokeWidth="0.6" opacity="0.5" />
      <rect x="11" y="9"  width="4"  height="3"  fill="none" stroke="#a0a0c0" strokeWidth="0.6" opacity="0.5" />
      {/* nose */}
      <rect x="9"  y="11" width="2"  height="2"  fill="#c8905a" opacity="0.5" />
      {/* mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="8" y="13" width="4" height="2" fill="#7c2d12" />
        : <rect x="8" y="13" width="4" height="1" fill="#b07040" opacity="0.8" />}

      {/* massive flowing white beard */}
      <rect x="3"  y="15" width="14" height="4"  fill="#f8fafc" />
      <rect x="4"  y="18" width="12" height="3"  fill="#e2e8f0" />
      <rect x="6"  y="20" width="8"  height="2"  fill="#f1f5f9" />

      {/* bright purple robe */}
      <rect x="4"  y="19" width="12" height="7"  fill="#7c3aed" className="char-body" />
      <rect x="8"  y="19" width="4"  height="7"  fill="#8b5cf6" opacity="0.45" />
      <rect x="9"  y="19" width="2"  height="7"  fill="#a78bfa" opacity="0.25" />

      {/* left arm */}
      <g className="arm-left">
        <rect x="2"  y="19" width="2"  height="5"  fill="#6d28d9" />
        <rect x="2"  y="24" width="2"  height="2"  fill={SKIN} />
      </g>
      {/* right arm + glowing staff */}
      <g className="arm-right">
        <rect x="16" y="19" width="2"  height="5"  fill="#6d28d9" />
        <rect x="16" y="24" width="2"  height="2"  fill={SKIN} />
        <rect x="18" y="6"  width="2"  height="18" fill="#ddd6fe" />
        <rect x="17" y="4"  width="4"  height="4"  fill="#7c3aed" />
        <rect x="18" y="4"  width="2"  height="3"  fill="#ede9fe" />
        <rect x="18" y="3"  width="2"  height="2"  fill="#a78bfa" opacity="0.8" />
      </g>

      {/* short chunky legs */}
      <g className="leg-left">
        <rect x="4"  y="26" width="5"  height="4"  fill="#5b21b6" />
        <rect x="4"  y="29" width="6"  height="1"  fill="#4c1d95" />
      </g>
      <g className="leg-right">
        <rect x="11" y="26" width="5"  height="4"  fill="#5b21b6" />
        <rect x="10" y="29" width="6"  height="1"  fill="#4c1d95" />
      </g>
    </svg>
  )
}

// ─── HERMIONE ──────────────────────────────────────────────────────────────────
// Giant curly brown hair halo, Gryffindor tie, dark uniform, book
export function HermioneCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* enormous curly hair — extends well beyond face */}
      <rect x="0"  y="0"  width="18" height="6"  fill="#7c3410" />
      <rect x="0"  y="2"  width="3"  height="10" fill="#92400e" />
      <rect x="15" y="2"  width="3"  height="10" fill="#92400e" />
      <rect x="1"  y="0"  width="16" height="3"  fill="#b45309" />  {/* highlight */}
      <rect x="0"  y="6"  width="2"  height="4"  fill="#7c3410" />  {/* curly side puff */}
      <rect x="16" y="6"  width="2"  height="4"  fill="#7c3410" />

      {/* face */}
      <rect x="3"  y="5"  width="12" height="8"  fill={SKIN} className="char-body" />
      {/* eyes 2×2 + eyelids */}
      <rect x="5"  y="7"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5" y="7" width="2" height="2" fill={SKIN} />
      <rect x="11" y="7"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="7" width="2" height="2" fill={SKIN} />
      {/* nose */}
      <rect x="8"  y="9"  width="2"  height="2"  fill="#c8905a" opacity="0.45" />
      {/* mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="11" width="4" height="1" fill="#b07040" opacity="0.8" />}

      {/* white collar + Gryffindor tie */}
      <rect x="6"  y="13" width="6"  height="1"  fill="#f0f0f0" />
      <rect x="8"  y="13" width="2"  height="7"  fill="#dc2626" />
      <rect x="8"  y="14" width="2"  height="2"  fill="#fbbf24" />
      <rect x="8"  y="17" width="2"  height="2"  fill="#fbbf24" />

      {/* dark uniform */}
      <rect x="3"  y="13" width="12" height="8"  fill="#1c1917" className="char-body" />

      {/* left arm + book */}
      <g className="arm-left">
        <rect x="1"  y="13" width="2"  height="6"  fill="#1c1917" />
        <rect x="1"  y="19" width="2"  height="2"  fill={SKIN} />
        {/* book */}
        <rect x="-3" y="18" width="5"  height="6"  fill="#7c2d12" />
        <rect x="-3" y="18" width="2"  height="6"  fill="#991b1b" />
        <rect x="-2" y="20" width="3"  height="1"  fill="#fbbf24" opacity="0.7" />
        <rect x="-2" y="22" width="3"  height="1"  fill="#fbbf24" opacity="0.5" />
      </g>
      {/* right arm */}
      <g className="arm-right">
        <rect x="15" y="13" width="2"  height="6"  fill="#1c1917" />
        <rect x="15" y="19" width="2"  height="2"  fill={SKIN} />
      </g>

      {/* short chunky legs */}
      <g className="leg-left">
        <rect x="3"  y="21" width="5"  height="4"  fill="#111827" />
        <rect x="3"  y="24" width="5"  height="2"  fill="#0c0a09" />
        <rect x="2"  y="25" width="6"  height="1"  fill="#0c0a09" />
      </g>
      <g className="leg-right">
        <rect x="10" y="21" width="5"  height="4"  fill="#111827" />
        <rect x="10" y="24" width="5"  height="2"  fill="#0c0a09" />
        <rect x="10" y="25" width="6"  height="1"  fill="#0c0a09" />
      </g>
    </svg>
  )
}

// ─── HARRY ─────────────────────────────────────────────────────────────────────
// Wild dark hair spike, round glasses, bright lightning scar, Gryffindor scarf, wand
export function HarryCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* spiky dark hair — multiple spikes */}
      <rect x="2"  y="0"  width="14" height="4"  fill="#111827" />
      <rect x="2"  y="2"  width="14" height="4"  fill="#1c1917" />
      <rect x="0"  y="3"  width="4"  height="5"  fill="#1c1917" />
      <rect x="14" y="3"  width="4"  height="5"  fill="#1c1917" />
      <rect x="4"  y="0"  width="3"  height="2"  fill="#374151" />  {/* highlight spike */}
      <rect x="10" y="0"  width="2"  height="3"  fill="#374151" />

      {/* big face */}
      <rect x="3"  y="5"  width="12" height="8"  fill={SKIN} className="char-body" />
      {/* lightning bolt scar — 3 pixels in zigzag */}
      <rect x="8"  y="5"  width="2"  height="2"  fill="#f87171" opacity="0.9" />
      <rect x="9"  y="6"  width="2"  height="1"  fill="#ef4444" opacity="0.9" />
      <rect x="8"  y="7"  width="2"  height="1"  fill="#f87171" opacity="0.8" />
      {/* round glasses — two square frames + bridge */}
      <rect x="4"  y="8"  width="4"  height="3"  fill="none" stroke="#9ca3af" strokeWidth="1" />
      <rect x="10" y="8"  width="4"  height="3"  fill="none" stroke="#9ca3af" strokeWidth="1" />
      <rect x="8"  y="9"  width="2"  height="1"  fill="#9ca3af" />  {/* bridge */}
      {/* eyes inside glasses */}
      <rect x="5"  y="9"  width="2"  height="1"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5"  y="9"  width="2"  height="1"  fill={SKIN} />
      <rect x="11" y="9"  width="2"  height="1"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="9"  width="2"  height="1"  fill={SKIN} />
      {/* mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="11" width="4" height="1" fill="#b07040" opacity="0.8" />}

      {/* bright Gryffindor scarf */}
      <rect x="4"  y="13" width="10" height="2"  fill="#dc2626" />
      <rect x="4"  y="13" width="2"  height="2"  fill="#fbbf24" />
      <rect x="7"  y="13" width="2"  height="2"  fill="#fbbf24" />
      <rect x="10" y="13" width="2"  height="2"  fill="#fbbf24" />

      {/* dark robe body */}
      <rect x="3"  y="14" width="12" height="8"  fill="#111827" className="char-body" />
      <rect x="6"  y="14" width="6"  height="8"  fill="#7f1d1d" opacity="0.3" />

      {/* left arm */}
      <g className="arm-left">
        <rect x="1"  y="14" width="2"  height="6"  fill="#111827" />
        <rect x="1"  y="20" width="2"  height="2"  fill={SKIN} />
      </g>
      {/* right arm + wand */}
      <g className="arm-right">
        <rect x="15" y="14" width="2"  height="6"  fill="#111827" />
        <rect x="15" y="20" width="2"  height="2"  fill={SKIN} />
        <rect x="17" y="16" width="1"  height="9"  fill="#92400e" />
        <rect x="17" y="15" width="2"  height="3"  fill="#fde68a" opacity="0.9" />
      </g>

      {/* short chunky legs */}
      <g className="leg-left">
        <rect x="3"  y="22" width="5"  height="4"  fill="#0f172a" />
        <rect x="2"  y="25" width="6"  height="1"  fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="10" y="22" width="5"  height="4"  fill="#0f172a" />
        <rect x="10" y="25" width="6"  height="1"  fill="#020617" />
      </g>
    </svg>
  )
}

// ─── RON ───────────────────────────────────────────────────────────────────────
// Explosion of bright orange hair, freckles, lanky frame, Gryffindor patch
export function RonCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="90" viewBox="0 0 18 30"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* enormous orange hair explosion */}
      <rect x="1"  y="0"  width="16" height="6"  fill="#c2410c" />
      <rect x="0"  y="2"  width="3"  height="10" fill="#ea580c" />
      <rect x="15" y="2"  width="3"  height="10" fill="#ea580c" />
      <rect x="2"  y="0"  width="14" height="3"  fill="#f97316" />  {/* bright highlight */}
      <rect x="4"  y="0"  width="10" height="2"  fill="#fb923c" />  {/* top highlight */}
      {/* extra hair puff sides */}
      <rect x="0"  y="5"  width="2"  height="5"  fill="#c2410c" />
      <rect x="16" y="5"  width="2"  height="5"  fill="#c2410c" />

      {/* big face */}
      <rect x="3"  y="5"  width="12" height="8"  fill={SKIN} className="char-body" />
      {/* freckles — 2×2 dots */}
      <rect x="4"  y="9"  width="2"  height="2"  fill="#92400e" opacity="0.5" />
      <rect x="7"  y="10" width="2"  height="2"  fill="#92400e" opacity="0.45" />
      <rect x="12" y="9"  width="2"  height="2"  fill="#92400e" opacity="0.5" />
      <rect x="10" y="10" width="2"  height="1"  fill="#92400e" opacity="0.35" />
      {/* eyes 2×2 + eyelids */}
      <rect x="5"  y="7"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5"  y="7"  width="2"  height="2"  fill={SKIN} />
      <rect x="11" y="7"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="7"  width="2"  height="2"  fill={SKIN} />
      <rect x="8"  y="9"  width="2"  height="2"  fill="#c8905a" opacity="0.45" />
      {/* mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="11" width="4" height="1" fill="#b07040" opacity="0.8" />}

      {/* Gryffindor badge */}
      <rect x="5"  y="16" width="4"  height="5"  fill="#dc2626" />
      <rect x="5"  y="16" width="4"  height="2"  fill="#fbbf24" opacity="0.7" />
      <rect x="6"  y="18" width="2"  height="1"  fill="#fbbf24" opacity="0.5" />

      {/* dark uniform — tall lanky */}
      <rect x="3"  y="13" width="12" height="10" fill="#1c1917" className="char-body" />

      {/* long lanky arms */}
      <g className="arm-left">
        <rect x="1"  y="13" width="2"  height="8"  fill="#1c1917" />
        <rect x="1"  y="21" width="2"  height="2"  fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="13" width="2"  height="8"  fill="#1c1917" />
        <rect x="15" y="21" width="2"  height="2"  fill={SKIN} />
        {/* wand */}
        <rect x="17" y="17" width="1"  height="8"  fill="#78350f" />
        <rect x="17" y="16" width="2"  height="3"  fill="#fde68a" opacity="0.9" />
      </g>

      {/* lanky legs */}
      <g className="leg-left">
        <rect x="3"  y="23" width="5"  height="5"  fill="#0f172a" />
        <rect x="2"  y="27" width="6"  height="1"  fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="10" y="23" width="5"  height="5"  fill="#0f172a" />
        <rect x="10" y="27" width="6"  height="1"  fill="#020617" />
      </g>
    </svg>
  )
}

// ─── McGONAGALL ────────────────────────────────────────────────────────────────
// VERY tall stacked pointed hat, grey bun, dark robes with bright emerald trim, goblet
export function McGonagallCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="48" height="108" viewBox="0 0 16 36"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* tall stacked pointed hat — 9 pixel rows */}
      <rect x="7"  y="0"  width="2"  height="2"  fill="#0f172a" />
      <rect x="6"  y="2"  width="4"  height="2"  fill="#111827" />
      <rect x="5"  y="4"  width="6"  height="2"  fill="#0f172a" />
      <rect x="4"  y="6"  width="8"  height="2"  fill="#111827" />
      <rect x="3"  y="8"  width="10" height="2"  fill="#0f172a" />
      <rect x="1"  y="10" width="14" height="2"  fill="#0f172a" />  {/* brim */}
      <rect x="2"  y="10" width="12" height="1"  fill="#059669" />  {/* vivid green band */}
      <rect x="5"  y="4"  width="1"  height="6"  fill="#1e3a5f" opacity="0.3" />  {/* shadow */}

      {/* grey hair bun — sides */}
      <rect x="1"  y="11" width="3"  height="5"  fill="#6b7280" />
      <rect x="12" y="11" width="3"  height="5"  fill="#6b7280" />
      {/* hair bun back */}
      <rect x="3"  y="11" width="10" height="2"  fill="#4b5563" />

      {/* face — older warm tone */}
      <rect x="3"  y="12" width="10" height="8"  fill="#ddb896" className="char-body" />
      {/* eyes 2×2 + eyelids */}
      <rect x="5"  y="14" width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5" y="14" width="2" height="2" fill="#ddb896" />
      <rect x="9"  y="14" width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="9" y="14" width="2" height="2" fill="#ddb896" />
      {/* nose */}
      <rect x="7"  y="16" width="2"  height="2"  fill="#a08060" opacity="0.5" />
      {/* stern thin mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="6" y="18" width="4" height="2" fill="#7c2d12" />
        : <rect x="6" y="18" width="4" height="1" fill="#a08060" opacity="0.85" />}

      {/* emerald brooch */}
      <rect x="6"  y="21" width="4"  height="3"  fill="#065f46" />
      <rect x="7"  y="21" width="2"  height="3"  fill="#34d399" opacity="0.7" />

      {/* dark robe body — emerald centre stripe */}
      <rect x="3"  y="20" width="10" height="9"  fill="#0f172a" className="char-body" />
      <rect x="7"  y="20" width="2"  height="9"  fill="#059669" opacity="0.5" />
      <rect x="6"  y="20" width="4"  height="9"  fill="#065f46" opacity="0.25" />

      {/* left arm + goblet */}
      <g className="arm-left">
        <rect x="1"  y="20" width="2"  height="7"  fill="#0f172a" />
        <rect x="1"  y="27" width="2"  height="2"  fill="#d1d5db" />
        {/* goblet */}
        <rect x="-3" y="26" width="5"  height="6"  fill="#d97706" />
        <rect x="-3" y="26" width="5"  height="2"  fill="#fbbf24" />
        <rect x="-2" y="28" width="3"  height="1"  fill="#fde68a" opacity="0.6" />
      </g>
      {/* right arm */}
      <g className="arm-right">
        <rect x="13" y="20" width="2"  height="7"  fill="#0f172a" />
        <rect x="13" y="27" width="2"  height="2"  fill="#d1d5db" />
      </g>

      {/* short legs */}
      <g className="leg-left">
        <rect x="3"  y="29" width="5"  height="5"  fill="#020617" />
        <rect x="2"  y="33" width="6"  height="1"  fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="8"  y="29" width="5"  height="5"  fill="#020617" />
        <rect x="8"  y="33" width="6"  height="1"  fill="#020617" />
      </g>
    </svg>
  )
}

// ─── SNAPE ─────────────────────────────────────────────────────────────────────
// Long dark curtain hair, very pale face, dramatically wide billowing black robes
export function SnapeCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="66" height="90" viewBox="0 0 22 30"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* curtain hair — long dark panels flanking face */}
      <rect x="4"  y="0"  width="14" height="4"  fill="#0f172a" />
      <rect x="2"  y="2"  width="4"  height="12" fill="#111827" />
      <rect x="16" y="2"  width="4"  height="12" fill="#111827" />
      <rect x="3"  y="1"  width="3"  height="2"  fill="#1e293b" />  {/* slight sheen */}
      <rect x="16" y="1"  width="3"  height="2"  fill="#1e293b" />

      {/* pale face */}
      <rect x="5"  y="4"  width="12" height="8"  fill={SKIN_P} className="char-body" />
      {/* eyes 2×2 + eyelids */}
      <rect x="7"  y="6"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="7"  y="6"  width="2"  height="2"  fill={SKIN_P} />
      <rect x="13" y="6"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="13" y="6"  width="2"  height="2"  fill={SKIN_P} />
      {/* prominent hooked nose */}
      <rect x="10" y="8"  width="3"  height="2"  fill="#a08870" opacity="0.6" />
      <rect x="12" y="9"  width="2"  height="1"  fill="#a08870" opacity="0.7" />
      {/* thin disapproving mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="9" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="9" y="11" width="4" height="1" fill="#605040" opacity="0.9" />}

      {/* tall high collar */}
      <rect x="8"  y="12" width="6"  height="2"  fill="#1e293b" />
      <rect x="9"  y="12" width="4"  height="3"  fill="#0f172a" />

      {/* dramatically wide billowing black robes */}
      <rect x="1"  y="13" width="20" height="12" fill="#0a0a14" className="char-body" />
      <rect x="2"  y="13" width="4"  height="12" fill="#111827" opacity="0.6" />
      <rect x="16" y="13" width="4"  height="12" fill="#111827" opacity="0.4" />
      {/* subtle robe crease line */}
      <rect x="8"  y="13" width="1"  height="12" fill="#1e293b" opacity="0.4" />
      <rect x="13" y="13" width="1"  height="12" fill="#1e293b" opacity="0.3" />

      {/* arms — outstretched dramatically */}
      <g className="arm-left">
        <rect x="0"  y="13" width="1"  height="8"  fill="#0a0a14" />
        <rect x="0"  y="21" width="2"  height="2"  fill="#c0b0a0" />
      </g>
      <g className="arm-right">
        <rect x="21" y="13" width="1"  height="8"  fill="#0a0a14" />
        <rect x="20" y="21" width="2"  height="2"  fill="#c0b0a0" />
      </g>

      {/* legs — peeking from robes */}
      <g className="leg-left">
        <rect x="3"  y="25" width="6"  height="5"  fill="#080808" />
        <rect x="2"  y="29" width="7"  height="1"  fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="13" y="25" width="6"  height="5"  fill="#080808" />
        <rect x="13" y="29" width="7"  height="1"  fill="#020617" />
      </g>
    </svg>
  )
}

// ─── HAGRID ─────────────────────────────────────────────────────────────────────
// Giant — 2× scale, wild mountain of hair, massive beard, giant coat, lantern
export function HagridCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="84" height="108" viewBox="0 0 28 36"
      className={isWalking ? 'agent-walking' : ''} {...PX}>

      {/* GIANT wild tangled hair — fills top third */}
      <rect x="2"  y="0"  width="24" height="8"  fill="#44403c" />
      <rect x="0"  y="2"  width="5"  height="13" fill="#57534e" />
      <rect x="23" y="2"  width="5"  height="13" fill="#57534e" />
      <rect x="4"  y="0"  width="20" height="4"  fill="#6b7280" opacity="0.35" />
      <rect x="6"  y="0"  width="16" height="2"  fill="#9ca3af" opacity="0.15" />
      {/* wild stray strands */}
      <rect x="1"  y="0"  width="2"  height="4"  fill="#374151" />
      <rect x="25" y="0"  width="2"  height="4"  fill="#374151" />
      <rect x="4"  y="0"  width="2"  height="3"  fill="#78716c" />

      {/* big ruddy face */}
      <rect x="5"  y="7"  width="18" height="10" fill={SKIN_R} className="char-body" />
      {/* large eyes 3×2 + eyelids */}
      <rect x="7"  y="9"  width="4"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="7" y="9" width="4" height="2" fill={SKIN_R} />
      <rect x="17" y="9"  width="4"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="17" y="9" width="4" height="2" fill={SKIN_R} />
      {/* big nose */}
      <rect x="12" y="11" width="4"  height="3"  fill="#b07040" opacity="0.5" />
      {/* wide mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="10" y="14" width="8" height="3" fill="#7c2d12" />
        : <rect x="10" y="14" width="8" height="2" fill="#b07040" opacity="0.7" />}

      {/* MASSIVE bushy beard */}
      <rect x="4"  y="15" width="20" height="6"  fill="#57534e" />
      <rect x="5"  y="18" width="18" height="5"  fill="#44403c" />
      <rect x="6"  y="21" width="16" height="3"  fill="#57534e" />
      <rect x="3"  y="16" width="4"  height="8"  fill="#44403c" />
      <rect x="21" y="16" width="4"  height="8"  fill="#44403c" />

      {/* enormous brown coat */}
      <rect x="2"  y="21" width="24" height="10" fill="#7c3c0a" className="char-body" />
      <rect x="8"  y="21" width="12" height="10" fill="#92400e" opacity="0.4" />
      <rect x="12" y="21" width="4"  height="10" fill="#a05010" opacity="0.2" />
      {/* coat buttons */}
      <rect x="13" y="24" width="2"  height="2"  fill="#4a2a08" />
      <rect x="13" y="28" width="2"  height="2"  fill="#4a2a08" />

      {/* giant left arm + lantern */}
      <g className="arm-left">
        <rect x="0"  y="21" width="2"  height="9"  fill="#6b3008" />
        <rect x="0"  y="30" width="2"  height="3"  fill={SKIN_R} />
        {/* lantern */}
        <rect x="-5" y="29" width="6"  height="8"  fill="#92400e" />
        <rect x="-4" y="30" width="4"  height="6"  fill="#fde68a" opacity="0.6" />
        <rect x="-5" y="29" width="6"  height="2"  fill="#7c2d12" />
        <rect x="-2" y="27" width="2"  height="3"  fill="#a16207" />
      </g>
      {/* giant right arm */}
      <g className="arm-right">
        <rect x="26" y="21" width="2"  height="9"  fill="#6b3008" />
        <rect x="26" y="30" width="2"  height="3"  fill={SKIN_R} />
      </g>

      {/* thick legs */}
      <g className="leg-left">
        <rect x="3"  y="31" width="9"  height="5"  fill="#292524" />
        <rect x="2"  y="35" width="10" height="1"  fill="#1c1917" />
      </g>
      <g className="leg-right">
        <rect x="16" y="31" width="9"  height="5"  fill="#292524" />
        <rect x="16" y="35" width="10" height="1"  fill="#1c1917" />
      </g>
    </svg>
  )
}

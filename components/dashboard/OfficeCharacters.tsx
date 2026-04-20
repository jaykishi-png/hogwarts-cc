'use client'

import { useEffect, useRef, useState } from 'react'

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

// ─── DUMBLEDORE sprite-sheet constants ─────────────────────────────────────────
const DUMB_SHEET_W = 1684
const DUMB_SHEET_H = 2528
const DUMB_SCALE   = 0.25          // renders sheet at 421×632 px
const DUMB_DISP_W  = 80            // visible container width
const DUMB_DISP_H  = 120           // visible container height

// Per-animation row data (original pixel coordinates).
// x(i) → left edge of frame i, y → top of row, fw/fh → frame size, fps → speed
const DUMB_ANIM = {
  idle:     { n: 8, x: (i: number) => 39 + i * 202,        y: 45,   fw: 202, fh: 479, fps: 6 },
  walk:     { n: 8, x: (i: number) => 53 + i * 199,        y: 628,  fw: 199, fh: 426, fps: 8 },
  talking:  { n: 5, x: (i: number) => 52 + i * 318,        y: 1158, fw: 318, fh: 425, fps: 6 },
  working:  { n: 3, x: (i: number) => [53, 583, 1167][i],  y: 1661, fw: 530, fh: 452, fps: 3 },
  sleeping: { n: 3, x: (i: number) => 53  + i * 530,       y: 2191, fw: 530, fh: 292, fps: 2 },
} as const
type DumbAnimKey = keyof typeof DUMB_ANIM

// ─── DUMBLEDORE ────────────────────────────────────────────────────────────────
// Sprite-sheet animation from public/agents/DUMBLEDORE_sprite.png
export function DumbledoreCharacter({ isWalking, status }: CharProps) {
  const animKey: DumbAnimKey =
    isWalking               ? 'walk'     :
    status === 'in-meeting' ? 'talking'  :
    status === 'working'    ? 'working'  :
    status === 'away'       ? 'sleeping' :
    'idle'

  const [frame, setFrame] = useState(0)
  const prevKey = useRef(animKey)

  useEffect(() => {
    if (prevKey.current !== animKey) {
      prevKey.current = animKey
      setFrame(0)
    }
    const anim = DUMB_ANIM[animKey]
    const id = setInterval(() => setFrame(f => (f + 1) % anim.n), 1000 / anim.fps)
    return () => clearInterval(id)
  }, [animKey])

  const anim   = DUMB_ANIM[animKey]
  const scaledX  = anim.x(frame) * DUMB_SCALE
  const scaledY  = anim.y        * DUMB_SCALE
  const scaledFW = anim.fw       * DUMB_SCALE
  const scaledFH = anim.fh       * DUMB_SCALE

  // Center frame inside the fixed display box (clip if frame is wider/taller)
  const bgX = Math.round(-scaledX + (DUMB_DISP_W - scaledFW) / 2)
  const bgY = Math.round(-scaledY + (DUMB_DISP_H - scaledFH) / 2)

  return (
    <div style={{
      width:              DUMB_DISP_W,
      height:             DUMB_DISP_H,
      backgroundImage:    'url(/agents/DUMBLEDORE_sprite.png)',
      backgroundSize:     `${Math.round(DUMB_SHEET_W * DUMB_SCALE)}px ${Math.round(DUMB_SHEET_H * DUMB_SCALE)}px`,
      backgroundPosition: `${bgX}px ${bgY}px`,
      backgroundRepeat:   'no-repeat',
      imageRendering:     'pixelated',
      overflow:           'hidden',
    }} />
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

// ─── LUNA ──────────────────────────────────────────────────────────────────────
// Wispy blonde hair, dreamy silver-blue eyes, radish earrings, silver-blue robes
export function LunaCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* wispy blonde hair */}
      <rect x="1"  y="0"  width="16" height="5"  fill="#fde68a" />
      <rect x="0"  y="2"  width="3"  height="8"  fill="#fef3c7" />
      <rect x="15" y="2"  width="3"  height="8"  fill="#fef3c7" />
      <rect x="2"  y="0"  width="14" height="2"  fill="#fef9c3" />
      {/* radish earrings */}
      <rect x="-1" y="8"  width="2"  height="3"  fill="#f97316" />
      <rect x="17" y="8"  width="2"  height="3"  fill="#f97316" />
      {/* face */}
      <rect x="3"  y="4"  width="12" height="8"  fill={SKIN} className="char-body" />
      <rect x="5"  y="6"  width="2"  height="2"  fill="#7dd3fc" />
      <rect className="eyelid eyelid-l" x="5"  y="6"  width="2" height="2" fill={SKIN} />
      <rect x="11" y="6"  width="2"  height="2"  fill="#7dd3fc" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2" height="2" fill={SKIN} />
      <rect x="8"  y="8"  width="2"  height="1"  fill="#c8905a" opacity="0.4" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="10" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="10" width="4" height="1" fill="#b07040" opacity="0.7" />}
      {/* silver-blue robes */}
      <rect x="3"  y="12" width="12" height="9"  fill="#bae6fd" className="char-body" />
      <rect x="7"  y="12" width="4"  height="9"  fill="#e0f2fe" opacity="0.4" />
      <g className="arm-left">
        <rect x="1"  y="12" width="2" height="6" fill="#7dd3fc" />
        <rect x="1"  y="18" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="12" width="2" height="6" fill="#7dd3fc" />
        <rect x="15" y="18" width="2" height="2" fill={SKIN} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="21" width="5" height="5" fill="#0369a1" />
        <rect x="2"  y="25" width="6" height="1" fill="#0c4a6e" />
      </g>
      <g className="leg-right">
        <rect x="10" y="21" width="5" height="5" fill="#0369a1" />
        <rect x="10" y="25" width="6" height="1" fill="#0c4a6e" />
      </g>
    </svg>
  )
}

// ─── GINNY ─────────────────────────────────────────────────────────────────────
// Short straight red hair, maroon Gryffindor robes, bold and athletic
export function GinnyCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* straight red hair */}
      <rect x="2"  y="0"  width="14" height="5"  fill="#b91c1c" />
      <rect x="1"  y="2"  width="3"  height="8"  fill="#dc2626" />
      <rect x="14" y="2"  width="3"  height="8"  fill="#dc2626" />
      <rect x="3"  y="0"  width="12" height="2"  fill="#ef4444" />
      {/* face */}
      <rect x="3"  y="4"  width="12" height="8"  fill={SKIN} className="char-body" />
      <rect x="5"  y="6"  width="2"  height="2"  fill="#92400e" />
      <rect className="eyelid eyelid-l" x="5"  y="6"  width="2" height="2" fill={SKIN} />
      <rect x="11" y="6"  width="2"  height="2"  fill="#92400e" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2" height="2" fill={SKIN} />
      <rect x="8"  y="8"  width="2"  height="1"  fill="#c8905a" opacity="0.4" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="10" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="10" width="4" height="1" fill="#b07040" opacity="0.8" />}
      {/* maroon Gryffindor robes */}
      <rect x="3"  y="12" width="12" height="9"  fill="#7f1d1d" className="char-body" />
      <rect x="6"  y="12" width="6"  height="9"  fill="#991b1b" opacity="0.5" />
      <rect x="3"  y="12" width="12" height="1"  fill="#fbbf24" opacity="0.5" />
      <g className="arm-left">
        <rect x="1"  y="12" width="2" height="6" fill="#7f1d1d" />
        <rect x="1"  y="18" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="12" width="2" height="6" fill="#7f1d1d" />
        <rect x="15" y="18" width="2" height="2" fill={SKIN} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="21" width="5" height="5" fill="#450a0a" />
        <rect x="2"  y="25" width="6" height="1" fill="#111827" />
      </g>
      <g className="leg-right">
        <rect x="10" y="21" width="5" height="5" fill="#450a0a" />
        <rect x="10" y="25" width="6" height="1" fill="#111827" />
      </g>
    </svg>
  )
}

// ─── NEVILLE ───────────────────────────────────────────────────────────────────
// Round brown hair, Gryffindor robes, holds small plant, reliable steady expression
export function NevilleCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* round brown hair */}
      <rect x="2"  y="0"  width="14" height="6"  fill="#78350f" />
      <rect x="1"  y="2"  width="3"  height="6"  fill="#92400e" />
      <rect x="14" y="2"  width="3"  height="6"  fill="#92400e" />
      <rect x="3"  y="0"  width="12" height="3"  fill="#a16207" />
      {/* round chubby face */}
      <rect x="2"  y="5"  width="14" height="9"  fill={SKIN} className="char-body" />
      <rect x="5"  y="7"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5"  y="7"  width="2" height="2" fill={SKIN} />
      <rect x="11" y="7"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="7"  width="2" height="2" fill={SKIN} />
      <rect x="8"  y="9"  width="2"  height="2"  fill="#c8905a" opacity="0.45" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="11" width="4" height="1" fill="#b07040" opacity="0.8" />}
      {/* Gryffindor robes */}
      <rect x="2"  y="14" width="14" height="8"  fill="#1c1917" className="char-body" />
      <rect x="7"  y="14" width="4"  height="8"  fill="#7f1d1d" opacity="0.4" />
      <g className="arm-left">
        <rect x="0"  y="14" width="2" height="6" fill="#1c1917" />
        <rect x="0"  y="20" width="2" height="2" fill={SKIN} />
        {/* small potted plant */}
        <rect x="-3" y="19" width="4" height="4" fill="#15803d" />
        <rect x="-2" y="22" width="2" height="2" fill="#92400e" />
        <rect x="-3" y="17" width="2" height="3" fill="#16a34a" />
        <rect x="-1" y="16" width="2" height="4" fill="#15803d" />
        <rect x="0"  y="17" width="2" height="3" fill="#22c55e" opacity="0.7" />
      </g>
      <g className="arm-right">
        <rect x="16" y="14" width="2" height="6" fill="#1c1917" />
        <rect x="16" y="20" width="2" height="2" fill={SKIN} />
      </g>
      <g className="leg-left">
        <rect x="2"  y="22" width="5" height="4" fill="#111827" />
        <rect x="2"  y="25" width="6" height="1" fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="11" y="22" width="5" height="4" fill="#111827" />
        <rect x="11" y="25" width="6" height="1" fill="#020617" />
      </g>
    </svg>
  )
}

// ─── DRACO ─────────────────────────────────────────────────────────────────────
// Slicked silver-blonde hair, pale, Slytherin green robes, snake badge, smug
export function DracoCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* slicked back silver-blonde hair */}
      <rect x="2"  y="0"  width="14" height="4"  fill="#e2e8f0" />
      <rect x="3"  y="1"  width="12" height="3"  fill="#f1f5f9" />
      <rect x="4"  y="0"  width="10" height="2"  fill="#f8fafc" />
      {/* pale face */}
      <rect x="3"  y="4"  width="12" height="8"  fill={SKIN_P} className="char-body" />
      <rect x="5"  y="6"  width="2"  height="2"  fill="#64748b" />
      <rect className="eyelid eyelid-l" x="5"  y="6"  width="2" height="2" fill={SKIN_P} />
      <rect x="11" y="6"  width="2"  height="2"  fill="#64748b" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2" height="2" fill={SKIN_P} />
      <rect x="8"  y="8"  width="2"  height="1"  fill="#a89070" opacity="0.4" />
      {/* smug thin mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="8" y="10" width="3" height="2" fill="#5c2d12" />
        : <rect x="8" y="10" width="4" height="1" fill="#a08060" opacity="0.9" />}
      {/* Slytherin green robes */}
      <rect x="3"  y="12" width="12" height="9"  fill="#064e3b" className="char-body" />
      <rect x="6"  y="12" width="6"  height="9"  fill="#065f46" opacity="0.5" />
      {/* silver snake badge */}
      <rect x="5"  y="14" width="4"  height="4"  fill="#166534" />
      <rect x="6"  y="15" width="2"  height="2"  fill="#86efac" opacity="0.6" />
      <g className="arm-left">
        <rect x="1"  y="12" width="2" height="6" fill="#064e3b" />
        <rect x="1"  y="18" width="2" height="2" fill={SKIN_P} />
      </g>
      <g className="arm-right">
        <rect x="15" y="12" width="2" height="6" fill="#064e3b" />
        <rect x="15" y="18" width="2" height="2" fill={SKIN_P} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="21" width="5" height="5" fill="#022c22" />
        <rect x="2"  y="25" width="6" height="1" fill="#111827" />
      </g>
      <g className="leg-right">
        <rect x="10" y="21" width="5" height="5" fill="#022c22" />
        <rect x="10" y="25" width="6" height="1" fill="#111827" />
      </g>
    </svg>
  )
}

// ─── SIRIUS ────────────────────────────────────────────────────────────────────
// Dark messy hair, sharp grey eyes, dark leather jacket, confident
export function SiriusCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* dark messy hair */}
      <rect x="1"  y="0"  width="16" height="6"  fill="#111827" />
      <rect x="0"  y="2"  width="4"  height="8"  fill="#1f2937" />
      <rect x="14" y="2"  width="4"  height="8"  fill="#1f2937" />
      <rect x="2"  y="0"  width="14" height="3"  fill="#374151" />
      <rect x="3"  y="0"  width="4"  height="2"  fill="#4b5563" />
      <rect x="10" y="0"  width="3"  height="3"  fill="#4b5563" />
      {/* face */}
      <rect x="3"  y="5"  width="12" height="8"  fill={SKIN} className="char-body" />
      <rect x="5"  y="7"  width="2"  height="2"  fill="#64748b" />
      <rect className="eyelid eyelid-l" x="5"  y="7"  width="2" height="2" fill={SKIN} />
      <rect x="11" y="7"  width="2"  height="2"  fill="#64748b" />
      <rect className="eyelid eyelid-r" x="11" y="7"  width="2" height="2" fill={SKIN} />
      <rect x="8"  y="9"  width="2"  height="2"  fill="#c8905a" opacity="0.4" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="11" width="4" height="1" fill="#b07040" opacity="0.8" />}
      {/* dark leather jacket */}
      <rect x="3"  y="13" width="12" height="9"  fill="#1c1917" className="char-body" />
      <rect x="7"  y="13" width="4"  height="9"  fill="#292524" opacity="0.7" />
      <rect x="7"  y="13" width="4"  height="2"  fill="#44403c" opacity="0.6" />
      <g className="arm-left">
        <rect x="1"  y="13" width="2" height="7" fill="#1c1917" />
        <rect x="1"  y="20" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="13" width="2" height="7" fill="#1c1917" />
        <rect x="15" y="20" width="2" height="2" fill={SKIN} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="22" width="5" height="4" fill="#111827" />
        <rect x="2"  y="25" width="6" height="1" fill="#030712" />
      </g>
      <g className="leg-right">
        <rect x="10" y="22" width="5" height="4" fill="#111827" />
        <rect x="10" y="25" width="6" height="1" fill="#030712" />
      </g>
    </svg>
  )
}

// ─── LUPIN ─────────────────────────────────────────────────────────────────────
// Sandy greying hair, tired kind eyes, worn patched brown robes
export function LupinCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* sandy greying hair */}
      <rect x="2"  y="0"  width="14" height="5"  fill="#a16207" />
      <rect x="1"  y="2"  width="3"  height="7"  fill="#ca8a04" />
      <rect x="14" y="2"  width="3"  height="7"  fill="#ca8a04" />
      <rect x="3"  y="0"  width="12" height="2"  fill="#d4a472" />
      {/* grey streaks */}
      <rect x="5"  y="0"  width="2"  height="4"  fill="#9ca3af" opacity="0.5" />
      <rect x="11" y="1"  width="2"  height="3"  fill="#9ca3af" opacity="0.4" />
      {/* tired face */}
      <rect x="3"  y="4"  width="12" height="8"  fill={SKIN} className="char-body" />
      <rect x="5"  y="6"  width="2"  height="2"  fill="#92400e" />
      <rect className="eyelid eyelid-l" x="5"  y="6"  width="2" height="2" fill={SKIN} />
      <rect x="11" y="6"  width="2"  height="2"  fill="#92400e" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2" height="2" fill={SKIN} />
      {/* under-eye shadows */}
      <rect x="5"  y="8"  width="3"  height="1"  fill="#c8905a" opacity="0.3" />
      <rect x="10" y="8"  width="3"  height="1"  fill="#c8905a" opacity="0.3" />
      <rect x="8"  y="8"  width="2"  height="1"  fill="#c8905a" opacity="0.4" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="11" width="4" height="1" fill="#b07040" opacity="0.8" />}
      {/* worn brown patched robes */}
      <rect x="3"  y="12" width="12" height="9"  fill="#78350f" className="char-body" />
      <rect x="6"  y="12" width="6"  height="9"  fill="#92400e" opacity="0.4" />
      {/* patches */}
      <rect x="4"  y="15" width="3"  height="3"  fill="#a16207" opacity="0.6" />
      <rect x="12" y="17" width="3"  height="2"  fill="#854d0e" opacity="0.7" />
      <g className="arm-left">
        <rect x="1"  y="12" width="2" height="6" fill="#78350f" />
        <rect x="1"  y="18" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="12" width="2" height="6" fill="#78350f" />
        <rect x="15" y="18" width="2" height="2" fill={SKIN} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="21" width="5" height="5" fill="#431407" />
        <rect x="2"  y="25" width="6" height="1" fill="#1c0a00" />
      </g>
      <g className="leg-right">
        <rect x="10" y="21" width="5" height="5" fill="#431407" />
        <rect x="10" y="25" width="6" height="1" fill="#1c0a00" />
      </g>
    </svg>
  )
}

// ─── FRED ──────────────────────────────────────────────────────────────────────
// Wild orange hair, freckles, purple/orange Weasley joke-shop colors, big grin
export function FredCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* wild orange hair */}
      <rect x="1"  y="0"  width="16" height="6"  fill="#c2410c" />
      <rect x="0"  y="2"  width="3"  height="9"  fill="#ea580c" />
      <rect x="15" y="2"  width="3"  height="9"  fill="#ea580c" />
      <rect x="2"  y="0"  width="14" height="3"  fill="#f97316" />
      <rect x="4"  y="0"  width="10" height="2"  fill="#fb923c" />
      {/* freckled face */}
      <rect x="3"  y="5"  width="12" height="8"  fill={SKIN} className="char-body" />
      <rect x="4"  y="9"  width="2"  height="1"  fill="#92400e" opacity="0.55" />
      <rect x="12" y="9"  width="2"  height="1"  fill="#92400e" opacity="0.55" />
      <rect x="7"  y="10" width="1"  height="1"  fill="#92400e" opacity="0.4" />
      <rect x="10" y="10" width="1"  height="1"  fill="#92400e" opacity="0.4" />
      <rect x="5"  y="6"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5"  y="6"  width="2" height="2" fill={SKIN} />
      <rect x="11" y="6"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2" height="2" fill={SKIN} />
      <rect x="8"  y="8"  width="2"  height="1"  fill="#c8905a" opacity="0.4" />
      {/* big grin */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="6" y="10" width="6" height="2" fill="#7c2d12" />
        : <rect x="6" y="10" width="6" height="1" fill="#b07040" opacity="0.9" />}
      {/* purple/orange joke shop jacket */}
      <rect x="3"  y="13" width="12" height="9"  fill="#7c3aed" className="char-body" />
      <rect x="6"  y="13" width="6"  height="9"  fill="#f97316" opacity="0.35" />
      <rect x="5"  y="15" width="3"  height="4"  fill="#f97316" opacity="0.5" />
      <g className="arm-left">
        <rect x="1"  y="13" width="2" height="6" fill="#7c3aed" />
        <rect x="1"  y="19" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="13" width="2" height="6" fill="#7c3aed" />
        <rect x="15" y="19" width="2" height="2" fill={SKIN} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="22" width="5" height="4" fill="#f97316" />
        <rect x="2"  y="25" width="6" height="1" fill="#c2410c" />
      </g>
      <g className="leg-right">
        <rect x="10" y="22" width="5" height="4" fill="#f97316" />
        <rect x="10" y="25" width="6" height="1" fill="#c2410c" />
      </g>
    </svg>
  )
}

// ─── GEORGE ────────────────────────────────────────────────────────────────────
// Same as Fred but left ear is scarred/missing — the tell-tale difference
export function GeorgeCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* wild orange hair — same as Fred */}
      <rect x="1"  y="0"  width="16" height="6"  fill="#c2410c" />
      <rect x="0"  y="2"  width="3"  height="9"  fill="#ea580c" />
      <rect x="15" y="2"  width="3"  height="9"  fill="#ea580c" />
      <rect x="2"  y="0"  width="14" height="3"  fill="#f97316" />
      {/* freckled face */}
      <rect x="3"  y="5"  width="12" height="8"  fill={SKIN} className="char-body" />
      {/* missing left ear — scarred skin patch */}
      <rect x="2"  y="8"  width="2"  height="4"  fill="#e09060" opacity="0.7" />
      <rect x="1"  y="9"  width="2"  height="2"  fill="#c87850" opacity="0.5" />
      <rect x="4"  y="9"  width="2"  height="1"  fill="#92400e" opacity="0.55" />
      <rect x="12" y="9"  width="2"  height="1"  fill="#92400e" opacity="0.55" />
      <rect x="5"  y="6"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5"  y="6"  width="2" height="2" fill={SKIN} />
      <rect x="11" y="6"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2" height="2" fill={SKIN} />
      <rect x="8"  y="8"  width="2"  height="1"  fill="#c8905a" opacity="0.4" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="6" y="10" width="6" height="2" fill="#7c2d12" />
        : <rect x="6" y="10" width="6" height="1" fill="#b07040" opacity="0.9" />}
      {/* purple/orange joke shop jacket — slightly different shade */}
      <rect x="3"  y="13" width="12" height="9"  fill="#6d28d9" className="char-body" />
      <rect x="6"  y="13" width="6"  height="9"  fill="#ea580c" opacity="0.35" />
      <rect x="12" y="15" width="3"  height="4"  fill="#ea580c" opacity="0.5" />
      <g className="arm-left">
        <rect x="1"  y="13" width="2" height="6" fill="#6d28d9" />
        <rect x="1"  y="19" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="13" width="2" height="6" fill="#6d28d9" />
        <rect x="15" y="19" width="2" height="2" fill={SKIN} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="22" width="5" height="4" fill="#ea580c" />
        <rect x="2"  y="25" width="6" height="1" fill="#c2410c" />
      </g>
      <g className="leg-right">
        <rect x="10" y="22" width="5" height="4" fill="#ea580c" />
        <rect x="10" y="25" width="6" height="1" fill="#c2410c" />
      </g>
    </svg>
  )
}

// ─── FLEUR ─────────────────────────────────────────────────────────────────────
// Long silver-blonde hair, pale elegant face, blue Beauxbatons robes
export function FleurCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* long silver-blonde flowing hair */}
      <rect x="2"  y="0"  width="14" height="6"  fill="#e2e8f0" />
      <rect x="0"  y="2"  width="4"  height="14" fill="#f1f5f9" />
      <rect x="14" y="2"  width="4"  height="14" fill="#f1f5f9" />
      <rect x="2"  y="0"  width="14" height="2"  fill="#f8fafc" />
      {/* pale elegant face */}
      <rect x="3"  y="4"  width="12" height="8"  fill={SKIN_P} className="char-body" />
      <rect x="5"  y="6"  width="2"  height="2"  fill="#60a5fa" />
      <rect className="eyelid eyelid-l" x="5"  y="6"  width="2" height="2" fill={SKIN_P} />
      <rect x="11" y="6"  width="2"  height="2"  fill="#60a5fa" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2" height="2" fill={SKIN_P} />
      <rect x="8"  y="8"  width="2"  height="1"  fill="#a89070" opacity="0.35" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="10" width="4" height="2" fill="#5c2d12" />
        : <rect x="7" y="10" width="4" height="1" fill="#a08060" opacity="0.8" />}
      {/* elegant blue Beauxbatons robes */}
      <rect x="3"  y="12" width="12" height="9"  fill="#1d4ed8" className="char-body" />
      <rect x="6"  y="12" width="6"  height="9"  fill="#3b82f6" opacity="0.35" />
      <rect x="3"  y="12" width="12" height="1"  fill="#93c5fd" opacity="0.5" />
      <g className="arm-left">
        <rect x="1"  y="12" width="2" height="6" fill="#1d4ed8" />
        <rect x="1"  y="18" width="2" height="2" fill={SKIN_P} />
      </g>
      <g className="arm-right">
        <rect x="15" y="12" width="2" height="6" fill="#1d4ed8" />
        <rect x="15" y="18" width="2" height="2" fill={SKIN_P} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="21" width="5" height="5" fill="#1e40af" />
        <rect x="2"  y="25" width="6" height="1" fill="#1e3a8a" />
      </g>
      <g className="leg-right">
        <rect x="10" y="21" width="5" height="5" fill="#1e40af" />
        <rect x="10" y="25" width="6" height="1" fill="#1e3a8a" />
      </g>
    </svg>
  )
}

// ─── MOODY ─────────────────────────────────────────────────────────────────────
// Scarred face, one glowing blue magical eye, grey hair patches, dark cloak
export function MoodyCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* grey/brown patchy hair */}
      <rect x="2"  y="0"  width="14" height="5"  fill="#374151" />
      <rect x="1"  y="2"  width="3"  height="7"  fill="#4b5563" />
      <rect x="14" y="2"  width="3"  height="7"  fill="#4b5563" />
      <rect x="3"  y="0"  width="5"  height="3"  fill="#6b7280" />
      <rect x="10" y="1"  width="4"  height="2"  fill="#78350f" opacity="0.5" />
      {/* scarred face */}
      <rect x="3"  y="4"  width="12" height="8"  fill={SKIN} className="char-body" />
      {/* scars — uneven skin patches */}
      <rect x="5"  y="5"  width="4"  height="3"  fill="#c87850" opacity="0.35" />
      <rect x="10" y="6"  width="3"  height="4"  fill="#d08850" opacity="0.3" />
      <rect x="4"  y="8"  width="2"  height="3"  fill="#b87040" opacity="0.4" />
      {/* normal eye */}
      <rect x="11" y="6"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2" height="2" fill={SKIN} />
      {/* magical spinning blue eye — bright and glowing */}
      <rect x="4"  y="6"  width="4"  height="4"  fill="#0ea5e9" />
      <rect x="5"  y="7"  width="2"  height="2"  fill="#e0f2fe" opacity="0.8" />
      <rect x="4"  y="6"  width="4"  height="4"  fill="none" stroke="#38bdf8" strokeWidth="0.5" />
      <rect x="8"  y="9"  width="2"  height="1"  fill="#c8905a" opacity="0.4" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="11" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="11" width="3" height="1" fill="#b07040" opacity="0.7" />}
      {/* dark traveling cloak */}
      <rect x="3"  y="12" width="12" height="9"  fill="#111827" className="char-body" />
      <rect x="6"  y="12" width="6"  height="9"  fill="#1f2937" opacity="0.6" />
      <g className="arm-left">
        <rect x="1"  y="12" width="2" height="7" fill="#111827" />
        <rect x="1"  y="19" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="12" width="2" height="7" fill="#111827" />
        <rect x="15" y="19" width="2" height="2" fill={SKIN} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="21" width="5" height="5" fill="#030712" />
        <rect x="2"  y="25" width="6" height="1" fill="#000000" />
      </g>
      <g className="leg-right">
        <rect x="10" y="21" width="4" height="5" fill="#030712" />
        {/* wooden leg hint — different color */}
        <rect x="13" y="21" width="2" height="5" fill="#78350f" />
        <rect x="10" y="25" width="6" height="1" fill="#000000" />
      </g>
    </svg>
  )
}

// ─── TRELAWNEY ─────────────────────────────────────────────────────────────────
// Wild frizzy hair, enormous magnifying spectacles, purple mystical robes, crystal ball
export function TrelawneyCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="96" viewBox="0 0 18 32" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* wild frizzy hair explosion */}
      <rect x="0"  y="0"  width="18" height="7"  fill="#92400e" />
      <rect x="0"  y="0"  width="3"  height="12" fill="#78350f" />
      <rect x="15" y="0"  width="3"  height="12" fill="#78350f" />
      <rect x="1"  y="0"  width="16" height="3"  fill="#b45309" />
      <rect x="2"  y="0"  width="4"  height="2"  fill="#d97706" />
      <rect x="12" y="0"  width="4"  height="2"  fill="#d97706" />
      <rect x="7"  y="0"  width="4"  height="1"  fill="#fbbf24" opacity="0.5" />
      <rect x="-1" y="3"  width="2"  height="6"  fill="#78350f" />
      <rect x="17" y="3"  width="2"  height="6"  fill="#78350f" />
      {/* pale face */}
      <rect x="3"  y="6"  width="12" height="8"  fill={SKIN_P} className="char-body" />
      {/* HUGE magnifying spectacles */}
      <rect x="3"  y="8"  width="5"  height="4"  fill="none" stroke="#b45309" strokeWidth="1" />
      <rect x="10" y="8"  width="5"  height="4"  fill="none" stroke="#b45309" strokeWidth="1" />
      <rect x="8"  y="9"  width="2"  height="2"  fill="#b45309" />
      <rect x="2"  y="9"  width="2"  height="2"  fill="#b45309" opacity="0.5" />
      <rect x="15" y="9"  width="2"  height="2"  fill="#b45309" opacity="0.5" />
      {/* big magnified eyes behind glasses */}
      <rect x="4"  y="9"  width="3"  height="2"  fill="#60a5fa" />
      <rect x="5"  y="9"  width="1"  height="1"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="4"  y="9"  width="3" height="2" fill={SKIN_P} />
      <rect x="11" y="9"  width="3"  height="2"  fill="#60a5fa" />
      <rect x="12" y="9"  width="1"  height="1"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="9"  width="3" height="2" fill={SKIN_P} />
      <rect x="8"  y="11" width="2"  height="1"  fill="#a89070" opacity="0.4" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="12" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="12" width="4" height="1" fill="#a08060" opacity="0.8" />}
      {/* purple mystical robes with shawls */}
      <rect x="2"  y="14" width="14" height="10" fill="#6d28d9" className="char-body" />
      <rect x="5"  y="14" width="8"  height="10" fill="#7c3aed" opacity="0.4" />
      <rect x="1"  y="15" width="3"  height="8"  fill="#9333ea" opacity="0.5" />
      <rect x="14" y="15" width="3"  height="8"  fill="#9333ea" opacity="0.5" />
      <g className="arm-left">
        <rect x="0"  y="14" width="2" height="7" fill="#6d28d9" />
        <rect x="0"  y="21" width="2" height="2" fill={SKIN_P} />
        {/* crystal ball */}
        <rect x="-3" y="20" width="4" height="4" fill="#a5b4fc" opacity="0.7" />
        <rect x="-2" y="21" width="2" height="2" fill="#e0e7ff" opacity="0.6" />
      </g>
      <g className="arm-right">
        <rect x="16" y="14" width="2" height="7" fill="#6d28d9" />
        <rect x="16" y="21" width="2" height="2" fill={SKIN_P} />
      </g>
      <g className="leg-left">
        <rect x="2"  y="24" width="6" height="5" fill="#4c1d95" />
        <rect x="1"  y="28" width="7" height="1" fill="#3b0764" />
      </g>
      <g className="leg-right">
        <rect x="10" y="24" width="6" height="5" fill="#4c1d95" />
        <rect x="10" y="28" width="7" height="1" fill="#3b0764" />
      </g>
    </svg>
  )
}

// ─── DOBBY ─────────────────────────────────────────────────────────────────────
// Giant head, ENORMOUS ears, huge luminous eyes, pillowcase outfit — unique proportions
export function DobbyCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="66" height="72" viewBox="0 0 22 24" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* ENORMOUS ears — extend far to the sides */}
      <rect x="-3" y="3"  width="5"  height="7"  fill="#c8a880" />
      <rect x="-4" y="4"  width="4"  height="5"  fill="#b89870" />
      <rect x="-2" y="5"  width="2"  height="3"  fill="#e0c090" opacity="0.6" />
      <rect x="20" y="3"  width="5"  height="7"  fill="#c8a880" />
      <rect x="22" y="4"  width="4"  height="5"  fill="#b89870" />
      <rect x="21" y="5"  width="2"  height="3"  fill="#e0c090" opacity="0.6" />
      {/* giant rounded head — 45% of total height */}
      <rect x="2"  y="0"  width="18" height="11" fill="#c8a880" className="char-body" />
      <rect x="3"  y="0"  width="16" height="2"  fill="#d8b890" />
      {/* HUGE luminous eyes */}
      <rect x="4"  y="3"  width="5"  height="4"  fill="#86efac" />
      <rect x="5"  y="4"  width="3"  height="2"  fill="#4ade80" />
      <rect x="6"  y="4"  width="1"  height="1"  fill="#1c1917" />
      <rect x="5"  y="3"  width="2"  height="1"  fill="#bbf7d0" opacity="0.8" />
      <rect className="eyelid eyelid-l" x="4"  y="3"  width="5" height="4" fill="#c8a880" />
      <rect x="13" y="3"  width="5"  height="4"  fill="#86efac" />
      <rect x="14" y="4"  width="3"  height="2"  fill="#4ade80" />
      <rect x="15" y="4"  width="1"  height="1"  fill="#1c1917" />
      <rect x="14" y="3"  width="2"  height="1"  fill="#bbf7d0" opacity="0.8" />
      <rect className="eyelid eyelid-r" x="13" y="3"  width="5" height="4" fill="#c8a880" />
      {/* long pointy nose */}
      <rect x="10" y="7"  width="2"  height="3"  fill="#b09070" />
      <rect x="9"  y="9"  width="4"  height="1"  fill="#a08060" />
      {/* mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="8" y="9" width="6" height="2" fill="#7c4020" />
        : <rect x="8" y="9" width="6" height="1" fill="#a07050" opacity="0.8" />}
      {/* pillowcase body */}
      <rect x="5"  y="11" width="12" height="8"  fill="#f5f5dc" className="char-body" />
      <rect x="7"  y="11" width="8"  height="8"  fill="#fffde7" opacity="0.5" />
      {/* pillowcase opening */}
      <rect x="5"  y="11" width="12" height="1"  fill="#d6d5b0" />
      <g className="arm-left">
        <rect x="2"  y="12" width="3" height="5" fill="#c8a880" />
        <rect x="2"  y="17" width="3" height="2" fill="#b89870" />
      </g>
      <g className="arm-right">
        <rect x="17" y="12" width="3" height="5" fill="#c8a880" />
        <rect x="17" y="17" width="3" height="2" fill="#b89870" />
      </g>
      <g className="leg-left">
        <rect x="6"  y="19" width="4" height="4" fill="#c8a880" />
        <rect x="5"  y="22" width="5" height="1" fill="#b89870" />
      </g>
      <g className="leg-right">
        <rect x="12" y="19" width="4" height="4" fill="#c8a880" />
        <rect x="12" y="22" width="5" height="1" fill="#b89870" />
      </g>
    </svg>
  )
}

// ─── PERCY ─────────────────────────────────────────────────────────────────────
// Neat parted red hair, round glasses, formal Gryffindor/prefect robes, prefect badge
export function ArthurCharacter({ isWalking, status }: CharProps) {
  const HAIR    = '#c0401a'  // sparse red hair — sides/back only
  const ROBES   = '#3a4a6a'  // dark navy Ministry robes
  const BADGE   = '#d4a030'  // gold Ministry badge
  const GLASSES = '#888888'
  const statusColor =
    status === 'online'      ? '#22c55e' :
    status === 'working'     ? '#3b82f6' :
    status === 'in-meeting'  ? '#ef4444' :
    /* away */                 '#eab308'
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" aria-label="ARTHUR"
         className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* bald crown — no hair pixels at y=1-2 center */}
      <rect x="3"  y="1"  width="12" height="7"  fill={SKIN} className="char-body" />
      {/* receding red hair — sides and back ring only */}
      <rect x="2"  y="3"  width="2"  height="4"  fill={HAIR} />
      <rect x="14" y="3"  width="2"  height="4"  fill={HAIR} />
      <rect x="3"  y="6"  width="12" height="2"  fill={HAIR} />
      {/* wire-rimmed glasses — two small grey outlines at y=4 */}
      <rect x="4"  y="4"  width="3"  height="2"  fill="none" stroke={GLASSES} strokeWidth="0.5" />
      <rect x="11" y="4"  width="3"  height="2"  fill="none" stroke={GLASSES} strokeWidth="0.5" />
      <rect x="7"  y="5"  width="4"  height="1"  fill={GLASSES} opacity="0.6" />
      {/* eyes behind glasses */}
      <rect x="5"  y="5"  width="2"  height="1"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5"  y="5"  width="2" height="1" fill={SKIN} />
      <rect x="12" y="5"  width="2"  height="1"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="12" y="5"  width="2" height="1" fill={SKIN} />
      {/* nose */}
      <rect x="8"  y="6"  width="2"  height="1"  fill="#c8905a" opacity="0.4" />
      {/* warm smile */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="6" y="9" width="6" height="2" fill="#7c2d12" />
        : <rect x="6"  y="9"  width="6"  height="1"  fill="#b07040" opacity="0.9" />}
      {/* Ministry robes — slightly wider torso */}
      <rect x="3"  y="10" width="12" height="10" fill={ROBES} className="char-body" />
      {/* robe front opening / lapel */}
      <rect x="8"  y="10" width="2"  height="10" fill={ROBES} opacity="0.5" />
      <rect x="7"  y="10" width="1"  height="10" fill="#2a3a5a" />
      <rect x="10" y="10" width="1"  height="10" fill="#2a3a5a" />
      {/* slight belly — wider at mid-torso */}
      <rect x="2"  y="13" width="14" height="4"  fill={ROBES} />
      {/* gold Ministry badge — left chest */}
      <rect x="4"  y="12" width="3"  height="3"  fill={BADGE} />
      <rect x="5"  y="13" width="1"  height="1"  fill="#a07820" />
      <g className="arm-left">
        <rect x="1"  y="10" width="2" height="7" fill={ROBES} />
        <rect x="1"  y="17" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="10" width="2" height="7" fill={ROBES} />
        <rect x="15" y="17" width="2" height="2" fill={SKIN} />
      </g>
      {/* dark grey trousers */}
      <g className="leg-left">
        <rect x="3"  y="20" width="5" height="6" fill="#374151" />
        <rect x="2"  y="25" width="6" height="2" fill="#111827" />
      </g>
      <g className="leg-right">
        <rect x="10" y="20" width="5" height="6" fill="#374151" />
        <rect x="10" y="25" width="6" height="2" fill="#111827" />
      </g>
      {/* status dot — bottom-right corner */}
      <rect x="15" y="25" width="2" height="2" fill={statusColor} />
    </svg>
  )
}

// ─── TONKS ─────────────────────────────────────────────────────────────────────
// Spiky pink hair, purple eyes, colorful eclectic metamorphmagus outfit
export function TonksCharacter({ isWalking, status }: CharProps) {
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* spiky pink hair */}
      <rect x="2"  y="0"  width="14" height="5"  fill="#ec4899" />
      <rect x="1"  y="2"  width="3"  height="7"  fill="#f472b6" />
      <rect x="14" y="2"  width="3"  height="7"  fill="#f472b6" />
      <rect x="3"  y="0"  width="12" height="2"  fill="#f9a8d4" />
      {/* spiky tips */}
      <rect x="4"  y="0"  width="2"  height="3"  fill="#f9a8d4" />
      <rect x="8"  y="0"  width="2"  height="3"  fill="#fce7f3" />
      <rect x="12" y="0"  width="2"  height="3"  fill="#f9a8d4" />
      {/* face */}
      <rect x="3"  y="4"  width="12" height="8"  fill={SKIN} className="char-body" />
      <rect x="5"  y="6"  width="2"  height="2"  fill="#a855f7" />
      <rect className="eyelid eyelid-l" x="5"  y="6"  width="2" height="2" fill={SKIN} />
      <rect x="11" y="6"  width="2"  height="2"  fill="#a855f7" />
      <rect className="eyelid eyelid-r" x="11" y="6"  width="2" height="2" fill={SKIN} />
      <rect x="8"  y="8"  width="2"  height="1"  fill="#c8905a" opacity="0.4" />
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="10" width="4" height="2" fill="#7c2d12" />
        : <rect x="7" y="10" width="4" height="1" fill="#b07040" opacity="0.8" />}
      {/* colorful eclectic jacket */}
      <rect x="3"  y="12" width="12" height="9"  fill="#8b5cf6" className="char-body" />
      <rect x="3"  y="12" width="6"  height="9"  fill="#ec4899" opacity="0.35" />
      <rect x="9"  y="12" width="6"  height="9"  fill="#06b6d4" opacity="0.35" />
      <g className="arm-left">
        <rect x="1"  y="12" width="2" height="6" fill="#ec4899" />
        <rect x="1"  y="18" width="2" height="2" fill={SKIN} />
      </g>
      <g className="arm-right">
        <rect x="15" y="12" width="2" height="6" fill="#06b6d4" />
        <rect x="15" y="18" width="2" height="2" fill={SKIN} />
      </g>
      <g className="leg-left">
        <rect x="3"  y="21" width="5" height="5" fill="#7c3aed" />
        <rect x="2"  y="25" width="6" height="1" fill="#5b21b6" />
      </g>
      <g className="leg-right">
        <rect x="10" y="21" width="5" height="5" fill="#0891b2" />
        <rect x="10" y="25" width="6" height="1" fill="#0e7490" />
      </g>
    </svg>
  )
}

// ─── BILL ──────────────────────────────────────────────────────────────────────
// Long Weasley-red hair, fang earring, curse-breaker leather jacket, scarred face
export function KingsleyCharacter({ isWalking, status }: CharProps) {
  const SKIN_K  = '#b07840'  // darker skin tone
  const ROBES_K = '#3a2870'  // deep purple Auror robes
  const GOLD_K  = '#d4a030'  // gold trim and earring
  const statusColor =
    status === 'online'      ? '#22c55e' :
    status === 'working'     ? '#3b82f6' :
    status === 'in-meeting'  ? '#ef4444' :
    /* away */                 '#eab308'
  return (
    <svg width="54" height="84" viewBox="0 0 18 28" aria-label="KINGSLEY"
         className={isWalking ? 'agent-walking' : ''} {...PX}>
      {/* head — completely bald, no hair rects */}
      <rect x="3"  y="1"  width="12" height="9"  fill={SKIN_K} className="char-body" />
      {/* small gold hoop earring — right ear */}
      <rect x="15" y="4"  width="1"  height="2"  fill={GOLD_K} />
      {/* eyes */}
      <rect x="5"  y="4"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-l" x="5"  y="4"  width="2" height="2" fill={SKIN_K} />
      <rect x="11" y="4"  width="2"  height="2"  fill="#1c1917" />
      <rect className="eyelid eyelid-r" x="11" y="4"  width="2" height="2" fill={SKIN_K} />
      {/* mouth */}
      {status === 'in-meeting'
        ? <rect className="mouth-talking" x="7" y="8" width="4" height="2" fill="#7c4010" />
        : <rect x="7" y="8" width="4" height="1" fill="#8b5a30" opacity="0.8" />}
      {/* deep purple Auror robes — torso */}
      <rect x="3"  y="10" width="12" height="9"  fill={ROBES_K} className="char-body" />
      {/* gold trim — collar edge */}
      <rect x="3"  y="10" width="12" height="1"  fill={GOLD_K} opacity="0.85" />
      {/* gold trim — collar V */}
      <rect x="7"  y="10" width="4"  height="3"  fill={GOLD_K} opacity="0.4" />
      {/* gold trim — hem edge */}
      <rect x="3"  y="18" width="12" height="1"  fill={GOLD_K} opacity="0.85" />
      {/* arms — purple robes with skin hands */}
      <g className="arm-left">
        <rect x="1"  y="10" width="2" height="7" fill={ROBES_K} />
        <rect x="1"  y="17" width="2" height="2" fill={SKIN_K} />
      </g>
      <g className="arm-right">
        <rect x="15" y="10" width="2" height="7" fill={ROBES_K} />
        <rect x="15" y="17" width="2" height="2" fill={SKIN_K} />
      </g>
      {/* dark trousers */}
      <g className="leg-left">
        <rect x="3"  y="19" width="5" height="6" fill="#2a2a3a" />
        <rect x="2"  y="25" width="6" height="2" fill="#111118" />
      </g>
      <g className="leg-right">
        <rect x="10" y="19" width="5" height="6" fill="#2a2a3a" />
        <rect x="10" y="25" width="6" height="2" fill="#111118" />
      </g>
      {/* status dot — bottom-right corner */}
      <rect x="15" y="25" width="2" height="2" fill={statusColor} />
    </svg>
  )
}

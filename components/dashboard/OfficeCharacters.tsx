'use client'

/**
 * Unique SVG mini-characters for each Hogwarts agent.
 * Each character has a distinct silhouette, outfit, and accessories.
 * Walking animation is driven by CSS classes on .leg-left, .leg-right, .arm-left, .arm-right
 */

import { useState } from 'react'

interface CharProps {
  avatar: string
  isWalking: boolean
  status: 'online' | 'working' | 'in-meeting' | 'away'
}

// Shared face circle using portrait image
function Face({ id, avatar, cx, cy, r }: { id: string; avatar: string; cx: number; cy: number; r: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <>
      <defs>
        <clipPath id={`face-${id}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {failed ? (
        <circle cx={cx} cy={cy} r={r} fill="#374151" />
      ) : (
        <image
          href={avatar}
          x={cx - r}
          y={cy - r}
          width={r * 2}
          height={r * 2 * 1.3}
          clipPath={`url(#face-${id})`}
          preserveAspectRatio="xMidYMin slice"
          onError={() => setFailed(true)}
        />
      )}
    </>
  )
}

// ─── DUMBLEDORE ───────────────────────────────────────────────────────────────
// Tall, majestic. Long purple robes, academic mortarboard, white beard, staff.

export function DumbledoreCharacter({ avatar, isWalking, status }: CharProps) {
  return (
    <svg width="58" height="112" viewBox="0 0 58 112" className={isWalking ? 'agent-walking' : ''}>
      {/* Mortarboard hat */}
      <rect x="16" y="5" width="26" height="3" rx="1" fill="#4c1d95" />
      <rect x="20" y="8" width="18" height="9" rx="1" fill="#5b21b6" />
      {/* Hat tassel */}
      <line x1="42" y1="5" x2="46" y2="12" stroke="#a78bfa" strokeWidth="1.5" />
      <circle cx="46" cy="13" r="2" fill="#a78bfa" />
      {/* Face */}
      <Face id="dumbledore" avatar={avatar} cx={29} cy={26} r={13} />
      {/* White beard */}
      <path d="M19,37 Q14,48 17,58 Q22,65 29,67 Q36,65 41,58 Q44,48 39,37 Z" fill="#f1f5f9" opacity="0.92" />
      {/* Long flowing robes */}
      <path d="M20,42 C18,52 12,72 10,95 L48,95 C46,72 40,52 38,42 Z" fill="#6d28d9" className="char-body" />
      {/* Robe highlight */}
      <path d="M24,42 C22,55 20,70 20,88 L29,88 C28,70 26,55 26,42 Z" fill="#7c3aed" opacity="0.4" />
      {/* Left arm */}
      <g className="arm-left">
        <path d="M20,44 C14,48 10,56 11,64 C13,67 16,67 18,65 C17,57 20,50 24,46 Z" fill="#5b21b6" />
        <circle cx="11" cy="65" r="3" fill="#e2b896" />
      </g>
      {/* Right arm holding staff */}
      <g className="arm-right">
        <path d="M38,44 C44,48 48,56 47,64 C45,67 42,67 40,65 C41,57 38,50 34,46 Z" fill="#5b21b6" />
        <circle cx="47" cy="65" r="3" fill="#e2b896" />
      </g>
      {/* Staff */}
      <line x1="50" y1="25" x2="50" y2="95" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="50" cy="24" rx="4" ry="4" fill="#8b5cf6" />
      <circle cx="50" cy="24" r="2" fill="#ddd6fe" />
      {/* Legs */}
      <g className="leg-left">
        <rect x="16" y="85" width="11" height="22" rx="4" fill="#4c1d95" />
        <rect x="15" y="103" width="12" height="5" rx="2" fill="#312e81" />
      </g>
      <g className="leg-right">
        <rect x="31" y="85" width="11" height="22" rx="4" fill="#4c1d95" />
        <rect x="30" y="103" width="12" height="5" rx="2" fill="#312e81" />
      </g>
      {/* Status glow ring */}
      <circle cx="29" cy="26" r="14" fill="none" stroke={
        status === 'online' ? '#4ade80' : status === 'working' ? '#fbbf24' : status === 'in-meeting' ? '#60a5fa' : '#4b5563'
      } strokeWidth="2" opacity="0.8" />
    </svg>
  )
}

// ─── HERMIONE ─────────────────────────────────────────────────────────────────
// Compact, precise. Gryffindor uniform, curly hair puffs, book in hand.

export function HermioneCharacter({ avatar, isWalking, status }: CharProps) {
  return (
    <svg width="52" height="100" viewBox="0 0 52 100" className={isWalking ? 'agent-walking' : ''}>
      {/* Curly hair left */}
      <ellipse cx="13" cy="22" rx="7" ry="9" fill="#92400e" />
      {/* Curly hair right */}
      <ellipse cx="39" cy="22" rx="7" ry="9" fill="#92400e" />
      {/* Hair top */}
      <ellipse cx="26" cy="14" rx="13" ry="7" fill="#78350f" />
      {/* Face */}
      <Face id="hermione" avatar={avatar} cx={26} cy={24} r={13} />
      {/* Gryffindor necktie */}
      <polygon points="24,38 28,38 27,50 25,50" fill="#dc2626" />
      <line x1="25" y1="40" x2="27" y2="40" stroke="#fbbf24" strokeWidth="1" />
      <line x1="25" y1="43" x2="27" y2="43" stroke="#fbbf24" strokeWidth="1" />
      {/* Body / school uniform */}
      <path d="M17,40 L15,82 L37,82 L35,40 Z" fill="#1c1917" className="char-body" />
      {/* Cardigan */}
      <path d="M17,40 L15,82 L22,82 L22,40 Z" fill="#292524" />
      <path d="M35,40 L37,82 L30,82 L30,40 Z" fill="#292524" />
      {/* Collar */}
      <path d="M19,38 L26,44 L33,38" fill="none" stroke="#e7e5e4" strokeWidth="1.5" />
      {/* Left arm holding book */}
      <g className="arm-left">
        <rect x="8" y="42" width="8" height="18" rx="3" fill="#1c1917" />
        <circle cx="10" cy="61" r="3" fill="#e2c4a0" />
        {/* Book */}
        <rect x="3" y="58" width="11" height="14" rx="1" fill="#854d0e" />
        <rect x="3" y="58" width="2" height="14" fill="#92400e" />
        <line x1="5" y1="62" x2="13" y2="62" stroke="#fbbf24" strokeWidth="0.7" />
        <line x1="5" y1="65" x2="13" y2="65" stroke="#fbbf24" strokeWidth="0.7" />
      </g>
      {/* Right arm */}
      <g className="arm-right">
        <rect x="36" y="42" width="8" height="18" rx="3" fill="#1c1917" />
        <circle cx="42" cy="61" r="3" fill="#e2c4a0" />
      </g>
      {/* Left leg */}
      <g className="leg-left">
        <rect x="16" y="76" width="10" height="20" rx="3" fill="#1c1917" />
        <rect x="15" y="92" width="11" height="5" rx="2" fill="#0c0a09" />
      </g>
      {/* Right leg */}
      <g className="leg-right">
        <rect x="28" y="76" width="10" height="20" rx="3" fill="#1c1917" />
        <rect x="27" y="92" width="11" height="5" rx="2" fill="#0c0a09" />
      </g>
      {/* Status ring */}
      <circle cx="26" cy="24" r="14" fill="none" stroke={
        status === 'online' ? '#4ade80' : status === 'working' ? '#fbbf24' : status === 'in-meeting' ? '#60a5fa' : '#4b5563'
      } strokeWidth="2" opacity="0.8" />
    </svg>
  )
}

// ─── HARRY ────────────────────────────────────────────────────────────────────
// Athletic build, Gryffindor robes, round glasses, wand, lightning bolt.

export function HarryCharacter({ avatar, isWalking, status }: CharProps) {
  return (
    <svg width="54" height="102" viewBox="0 0 54 102" className={isWalking ? 'agent-walking' : ''}>
      {/* Messy dark hair */}
      <path d="M13,20 Q10,10 18,7 Q27,3 36,7 Q44,10 41,20 Q37,14 27,13 Q17,14 13,20 Z" fill="#1c1917" />
      {/* Hair tufts */}
      <ellipse cx="15" cy="17" rx="5" ry="6" fill="#1c1917" />
      <ellipse cx="38" cy="17" rx="5" ry="6" fill="#1c1917" />
      {/* Face */}
      <Face id="harry" avatar={avatar} cx={27} cy={25} r={13} />
      {/* Glasses */}
      <circle cx="23" cy="25" r="5" fill="none" stroke="#d1d5db" strokeWidth="1.5" />
      <circle cx="31" cy="25" r="5" fill="none" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="28" y1="25" x2="26" y2="25" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="18" y1="24" x2="15" y2="23" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="36" y1="24" x2="39" y2="23" stroke="#d1d5db" strokeWidth="1.5" />
      {/* Gryffindor scarf */}
      <path d="M20,39 Q27,43 34,39 L33,44 Q27,47 21,44 Z" fill="#dc2626" />
      <line x1="22" y1="40" x2="22" y2="46" stroke="#fbbf24" strokeWidth="1.5" />
      <line x1="26" y1="41" x2="26" y2="47" stroke="#fbbf24" strokeWidth="1.5" />
      {/* Body — dark Gryffindor robes */}
      <path d="M19,42 L16,83 L38,83 L35,42 Z" fill="#1c1917" className="char-body" />
      <path d="M22,42 L22,83 L30,83 L30,42 Z" fill="#7f1d1d" opacity="0.6" />
      {/* Left arm */}
      <g className="arm-left">
        <rect x="9" y="44" width="9" height="17" rx="3" fill="#1c1917" />
        <circle cx="12" cy="62" r="3" fill="#e2b896" />
      </g>
      {/* Right arm — holding wand forward */}
      <g className="arm-right">
        <rect x="36" y="44" width="9" height="17" rx="3" fill="#1c1917" />
        <circle cx="43" cy="62" r="3" fill="#e2b896" />
        {/* Wand */}
        <line x1="46" y1="58" x2="54" y2="50" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="55" cy="49" r="2" fill="#fbbf24" opacity="0.9" />
      </g>
      {/* Left leg */}
      <g className="leg-left">
        <rect x="17" y="77" width="10" height="21" rx="3" fill="#111827" />
        <rect x="16" y="94" width="11" height="5" rx="2" fill="#030712" />
      </g>
      {/* Right leg */}
      <g className="leg-right">
        <rect x="29" y="77" width="10" height="21" rx="3" fill="#111827" />
        <rect x="28" y="94" width="11" height="5" rx="2" fill="#030712" />
      </g>
      {/* Status ring */}
      <circle cx="27" cy="25" r="14" fill="none" stroke={
        status === 'online' ? '#4ade80' : status === 'working' ? '#fbbf24' : status === 'in-meeting' ? '#60a5fa' : '#4b5563'
      } strokeWidth="2" opacity="0.8" />
    </svg>
  )
}

// ─── RON ──────────────────────────────────────────────────────────────────────
// Lanky and tall, bright red/orange hair, Gryffindor robes, wand.

export function RonCharacter({ avatar, isWalking, status }: CharProps) {
  return (
    <svg width="50" height="108" viewBox="0 0 50 108" className={isWalking ? 'agent-walking' : ''}>
      {/* Big red hair */}
      <ellipse cx="25" cy="13" rx="14" ry="10" fill="#c2410c" />
      <ellipse cx="12" cy="17" rx="6" ry="8" fill="#ea580c" />
      <ellipse cx="38" cy="17" rx="6" ry="8" fill="#ea580c" />
      {/* Hair highlights */}
      <path d="M15,10 Q25,6 35,10 Q30,8 25,8 Q20,8 15,10 Z" fill="#fb923c" opacity="0.6" />
      {/* Face */}
      <Face id="ron" avatar={avatar} cx={25} cy={26} r={13} />
      {/* Freckles */}
      <circle cx="20" cy="29" r="1" fill="#92400e" opacity="0.5" />
      <circle cx="22" cy="31" r="1" fill="#92400e" opacity="0.5" />
      <circle cx="28" cy="29" r="1" fill="#92400e" opacity="0.5" />
      <circle cx="30" cy="31" r="1" fill="#92400e" opacity="0.5" />
      {/* Lanky torso */}
      <rect x="18" y="41" width="14" height="24" rx="2" fill="#1c1917" className="char-body" />
      {/* Gryffindor patch */}
      <rect x="19" y="43" width="6" height="6" rx="1" fill="#dc2626" />
      <path d="M20,44 L22,48 L24,44" fill="#fbbf24" />
      {/* Long left arm (lanky) */}
      <g className="arm-left">
        <rect x="7" y="43" width="10" height="22" rx="4" fill="#1c1917" />
        <circle cx="11" cy="66" r="3.5" fill="#e2b896" />
      </g>
      {/* Right arm with wand */}
      <g className="arm-right">
        <rect x="33" y="43" width="10" height="22" rx="4" fill="#1c1917" />
        <circle cx="39" cy="66" r="3.5" fill="#e2b896" />
        <line x1="42" y1="62" x2="49" y2="54" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="49.5" cy="53" r="1.8" fill="#fde68a" opacity="0.85" />
      </g>
      {/* Long lanky legs */}
      <g className="leg-left">
        <rect x="17" y="63" width="11" height="28" rx="4" fill="#111827" />
        <rect x="16" y="87" width="12" height="5" rx="2" fill="#030712" />
      </g>
      <g className="leg-right">
        <rect x="30" y="63" width="11" height="28" rx="4" fill="#111827" />
        <rect x="29" y="87" width="12" height="5" rx="2" fill="#030712" />
      </g>
      {/* Status ring */}
      <circle cx="25" cy="26" r="14" fill="none" stroke={
        status === 'online' ? '#4ade80' : status === 'working' ? '#fbbf24' : status === 'in-meeting' ? '#60a5fa' : '#4b5563'
      } strokeWidth="2" opacity="0.8" />
    </svg>
  )
}

// ─── McGONAGALL ───────────────────────────────────────────────────────────────
// Tall and strict. Tall pointy witch hat, slim black robes, emerald accents, goblet.

export function McGonagallCharacter({ avatar, isWalking, status }: CharProps) {
  return (
    <svg width="52" height="118" viewBox="0 0 52 118" className={isWalking ? 'agent-walking' : ''}>
      {/* Tall pointed witch hat */}
      <polygon points="26,1 18,22 34,22" fill="#111827" />
      <ellipse cx="26" cy="22" rx="12" ry="4" fill="#1f2937" />
      {/* Hat band */}
      <rect x="14" y="19" width="24" height="4" rx="1" fill="#059669" />
      {/* Hair bun */}
      <ellipse cx="26" cy="30" rx="8" ry="4" fill="#4b5563" />
      <circle cx="26" cy="29" r="3" fill="#374151" />
      {/* Face */}
      <Face id="mcgonagall" avatar={avatar} cx={26} cy={38} r={13} />
      {/* Slim tall body */}
      <path d="M20,53 L17,95 L35,95 L32,53 Z" fill="#111827" className="char-body" />
      {/* Emerald robe trim */}
      <line x1="26" y1="53" x2="26" y2="95" stroke="#059669" strokeWidth="1.5" />
      <path d="M20,53 L22,55 L24,53" stroke="#059669" strokeWidth="1" fill="none" />
      {/* Brooch */}
      <circle cx="26" cy="56" r="3" fill="#065f46" />
      <circle cx="26" cy="56" r="1.5" fill="#6ee7b7" />
      {/* Left arm */}
      <g className="arm-left">
        <rect x="10" y="55" width="9" height="18" rx="3" fill="#111827" />
        <rect x="9" y="70" width="10" height="3" rx="1" fill="#059669" />
        <circle cx="13" cy="74" r="3" fill="#d1d5db" />
        {/* Goblet */}
        <path d="M6,72 L10,72 L9,82 L7,82 Z" fill="#d97706" />
        <ellipse cx="8" cy="72" rx="3" ry="1.5" fill="#fbbf24" />
        <rect x="6" y="82" width="4" height="2" rx="1" fill="#b45309" />
      </g>
      {/* Right arm */}
      <g className="arm-right">
        <rect x="33" y="55" width="9" height="18" rx="3" fill="#111827" />
        <rect x="33" y="70" width="10" height="3" rx="1" fill="#059669" />
        <circle cx="39" cy="74" r="3" fill="#d1d5db" />
      </g>
      {/* Slim legs */}
      <g className="leg-left">
        <rect x="18" y="89" width="9" height="24" rx="3" fill="#0f172a" />
        <rect x="17" y="109" width="10" height="5" rx="2" fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="29" y="89" width="9" height="24" rx="3" fill="#0f172a" />
        <rect x="28" y="109" width="10" height="5" rx="2" fill="#020617" />
      </g>
      {/* Status ring */}
      <circle cx="26" cy="38" r="14" fill="none" stroke={
        status === 'online' ? '#4ade80' : status === 'working' ? '#fbbf24' : status === 'in-meeting' ? '#60a5fa' : '#4b5563'
      } strokeWidth="2" opacity="0.8" />
    </svg>
  )
}

// ─── SNAPE ────────────────────────────────────────────────────────────────────
// Dark, imposing. Wide flowing black robes, shoulder-length black hair, arms crossed.

export function SnapeCharacter({ avatar, isWalking, status }: CharProps) {
  return (
    <svg width="58" height="105" viewBox="0 0 58 105" className={isWalking ? 'agent-walking' : ''}>
      {/* Long shoulder-length hair — left */}
      <path d="M14,18 Q9,28 10,44 Q13,46 15,44 Q14,30 18,20 Z" fill="#1c1917" />
      {/* Long shoulder-length hair — right */}
      <path d="M44,18 Q49,28 48,44 Q45,46 43,44 Q44,30 40,20 Z" fill="#1c1917" />
      {/* Hair top */}
      <path d="M14,18 Q20,10 29,10 Q38,10 44,18 Q38,14 29,14 Q20,14 14,18 Z" fill="#111827" />
      {/* Face */}
      <Face id="snape" avatar={avatar} cx={29} cy={25} r={13} />
      {/* Wide billowing robes */}
      <path d="M20,41 C14,52 6,70 4,100 L54,100 C52,70 44,52 38,41 Z" fill="#0f172a" className="char-body" />
      {/* Robe dark sheen */}
      <path d="M24,41 C20,55 16,72 16,95 L29,95 C28,72 26,55 26,41 Z" fill="#1e293b" opacity="0.5" />
      {/* High collar */}
      <path d="M22,40 L29,46 L36,40 Q33,36 29,36 Q25,36 22,40 Z" fill="#1e293b" />
      {/* Arms CROSSED — distinctive Snape pose */}
      <g className="arm-left">
        <path d="M20,46 C16,50 15,56 18,62 C22,65 28,63 32,60 C28,57 23,54 22,48 Z" fill="#111827" />
        <circle cx="19" cy="63" r="3" fill="#c8c8c8" />
      </g>
      <g className="arm-right">
        <path d="M38,46 C42,50 43,56 40,62 C36,65 30,63 26,60 C30,57 35,54 36,48 Z" fill="#0f172a" />
        <circle cx="39" cy="63" r="3" fill="#c8c8c8" />
      </g>
      {/* Dark legs */}
      <g className="leg-left">
        <rect x="17" y="90" width="11" height="22" rx="3" fill="#0f172a" />
        <rect x="16" y="108" width="12" height="4" rx="2" fill="#020617" />
      </g>
      <g className="leg-right">
        <rect x="30" y="90" width="11" height="22" rx="3" fill="#0f172a" />
        <rect x="29" y="108" width="12" height="4" rx="2" fill="#020617" />
      </g>
      {/* Status ring */}
      <circle cx="29" cy="25" r="14" fill="none" stroke={
        status === 'online' ? '#4ade80' : status === 'working' ? '#fbbf24' : status === 'in-meeting' ? '#60a5fa' : '#4b5563'
      } strokeWidth="2" opacity="0.8" />
    </svg>
  )
}

// ─── HAGRID ───────────────────────────────────────────────────────────────────
// HUGE. 1.6x wider, giant coat, wild bushy hair and beard, lantern.

export function HagridCharacter({ avatar, isWalking, status }: CharProps) {
  return (
    <svg width="80" height="112" viewBox="0 0 80 112" className={isWalking ? 'agent-walking' : ''}>
      {/* Wild bushy hair — enormous */}
      <ellipse cx="40" cy="18" rx="26" ry="18" fill="#44403c" />
      <ellipse cx="16" cy="24" rx="14" ry="16" fill="#57534e" />
      <ellipse cx="64" cy="24" rx="14" ry="16" fill="#57534e" />
      {/* Hair texture */}
      <path d="M18,14 Q40,8 62,14 Q52,11 40,11 Q28,11 18,14 Z" fill="#6b7280" opacity="0.4" />
      {/* Face */}
      <Face id="hagrid" avatar={avatar} cx={40} cy={28} r={17} />
      {/* Massive bushy beard */}
      <path d="M24,43 Q18,55 20,68 Q28,76 40,78 Q52,76 60,68 Q62,55 56,43 Z" fill="#57534e" />
      {/* Beard texture */}
      <path d="M28,48 Q30,56 28,64" stroke="#78716c" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M40,50 Q40,60 39,66" stroke="#78716c" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M52,48 Q50,56 52,64" stroke="#78716c" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Enormous coat body */}
      <path d="M22,50 C16,62 10,78 8,105 L72,105 C70,78 64,62 58,50 Z" fill="#78350f" className="char-body" />
      {/* Coat texture / lapels */}
      <path d="M32,50 L35,66 L40,60 L45,66 L48,50 Z" fill="#92400e" />
      <line x1="40" y1="60" x2="40" y2="105" stroke="#92400e" strokeWidth="2" opacity="0.4" />
      {/* Giant left arm */}
      <g className="arm-left">
        <path d="M22,54 C12,60 6,72 8,84 C11,88 16,88 19,85 C17,74 20,64 26,58 Z" fill="#7c2d12" />
        <circle cx="8" cy="85" r="5" fill="#c8a060" />
        {/* Lantern */}
        <rect x="-2" y="82" width="10" height="14" rx="2" fill="#854d0e" opacity="0.9" />
        <rect x="-1" y="83" width="8" height="12" rx="1" fill="#fde68a" opacity="0.7" />
        <line x1="3" y1="80" x2="3" y2="82" stroke="#a16207" strokeWidth="1.5" />
      </g>
      {/* Giant right arm */}
      <g className="arm-right">
        <path d="M58,54 C68,60 74,72 72,84 C69,88 64,88 61,85 C63,74 60,64 54,58 Z" fill="#7c2d12" />
        <circle cx="72" cy="85" r="5" fill="#c8a060" />
      </g>
      {/* Large legs */}
      <g className="leg-left">
        <rect x="22" y="96" width="16" height="22" rx="5" fill="#44403c" />
        <rect x="21" y="114" width="17" height="6" rx="3" fill="#1c1917" />
      </g>
      <g className="leg-right">
        <rect x="42" y="96" width="16" height="22" rx="5" fill="#44403c" />
        <rect x="41" y="114" width="17" height="6" rx="3" fill="#1c1917" />
      </g>
      {/* Status ring */}
      <circle cx="40" cy="28" r="18" fill="none" stroke={
        status === 'online' ? '#4ade80' : status === 'working' ? '#fbbf24' : status === 'in-meeting' ? '#60a5fa' : '#4b5563'
      } strokeWidth="2.5" opacity="0.8" />
    </svg>
  )
}

'use client'
import type { RoomId } from './types'

const CRSP = { shapeRendering: 'crispEdges' as const, style: { imageRendering: 'pixelated' } as React.CSSProperties }

/** Top-down office desk with monitor, keyboard, mug, floor shadow */
export function PxDesk({ style, screenColor = '#1e4888' }: { style?: React.CSSProperties; screenColor?: string }) {
  return (
    <svg width="68" height="56" viewBox="0 0 17 14" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* desk surface */}
      <rect x="0" y="4"  width="17" height="10" fill="#8b5c30" />
      <rect x="0" y="4"  width="17" height="1"  fill="#a87040" /> {/* top highlight */}
      <rect x="0" y="12" width="17" height="2"  fill="#5c3010" /> {/* front shadow */}
      <rect x="1"  y="13" width="2"  height="1"  fill="#4a2808" /> {/* leg L */}
      <rect x="14" y="13" width="2"  height="1"  fill="#4a2808" /> {/* leg R */}
      {/* monitor shell */}
      <rect x="2"  y="0"  width="13" height="6"  fill="#1e2535" />
      {/* screen */}
      <rect x="3"  y="1"  width="11" height="4"  fill={screenColor} />
      <rect x="4"  y="1"  width="9"  height="1"  fill="#2860d8" opacity="0.55" />
      <rect x="4"  y="3"  width="9"  height="1"  fill="#1848b0" opacity="0.35" />
      {/* stand */}
      <rect x="7"  y="6"  width="3"  height="1"  fill="#374151" />
      {/* keyboard */}
      <rect x="1"  y="7"  width="11" height="4"  fill="#d4c9b0" />
      <rect x="2"  y="8"  width="9"  height="2"  fill="#c0b098" />
      {[2,5,8].map(x => <rect key={x} x={x} y="8" width="2" height="1" fill="#a89878" />)}
      {/* mouse */}
      <rect x="13" y="7"  width="3"  height="4"  fill="#9ca3af" />
      <rect x="14" y="8"  width="1"  height="2"  fill="#6b7280" />
      {/* desk mug */}
      <rect x="14" y="4"  width="2"  height="2"  fill="#dc4444" />
      <rect x="14" y="3"  width="2"  height="1"  fill="#f87171" />
    </svg>
  )
}

/** Chair (top-down view) */
export function PxChair({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="28" height="32" viewBox="0 0 7 8" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect x="0" y="0" width="7" height="3" fill="#6b3010" />
      <rect x="0" y="0" width="7" height="1" fill="#8b4018" />
      <rect x="0" y="3" width="7" height="4" fill="#7c3a18" />
      <rect x="0" y="6" width="7" height="1" fill="#5c2c10" />
      <rect x="0" y="7" width="2" height="1" fill="#4a2010" />
      <rect x="5" y="7" width="2" height="1" fill="#4a2010" />
    </svg>
  )
}

/** Potted plant */
export function PxPlant({ style, leafColor = '#15803d' }: { style?: React.CSSProperties; leafColor?: string }) {
  return (
    <svg width="28" height="40" viewBox="0 0 7 10" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* foliage */}
      <rect x="1" y="0" width="5" height="6" fill={leafColor} />
      <rect x="2" y="0" width="3" height="1" fill="#166534" />
      <rect x="0" y="2" width="2" height="3" fill={leafColor} />
      <rect x="5" y="2" width="2" height="3" fill={leafColor} />
      <rect x="1" y="1" width="1" height="1" fill="#22c55e" opacity="0.7" />
      <rect x="4" y="1" width="2" height="1" fill="#22c55e" opacity="0.6" />
      {/* pot rim */}
      <rect x="0" y="6" width="7" height="1" fill="#9a340a" />
      {/* pot body */}
      <rect x="1" y="6" width="5" height="4" fill="#c2410c" />
      <rect x="1" y="7" width="5" height="1" fill="#b43c0c" />
      <rect x="1" y="9" width="5" height="1" fill="#7c2c08" />
      {/* soil */}
      <rect x="1" y="6" width="5" height="2" fill="#3d1a06" />
    </svg>
  )
}

/** Bookshelf — rich colorful spines */
export function PxBookshelf({ style, rows = 2 }: { style?: React.CSSProperties; rows?: number }) {
  const palette = ['#dc2626','#2563eb','#16a34a','#d97706','#7c3aed','#db2777',
                   '#0891b2','#65a30d','#9333ea','#ea580c','#0284c7','#b91c1c',
                   '#15803d','#7c2d12','#1d4ed8','#854d0e']
  const h = rows === 2 ? 72 : 40
  const vh = rows === 2 ? 18 : 10
  return (
    <svg width="64" height={h} viewBox={`0 0 16 ${vh}`} {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* frame */}
      <rect width="16" height={vh} fill="#5c3010" />
      {rows === 2 && <rect x="0" y="9" width="16" height="1" fill="#3d1e08" />}
      {/* row 1 books */}
      {palette.slice(0, 8).map((c, i) => (
        <rect key={i} x={i * 2} y="1" width="2" height={rows === 2 ? 7 : vh - 2} fill={c} opacity="0.9" />
      ))}
      {/* row 2 books */}
      {rows === 2 && palette.slice(8, 16).map((c, i) => (
        <rect key={i} x={i * 2} y="10" width="2" height="7" fill={c} opacity="0.9" />
      ))}
      {/* spine highlights */}
      {[0,2,4,6,8,10,12,14].map(x => (
        <rect key={x} x={x} y="1" width="1" height="1" fill="rgba(255,255,255,0.2)" />
      ))}
    </svg>
  )
}

/** Filing cabinet */
export function PxCabinet({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="36" height="48" viewBox="0 0 9 12" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect width="9" height="12" fill="#6b3c1a" />
      {[1,4,8].map(y => (
        <rect key={y} x="1" y={y} width="7" height="2" fill="#4a2808" />
      ))}
      {[1,4,8].map(y => (
        <rect key={y} x="3" y={y + 0.5} width="3" height="1" fill="#8b5c2a" />
      ))}
      <rect x="0" y="0" width="9" height="1" fill="#8b5030" />
    </svg>
  )
}

/** Couch (top-down, horizontal) */
export function PxCouch({ style, tileW = 3 }: { style?: React.CSSProperties; tileW?: number }) {
  const vw = tileW * 8
  const pw = tileW * 32
  return (
    <svg width={pw} height={40} viewBox={`0 0 ${vw} 10`} {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* back */}
      <rect x="0" y="0" width={vw} height="3" fill="#8b4513" />
      <rect x="0" y="0" width={vw} height="1" fill="#a05520" />
      {/* seat */}
      <rect x="0" y="3" width={vw} height="6" fill="#7c3c18" />
      {/* cushion dividers */}
      {[Math.floor(vw/3), Math.floor(2*vw/3)].map(x => (
        <rect key={x} x={x} y="3" width="1" height="6" fill="#5c2c10" />
      ))}
      {/* armrests */}
      <rect x="0"    y="2" width="2" height="8" fill="#6b3010" />
      <rect x={vw-2} y="2" width="2" height="8" fill="#6b3010" />
      {/* cushion texture */}
      <rect x="3" y="4" width={Math.floor(vw/3)-4} height="3" fill="#9b4d24" opacity="0.4" />
    </svg>
  )
}

/** Coffee table */
export function PxCoffeeTable({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="64" height="32" viewBox="0 0 16 8" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect width="16" height="8" fill="#6b3c1a" />
      <rect y="0" width="16" height="1" fill="#8b5c2a" />
      <rect y="7" width="16" height="1" fill="#4a2810" />
      <rect x="1" y="1" width="14" height="6" fill="#7c4820" />
      {/* coffee cup + magazine */}
      <rect x="5" y="3" width="3" height="3" fill="#f5f5f0" />
      <rect x="9" y="3" width="4" height="2" fill="#d0c8b0" />
      <rect x="9" y="3" width="4" height="1" fill="#60a0c0" opacity="0.7" />
    </svg>
  )
}

/** Kitchen counter strip */
export function PxCounter({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="128" height="36" viewBox="0 0 32 9" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* surface */}
      <rect width="32" height="9" fill="#b0a080" />
      <rect y="0" width="32" height="1" fill="#c8b898" />
      <rect y="8" width="32" height="1" fill="#8a7860" />
      {/* sink */}
      <rect x="1" y="1" width="7" height="7" fill="#8a9090" />
      <rect x="2" y="2" width="5" height="5" fill="#707878" />
      <rect x="4" y="2" width="2" height="1" fill="#909898" />
      {/* coffee machine */}
      <rect x="10" y="1" width="5" height="7" fill="#2d2d2d" />
      <rect x="11" y="2" width="3" height="3" fill="#1a1a1a" />
      <rect x="11" y="2" width="3" height="1" fill="#60a0c0" opacity="0.9" />
      <rect x="12" y="5" width="1" height="3" fill="#444" />
      {/* toaster */}
      <rect x="17" y="2" width="5" height="5" fill="#c0b898" />
      <rect x="18" y="2" width="1" height="3" fill="#888070" />
      <rect x="20" y="2" width="1" height="3" fill="#888070" />
      {/* items on right */}
      <rect x="24" y="2" width="3" height="5" fill="#f5f0e0" />
      <rect x="28" y="3" width="3" height="4" fill="#e8dfd0" />
    </svg>
  )
}

/** Fridge */
export function PxFridge({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="36" height="56" viewBox="0 0 9 14" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect width="9" height="14" fill="#dce8e8" />
      <rect y="0" width="9" height="1" fill="#b8d0d0" />
      <rect y="13" width="9" height="1" fill="#98b8b8" />
      <rect y="5" width="9" height="1" fill="#a0b8b8" />
      {/* handles */}
      <rect x="7" y="1" width="1" height="3" fill="#7a8888" />
      <rect x="7" y="6" width="1" height="7" fill="#7a8888" />
      {/* panels */}
      <rect x="1" y="1" width="5" height="3" fill="#cce0e0" />
      <rect x="1" y="6" width="5" height="7" fill="#d4e8e8" />
    </svg>
  )
}

/** Conference table with chairs */
export function PxMeetingTable({ style, occupied }: { style?: React.CSSProperties; occupied: boolean }) {
  const tc = occupied ? '#96632a' : '#7c4820'
  return (
    <svg width="208" height="100" viewBox="0 0 52 25" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* chairs — north row */}
      {[2,10,18,26,34,42].map(x => (
        <g key={x}>
          <rect x={x} y="0" width="8" height="5" fill="#6b3010" />
          <rect x={x} y="0" width="8" height="1" fill="#8b4020" />
          <rect x={x+1} y="1" width="6" height="3" fill="#7c3818" />
        </g>
      ))}
      {/* table */}
      <rect x="0" y="6"  width="52" height="13" fill={tc} />
      <rect x="0" y="6"  width="52" height="1"  fill="#b07840" />
      <rect x="0" y="17" width="52" height="2"  fill="#5c3010" />
      {/* table grain */}
      {[8,17,26,35,44].map(x => (
        <rect key={x} x={x} y="7" width="1" height="11" fill="rgba(0,0,0,0.08)" />
      ))}
      {/* table center line */}
      <rect x="0" y="12" width="52" height="1" fill="rgba(0,0,0,0.07)" />
      {/* papers on table */}
      {[3,14,25,36].map(x => (
        <rect key={x} x={x} y="8"  width="6" height="8" fill="#f0e8d0" opacity="0.55" />
      ))}
      {/* laptop */}
      <rect x="44" y="8"  width="6" height="4" fill="#1e2535" />
      <rect x="45" y="9"  width="4" height="2" fill="#1e3060" />
      {/* chairs — south row */}
      {[2,10,18,26,34,42].map(x => (
        <g key={x}>
          <rect x={x} y="20" width="8" height="5" fill="#6b3010" />
          <rect x={x} y="24" width="8" height="1" fill="#4a2010" />
          <rect x={x+1} y="20" width="6" height="3" fill="#7c3818" />
        </g>
      ))}
    </svg>
  )
}

/** Server/equipment rack */
export function PxServerRack({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="40" height="80" viewBox="0 0 10 20" {...CRSP} style={{ ...CRSP.style, ...style }}>
      <rect width="10" height="20" fill="#1a1c2c" />
      <rect y="0" width="10" height="1" fill="#252840" />
      {[1,4,7,10,13,16].map(y => (
        <rect key={y} x="1" y={y} width="8" height="2" fill="#141628" />
      ))}
      {/* LED status lights */}
      {[1,4,7,10,13,16].map((y, i) => (
        <rect key={y} x="8" y={y} width="1" height="1"
          fill={i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#3b82f6' : '#f59e0b'} opacity="0.95" />
      ))}
      {/* drive bays */}
      {[1,4,7,10].map(y => (
        <rect key={y} x="1" y={y} width="6" height="1" fill="#1e2030" />
      ))}
      <rect x="0" y="19" width="10" height="1" fill="#252840" />
    </svg>
  )
}

/** Dual-monitor workstation */
export function PxDualDesk({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="96" height="56" viewBox="0 0 24 14" {...CRSP} style={{ ...CRSP.style, ...style }}>
      {/* desk */}
      <rect x="0" y="4" width="24" height="10" fill="#8b5c30" />
      <rect x="0" y="4" width="24" height="1"  fill="#a87040" />
      <rect x="0" y="12" width="24" height="2" fill="#5c3010" />
      {/* monitor L */}
      <rect x="1" y="0" width="10" height="6" fill="#1e2535" />
      <rect x="2" y="1" width="8"  height="4" fill="#1e3060" />
      <rect x="3" y="1" width="6"  height="1" fill="#2860d8" opacity="0.5" />
      <rect x="4" y="6" width="2"  height="1" fill="#374151" />
      {/* monitor R */}
      <rect x="13" y="0" width="10" height="6" fill="#1e2535" />
      <rect x="14" y="1" width="8"  height="4" fill="#10b981" opacity="0.6" />
      <rect x="15" y="1" width="6"  height="1" fill="#34d399" opacity="0.5" />
      <rect x="17" y="6" width="2"  height="1" fill="#374151" />
      {/* keyboard */}
      <rect x="2" y="7" width="10" height="4" fill="#d4c9b0" />
      <rect x="14" y="7" width="8"  height="4" fill="#d4c9b0" />
      {/* mouse pads */}
      <rect x="13" y="7" width="1" height="4" fill="#9ca3af" opacity="0.4" />
    </svg>
  )
}

/** Pinboard / mood board */
export function PxPinboard({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none" style={style}>
      <svg width="64" height="72" viewBox="0 0 16 18" {...CRSP} style={CRSP.style}>
        {/* board surface */}
        <rect width="16" height="18" fill="#c8a060" />
        <rect y="0" width="16" height="1" fill="#d8b070" />
        <rect y="17" width="16" height="1" fill="#8a7040" />
        {/* frame */}
        <rect x="0" y="0" width="1" height="18" fill="#7c5020" />
        <rect x="15" y="0" width="1" height="18" fill="#7c5020" />
        {/* sticky notes */}
        <rect x="1" y="2" width="4" height="4" fill="#fde68a" opacity="0.9" />
        <rect x="6" y="1" width="4" height="5" fill="#bfdbfe" opacity="0.85" />
        <rect x="11" y="2" width="4" height="4" fill="#bbf7d0" opacity="0.85" />
        <rect x="2" y="8" width="5" height="4" fill="#fca5a5" opacity="0.85" />
        <rect x="9" y="7" width="5" height="5" fill="#ddd6fe" opacity="0.85" />
        <rect x="1" y="14" width="7" height="3" fill="#fed7aa" opacity="0.85" />
        {/* lines on notes */}
        <rect x="2" y="3" width="2" height="1" fill="rgba(0,0,0,0.2)" />
        <rect x="7" y="2" width="2" height="1" fill="rgba(0,0,0,0.2)" />
        <rect x="10" y="9" width="3" height="1" fill="rgba(0,0,0,0.2)" />
      </svg>
    </div>
  )
}

// ─── Room furniture layouts ───────────────────────────────────────────────────

export function Furniture({ roomId, occupied }: { roomId: RoomId; occupied: boolean }) {
  if (roomId === 'great-hall') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxMeetingTable
        occupied={occupied}
        style={{ position: 'absolute', left: '12%', top: '20%' }}
      />
      {/* whiteboard */}
      <svg width="52" height="32" viewBox="0 0 13 8"
        style={{ position: 'absolute', top: '6%', right: '4%', imageRendering: 'pixelated' }}
        shapeRendering="crispEdges">
        <rect width="13" height="8" fill="#f5f0e8" />
        <rect y="0" width="13" height="1" fill="#d8d0b8" />
        <rect y="7" width="13" height="1" fill="#b8b0a0" />
        <rect x="0" y="0" width="1" height="8" fill="#5c3010" />
        <rect x="12" y="0" width="1" height="8" fill="#5c3010" />
        <rect x="1" y="2" width="8" height="1" fill="#8090b0" opacity="0.7" />
        <rect x="1" y="4" width="5" height="1" fill="#a0b0d0" opacity="0.5" />
        <rect x="1" y="6" width="9" height="1" fill="#7088a0" opacity="0.4" />
      </svg>
      {/* projector screen hint */}
      <svg width="40" height="8" viewBox="0 0 10 2"
        style={{ position: 'absolute', top: '4%', left: '35%', imageRendering: 'pixelated' }}
        shapeRendering="crispEdges">
        <rect width="10" height="2" fill="#e8e0d0" />
        <rect y="0" width="10" height="1" fill="#d0c8b8" />
      </svg>
    </div>
  )

  if (roomId === 'headmaster') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxDesk style={{ position: 'absolute', left: '22%', top: '28%' }} screenColor="#3060c0" />
      <PxChair style={{ position: 'absolute', left: '27%', top: '56%' }} />
      <PxBookshelf style={{ position: 'absolute', right: '4%', top: '10%' }} rows={2} />
      <PxCabinet style={{ position: 'absolute', left: '4%', top: '18%' }} />
      <PxPlant style={{ position: 'absolute', left: '6%', bottom: '10%' }} />
      {/* name plaque */}
      <svg width="40" height="10" viewBox="0 0 10 2.5"
        style={{ position: 'absolute', bottom: '8%', right: '20%', imageRendering: 'pixelated' }}
        shapeRendering="crispEdges">
        <rect width="10" height="3" fill="#c8a040" />
        <rect x="1" y="1" width="8" height="1" fill="#8b6820" opacity="0.6" />
      </svg>
    </div>
  )

  if (roomId === 'lab') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxDualDesk style={{ position: 'absolute', left: '5%', top: '18%' }} />
      <PxChair style={{ position: 'absolute', left: '14%', top: '52%' }} />
      <PxServerRack style={{ position: 'absolute', right: '6%', top: '8%' }} />
      <PxServerRack style={{ position: 'absolute', right: '18%', top: '8%' }} />
      <PxPlant style={{ position: 'absolute', left: '4%', bottom: '8%' }} leafColor="#166534" />
      {/* cable tray / floor strip */}
      <svg width="4" height="56" viewBox="0 0 1 14"
        style={{ position: 'absolute', right: '30%', top: '10%', imageRendering: 'pixelated' }}
        shapeRendering="crispEdges">
        <rect width="1" height="14" fill="#1a1a2a" opacity="0.6" />
        {[1,3,5,7,9,11].map(y => <rect key={y} x="0" y={y} width="1" height="1" fill="#3b82f6" opacity="0.6" />)}
      </svg>
    </div>
  )

  if (roomId === 'library') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxBookshelf style={{ position: 'absolute', left: '4%', top: '8%' }} rows={2} />
      <PxDesk style={{ position: 'absolute', left: '52%', top: '15%' }} screenColor="#d97706" />
      <PxChair style={{ position: 'absolute', left: '57%', top: '50%' }} />
      <PxPlant style={{ position: 'absolute', right: '5%', bottom: '8%' }} />
    </div>
  )

  if (roomId === 'requirement') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxBookshelf style={{ position: 'absolute', left: '4%', top: '8%' }} rows={2} />
      <PxDesk style={{ position: 'absolute', right: '6%', top: '18%' }} screenColor="#10a060" />
      <PxChair style={{ position: 'absolute', right: '9%', top: '52%' }} />
      <PxCabinet style={{ position: 'absolute', right: '4%', bottom: '8%' }} />
    </div>
  )

  if (roomId === 'auror') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxDesk style={{ position: 'absolute', left: '8%', top: '15%' }} screenColor="#d97706" />
      <PxChair style={{ position: 'absolute', left: '13%', top: '50%' }} />
      <PxPlant style={{ position: 'absolute', right: '5%', bottom: '8%' }} />
    </div>
  )

  if (roomId === 'clocktower') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxDesk style={{ position: 'absolute', left: '8%', top: '15%' }} screenColor="#7c3aed" />
      <PxChair style={{ position: 'absolute', left: '13%', top: '50%' }} />
      <PxDesk style={{ position: 'absolute', left: '48%', top: '15%' }} screenColor="#db2777" />
      <PxChair style={{ position: 'absolute', left: '53%', top: '50%' }} />
      <PxPinboard style={{ position: 'absolute', right: '4%', top: '10%' }} />
    </div>
  )

  if (roomId === 'broomsticks') return (
    <div className="absolute inset-0 pointer-events-none">
      <PxCouch style={{ position: 'absolute', left: '2%', top: '12%' }} tileW={3} />
      <PxCoffeeTable style={{ position: 'absolute', left: '15%', top: '35%' }} />
      <PxCounter style={{ position: 'absolute', right: '4%', top: '12%' }} />
      <PxFridge style={{ position: 'absolute', right: '2%', bottom: '5%' }} />
    </div>
  )
  return null
}

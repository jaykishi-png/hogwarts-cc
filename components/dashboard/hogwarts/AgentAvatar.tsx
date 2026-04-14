'use client'
import { useState } from 'react'
import Image from 'next/image'
import { RING_MAP } from './types'

export function AgentAvatar({ avatar, name, color, size = 32 }: { avatar: string; name: string; color: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const ring = RING_MAP[color] ?? 'ring-gray-600/60'
  if (failed) return (
    <div className={`flex items-center justify-center rounded-full ring-2 ${ring} bg-[#1a1d27] text-[10px] font-bold text-gray-400 flex-shrink-0`}
      style={{ width: size, height: size }}>{name[0]}</div>
  )
  return (
    <Image src={avatar} alt={name} width={size} height={size}
      className={`rounded-full object-cover object-top ring-2 ${ring} flex-shrink-0`}
      onError={() => setFailed(true)} />
  )
}

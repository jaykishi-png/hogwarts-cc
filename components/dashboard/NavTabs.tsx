'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, Building2 } from 'lucide-react'

type TabKey = 'dashboard' | 'hogwarts' | 'office'

const TABS: { key: TabKey; label: string; href: string; icon: React.ReactNode }[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard size={12} />,
  },
  {
    key: 'hogwarts',
    label: 'Hogwarts',
    href: '/hogwarts',
    icon: (
      <Image
        src="/agents/Hogwarts_Cyborg.png"
        alt=""
        width={14}
        height={14}
        className="rounded-sm object-cover object-top flex-shrink-0"
      />
    ),
  },
  {
    key: 'office',
    label: 'Office',
    href: '/office',
    icon: <Building2 size={12} />,
  },
]

export function NavTabs({ active }: { active: TabKey }) {
  return (
    <nav className="flex items-center gap-1 bg-[#0f1117] rounded-lg p-1 border border-[#2a2d3a]">
      {TABS.map(tab => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            active === tab.key
              ? 'bg-[#1a1d27] text-gray-100 border border-[#3a3d4a]'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {tab.icon}
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}

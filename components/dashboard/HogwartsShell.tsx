'use client'

import { HogwartsPanel } from './HogwartsPanel'
import { NavTabs } from './NavTabs'
import { format } from 'date-fns'

export function HogwartsShell() {
  return (
    <div className="h-screen flex flex-col bg-[#0f1117] overflow-hidden">

      {/* Header */}
      <header className="flex-shrink-0 bg-[#13151e] border-b border-[#2a2d3a] px-6 py-3 z-10">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-gray-100">Dashboard</h1>
            <span className="text-sm text-gray-500 hidden sm:block">
              {format(new Date(), 'EEEE, MMMM d')}
            </span>
          </div>
          <NavTabs active="hogwarts" />
        </div>
      </header>

      {/* Hogwarts panel — full remaining height */}
      <main className="flex-1 min-h-0 max-w-[1200px] w-full mx-auto px-6 py-5 flex flex-col">
        <div className="
          flex-1 min-h-0 bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-5
          overflow-y-auto
          [&::-webkit-scrollbar]:w-[3px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]
          [&::-webkit-scrollbar-thumb]:rounded-full
        ">
          <HogwartsPanel />
        </div>
      </main>
    </div>
  )
}

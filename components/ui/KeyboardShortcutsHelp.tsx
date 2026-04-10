'use client'

import { useState } from 'react'
import { Keyboard, X } from 'lucide-react'

const SHORTCUTS = [
  { key: 'D', desc: 'Mark selected task done' },
  { key: 'S', desc: 'Snooze selected task' },
  { key: 'O', desc: 'Open task in source' },
  { key: '↑ / ↓', desc: 'Navigate tasks' },
  { key: '⌘A', desc: 'Select all tasks' },
  { key: 'T', desc: 'Run AI triage' },
  { key: 'Esc', desc: 'Clear selection' },
]

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
        title="Keyboard shortcuts"
      >
        <Keyboard size={12} />
        <span className="hidden sm:inline">Shortcuts</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 w-64 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-200">Keyboard Shortcuts</h3>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{desc}</span>
                  <kbd className="text-[11px] bg-[#0f1117] border border-[#2a2d3a] text-gray-300 px-2 py-0.5 rounded font-mono">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

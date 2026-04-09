'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import type { TaskCreateInput } from '@/types/task'

interface Props {
  onAdd: (input: TaskCreateInput) => void
}

export function QuickAdd({ onAdd }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        setTitle('')
        setDueDate('')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({ title: title.trim(), due_date: dueDate ? new Date(dueDate).toISOString() : undefined, source: 'manual' })
    setTitle('')
    setDueDate('')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="flex items-center gap-2 w-full p-2.5 border border-dashed border-[#2a2d3a] rounded-lg text-sm text-gray-600 hover:border-gray-500 hover:text-gray-400 transition-colors"
      >
        <Plus size={14} />
        <span>Add task</span>
        <span className="ml-auto text-[10px] bg-[#1e2130] px-1.5 py-0.5 rounded text-gray-500">⌘K</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-blue-800/60 rounded-lg p-3 bg-blue-900/10 space-y-2">
      <div className="flex items-center gap-2">
        <Plus size={14} className="text-blue-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Task title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
          autoFocus
        />
        <button type="button" onClick={() => { setIsOpen(false); setTitle(''); setDueDate('') }} className="text-gray-600 hover:text-gray-400">
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 pl-5">
        <label className="text-xs text-gray-500">Due:</label>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="text-xs border border-[#2a2d3a] rounded px-2 py-1 bg-[#13151e] text-gray-400"
          min={new Date().toISOString().split('T')[0]}
        />
        <div className="flex-1" />
        <button
          type="submit"
          disabled={!title.trim()}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
        >
          Add task
        </button>
      </div>
    </form>
  )
}

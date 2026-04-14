'use client'

import { useState } from 'react'
import { Loader2, Copy, CheckCircle2, AlertCircle, ClipboardCopy } from 'lucide-react'

type Brand = 'Revenue Rush' | 'The Process'
type Format = 'Curiosity Gap' | 'Controversy' | 'Specificity' | 'Relatability' | 'Pattern Interrupt' | 'Story Arc' | 'Value Bomb'
type Count = 10 | 20 | 30

interface Hook {
  text: string
  format: string
}

const ALL_FORMATS: Format[] = [
  'Curiosity Gap', 'Controversy', 'Specificity', 'Relatability',
  'Pattern Interrupt', 'Story Arc', 'Value Bomb',
]

export function BatchHookPanel({ pushLog }: { pushLog?: (msg: string) => void }) {
  const [brand, setBrand] = useState<Brand>('Revenue Rush')
  const [topic, setTopic] = useState('')
  const [formats, setFormats] = useState<Format[]>(['Curiosity Gap', 'Specificity'])
  const [count, setCount] = useState<Count>(10)
  const [results, setResults] = useState<Hook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  function toggleFormat(f: Format) {
    setFormats(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )
  }

  function copyHook(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    })
  }

  function copyAll() {
    const text = results.map((h, i) => `${i + 1}. ${h.text}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    })
  }

  async function generate() {
    if (!topic.trim() || formats.length === 0 || loading) return
    setLoading(true)
    setError('')
    setResults([])
    pushLog?.(`Batch Hook Generator: generating ${count} hooks for ${brand}…`)

    try {
      const res = await fetch('/api/agents/batch-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, topic, formats, count }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResults(data.hooks ?? [])
      pushLog?.(`Generated ${data.hooks?.length ?? 0} hooks for ${brand}.`)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  // Group hooks by format if multiple formats selected
  const grouped: Record<string, Hook[]> = {}
  if (formats.length > 1 && results.length > 0) {
    for (const h of results) {
      if (!grouped[h.format]) grouped[h.format] = []
      grouped[h.format].push(h)
    }
  }
  const isGrouped = formats.length > 1 && Object.keys(grouped).length > 1

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
      {/* Header */}
      <div className="flex-shrink-0">
        <p className="text-sm font-semibold text-gray-200">🎣 Batch Hook Generator</p>
        <p className="text-[11px] text-gray-600 mt-0.5">Generate hooks at scale for your brands</p>
      </div>

      {/* Form */}
      <div className="flex-shrink-0 space-y-3">
        {/* Brand selector */}
        <div className="flex gap-2">
          {(['Revenue Rush', 'The Process'] as Brand[]).map(b => (
            <button
              key={b}
              onClick={() => setBrand(b)}
              className={`flex-1 py-2 rounded-xl border text-[11px] font-medium transition-all ${
                brand === b
                  ? b === 'Revenue Rush'
                    ? 'border-amber-700/50 bg-amber-900/20 text-amber-300'
                    : 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300'
                  : 'border-[#1e2030] bg-[#0d0f1a] text-gray-600 hover:text-gray-400'
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Topic input */}
        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') generate() }}
            placeholder="e.g. dropshipping, supplements, ads that convert"
            className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors"
          />
        </div>

        {/* Format checkboxes */}
        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Formats</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_FORMATS.map(f => (
              <button
                key={f}
                onClick={() => toggleFormat(f)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all ${
                  formats.includes(f)
                    ? 'border-purple-700/50 bg-purple-900/20 text-purple-300'
                    : 'border-[#1e2030] bg-[#0d0f1a] text-gray-600 hover:text-gray-400 hover:border-[#2a2d3a]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Count selector */}
        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 block">Count</label>
          <div className="flex gap-2">
            {([10, 20, 30] as Count[]).map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                  count === n
                    ? 'border-purple-700/50 bg-purple-900/20 text-purple-300'
                    : 'border-[#1e2030] bg-[#0d0f1a] text-gray-600 hover:text-gray-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={!topic.trim() || formats.length === 0 || loading}
          className="w-full flex items-center justify-center gap-2 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Generating {count} hooks…</>
            : <>🎣 Generate {count} Hooks</>}
        </button>
      </div>

      {error && (
        <div className="flex-shrink-0 flex items-start gap-2 rounded-xl border border-red-800/40 bg-red-900/20 p-3 text-sm text-red-300">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          {/* Export bar */}
          <div className="flex-shrink-0 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              {results.length} hooks — {brand}
            </p>
            <button
              onClick={copyAll}
              className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-[#0d0f1a] border border-transparent hover:border-[#1e2030]"
            >
              {copiedAll ? <CheckCircle2 size={12} className="text-emerald-400" /> : <ClipboardCopy size={12} />}
              Export all
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1
            [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">

            {isGrouped
              ? Object.entries(grouped).map(([fmt, hooks]) => (
                  <div key={fmt} className="mb-3">
                    <p className="text-[9px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5">{fmt}</p>
                    {hooks.map((h, i) => (
                      <HookRow
                        key={`${fmt}-${i}`}
                        hook={h}
                        index={results.indexOf(h)}
                        copiedIdx={copiedIdx}
                        onCopy={copyHook}
                      />
                    ))}
                  </div>
                ))
              : results.map((h, i) => (
                  <HookRow
                    key={i}
                    hook={h}
                    index={i}
                    copiedIdx={copiedIdx}
                    onCopy={copyHook}
                  />
                ))
            }
          </div>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <p className="text-2xl mb-2">🎣</p>
            <p className="text-sm text-gray-600">Enter a topic and generate hooks</p>
            <p className="text-[11px] text-gray-700 mt-1">Mix formats for variety</p>
          </div>
        </div>
      )}
    </div>
  )
}

function HookRow({
  hook,
  index,
  copiedIdx,
  onCopy,
}: {
  hook: Hook
  index: number
  copiedIdx: number | null
  onCopy: (text: string, idx: number) => void
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#1e2030] bg-[#0a0c14] hover:border-[#2a2d3a] transition-all px-3 py-2.5 group">
      <span className="flex-shrink-0 text-[11px] text-gray-700 w-5 text-right pt-0.5">{index + 1}.</span>
      <p className="flex-1 text-[12px] text-gray-300 leading-relaxed">{hook.text}</p>
      <button
        onClick={() => onCopy(hook.text, index)}
        title="Copy hook"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-700 hover:text-gray-300 hover:bg-[#1e2030] transition-all opacity-0 group-hover:opacity-100"
      >
        {copiedIdx === index
          ? <CheckCircle2 size={12} className="text-emerald-400" />
          : <Copy size={12} />}
      </button>
    </div>
  )
}

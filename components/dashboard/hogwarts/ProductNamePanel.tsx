'use client'

import { useState } from 'react'
import { Loader2, Tag, Copy, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

interface ProductName {
  name: string
  rationale: string
  tagline: string
  style: string
}

const STYLE_COLORS: Record<string, string> = {
  direct:       'text-blue-400 bg-blue-900/20 border-blue-800/30',
  abstract:     'text-purple-400 bg-purple-900/20 border-purple-800/30',
  emotional:    'text-rose-400 bg-rose-900/20 border-rose-800/30',
  functional:   'text-emerald-400 bg-emerald-900/20 border-emerald-800/30',
  aspirational: 'text-amber-400 bg-amber-900/20 border-amber-800/30',
}

export function ProductNamePanel({ pushLog }: { pushLog: (msg: string, type: 'chat' | 'status' | 'move' | 'meeting') => void }) {
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState<'Revenue Rush' | 'The Process'>('Revenue Rush')
  const [keywords, setKeywords] = useState('')
  const [names, setNames] = useState<ProductName[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  function copyName(name: string, idx: number) {
    navigator.clipboard.writeText(name).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    })
  }

  async function generate() {
    if (!description.trim() || loading) return
    setLoading(true)
    setError('')
    setNames([])
    pushLog(`Generating product names for ${brand}…`, 'status')

    try {
      const res = await fetch('/api/agents/product-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, brand, keywords: keywords || undefined }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setNames(data.names ?? [])
      pushLog(`Generated ${data.names?.length ?? 0} name options for ${brand}.`, 'chat')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
      {/* Header */}
      <div className="flex-shrink-0">
        <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Product Name Generator</p>
        <p className="text-[11px] text-gray-600">RON-powered naming engine for your brands</p>
      </div>

      {/* Form */}
      <div className="flex-shrink-0 space-y-3">
        {/* Brand selector */}
        <div className="flex gap-2">
          {(['Revenue Rush', 'The Process'] as const).map(b => (
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

        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Product Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={brand === 'Revenue Rush'
              ? 'e.g. A 6-week course teaching Shopify store owners how to run profitable Meta ads…'
              : 'e.g. A pre-workout supplement with clean ingredients, no fillers, designed for focus and energy…'
            }
            rows={3}
            className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Keywords (optional)</label>
          <input
            type="text"
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="e.g. growth, momentum, clarity, results…"
            className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors"
          />
        </div>

        <button
          onClick={generate}
          disabled={!description.trim() || loading}
          className="w-full flex items-center justify-center gap-2 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          {loading ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Tag size={15} /> Generate 10 Names</>}
        </button>
      </div>

      {error && (
        <div className="flex-shrink-0 flex items-start gap-2 rounded-xl border border-red-800/40 bg-red-900/20 p-3 text-sm text-red-300">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {names.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2
          [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{names.length} options for {brand}</p>
            <button onClick={generate} className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              <RefreshCw size={10} /> Regenerate
            </button>
          </div>
          {names.map((n, i) => (
            <div key={i} className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3 hover:border-[#2a2d3a] transition-colors group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-bold text-gray-100">{n.name}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${STYLE_COLORS[n.style] ?? 'text-gray-400 bg-gray-900/20 border-gray-800/30'}`}>
                      {n.style}
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-300 italic mb-1">"{n.tagline}"</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{n.rationale}</p>
                </div>
                <button
                  onClick={() => copyName(n.name, i)}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-[#1e2030] transition-all opacity-0 group-hover:opacity-100"
                  title="Copy name"
                >
                  {copiedIdx === i ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && names.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <Tag size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Describe your product to generate names</p>
            <p className="text-[11px] text-gray-700 mt-1">Context-aware naming for Revenue Rush and The Process</p>
          </div>
        </div>
      )}
    </div>
  )
}

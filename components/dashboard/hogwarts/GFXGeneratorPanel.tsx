'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Download, RefreshCw, ImageIcon, AlertCircle } from 'lucide-react'

interface GFXSection {
  timestamp: string
  topic: string
  gfxType: string
  description: string
  visualConcept: string
  imageUrl?: string
  imageError?: string
}

const GFX_TYPE_COLORS: Record<string, string> = {
  'lower-third':       'text-blue-400 bg-blue-900/20 border-blue-800/30',
  'fullscreen-graphic':'text-purple-400 bg-purple-900/20 border-purple-800/30',
  'callout-bubble':    'text-amber-400 bg-amber-900/20 border-amber-800/30',
  'data-viz':          'text-emerald-400 bg-emerald-900/20 border-emerald-800/30',
  'b-roll-overlay':    'text-cyan-400 bg-cyan-900/20 border-cyan-800/30',
  'title-card':        'text-red-400 bg-red-900/20 border-red-800/30',
  'icon-animation':    'text-orange-400 bg-orange-900/20 border-orange-800/30',
  'list-reveal':       'text-pink-400 bg-pink-900/20 border-pink-800/30',
}

export function GFXGeneratorPanel({ pushLog }: { pushLog: (msg: string, type: 'chat' | 'status' | 'move' | 'meeting') => void }) {
  const [transcript, setTranscript] = useState('')
  const [sections, setSections] = useState<GFXSection[]>([])
  const [loading, setLoading] = useState(false)
  const [generateImages, setGenerateImages] = useState(true)
  const [error, setError] = useState('')

  async function analyze() {
    if (!transcript.trim() || loading) return
    setLoading(true)
    setError('')
    setSections([])
    pushLog('GFX Generator analyzing transcript…', 'status')

    try {
      const res = await fetch('/api/gfx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, generateImages }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setSections(data.sections ?? [])
      pushLog(`GFX Generator found ${data.sections?.length ?? 0} opportunities.`, 'chat')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">GFX Generator</p>
          <p className="text-[11px] text-gray-600">Paste a video transcript or talking-head description</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={generateImages}
              onChange={e => setGenerateImages(e.target.checked)}
              className="accent-purple-500 w-3 h-3"
            />
            Generate reference images
          </label>
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex flex-col gap-2">
        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Paste your video transcript, script, or a description of your talking-head interview content here…"
          rows={5}
          className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors resize-none"
        />
        <button
          onClick={analyze}
          disabled={!transcript.trim() || loading}
          className="flex items-center justify-center gap-2 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Analyzing{generateImages ? ' + generating images' : ''}…</>
            : <><Sparkles size={15} /> Analyze for GFX</>}
        </button>
      </div>

      {error && (
        <div className="flex-shrink-0 flex items-start gap-2 rounded-xl border border-red-800/40 bg-red-900/20 p-3 text-sm text-red-300">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {sections.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3
          [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{sections.length} GFX Opportunities</p>
            <button onClick={analyze} className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              <RefreshCw size={10} /> Regenerate
            </button>
          </div>
          {sections.map((s, i) => (
            <div key={i} className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] overflow-hidden">
              <div className="flex items-start gap-3 p-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#1e2030] flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-500">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold text-gray-200">{s.timestamp}</span>
                    <span className="text-[10px] text-gray-600">—</span>
                    <span className="text-[11px] text-gray-400 truncate">{s.topic}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${GFX_TYPE_COLORS[s.gfxType] ?? 'text-gray-400 bg-gray-900/20 border-gray-800/30'}`}>
                      {s.gfxType}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{s.description}</p>
                </div>
              </div>
              {/* Reference image */}
              {s.imageUrl && (
                <div className="border-t border-[#1e2030] relative">
                  <img src={s.imageUrl} alt={`GFX reference for ${s.topic}`}
                    className="w-full object-cover rounded-b-xl max-h-64" />
                  <a
                    href={s.imageUrl} target="_blank" rel="noreferrer"
                    className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-gray-300 bg-black/70 hover:bg-black/90 rounded-lg px-2 py-1 transition-colors"
                  >
                    <Download size={10} /> Full size
                  </a>
                </div>
              )}
              {s.imageError && (
                <div className="border-t border-[#1e2030] px-3 py-2 flex items-center gap-2 text-[10px] text-gray-600">
                  <ImageIcon size={11} className="text-gray-700" />
                  Image generation failed: {s.imageError}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && sections.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <Sparkles size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Paste a transcript to find GFX opportunities</p>
            <p className="text-[11px] text-gray-700 mt-1">Supports scripts, auto-captions, or plain descriptions</p>
          </div>
        </div>
      )}
    </div>
  )
}

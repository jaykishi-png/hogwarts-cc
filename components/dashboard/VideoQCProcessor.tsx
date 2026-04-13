'use client'

import { useState, useRef, useCallback } from 'react'
import { Clapperboard, Link2, Upload, ToggleLeft, ToggleRight, ClipboardCopy, Check, Loader2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry { name: string; report: string; ts: string }

type Stage =
  | 'idle'
  | 'extracting-frames'
  | 'detecting-cuts'
  | 'analyzing-visuals'
  | 'transcribing'
  | 'generating-report'
  | 'done'

const STAGE_LABELS: Record<Stage, string> = {
  'idle':               '',
  'extracting-frames':  'Extracting frames…',
  'detecting-cuts':     'Detecting jump cuts…',
  'analyzing-visuals':  'Analysing frames with GPT-4o Vision…',
  'transcribing':       'Transcribing audio with Whisper…',
  'generating-report':  'HARRY is writing the report…',
  'done':               'Done',
}

// ─── WAV encoder (pure JS, no deps) ──────────────────────────────────────────

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buf  = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buf)
  const ws   = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true)
  ws(8, 'WAVE'); ws(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true);  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  ws(36, 'data'); view.setUint32(40, samples.length * 2, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2
  }
  return buf
}

// ─── Luminance-based pixel diff ───────────────────────────────────────────────

function pixelDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let sum = 0
  for (let i = 0; i < a.length; i += 4) {
    const la = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]
    const lb = 0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]
    sum += Math.abs(la - lb)
  }
  return sum / (a.length / 4) / 255
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  pushLog: (msg: string, type: 'chat' | 'move' | 'status' | 'meeting') => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VideoQCProcessor({ pushLog }: Props) {
  const [mode, setMode]           = useState<'url' | 'file'>('file')

  // URL mode state
  const [qcUrl, setQcUrl]         = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError]   = useState('')
  const [postComment, setPostComment] = useState(false)

  // File mode state
  const [file, setFile]           = useState<File | null>(null)
  const [stage, setStage]         = useState<Stage>('idle')
  const [progress, setProgress]   = useState(0)
  const [progressDetail, setProgressDetail] = useState('')

  // Shared output state
  const [report, setReport]       = useState('')
  const [assetName, setAssetName] = useState('')
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)
  const [history, setHistory]     = useState<HistoryEntry[]>([])

  const dropRef   = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    setFile(null); setStage('idle'); setProgress(0); setProgressDetail('')
    setReport(''); setAssetName(''); setError('')
  }

  // ── File drag-drop ────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && (f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|avi|mkv|webm)$/i))) {
      setFile(f); setError('')
    } else {
      setError('Please drop a video file (MP4, MOV, AVI, MKV, WebM)')
    }
  }, [])

  // ── URL-based QC (existing flow) ──────────────────────────────────────────
  async function runUrlQc() {
    if (!qcUrl.trim() || urlLoading) return
    setUrlLoading(true); setUrlError(''); setReport(''); setAssetName('')
    pushLog('HARRY: Running QC on Frame.io asset…', 'chat')
    try {
      const res  = await fetch('/api/qc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: qcUrl.trim(), postComment }),
      })
      const data = await res.json()
      if (data.error) { setUrlError(data.error) }
      else {
        setReport(data.answer); setAssetName(data.assetName ?? 'Asset')
        pushLog(`HARRY: QC complete — "${data.assetName}"`, 'chat')
        setHistory(p => [{ name: data.assetName ?? 'Asset', report: data.answer, ts: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) }, ...p.slice(0, 9)])
      }
    } catch (e) { setUrlError(String(e)) }
    finally { setUrlLoading(false) }
  }

  // ── File-based QC pipeline ────────────────────────────────────────────────
  async function runFileQc() {
    if (!file || stage !== 'idle') return
    setError(''); setReport(''); setAssetName(file.name)
    pushLog(`HARRY: Processing "${file.name}"…`, 'chat')

    try {
      // ── Step 1: Extract frames at 1fps via HTML5 Video + Canvas ──────────
      setStage('extracting-frames'); setProgress(0)

      const frames = await new Promise<Array<{ time: number; dataUrl: string; pixels: Uint8ClampedArray }>>(
        (resolve, reject) => {
          const video  = document.createElement('video')
          const objUrl = URL.createObjectURL(file)
          video.src    = objUrl
          video.muted  = true
          video.preload = 'auto'
          video.crossOrigin = 'anonymous'

          video.onloadedmetadata = async () => {
            const duration  = video.duration
            const total     = Math.max(1, Math.floor(duration))
            const collected: Array<{ time: number; dataUrl: string; pixels: Uint8ClampedArray }> = []

            // Main canvas (scaled to 640px wide for Vision)
            const scale  = Math.min(1, 640 / (video.videoWidth || 1280))
            const cw     = Math.round((video.videoWidth || 1280) * scale)
            const ch     = Math.round((video.videoHeight || 720) * scale)
            const canvas = document.createElement('canvas')
            canvas.width = cw; canvas.height = ch
            const ctx    = canvas.getContext('2d')!

            // Thumb canvas (64×36) for fast pixel diff
            const thumb  = document.createElement('canvas')
            thumb.width  = 64; thumb.height = 36
            const tctx   = thumb.getContext('2d')!

            for (let i = 0; i <= total; i++) {
              video.currentTime = i
              await new Promise<void>(res => { video.onseeked = () => res() })
              ctx.drawImage(video, 0, 0, cw, ch)
              tctx.drawImage(video, 0, 0, 64, 36)
              collected.push({
                time:    i,
                dataUrl: canvas.toDataURL('image/jpeg', 0.65),
                pixels:  tctx.getImageData(0, 0, 64, 36).data,
              })
              setProgress(Math.round((i / total) * 100))
              setProgressDetail(`Frame ${i} / ${total}`)
            }
            URL.revokeObjectURL(objUrl)
            resolve(collected)
          }
          video.onerror = reject
          video.load()
        }
      )

      // ── Step 2: Detect jump cuts ──────────────────────────────────────────
      setStage('detecting-cuts'); setProgress(0)
      const JUMP_THRESHOLD = 0.12
      const jumpCuts: number[] = []
      for (let i = 1; i < frames.length; i++) {
        const diff = pixelDiff(frames[i - 1].pixels, frames[i].pixels)
        if (diff > JUMP_THRESHOLD) jumpCuts.push(frames[i].time)
        setProgress(Math.round((i / frames.length) * 100))
      }

      // ── Step 3: Send frames to GPT-4o Vision in batches of 8 ─────────────
      setStage('analyzing-visuals'); setProgress(0)
      const BATCH = 8
      const stripped = frames.map(f => ({ time: f.time, dataUrl: f.dataUrl }))
      const totalBatches = Math.ceil(stripped.length / BATCH)
      const visualFindings: string[] = []

      for (let b = 0; b < totalBatches; b++) {
        const batch = stripped.slice(b * BATCH, (b + 1) * BATCH)
        setProgressDetail(`Batch ${b + 1} / ${totalBatches}`)
        const res  = await fetch('/api/qc/frames', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frames: batch, batchIndex: b, totalBatches }),
        })
        const data = await res.json()
        if (data.findings) visualFindings.push(data.findings)
        setProgress(Math.round(((b + 1) / totalBatches) * 100))
      }

      // ── Step 4: Extract audio + Whisper ───────────────────────────────────
      setStage('transcribing'); setProgress(0); setProgressDetail('')
      let transcript = ''
      try {
        // Decode audio via Web Audio API, resample to 16kHz mono
        const arrayBuf  = await file.arrayBuffer()
        const tmpCtx    = new AudioContext()
        const decoded   = await tmpCtx.decodeAudioData(arrayBuf.slice(0))
        await tmpCtx.close()

        const targetRate  = 16000
        const offCtx      = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate)
        const src         = offCtx.createBufferSource()
        src.buffer        = decoded
        src.connect(offCtx.destination)
        src.start()
        const resampled   = await offCtx.startRendering()
        const mono        = resampled.getChannelData(0)

        // Split into ~3.8MB chunks and transcribe each
        const MAX_SAMPLES = Math.floor(3.8 * 1024 * 1024 / 2)
        const chunks      = Math.ceil(mono.length / MAX_SAMPLES)
        const parts: string[] = []

        for (let c = 0; c < chunks; c++) {
          const slice  = mono.slice(c * MAX_SAMPLES, (c + 1) * MAX_SAMPLES)
          const wav    = encodeWAV(slice, targetRate)
          const blob   = new Blob([wav], { type: 'audio/wav' })
          const fd     = new FormData()
          fd.append('audio', blob, `chunk_${c}.wav`)
          fd.append('chunkIdx', String(c))
          setProgressDetail(`Chunk ${c + 1} / ${chunks}`)
          const res  = await fetch('/api/qc/audio', { method: 'POST', body: fd })
          const data = await res.json()
          if (data.transcript) parts.push(data.transcript)
          setProgress(Math.round(((c + 1) / chunks) * 100))
        }
        transcript = parts.join(' ')
      } catch (audioErr) {
        console.warn('Audio extraction failed:', audioErr)
        // non-fatal — continue without transcript
      }

      // ── Step 5: HARRY synthesises the report ──────────────────────────────
      setStage('generating-report'); setProgress(0)
      const video2 = document.createElement('video')
      video2.src   = URL.createObjectURL(file)
      await new Promise<void>(res => { video2.onloadedmetadata = () => res(); video2.load() })
      const duration = video2.duration
      URL.revokeObjectURL(video2.src)

      const res  = await fetch('/api/qc/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName:       file.name,
          duration,
          visualFindings,
          transcript,
          jumpCuts,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setReport(data.report)
      setStage('done')
      pushLog(`HARRY: QC complete — "${file.name}" (${jumpCuts.length} jump cuts, ${frames.length} frames)`, 'chat')
      setHistory(p => [{ name: file.name, report: data.report, ts: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) }, ...p.slice(0, 9)])

    } catch (err: unknown) {
      setError(String(err))
      setStage('idle')
    }
  }

  const isProcessing = stage !== 'idle' && stage !== 'done'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-red-900/40 border border-red-800/40 flex items-center justify-center">
            <Clapperboard size={13} className="text-red-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-200">Video QC</p>
            <p className="text-[10px] text-gray-600">Frame-by-frame · Whisper audio · Jump cut detection</p>
          </div>

          {/* Mode tabs */}
          <div className="ml-auto flex items-center bg-[#07080e] border border-[#1e2030] rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => { setMode('file'); reset() }}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${mode === 'file' ? 'bg-red-800/60 text-red-200' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <Upload size={10} className="inline mr-1" />File Upload
            </button>
            <button
              onClick={() => { setMode('url'); reset() }}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${mode === 'url' ? 'bg-red-800/60 text-red-200' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <Link2 size={10} className="inline mr-1" />Frame.io Link
            </button>
          </div>
        </div>

        {/* ── File upload mode ─────────────────────────────────────────── */}
        {mode === 'file' && (
          <>
            {!file ? (
              <div
                ref={dropRef}
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInput.current?.click()}
                className="border-2 border-dashed border-[#2a2d3a] hover:border-red-800/60 rounded-xl p-6 text-center cursor-pointer transition-colors group"
              >
                <Upload size={20} className="mx-auto text-gray-700 group-hover:text-red-800/60 mb-2 transition-colors" />
                <p className="text-xs text-gray-600 group-hover:text-gray-500 transition-colors">
                  Drop video file here or <span className="text-red-400">click to browse</span>
                </p>
                <p className="text-[10px] text-gray-700 mt-1">MP4, MOV, AVI, MKV, WebM</p>
                <input ref={fileInput} type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError('') } }} />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2.5 flex items-center gap-2 min-w-0">
                  <Clapperboard size={13} className="text-red-400 flex-shrink-0" />
                  <span className="text-xs text-gray-300 truncate">{file.name}</span>
                  <span className="text-[10px] text-gray-600 flex-shrink-0">
                    {(file.size / 1_000_000).toFixed(1)} MB
                  </span>
                </div>
                {!isProcessing && (
                  <button onClick={reset} className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                )}
                <button
                  onClick={runFileQc}
                  disabled={isProcessing || stage === 'done'}
                  className="flex-shrink-0 bg-red-800/80 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Clapperboard size={13} />}
                  {isProcessing ? STAGE_LABELS[stage].replace('…', '') : stage === 'done' ? 'Done ✓' : 'Run QC'}
                </button>
              </div>
            )}

            {/* Progress bar */}
            {isProcessing && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{STAGE_LABELS[stage]}</span>
                  <span className="text-[10px] text-gray-700">{progressDetail}</span>
                </div>
                <div className="h-1.5 bg-[#07080e] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-700 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── URL mode ─────────────────────────────────────────────────── */}
        {mode === 'url' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-600">Thumbnail + OG metadata analysis (no file download)</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <button onClick={() => setPostComment(p => !p)} className="flex items-center">
                  {postComment
                    ? <ToggleRight size={18} className="text-red-400" />
                    : <ToggleLeft  size={18} className="text-gray-600" />}
                </button>
                <span className="text-[10px] text-gray-600">Post to Frame.io</span>
              </label>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                <input
                  type="text" value={qcUrl}
                  onChange={e => { setQcUrl(e.target.value); setUrlError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') runUrlQc() }}
                  placeholder="Paste Frame.io link (f.io, app.frame.io, next.frame.io)…"
                  className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg pl-8 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-red-700/60 transition-colors"
                />
              </div>
              <button
                onClick={runUrlQc} disabled={!qcUrl.trim() || urlLoading}
                className="flex-shrink-0 bg-red-800/80 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {urlLoading ? <Loader2 size={13} className="animate-spin" /> : <Clapperboard size={13} />}
                {urlLoading ? 'Running…' : 'Run QC'}
              </button>
            </div>
            {urlError && <p className="text-[11px] text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">⚠️ {urlError}</p>}
          </div>
        )}

        {error && <p className="mt-2 text-[11px] text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">⚠️ {error}</p>}
      </div>

      {/* ── Report + History ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex gap-3">

        {/* Report panel */}
        <div className="flex-1 min-h-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] flex flex-col overflow-hidden">
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-red-500 opacity-70" />
              <div className="text-center space-y-1">
                <p className="text-xs text-gray-400 font-medium">{STAGE_LABELS[stage]}</p>
                {progressDetail && <p className="text-[10px] text-gray-700">{progressDetail}</p>}
              </div>
            </div>
          )}

          {!isProcessing && !report && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-center p-6">
              <div className="w-12 h-12 rounded-xl bg-red-900/20 border border-red-800/20 flex items-center justify-center">
                <Clapperboard size={20} className="text-red-800/60" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">No report yet</p>
                <p className="text-[10px] text-gray-700 mt-0.5 leading-relaxed">
                  {mode === 'file'
                    ? 'Drop a video file and click Run QC'
                    : 'Paste a Frame.io link and click Run QC'}
                </p>
              </div>
              {mode === 'file' && (
                <div className="mt-2 text-[10px] text-gray-800 space-y-1 text-left">
                  <p>✓ Every frame examined (1fps)</p>
                  <p>✓ Typos on every title / lower third</p>
                  <p>✓ Jump cut detection (pixel diff)</p>
                  <p>✓ Full audio → Whisper transcription</p>
                  <p>✓ Filler words, cut-offs, repeated phrases</p>
                </div>
              )}
            </div>
          )}

          {!isProcessing && report && (
            <>
              <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-[#1e2030]">
                <Image src="/agents/HARRY_Cyborg.png" alt="HARRY" width={22} height={22} className="rounded-md object-cover" />
                <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider">HARRY</span>
                <span className="text-[10px] text-gray-600 ml-0.5">· Creative Review</span>
                {assetName && (
                  <span className="ml-1 text-[10px] text-gray-500 bg-[#1e2030] rounded px-1.5 py-0.5 truncate max-w-[200px]">
                    {assetName}
                  </span>
                )}
                <button
                  onClick={() => { navigator.clipboard.writeText(report); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="ml-auto flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-300 transition-colors"
                >
                  {copied ? <Check size={11} className="text-green-400" /> : <ClipboardCopy size={11} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 prose prose-invert max-w-none text-xs text-gray-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <p className="font-bold text-gray-100 mb-2 mt-3 text-sm border-b border-[#1e2030] pb-1">{children}</p>,
                    h2: ({ children }) => <p className="font-bold text-gray-200 mb-1.5 mt-3 text-[13px]">{children}</p>,
                    h3: ({ children }) => <p className="font-semibold text-gray-300 mb-1 mt-2 text-xs">{children}</p>,
                    p:  ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
                    em: ({ children }) => <em className="italic text-gray-400">{children}</em>,
                    code: ({ children }) => <code className="bg-[#1e2030] text-red-300 rounded px-1 py-0.5 font-mono text-[11px]">{children}</code>,
                    hr: () => <hr className="border-[#2a2d3a] my-3" />,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-red-700 pl-3 text-gray-400 italic my-2">{children}</blockquote>,
                  }}
                >
                  {report}
                </ReactMarkdown>
              </div>
            </>
          )}
        </div>

        {/* History sidebar */}
        {history.length > 0 && (
          <div className="w-52 flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] flex flex-col overflow-hidden">
            <p className="flex-shrink-0 text-[9px] font-semibold text-gray-700 uppercase tracking-wider px-3 pt-3 pb-2 border-b border-[#1e2030]">
              Recent Reviews
            </p>
            <div className="flex-1 overflow-y-auto">
              {history.map((h, i) => (
                <button key={i} onClick={() => { setReport(h.report); setAssetName(h.name) }}
                  className="w-full text-left px-3 py-2.5 border-b border-[#1e2030]/60 hover:bg-[#1e2030]/40 transition-colors"
                >
                  <p className="text-[10px] text-gray-300 font-medium truncate">{h.name}</p>
                  <p className="text-[9px] text-gray-700 mt-0.5">{h.ts}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

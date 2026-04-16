'use client'

import { useState, useRef, useCallback, useId } from 'react'
import {
  Mic, Upload, Check, Loader2, X, FileText, FileCode,
  Download, BookOpen, ExternalLink, FolderOpen, ChevronDown,
} from 'lucide-react'
import { TRANSCRIPT_TEMPLATES } from '@/config/transcript-templates'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Segment { start: number; end: number; text: string }

type TxStatus  = 'pending' | 'transcribing' | 'done' | 'error'
type DocStatus = 'pending' | 'creating'     | 'done' | 'error'

interface BatchItem {
  id:          string
  file:        File
  txStatus:    TxStatus
  txProgress:  number
  txChunk:     string
  transcript:  string
  segments:    Segment[]
  txError:     string
  moduleNum:   string
  lessonNum:   string
  lessonTitle: string
  docStatus:   DocStatus
  docUrl:      string
  docTitle:    string
  docError:    string
}

type PanelStage = 'idle' | 'queued' | 'transcribing' | 'metadata' | 'creating' | 'done'

interface Props { pushLog: (msg: string, type: 'chat' | 'move' | 'status' | 'meeting') => void }

// ─── WAV encoder ────────────────────────────────────────────────────────────

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

// ─── SRT / VTT / download helpers ───────────────────────────────────────────

function padT(n: number) { return n.toString().padStart(2, '0') }
function toSRTTime(s: number): string {
  const ms = Math.floor((s % 1) * 1000)
  const ss = Math.floor(s) % 60
  const mm = Math.floor(s / 60) % 60
  const hh = Math.floor(s / 3600)
  return `${padT(hh)}:${padT(mm)}:${padT(ss)},${ms.toString().padStart(3, '0')}`
}
function generateSRT(segs: Segment[]): string {
  return segs.filter(s => s.text.trim())
    .map((s, i) => `${i + 1}\n${toSRTTime(s.start)} --> ${toSRTTime(s.end)}\n${s.text.trim()}`)
    .join('\n\n')
}
function generateVTT(segs: Segment[]): string {
  const t = (s: number) => toSRTTime(s).replace(',', '.')
  return 'WEBVTT\n\n' + segs.filter(s => s.text.trim())
    .map((s, i) => `${i + 1}\n${t(s.start)} --> ${t(s.end)}\n${s.text.trim()}`)
    .join('\n\n')
}
function downloadText(content: string, filename: string, mime: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = filename; a.click(); URL.revokeObjectURL(a.href)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pad2 = (n: string) => n.trim().padStart(2, '0')
const wordCount = (t: string) => t.trim() ? t.trim().split(/\s+/).length : 0
const baseName  = (f: File) => f.name.replace(/\.[^/.]+$/, '')
const truncate  = (s: string, n = 30) => s.length > n ? s.slice(0, n - 1) + '…' : s

function makeItem(file: File, lessonIdx: number): BatchItem {
  return {
    id: `${file.name}-${Date.now()}-${Math.random()}`,
    file,
    txStatus: 'pending', txProgress: 0, txChunk: '', transcript: '', segments: [], txError: '',
    moduleNum: '1', lessonNum: String(lessonIdx + 1), lessonTitle: '',
    docStatus: 'pending', docUrl: '', docTitle: '', docError: '',
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TranscriptionPanel({ pushLog }: Props) {
  const uid = useId()
  const fileInput = useRef<HTMLInputElement>(null)

  const [items,       setItems]       = useState<BatchItem[]>([])
  const [panelStage,  setPanelStage]  = useState<PanelStage>('idle')
  const [templateKey,  setTemplateKey]  = useState(TRANSCRIPT_TEMPLATES[0].key)
  const [courseTitle,  setCourseTitle]  = useState(TRANSCRIPT_TEMPLATES[0].courseTitle)
  const [courseLevel,  setCourseLevel]  = useState('')
  const [folderUrl,   setFolderUrl]   = useState('')
  const [folderName,  setFolderName]  = useState('')
  const [globalError, setGlobalError] = useState('')

  // ── Item updater ───────────────────────────────────────────────────────────
  const updateItem = useCallback((id: string, patch: Partial<BatchItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }, [])

  // ── addFiles ───────────────────────────────────────────────────────────────
  const addFiles = useCallback((files: File[]) => {
    const valid = files.filter(f =>
      f.type.startsWith('video/') || f.type.startsWith('audio/') ||
      /\.(mp4|mov|avi|mkv|webm|mp3|m4a|wav|aac)$/i.test(f.name)
    )
    if (!valid.length) return
    setItems(prev => {
      const base = prev.length
      const newItems = valid.map((f, i) => makeItem(f, base + i))
      return [...prev, ...newItems]
    })
    setPanelStage('queued')
    setGlobalError('')
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(it => it.id !== id)
      if (!next.length) setPanelStage('idle')
      return next
    })
  }, [])

  // ── onDrop ─────────────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  // ── transcribeItem ─────────────────────────────────────────────────────────
  const transcribeItem = useCallback(async (item: BatchItem) => {
    updateItem(item.id, { txStatus: 'transcribing', txProgress: 0, txChunk: '', txError: '' })
    try {
      const TARGET_RATE   = 16000
      const MAX_SAMPLES   = Math.floor(3.8 * 1024 * 1024 / 2)
      const chunkDuration = MAX_SAMPLES / TARGET_RATE

      const arrayBuf = await item.file.arrayBuffer()
      const tmpCtx   = new AudioContext()
      const decoded  = await tmpCtx.decodeAudioData(arrayBuf.slice(0))
      await tmpCtx.close()

      const offCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_RATE), TARGET_RATE)
      const src    = offCtx.createBufferSource()
      src.buffer   = decoded; src.connect(offCtx.destination); src.start()
      const resampled = await offCtx.startRendering()
      const mono      = resampled.getChannelData(0)

      const chunks   = Math.ceil(mono.length / MAX_SAMPLES)
      const parts:   string[]  = []
      const allSegs: Segment[] = []

      for (let c = 0; c < chunks; c++) {
        const timeOffset = c * chunkDuration
        const slice      = mono.slice(c * MAX_SAMPLES, (c + 1) * MAX_SAMPLES)
        const wav        = encodeWAV(slice, TARGET_RATE)
        const blob       = new Blob([wav], { type: 'audio/wav' })
        const fd         = new FormData()
        fd.append('audio', blob, `chunk_${c}.wav`)
        fd.append('chunkIdx', String(c))

        updateItem(item.id, {
          txChunk:    `Chunk ${c + 1} / ${chunks}`,
          txProgress: Math.round((c / chunks) * 100),
        })

        const res  = await fetch('/api/qc/audio', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        if (data.transcript) parts.push(data.transcript)
        for (const seg of (data.segments ?? [])) {
          allSegs.push({ start: seg.start + timeOffset, end: seg.end + timeOffset, text: seg.text })
        }
        updateItem(item.id, { txProgress: Math.round(((c + 1) / chunks) * 100) })
      }

      const fullText = parts.join(' ').trim()
      updateItem(item.id, { txStatus: 'done', txProgress: 100, transcript: fullText, segments: allSegs })
      pushLog(`Transcribed "${item.file.name}" · ${allSegs.length} segments`, 'chat')
    } catch (err) {
      updateItem(item.id, { txStatus: 'error', txError: String(err) })
    }
  }, [updateItem, pushLog])

  // ── transcribeAll ──────────────────────────────────────────────────────────
  const transcribeAll = useCallback(async () => {
    setPanelStage('transcribing')
    setGlobalError('')
    // We need the snapshot at call time — read from ref via functional update pattern
    setItems(prev => {
      // kick off async transcription using the current items list
      ;(async () => {
        for (const item of prev) {
          if (item.txStatus !== 'pending') continue
          await transcribeItem(item)
        }
        setPanelStage('metadata')
      })()
      return prev
    })
  }, [transcribeItem])

  // ── createAllDocs ──────────────────────────────────────────────────────────
  const createAllDocs = useCallback(async () => {
    setPanelStage('creating')
    setGlobalError('')

    // 1. Create Drive folder
    let fId = ''
    let fUrl = ''
    try {
      const template = TRANSCRIPT_TEMPLATES.find(t => t.key === templateKey)
      const name = template?.key ?? templateKey
      const res  = await fetch('/api/drive-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fId   = data.folderId
      fUrl  = data.folderUrl
      setFolderUrl(fUrl)
      setFolderName(name)
      pushLog(`Drive folder created — "${name}"`, 'chat')
    } catch (err) {
      setGlobalError(`Folder creation failed: ${String(err)}`)
      setPanelStage('metadata')
      return
    }

    // 2. Create each doc
    let allDone = true
    for (const item of items) {
      updateItem(item.id, { docStatus: 'creating', docError: '' })
      try {
        const res = await fetch('/api/transcript-to-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateKey,
            courseTitle: courseTitle.trim() || undefined,
            courseLevel: courseLevel.trim() || 'Beginner',
            lessonTitle: item.lessonTitle,
            moduleNum:   item.moduleNum,
            lessonNum:   item.lessonNum,
            transcript:  item.transcript,
            folderId:    fId,
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        updateItem(item.id, { docStatus: 'done', docUrl: data.docUrl, docTitle: data.docTitle })
        pushLog(`Google Doc created — "${data.docTitle}"`, 'chat')
      } catch (err) {
        updateItem(item.id, { docStatus: 'error', docError: String(err) })
        allDone = false
      }
    }

    setPanelStage('done')
    if (!allDone) setGlobalError('Some docs failed — see individual errors below.')
  }, [items, templateKey, courseTitle, courseLevel, updateItem, pushLog])

  // ── reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setItems([]); setPanelStage('idle'); setTemplateKey(TRANSCRIPT_TEMPLATES[0].key)
    setCourseTitle(TRANSCRIPT_TEMPLATES[0].courseTitle)
    setCourseLevel(''); setFolderUrl(''); setFolderName(''); setGlobalError('')
  }, [])

  // ── selectedTemplate ───────────────────────────────────────────────────────
  const selectedTemplate = TRANSCRIPT_TEMPLATES.find(t => t.key === templateKey)

  // ── docNamePreview ─────────────────────────────────────────────────────────
  const docPreview = (item: BatchItem) =>
    `${templateKey} M${pad2(item.moduleNum || '1')}L${pad2(item.lessonNum || '1')} Transcript`

  // ── Export buttons ─────────────────────────────────────────────────────────
  function ExportButtons({ item }: { item: BatchItem }) {
    if (item.txStatus !== 'done') return null
    const name = baseName(item.file)
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => downloadText(item.transcript, `${name}.txt`, 'text/plain')}
          className="flex items-center gap-0.5 text-[9px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors"
        >
          <Download size={9} />TXT
        </button>
        <button
          onClick={() => downloadText(generateSRT(item.segments), `${name}.srt`, 'text/plain')}
          className="flex items-center gap-0.5 text-[9px] text-violet-500 hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-900/20 border border-violet-800/30 transition-colors"
        >
          <FileCode size={9} />SRT
        </button>
        <button
          onClick={() => downloadText(generateVTT(item.segments), `${name}.vtt`, 'text/vtt')}
          className="flex items-center gap-0.5 text-[9px] text-violet-500 hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-900/20 border border-violet-800/30 transition-colors"
        >
          <FileCode size={9} />VTT
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-900/40 border border-violet-800/40 flex items-center justify-center">
              <Mic size={13} className="text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-200">Batch Transcribe</p>
              <p className="text-[10px] text-gray-600">Whisper · multi-file · Google Docs</p>
            </div>
          </div>
          {panelStage !== 'idle' && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors px-2 py-1 rounded hover:bg-white/5"
            >
              <X size={11} />New Batch
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInput.current?.click()}
          className="border-2 border-dashed border-[#2a2d3a] hover:border-violet-800/60 rounded-xl p-5 text-center cursor-pointer transition-colors group"
        >
          <Upload size={18} className="mx-auto text-gray-700 group-hover:text-violet-800/60 mb-1.5 transition-colors" />
          <p className="text-xs text-gray-600 group-hover:text-gray-500 transition-colors">
            Drop video/audio files or <span className="text-violet-400">click to browse</span>
          </p>
          <p className="text-[10px] text-gray-700 mt-0.5">MP4, MOV, MKV, MP3, WAV, M4A — multiple files OK</p>
          <input
            ref={fileInput} id={`${uid}-file`} type="file"
            accept="video/*,audio/*" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) addFiles(Array.from(e.target.files)) }}
          />
        </div>

        {globalError && (
          <p className="mt-2 text-[10px] text-red-400">{globalError}</p>
        )}
      </div>

      {/* ── Queued file list ────────────────────────────────────────────────── */}
      {(panelStage === 'queued' || panelStage === 'transcribing') && items.length > 0 && (
        <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-300">
              {items.length} file{items.length !== 1 ? 's' : ''} queued
            </p>
            {panelStage === 'queued' && (
              <button
                onClick={transcribeAll}
                className="flex items-center gap-1.5 bg-violet-800/80 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
              >
                <Mic size={12} />Transcribe All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {item.txStatus === 'pending'      && <FileText size={12} className="text-gray-600 flex-shrink-0" />}
                  {item.txStatus === 'transcribing' && <Loader2  size={12} className="text-violet-400 animate-spin flex-shrink-0" />}
                  {item.txStatus === 'done'         && <Check    size={12} className="text-violet-400 flex-shrink-0" />}
                  {item.txStatus === 'error'        && <X        size={12} className="text-red-400 flex-shrink-0" />}
                  <span className="text-xs text-gray-300 truncate flex-1">{truncate(item.file.name, 40)}</span>
                  <span className="text-[10px] text-gray-600 flex-shrink-0">{(item.file.size / 1_000_000).toFixed(1)} MB</span>
                  {panelStage === 'queued' && item.txStatus === 'pending' && (
                    <button onClick={() => removeItem(item.id)} className="text-gray-700 hover:text-gray-500 flex-shrink-0 transition-colors">
                      <X size={11} />
                    </button>
                  )}
                </div>
                {item.txStatus === 'transcribing' && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-gray-600">Transcribing…</span>
                      <span className="text-[10px] text-gray-700">{item.txChunk}</span>
                    </div>
                    <div className="h-1 bg-[#1e2030] rounded-full overflow-hidden">
                      <div className="h-full bg-violet-700 rounded-full transition-all duration-300" style={{ width: `${item.txProgress}%` }} />
                    </div>
                  </div>
                )}
                {item.txStatus === 'error' && (
                  <p className="mt-1 text-[10px] text-red-400 truncate">{item.txError}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Metadata form ───────────────────────────────────────────────────── */}
      {(panelStage === 'metadata' || panelStage === 'creating' || panelStage === 'done') && (
        <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-4 space-y-4">

          {/* Folder success banner */}
          {folderUrl && (
            <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-800/40 rounded-lg px-3 py-2">
              <FolderOpen size={12} className="text-emerald-400 flex-shrink-0" />
              <span className="text-xs text-emerald-300 flex-1 truncate">{folderName}</span>
              <a href={folderUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex-shrink-0">
                Open <ExternalLink size={10} />
              </a>
            </div>
          )}

          {/* Global fields */}
          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2">Global Settings</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Course</label>
                <div className="relative">
                  <select
                    value={templateKey}
                    onChange={e => {
                      const key = e.target.value
                      setTemplateKey(key)
                      const tpl = TRANSCRIPT_TEMPLATES.find(t => t.key === key)
                      if (tpl) setCourseTitle(tpl.courseTitle)
                    }}
                    disabled={panelStage === 'creating' || panelStage === 'done'}
                    className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-xs text-gray-300 appearance-none cursor-pointer focus:outline-none focus:border-emerald-800/60 disabled:opacity-50"
                  >
                    {TRANSCRIPT_TEMPLATES.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Course Title</label>
                <input
                  type="text" value={courseTitle}
                  onChange={e => setCourseTitle(e.target.value)}
                  placeholder="e.g. Launching Email Campaigns"
                  disabled={panelStage === 'creating' || panelStage === 'done'}
                  className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-800/60 placeholder:text-gray-700 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Course Level</label>
                <input
                  type="text" value={courseLevel}
                  onChange={e => setCourseLevel(e.target.value)}
                  placeholder="Beginner"
                  disabled={panelStage === 'creating' || panelStage === 'done'}
                  className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-800/60 placeholder:text-gray-700 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Per-file cards */}
          <div>
            <p className="text-xs font-semibold text-gray-300 mb-2">Per-File Metadata</p>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="bg-[#07080e] border border-[#1e2030] rounded-lg p-3 space-y-2">

                  {/* File header row */}
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={12} className="text-violet-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300 truncate flex-1">{truncate(item.file.name, 35)}</span>
                    {item.txStatus === 'done' && (
                      <span className="text-[10px] text-gray-600 flex-shrink-0">
                        {wordCount(item.transcript).toLocaleString()} words
                      </span>
                    )}
                    <ExportButtons item={item} />
                  </div>

                  {/* Module / Lesson / preview row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-gray-600">Module</label>
                      <input
                        type="number" min="1" value={item.moduleNum}
                        onChange={e => updateItem(item.id, { moduleNum: e.target.value })}
                        disabled={panelStage === 'creating' || panelStage === 'done'}
                        className="w-14 bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-emerald-800/60 disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-gray-600">Lesson</label>
                      <input
                        type="number" min="1" value={item.lessonNum}
                        onChange={e => updateItem(item.id, { lessonNum: e.target.value })}
                        disabled={panelStage === 'creating' || panelStage === 'done'}
                        className="w-14 bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-emerald-800/60 disabled:opacity-50"
                      />
                    </div>
                    <span className="text-[10px] text-gray-600">→</span>
                    <span className="text-[10px] text-gray-500 font-mono">{docPreview(item)}</span>
                  </div>

                  {/* Lesson title */}
                  <input
                    type="text" value={item.lessonTitle}
                    onChange={e => updateItem(item.id, { lessonTitle: e.target.value })}
                    placeholder="Lesson Title (e.g. Introduction to Email Marketing)"
                    disabled={panelStage === 'creating' || panelStage === 'done'}
                    className="w-full bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-emerald-800/60 placeholder:text-gray-700 disabled:opacity-50"
                  />

                  {/* Doc creation status */}
                  {item.docStatus === 'creating' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <Loader2 size={11} className="animate-spin" />Creating doc…
                    </div>
                  )}
                  {item.docStatus === 'done' && item.docUrl && (
                    <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-800/30 rounded px-2 py-1.5">
                      <Check size={11} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-[10px] text-emerald-300 flex-1 truncate">{item.docTitle}</span>
                      <a href={item.docUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex-shrink-0">
                        Open <ExternalLink size={9} />
                      </a>
                    </div>
                  )}
                  {item.docStatus === 'error' && (
                    <p className="text-[10px] text-red-400">{item.docError}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Create All Docs button */}
          {(panelStage === 'metadata') && (
            <button
              onClick={createAllDocs}
              disabled={!selectedTemplate || items.every(it => it.txStatus !== 'done')}
              className="w-full flex items-center justify-center gap-2 bg-emerald-900/60 hover:bg-emerald-800/60 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-800/40 text-emerald-300 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors"
            >
              <BookOpen size={13} />Create All Docs
            </button>
          )}

          {panelStage === 'creating' && (
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 py-1">
              <Loader2 size={13} className="animate-spin" />Creating docs…
            </div>
          )}

          {panelStage === 'done' && (
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <Check size={11} className="text-emerald-400" />
              All done — {items.filter(i => i.docStatus === 'done').length} / {items.length} docs created.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

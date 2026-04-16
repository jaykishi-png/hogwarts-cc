'use client'

import { useState, useRef, useCallback, useId, useEffect } from 'react'
import {
  Mic, Upload, Check, Loader2, X, FileText, FileCode,
  Download, BookOpen, ExternalLink, FolderOpen, ChevronDown, Eye, EyeOff,
  History, ChevronRight, Trash2, Plus, Settings, Save,
} from 'lucide-react'
import { TRANSCRIPT_TEMPLATES, TranscriptTemplate } from '@/config/transcript-templates'

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
type PanelView  = 'batch' | 'history' | 'templates'

// ─── History types ───────────────────────────────────────────────────────────

interface HistoryDoc {
  docTitle:    string
  docUrl:      string
  fileName:    string
  moduleNum:   string
  lessonNum:   string
  lessonTitle: string
  transcript:  string
  segments:    Segment[]
}
interface BatchHistoryEntry {
  id:           string
  createdAt:    string
  templateKey:  string
  courseTitle:  string
  courseLevel:  string
  folderUrl:    string
  folderName:   string
  docs:         HistoryDoc[]
  totalFiles:   number
  successCount: number
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const HISTORY_KEY   = 'transcription_history'
const TEMPLATES_KEY = 'transcription_custom_templates'
const MAX_HISTORY   = 50

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}
function writeLS(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { pushLog: (msg: string, type: 'chat' | 'move' | 'status' | 'meeting') => void }

// ─── WAV encoder ─────────────────────────────────────────────────────────────

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

// ─── Subtitle helpers ─────────────────────────────────────────────────────────

function padT(n: number) { return n.toString().padStart(2, '0') }
function toSRTTime(s: number): string {
  const ms = Math.floor((s % 1) * 1000)
  return `${padT(Math.floor(s / 3600))}:${padT(Math.floor(s / 60) % 60)}:${padT(Math.floor(s) % 60)},${ms.toString().padStart(3, '0')}`
}
function generateSRT(segs: Segment[]) {
  return segs.filter(s => s.text.trim()).map((s, i) =>
    `${i + 1}\n${toSRTTime(s.start)} --> ${toSRTTime(s.end)}\n${s.text.trim()}`).join('\n\n')
}
function generateVTT(segs: Segment[]) {
  const t = (s: number) => toSRTTime(s).replace(',', '.')
  return 'WEBVTT\n\n' + segs.filter(s => s.text.trim()).map((s, i) =>
    `${i + 1}\n${t(s.start)} --> ${t(s.end)}\n${s.text.trim()}`).join('\n\n')
}

// SCC (Scenarist Closed Captions) with EIA-608 odd-parity encoding
function generateSCC(segs: Segment[]): string {
  // Add odd parity to a 7-bit ASCII byte
  function op(b: number): number {
    let p = 0, x = b & 0x7f
    while (x) { p ^= x & 1; x >>= 1 }
    return p === 0 ? (b | 0x80) : (b & 0x7f)
  }
  // Encode text to parity-encoded hex word pairs
  function encText(text: string): string[] {
    const bytes = Array.from(text).map(c => {
      const code = c.charCodeAt(0)
      return op(code > 31 && code < 128 ? code : 32)
    })
    if (bytes.length % 2) bytes.push(op(32)) // pad to even
    const words: string[] = []
    for (let i = 0; i < bytes.length; i += 2)
      words.push(bytes[i].toString(16).padStart(2,'0') + bytes[i+1].toString(16).padStart(2,'0'))
    return words
  }
  // Timecode HH:MM:SS;FF (29.97fps drop-frame style)
  function tc(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor(s % 3600 / 60)
    const sec = Math.floor(s % 60)
    const fr = Math.min(29, Math.floor((s % 1) * 29.97))
    return [h, m, sec].map(n => String(n).padStart(2,'0')).join(':') + ';' + String(fr).padStart(2,'0')
  }

  const lines = ['Scenarist_SCC V1.0', '', '']
  for (const seg of segs.filter(s => s.text.trim())) {
    const text = seg.text.trim().slice(0, 32)
    const textWords = encText(text)
    // Pop-on: erase NDM → RCL → PAC row 15 → text → flip memories
    const cmd = ['94ad','94ad','9420','9420','947a','947a', ...textWords, '942c','942c'].join(' ')
    lines.push(`${tc(seg.start)}\t${cmd}`)
    lines.push(`${tc(seg.end)}\t942c 942c`)
    lines.push('')
  }
  return lines.join('\n')
}

function dlText(content: string, filename: string, mime: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = filename; a.click(); URL.revokeObjectURL(a.href)
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

const pad2      = (n: string) => n.trim().padStart(2, '0')
const wordCount = (t: string) => t.trim() ? t.trim().split(/\s+/).length : 0
const baseName  = (f: File)   => f.name.replace(/\.[^/.]+$/, '')
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

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function previewUrl(editUrl: string) { return editUrl.replace('/edit', '/preview') }

// ─── Component ────────────────────────────────────────────────────────────────

export function TranscriptionPanel({ pushLog }: Props) {
  const uid = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const itemsRef  = useRef<BatchItem[]>([])

  // ── Batch state ────────────────────────────────────────────────────────────
  const [items,       setItems]       = useState<BatchItem[]>([])
  const [panelStage,  setPanelStage]  = useState<PanelStage>('idle')
  const [templateKey, setTemplateKey] = useState(TRANSCRIPT_TEMPLATES[0].key)
  const [courseTitle, setCourseTitle] = useState(TRANSCRIPT_TEMPLATES[0].courseTitle)
  const [courseLevel, setCourseLevel] = useState('')
  const [folderUrl,   setFolderUrl]   = useState('')
  const [folderName,  setFolderName]  = useState('')
  const [globalError, setGlobalError] = useState('')

  // ── View / preview ─────────────────────────────────────────────────────────
  const [view,       setView]       = useState<PanelView>('batch')
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null)

  // ── History ────────────────────────────────────────────────────────────────
  const [history,     setHistory]     = useState<BatchHistoryEntry[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // ── Custom templates ───────────────────────────────────────────────────────
  const [customTemplates, setCustomTemplates] = useState<TranscriptTemplate[]>([])
  const [newTpl, setNewTpl] = useState({ key: '', label: '', courseTitle: '', templateId: '' })
  const [tplError, setTplError] = useState('')

  // Load from localStorage on mount
  useEffect(() => {
    setHistory(readLS<BatchHistoryEntry[]>(HISTORY_KEY, []))
    setCustomTemplates(readLS<TranscriptTemplate[]>(TEMPLATES_KEY, []))
  }, [])

  // Keep itemsRef in sync so createAllDocs can read current items reliably
  useEffect(() => { itemsRef.current = items }, [items])

  // All available templates = static + custom
  const allTemplates: TranscriptTemplate[] = [...TRANSCRIPT_TEMPLATES, ...customTemplates]
  const selectedTemplate = allTemplates.find(t => t.key === templateKey)
  const isLocked = panelStage === 'creating' || panelStage === 'done'

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
    setItems(prev => [...prev, ...valid.map((f, i) => makeItem(f, prev.length + i))])
    setPanelStage('queued')
    setGlobalError('')
    setView('batch')
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(it => it.id !== id)
      if (!next.length) setPanelStage('idle')
      return next
    })
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  // ── transcribeItem ─────────────────────────────────────────────────────────
  const transcribeItem = useCallback(async (item: BatchItem) => {
    updateItem(item.id, { txStatus: 'transcribing', txProgress: 0, txChunk: '', txError: '' })
    try {
      const TARGET_RATE = 16000
      const MAX_SAMPLES = Math.floor(3.8 * 1024 * 1024 / 2)
      const chunkDur    = MAX_SAMPLES / TARGET_RATE

      const arrayBuf = await item.file.arrayBuffer()
      const tmpCtx   = new AudioContext()
      const decoded  = await tmpCtx.decodeAudioData(arrayBuf.slice(0))
      await tmpCtx.close()

      const offCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_RATE), TARGET_RATE)
      const src    = offCtx.createBufferSource()
      src.buffer   = decoded; src.connect(offCtx.destination); src.start()
      const mono   = (await offCtx.startRendering()).getChannelData(0)

      const chunks = Math.ceil(mono.length / MAX_SAMPLES)
      const parts: string[] = []; const allSegs: Segment[] = []

      for (let c = 0; c < chunks; c++) {
        const offset = c * chunkDur
        const wav    = encodeWAV(mono.slice(c * MAX_SAMPLES, (c + 1) * MAX_SAMPLES), TARGET_RATE)
        const fd     = new FormData()
        fd.append('audio', new Blob([wav], { type: 'audio/wav' }), `chunk_${c}.wav`)
        fd.append('chunkIdx', String(c))

        updateItem(item.id, { txChunk: `Chunk ${c + 1} / ${chunks}`, txProgress: Math.round((c / chunks) * 100) })

        const res  = await fetch('/api/qc/audio', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        if (data.transcript) parts.push(data.transcript)
        for (const seg of (data.segments ?? []))
          allSegs.push({ start: seg.start + offset, end: seg.end + offset, text: seg.text })

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
    setPanelStage('transcribing'); setGlobalError('')
    setItems(prev => {
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
    setPanelStage('creating'); setGlobalError('')

    let fId = '', fUrl = ''
    try {
      const name = selectedTemplate?.key ?? templateKey
      const res  = await fetch('/api/drive-folder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fId = data.folderId; fUrl = data.folderUrl
      setFolderUrl(fUrl); setFolderName(name)
      pushLog(`Drive folder created — "${name}"`, 'chat')
    } catch (err) {
      setGlobalError(`Folder creation failed: ${String(err)}`); setPanelStage('metadata'); return
    }

    const currentItems = itemsRef.current

    const completedDocs: HistoryDoc[] = []
    let successCount = 0

    for (const item of currentItems) {
      updateItem(item.id, { docStatus: 'creating', docError: '' })
      try {
        const res = await fetch('/api/transcript-to-doc', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        completedDocs.push({
          docTitle: data.docTitle, docUrl: data.docUrl, fileName: item.file.name,
          moduleNum: item.moduleNum, lessonNum: item.lessonNum, lessonTitle: item.lessonTitle,
          transcript: item.transcript, segments: item.segments,
        })
        successCount++
      } catch (err) {
        updateItem(item.id, { docStatus: 'error', docError: String(err) })
      }
    }

    // Save to history
    const entry: BatchHistoryEntry = {
      id: `batch-${Date.now()}`, createdAt: new Date().toISOString(),
      templateKey, courseTitle: courseTitle.trim() || (selectedTemplate?.courseTitle ?? ''),
      courseLevel: courseLevel.trim() || 'Beginner',
      folderUrl: fUrl, folderName: selectedTemplate?.key ?? templateKey,
      docs: completedDocs, totalFiles: currentItems.length, successCount,
    }
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY)
      writeLS(HISTORY_KEY, next); return next
    })

    setPanelStage('done')
    if (successCount < currentItems.length) setGlobalError('Some docs failed — see individual errors below.')
  }, [templateKey, courseTitle, courseLevel, selectedTemplate, updateItem, pushLog])

  // ── reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setItems([]); setPanelStage('idle')
    setTemplateKey(TRANSCRIPT_TEMPLATES[0].key)
    setCourseTitle(TRANSCRIPT_TEMPLATES[0].courseTitle)
    setCourseLevel(''); setFolderUrl(''); setFolderName(''); setGlobalError(''); setPreviewDoc(null)
  }, [])

  // ── History helpers ────────────────────────────────────────────────────────
  const toggleExpand = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const deleteHistoryEntry = (id: string) => setHistory(prev => {
    const next = prev.filter(e => e.id !== id); writeLS(HISTORY_KEY, next); return next
  })
  const clearHistory = () => { setHistory([]); writeLS(HISTORY_KEY, []) }

  // ── Template helpers ───────────────────────────────────────────────────────
  const addCustomTemplate = () => {
    setTplError('')
    if (!newTpl.key.trim())        return setTplError('Key is required (e.g. AB2)')
    if (!newTpl.courseTitle.trim()) return setTplError('Course Title is required')
    if (!newTpl.templateId.trim()) return setTplError('Template Doc ID is required')
    const key = newTpl.key.trim().toUpperCase()
    if (allTemplates.some(t => t.key === key)) return setTplError(`Key "${key}" already exists`)
    const tpl: TranscriptTemplate = {
      key,
      label:       newTpl.label.trim() || key,
      courseTitle: newTpl.courseTitle.trim(),
      templateId:  newTpl.templateId.trim(),
    }
    setCustomTemplates(prev => {
      const next = [...prev, tpl]; writeLS(TEMPLATES_KEY, next); return next
    })
    setNewTpl({ key: '', label: '', courseTitle: '', templateId: '' })
  }
  const deleteCustomTemplate = (key: string) => setCustomTemplates(prev => {
    const next = prev.filter(t => t.key !== key); writeLS(TEMPLATES_KEY, next); return next
  })

  // ── Export buttons ─────────────────────────────────────────────────────────
  function ExportButtons({ item }: { item: BatchItem }) {
    if (item.txStatus !== 'done') return null
    const name = baseName(item.file)
    return (
      <div className="flex items-center gap-1">
        <button onClick={() => dlText(item.transcript, `${name}.txt`, 'text/plain')}
          className="flex items-center gap-0.5 text-[9px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors">
          <Download size={9} />TXT
        </button>
        <button onClick={() => dlText(generateSRT(item.segments), `${name}.srt`, 'text/plain')}
          className="flex items-center gap-0.5 text-[9px] text-violet-500 hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-900/20 border border-violet-800/30 transition-colors">
          <FileCode size={9} />SRT
        </button>
        <button onClick={() => dlText(generateVTT(item.segments), `${name}.vtt`, 'text/vtt')}
          className="flex items-center gap-0.5 text-[9px] text-violet-500 hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-900/20 border border-violet-800/30 transition-colors">
          <FileCode size={9} />VTT
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Preview modal ──────────────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#07080e]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d0f1a] border-b border-[#1e2030] flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={13} className="text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-200 truncate">{previewDoc.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={previewDoc.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-800/40 transition-colors">
                <ExternalLink size={10} />Open in Google Docs
              </a>
              <button onClick={() => setPreviewDoc(null)}
                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-white/5 border border-[#2a2d3a] transition-colors">
                <EyeOff size={10} />Close
              </button>
            </div>
          </div>
          <iframe src={previewUrl(previewDoc.url)} className="flex-1 w-full border-0" title={previewDoc.title} allowFullScreen />
        </div>
      )}

      {/* Scroll container — height is bounded by the flex parent; inner div grows freely */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
      <div className="flex flex-col gap-3 pb-3">

        {/* ── Header card ────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-4 space-y-3">

          {/* Title row + tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-900/40 border border-violet-800/40 flex items-center justify-center">
                <Mic size={13} className="text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-200">Batch Transcribe</p>
                <p className="text-[10px] text-gray-600">Whisper · multi-file · Google Docs</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Tab bar */}
              <div className="flex items-center bg-[#07080e] border border-[#1e2030] rounded-lg p-0.5">
                {([
                  { id: 'batch',     icon: <Upload size={9} />,   label: 'Batch'     },
                  { id: 'history',   icon: <History size={9} />,  label: 'History',  badge: history.length },
                  { id: 'templates', icon: <Settings size={9} />, label: 'Templates' },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setView(tab.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                      view === tab.id
                        ? 'bg-violet-900/60 text-violet-300 border border-violet-800/40'
                        : 'text-gray-600 hover:text-gray-400'
                    }`}>
                    {tab.icon}{tab.label}
                    {'badge' in tab && tab.badge > 0 && (
                      <span className="ml-0.5 bg-violet-800/60 text-violet-300 rounded-full px-1 text-[8px] font-bold">{tab.badge}</span>
                    )}
                  </button>
                ))}
              </div>
              {view === 'batch' && panelStage !== 'idle' && (
                <button onClick={reset}
                  className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors px-2 py-1 rounded hover:bg-white/5">
                  <X size={11} />New Batch
                </button>
              )}
            </div>
          </div>

          {/* ── Always-visible global settings ───────────────────────────── */}
          {view === 'batch' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {/* Course template */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Course Template</label>
                  <div className="relative">
                    <select
                      value={templateKey}
                      onChange={e => {
                        const key = e.target.value
                        setTemplateKey(key)
                        const tpl = allTemplates.find(t => t.key === key)
                        if (tpl) setCourseTitle(tpl.courseTitle)
                      }}
                      disabled={isLocked}
                      className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-xs text-gray-300 appearance-none cursor-pointer focus:outline-none focus:border-violet-800/60 disabled:opacity-50"
                    >
                      {allTemplates.map(t => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                  </div>
                </div>

                {/* Course Level */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Course Level</label>
                  <input type="text" value={courseLevel}
                    onChange={e => setCourseLevel(e.target.value)}
                    placeholder="Beginner"
                    disabled={isLocked}
                    className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-violet-800/60 placeholder:text-gray-700 disabled:opacity-50"
                  />
                </div>

                {/* Course Title — full width */}
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-500 mb-1">Course Title</label>
                  <input type="text" value={courseTitle}
                    onChange={e => setCourseTitle(e.target.value)}
                    placeholder="e.g. Launching Email Campaigns"
                    disabled={isLocked}
                    className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-violet-800/60 placeholder:text-gray-700 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Drive folder banner */}
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

              {/* Drop zone */}
              <div
                onDrop={onDrop} onDragOver={e => e.preventDefault()}
                onClick={() => fileInput.current?.click()}
                className="border-2 border-dashed border-[#2a2d3a] hover:border-violet-800/60 rounded-xl p-5 text-center cursor-pointer transition-colors group"
              >
                <Upload size={18} className="mx-auto text-gray-700 group-hover:text-violet-800/60 mb-1.5 transition-colors" />
                <p className="text-xs text-gray-600 group-hover:text-gray-500 transition-colors">
                  Drop video/audio files or <span className="text-violet-400">click to browse</span>
                </p>
                <p className="text-[10px] text-gray-700 mt-0.5">MP4, MOV, MKV, MP3, WAV, M4A — multiple files OK</p>
                <input ref={fileInput} id={`${uid}-file`} type="file" accept="video/*,audio/*" multiple className="hidden"
                  onChange={e => { if (e.target.files?.length) addFiles(Array.from(e.target.files)) }} />
              </div>

              {globalError && <p className="text-[10px] text-red-400">{globalError}</p>}
            </>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* HISTORY VIEW                                                         */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {view === 'history' && (
          <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-300">
                {history.length === 0 ? 'No history yet' : `${history.length} batch${history.length !== 1 ? 'es' : ''}`}
              </p>
              {history.length > 0 && (
                <button onClick={clearHistory}
                  className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-900/10">
                  <Trash2 size={10} />Clear all
                </button>
              )}
            </div>

            {history.length === 0 && (
              <div className="text-center py-8">
                <History size={24} className="mx-auto text-gray-700 mb-2" />
                <p className="text-xs text-gray-600">Completed batches will appear here</p>
              </div>
            )}

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
              {history.map(entry => {
                const expanded = expandedIds.has(entry.id)
                return (
                  <div key={entry.id} className="bg-[#07080e] border border-[#1e2030] rounded-lg overflow-hidden">
                    <button className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
                      onClick={() => toggleExpand(entry.id)}>
                      <ChevronRight size={12} className={`text-gray-600 flex-shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-violet-400 flex-shrink-0">{entry.templateKey}</span>
                          <span className="text-[10px] text-gray-300 truncate">{entry.courseTitle}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-gray-600">{fmtDate(entry.createdAt)}</span>
                          <span className="text-[9px] text-gray-700">·</span>
                          <span className="text-[9px] text-gray-600">{entry.successCount}/{entry.totalFiles} doc{entry.totalFiles !== 1 ? 's' : ''}</span>
                          {entry.courseLevel && <><span className="text-[9px] text-gray-700">·</span><span className="text-[9px] text-gray-600">{entry.courseLevel}</span></>}
                        </div>
                      </div>
                      {entry.folderUrl && (
                        <a href={entry.folderUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[9px] text-emerald-500 hover:text-emerald-400 px-2 py-1 rounded bg-emerald-900/20 border border-emerald-800/30 transition-colors flex-shrink-0">
                          <FolderOpen size={9} />Folder
                        </a>
                      )}
                      <button onClick={e => { e.stopPropagation(); deleteHistoryEntry(entry.id) }}
                        className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0 p-1 rounded hover:bg-red-900/10">
                        <Trash2 size={10} />
                      </button>
                    </button>

                    {expanded && (
                      <div className="border-t border-[#1e2030] px-3 py-2 space-y-2.5">
                        {entry.docs.length === 0 && <p className="text-[10px] text-gray-600">No docs were created in this batch.</p>}
                        {entry.docs.map((doc, i) => {
                          const name = doc.fileName.replace(/\.[^/.]+$/, '')
                          return (
                            <div key={i} className="space-y-1.5">
                              {/* Doc title + open/preview */}
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={10} className="text-gray-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-gray-300 truncate">{doc.docTitle}</p>
                                  {doc.lessonTitle && <p className="text-[9px] text-gray-600 truncate">{doc.lessonTitle}</p>}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => setPreviewDoc({ url: doc.docUrl, title: doc.docTitle })}
                                    className="flex items-center gap-0.5 text-[9px] text-violet-500 hover:text-violet-300 px-1.5 py-1 rounded bg-violet-900/20 border border-violet-800/30 transition-colors">
                                    <Eye size={9} />Preview
                                  </button>
                                  <a href={doc.docUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-0.5 text-[9px] text-emerald-500 hover:text-emerald-400 px-1.5 py-1 rounded bg-emerald-900/20 border border-emerald-800/30 transition-colors">
                                    <ExternalLink size={9} />Doc
                                  </a>
                                </div>
                              </div>
                              {/* Download buttons */}
                              {doc.transcript && (
                                <div className="flex items-center gap-1 pl-4">
                                  <span className="text-[9px] text-gray-700 mr-0.5">↓</span>
                                  <button onClick={() => dlText(doc.transcript, `${name}.txt`, 'text/plain')}
                                    className="flex items-center gap-0.5 text-[9px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors">
                                    <Download size={8} />TXT
                                  </button>
                                  {doc.segments?.length > 0 && (<>
                                    <button onClick={() => dlText(generateSRT(doc.segments), `${name}.srt`, 'text/plain')}
                                      className="flex items-center gap-0.5 text-[9px] text-violet-500 hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-900/20 border border-violet-800/30 transition-colors">
                                      <FileCode size={8} />SRT
                                    </button>
                                    <button onClick={() => dlText(generateVTT(doc.segments), `${name}.vtt`, 'text/vtt')}
                                      className="flex items-center gap-0.5 text-[9px] text-violet-500 hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-900/20 border border-violet-800/30 transition-colors">
                                      <FileCode size={8} />VTT
                                    </button>
                                    <button onClick={() => dlText(generateSCC(doc.segments), `${name}.scc`, 'text/plain')}
                                      className="flex items-center gap-0.5 text-[9px] text-violet-500 hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-900/20 border border-violet-800/30 transition-colors">
                                      <FileCode size={8} />SCC
                                    </button>
                                  </>)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TEMPLATES VIEW                                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {view === 'templates' && (
          <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-4 space-y-4">

            {/* Add new template form */}
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                <Plus size={11} className="text-violet-400" />Add New Template
              </p>
              <div className="bg-[#07080e] border border-[#1e2030] rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Key <span className="text-gray-700">(e.g. AB2)</span></label>
                    <input type="text" value={newTpl.key}
                      onChange={e => setNewTpl(p => ({ ...p, key: e.target.value }))}
                      placeholder="AB2"
                      className="w-full bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-800/60 placeholder:text-gray-700 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Label <span className="text-gray-700">(display name)</span></label>
                    <input type="text" value={newTpl.label}
                      onChange={e => setNewTpl(p => ({ ...p, label: e.target.value }))}
                      placeholder="AB2 — My Course"
                      className="w-full bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-800/60 placeholder:text-gray-700"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-500 mb-1">Course Title</label>
                    <input type="text" value={newTpl.courseTitle}
                      onChange={e => setNewTpl(p => ({ ...p, courseTitle: e.target.value }))}
                      placeholder="e.g. Advanced Email Campaigns"
                      className="w-full bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-800/60 placeholder:text-gray-700"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-500 mb-1">
                      Google Doc Template ID
                      <span className="text-gray-700 ml-1">— from the URL: /document/d/<span className="text-violet-600">ID</span>/edit</span>
                    </label>
                    <input type="text" value={newTpl.templateId}
                      onChange={e => setNewTpl(p => ({ ...p, templateId: e.target.value }))}
                      placeholder="1XTbKQhk_DPkZQlF9Ho-k-hQ5cEyAvBUdmGYTa4g1MMY"
                      className="w-full bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-800/60 placeholder:text-gray-700 font-mono"
                    />
                  </div>
                </div>
                {tplError && <p className="text-[10px] text-red-400">{tplError}</p>}
                <button onClick={addCustomTemplate}
                  className="flex items-center gap-1.5 bg-violet-900/60 hover:bg-violet-800/60 border border-violet-800/40 text-violet-300 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors">
                  <Save size={11} />Save Template
                </button>
              </div>
            </div>

            {/* Built-in templates list */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">Built-in ({TRANSCRIPT_TEMPLATES.length})</p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5">
                {TRANSCRIPT_TEMPLATES.map(t => (
                  <div key={t.key} className="flex items-center gap-2 px-3 py-2 bg-[#07080e] border border-[#1e2030] rounded-lg">
                    <span className="text-[10px] font-bold text-violet-400 w-10 flex-shrink-0">{t.key}</span>
                    <span className="text-[10px] text-gray-400 flex-1 truncate">{t.courseTitle}</span>
                    <span className="text-[9px] text-gray-700 font-mono truncate max-w-[100px]">{t.templateId.slice(0, 12)}…</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom templates list */}
            {customTemplates.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">Custom ({customTemplates.length})</p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5">
                  {customTemplates.map(t => (
                    <div key={t.key} className="flex items-center gap-2 px-3 py-2 bg-[#07080e] border border-emerald-900/40 rounded-lg">
                      <span className="text-[10px] font-bold text-emerald-400 w-10 flex-shrink-0">{t.key}</span>
                      <span className="text-[10px] text-gray-400 flex-1 truncate">{t.courseTitle}</span>
                      <span className="text-[9px] text-gray-700 font-mono truncate max-w-[100px]">{t.templateId.slice(0, 12)}…</span>
                      <button onClick={() => deleteCustomTemplate(t.key)}
                        className="text-gray-700 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-900/10 flex-shrink-0">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* BATCH VIEW — file list + action bar                                  */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {view === 'batch' && items.length > 0 && (
          <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-300">
                {items.length} file{items.length !== 1 ? 's' : ''}
                {panelStage === 'queued'   ? ' — fill in metadata, then transcribe' : ''}
                {panelStage === 'metadata' ? ' — ready to create docs' : ''}
              </p>
              {panelStage === 'queued' && (
                <button onClick={transcribeAll}
                  className="flex items-center gap-1.5 bg-violet-800/80 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-xs font-semibold transition-colors">
                  <Mic size={12} />Transcribe All
                </button>
              )}
              {panelStage === 'transcribing' && (
                <div className="flex items-center gap-1.5 text-[10px] text-violet-400">
                  <Loader2 size={11} className="animate-spin" />Transcribing…
                </div>
              )}
            </div>

            {/* Scrollable file cards */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
              {items.map(item => (
                <div key={item.id} className="bg-[#07080e] border border-[#1e2030] rounded-lg p-3 space-y-2">

                  {/* File name row */}
                  <div className="flex items-center gap-2 min-w-0">
                    {item.txStatus === 'pending'      && <FileText size={12} className="text-gray-600 flex-shrink-0" />}
                    {item.txStatus === 'transcribing' && <Loader2  size={12} className="text-violet-400 animate-spin flex-shrink-0" />}
                    {item.txStatus === 'done'         && <Check    size={12} className="text-violet-400 flex-shrink-0" />}
                    {item.txStatus === 'error'        && <X        size={12} className="text-red-400 flex-shrink-0" />}
                    <span className="text-xs text-gray-300 truncate flex-1">{truncate(item.file.name, 40)}</span>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">
                      {item.txStatus === 'done'
                        ? `${wordCount(item.transcript).toLocaleString()} words`
                        : `${(item.file.size / 1_000_000).toFixed(1)} MB`}
                    </span>
                    <ExportButtons item={item} />
                    {!isLocked && item.txStatus === 'pending' && (
                      <button onClick={() => removeItem(item.id)} className="text-gray-700 hover:text-gray-500 flex-shrink-0 transition-colors ml-1">
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {item.txStatus === 'transcribing' && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-gray-600">Transcribing…</span>
                        <span className="text-[10px] text-gray-700">{item.txChunk}</span>
                      </div>
                      <div className="h-1 bg-[#1e2030] rounded-full overflow-hidden">
                        <div className="h-full bg-violet-700 rounded-full transition-all duration-300" style={{ width: `${item.txProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {item.txStatus === 'error' && <p className="text-[10px] text-red-400 truncate">{item.txError}</p>}

                  {/* Footer metadata */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-1">Module #</label>
                      <input type="number" min="1" value={item.moduleNum}
                        onChange={e => updateItem(item.id, { moduleNum: e.target.value })}
                        disabled={isLocked}
                        className="w-full bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-800/60 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-1">Lesson #</label>
                      <input type="number" min="1" value={item.lessonNum}
                        onChange={e => updateItem(item.id, { lessonNum: e.target.value })}
                        disabled={isLocked}
                        className="w-full bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-800/60 disabled:opacity-50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-gray-600 mb-1">Lesson Title</label>
                      <input type="text" value={item.lessonTitle}
                        onChange={e => updateItem(item.id, { lessonTitle: e.target.value })}
                        placeholder="e.g. Introduction to Email Marketing"
                        disabled={isLocked}
                        className="w-full bg-[#0d0f1a] border border-[#2a2d3a] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-violet-800/60 placeholder:text-gray-700 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Doc name preview */}
                  <p className="text-[10px] text-gray-600">
                    → doc: <span className="font-mono text-gray-500">{templateKey} M{pad2(item.moduleNum || '1')}L{pad2(item.lessonNum || '1')} Transcript</span>
                  </p>

                  {/* Doc status */}
                  {item.docStatus === 'creating' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <Loader2 size={11} className="animate-spin" />Creating doc…
                    </div>
                  )}
                  {item.docStatus === 'done' && item.docUrl && (
                    <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-800/30 rounded-lg px-3 py-2">
                      <Check size={11} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-[10px] text-emerald-300 flex-1 truncate font-medium">{item.docTitle}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => setPreviewDoc({ url: item.docUrl, title: item.docTitle })}
                          className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 px-2 py-1 rounded bg-violet-900/30 border border-violet-800/40 transition-colors">
                          <Eye size={9} />Preview
                        </button>
                        <a href={item.docUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-900/30 border border-emerald-800/40 transition-colors">
                          <ExternalLink size={9} />Open
                        </a>
                      </div>
                    </div>
                  )}
                  {item.docStatus === 'error' && <p className="text-[10px] text-red-400">{item.docError || 'Doc creation failed — check Vercel logs'}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action bar ───────────────────────────────────────────────────── */}
        {view === 'batch' && panelStage === 'metadata' && (
          <div className="flex-shrink-0">
            <button onClick={createAllDocs}
              disabled={!selectedTemplate || items.every(it => it.txStatus !== 'done')}
              className="w-full flex items-center justify-center gap-2 bg-emerald-900/60 hover:bg-emerald-800/60 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-800/40 text-emerald-300 rounded-xl px-4 py-3 text-xs font-semibold transition-colors">
              <BookOpen size={13} />Create All Docs
            </button>
          </div>
        )}

        {view === 'batch' && panelStage === 'creating' && (
          <div className="flex-shrink-0 flex items-center justify-center gap-2 text-xs text-emerald-400 py-2">
            <Loader2 size={13} className="animate-spin" />Creating docs…
          </div>
        )}

        {view === 'batch' && panelStage === 'done' && (
          <div className="flex-shrink-0 flex items-center gap-2 text-[10px] text-gray-500 bg-[#0d0f1a] rounded-xl border border-[#1e2030] px-4 py-3">
            <Check size={11} className="text-emerald-400" />
            <span>All done — {items.filter(i => i.docStatus === 'done').length} / {items.length} docs created.</span>
            {folderUrl && (
              <a href={folderUrl} target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
                <FolderOpen size={10} />View Folder <ExternalLink size={9} />
              </a>
            )}
          </div>
        )}
      </div>{/* end flex-col content */}
      </div>{/* end scroll container */}
    </>
  )
}

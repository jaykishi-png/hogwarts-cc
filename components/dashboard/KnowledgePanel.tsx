'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  BookOpen, Upload, Search, Trash2, FileText, CheckCircle2,
  XCircle, Loader2, Clock, Copy, ChevronDown, ChevronUp,
  AlertCircle, Database, RefreshCw, Send,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ── Types ──────────────────────────────────────────────────────────────────────

interface KBFile {
  id: string
  name: string
  size: number
  status: 'completed' | 'in_progress' | 'failed' | 'cancelled'
  createdAt: number
}

interface Citation {
  index: number
  fileName: string
  quote?: string
}

interface QAEntry {
  id: number
  question: string
  answer: string
  citations: Citation[]
  threadId: string
  ts: Date
}

interface SetupInfo {
  assistantId: string
  vectorStoreId: string
  fileCount: number
  configured: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: KBFile['status'] }) {
  if (status === 'completed')
    return <span className="flex items-center gap-1 text-[9px] text-emerald-400"><CheckCircle2 size={9} /> Indexed</span>
  if (status === 'in_progress')
    return <span className="flex items-center gap-1 text-[9px] text-amber-400"><Loader2 size={9} className="animate-spin" /> Processing</span>
  if (status === 'failed')
    return <span className="flex items-center gap-1 text-[9px] text-red-400"><XCircle size={9} /> Failed</span>
  return <span className="flex items-center gap-1 text-[9px] text-gray-500"><Clock size={9} /> Pending</span>
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function KnowledgePanel({ pushLog }: { pushLog: (msg: string, type: 'status' | 'chat' | 'move' | 'meeting') => void }) {
  const [tab, setTab] = useState<'query' | 'documents'>('query')

  // Setup state
  const [setup, setSetup] = useState<SetupInfo | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [showIds, setShowIds] = useState(false)

  // Documents state
  const [files, setFiles] = useState<KBFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Query state
  const [question, setQuestion] = useState('')
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([])
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState('')
  const [threadId, setThreadId] = useState<string | undefined>()
  const [keepThread, setKeepThread] = useState(false)
  const [expandedCitations, setExpandedCitations] = useState<Set<number>>(new Set())
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const qaBottomRef = useRef<HTMLDivElement>(null)

  // ── Initialise ──────────────────────────────────────────────────────────────

  const initialise = useCallback(async () => {
    setSetupLoading(true)
    setSetupError('')
    try {
      const res = await fetch('/api/knowledge/setup')
      const data = await res.json()
      if (data.error) { setSetupError(data.error); return }
      setSetup(data)
      if (!data.configured) setShowIds(true)
    } catch (err) {
      setSetupError(String(err))
    } finally {
      setSetupLoading(false)
    }
  }, [])

  useEffect(() => { initialise() }, [initialise])

  // ── Load files ──────────────────────────────────────────────────────────────

  const loadFiles = useCallback(async () => {
    setFilesLoading(true)
    try {
      const res = await fetch('/api/knowledge/files')
      const data = await res.json()
      if (data.files) setFiles(data.files)
    } catch { /* silent */ }
    finally { setFilesLoading(false) }
  }, [])

  useEffect(() => {
    if (setup && tab === 'documents') loadFiles()
  }, [setup, tab, loadFiles])

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function uploadFile(file: File) {
    if (uploading) return
    setUploading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) { setUploadError(data.error); return }
      pushLog(`📄 Uploaded "${file.name}" to Revenue Rush KB`, 'status')
      setSetup(s => s ? { ...s, fileCount: s.fileCount + 1 } : s)
      // Reload file list after a short delay to allow processing to register
      setTimeout(loadFiles, 1200)
    } catch (err) {
      setUploadError(String(err))
    } finally {
      setUploading(false)
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) uploadFile(f)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) uploadFile(f)
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function deleteFile(fileId: string, fileName: string) {
    setDeletingId(fileId)
    try {
      const res = await fetch('/api/knowledge/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })
      const data = await res.json()
      if (data.error) return
      setFiles(f => f.filter(x => x.id !== fileId))
      setSetup(s => s ? { ...s, fileCount: Math.max(0, s.fileCount - 1) } : s)
      pushLog(`🗑 Removed "${fileName}" from Revenue Rush KB`, 'status')
    } catch { /* silent */ }
    finally { setDeletingId(null) }
  }

  // ── Query ───────────────────────────────────────────────────────────────────

  async function askQuestion() {
    if (!question.trim() || asking) return
    const q = question.trim()
    setQuestion('')
    setAsking(true)
    setAskError('')

    try {
      const res = await fetch('/api/knowledge/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, threadId: keepThread ? threadId : undefined }),
      })
      const data = await res.json()
      if (data.error) { setAskError(data.error); return }

      if (keepThread) setThreadId(data.threadId)

      const entry: QAEntry = {
        id: Date.now(),
        question: q,
        answer: data.answer,
        citations: data.citations ?? [],
        threadId: data.threadId,
        ts: new Date(),
      }
      setQaHistory(h => [entry, ...h])
      pushLog(`📚 KB query: "${q.slice(0, 50)}${q.length > 50 ? '…' : ''}"`, 'chat')
    } catch (err) {
      setAskError(String(err))
    } finally {
      setAsking(false)
    }
  }

  function copyAnswer(id: number, text: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  function toggleCitations(id: number) {
    setExpandedCitations(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-purple-400" />
          <span className="text-[11px] font-semibold text-gray-300">Revenue Rush Knowledge Base</span>
          {setup && (
            <span className="text-[9px] text-gray-600 bg-[#1e2030] border border-[#2a2d3a] rounded px-1.5 py-0.5">
              {setup.fileCount} doc{setup.fileCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={initialise}
          disabled={setupLoading}
          className="text-gray-600 hover:text-gray-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={11} className={setupLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Setup card (first-time / IDs) ───────────────────────────────────── */}
      {!setup && !setupLoading && (
        <div className="flex-shrink-0 bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Database size={13} className="text-purple-400" />
            <span className="text-[11px] font-semibold text-gray-300">Initialise Knowledge Base</span>
          </div>
          <p className="text-[10px] text-gray-500 mb-3">
            Creates an OpenAI Assistant + Vector Store for Revenue Rush docs. One-time setup.
          </p>
          {setupError && (
            <p className="text-[10px] text-red-400 mb-2 flex items-center gap-1">
              <AlertCircle size={10} /> {setupError}
            </p>
          )}
          <button
            onClick={initialise}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-900/40 border border-purple-700/50 text-purple-300 text-[11px] hover:bg-purple-900/60 transition-all"
          >
            <Database size={11} /> Initialise
          </button>
        </div>
      )}

      {setupLoading && !setup && (
        <div className="flex-shrink-0 flex items-center gap-2 text-[10px] text-gray-500 mb-3">
          <Loader2 size={11} className="animate-spin text-purple-400" />
          Setting up knowledge base…
        </div>
      )}

      {/* ── First-time: show env var instructions ──────────────────────────── */}
      {setup && !setup.configured && showIds && (
        <div className="flex-shrink-0 bg-amber-950/30 border border-amber-700/40 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
              <AlertCircle size={10} /> Add to .env.local to persist
            </span>
            <button onClick={() => setShowIds(false)} className="text-gray-600 hover:text-gray-400 text-[10px]">✕</button>
          </div>
          <pre className="text-[9px] text-amber-300/80 font-mono bg-black/30 rounded p-2 select-all overflow-x-auto">
{`OPENAI_ASSISTANT_ID=${setup.assistantId}
OPENAI_VECTOR_STORE_ID=${setup.vectorStoreId}`}
          </pre>
          <p className="text-[9px] text-gray-600 mt-1.5">
            Save these in .env.local so they survive restarts. The KB is already active for this session.
          </p>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      {setup && (
        <>
          <div className="flex-shrink-0 flex gap-1 mb-3">
            {(['query', 'documents'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  tab === t
                    ? 'bg-[#2a2d3a] border-[#3a3d50] text-gray-200'
                    : 'bg-[#161928] border-[#2a2d3a] text-gray-500 hover:text-gray-300'
                }`}
              >
                {t === 'query' ? <Search size={10} /> : <FileText size={10} />}
                {t === 'query' ? 'Query' : 'Documents'}
              </button>
            ))}
          </div>

          {/* ── Query Tab ──────────────────────────────────────────────────── */}
          {tab === 'query' && (
            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">

              {/* Input bar */}
              <div className="flex-shrink-0 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && askQuestion()}
                    placeholder="Ask anything about Revenue Rush…"
                    disabled={asking}
                    className="flex-1 bg-[#0d0f1a] border border-[#2a2d3a] rounded-lg px-3 py-2 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-700/60 disabled:opacity-50"
                  />
                  <button
                    onClick={askQuestion}
                    disabled={asking || !question.trim()}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-purple-900/40 border border-purple-700/50 text-purple-300 hover:bg-purple-900/70 disabled:opacity-40 transition-all"
                  >
                    {asking ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setKeepThread(k => !k)}
                    className={`flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded border transition-all ${
                      keepThread
                        ? 'bg-purple-900/30 border-purple-700/40 text-purple-400'
                        : 'bg-[#0d0f1a] border-[#2a2d3a] text-gray-600'
                    }`}
                  >
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: keepThread ? '#7c3aed' : '#2a2d3a',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    Conversation mode
                  </button>
                  {keepThread && threadId && (
                    <button
                      onClick={() => { setThreadId(undefined); setQaHistory([]) }}
                      className="text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      New thread
                    </button>
                  )}
                  {askError && (
                    <span className="text-[9px] text-red-400 flex items-center gap-1 ml-auto">
                      <AlertCircle size={9} /> {askError}
                    </span>
                  )}
                </div>
              </div>

              {/* Thinking indicator */}
              {asking && (
                <div className="flex-shrink-0 flex items-center gap-2 text-[10px] text-purple-400">
                  <Loader2 size={11} className="animate-spin" />
                  Searching Revenue Rush documents…
                </div>
              )}

              {/* QA history */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3">
                {qaHistory.length === 0 && !asking && (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <BookOpen size={22} className="text-gray-700 mb-2" />
                    <p className="text-[10px] text-gray-600">Ask a question to search your Revenue Rush docs</p>
                    <p className="text-[9px] text-gray-700 mt-1">Try: "What are our top revenue channels?" or "Summarise the Q1 campaign strategy"</p>
                  </div>
                )}
                {qaHistory.map(entry => (
                  <div key={entry.id} className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] overflow-hidden">
                    {/* Question */}
                    <div className="flex items-start gap-2 px-3 py-2 border-b border-[#1e2030] bg-[#0a0c14]">
                      <Search size={10} className="text-purple-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-300 flex-1">{entry.question}</p>
                      <span className="text-[8px] text-gray-700 flex-shrink-0">
                        {entry.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Answer */}
                    <div className="px-3 py-2">
                      <div className="prose prose-invert prose-sm max-w-none text-[11px] leading-relaxed [&>*]:text-gray-300 [&_h1]:text-[13px] [&_h2]:text-[12px] [&_h3]:text-[11px] [&_code]:text-purple-300 [&_code]:bg-[#1e2030] [&_code]:px-1 [&_code]:rounded [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:my-0.5 [&_strong]:text-gray-200 [&_a]:text-purple-400">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {entry.answer}
                        </ReactMarkdown>
                      </div>

                      {/* Citations */}
                      {entry.citations.length > 0 && (
                        <div className="mt-2 border-t border-[#1e2030] pt-2">
                          <button
                            onClick={() => toggleCitations(entry.id)}
                            className="flex items-center gap-1.5 text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
                          >
                            <FileText size={9} />
                            {entry.citations.length} source{entry.citations.length !== 1 ? 's' : ''}
                            {expandedCitations.has(entry.id) ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                          </button>
                          {expandedCitations.has(entry.id) && (
                            <div className="mt-1.5 space-y-1">
                              {entry.citations.map(c => (
                                <div key={c.index} className="flex items-start gap-1.5 text-[9px] text-gray-600">
                                  <span className="text-purple-500 font-mono flex-shrink-0">[{c.index}]</span>
                                  <span className="text-gray-500">{c.fileName}</span>
                                  {c.quote && (
                                    <span className="text-gray-700 italic truncate">— "{c.quote.slice(0, 80)}…"</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Copy button */}
                      <div className="flex justify-end mt-1.5">
                        <button
                          onClick={() => copyAnswer(entry.id, entry.answer)}
                          className="flex items-center gap-1 text-[9px] text-gray-700 hover:text-gray-400 transition-colors"
                        >
                          {copiedId === entry.id
                            ? <><CheckCircle2 size={9} className="text-emerald-400" /> Copied</>
                            : <><Copy size={9} /> Copy</>}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={qaBottomRef} />
              </div>
            </div>
          )}

          {/* ── Documents Tab ──────────────────────────────────────────────── */}
          {tab === 'documents' && (
            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">

              {/* Upload zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-shrink-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-5 cursor-pointer transition-all ${
                  dragOver
                    ? 'border-purple-600 bg-purple-900/20'
                    : uploading
                      ? 'border-[#2a2d3a] bg-[#0d0f1a] opacity-60 pointer-events-none'
                      : 'border-[#2a2d3a] bg-[#0d0f1a] hover:border-purple-700/60 hover:bg-purple-900/10'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.html"
                  onChange={onFileInput}
                />
                {uploading
                  ? <><Loader2 size={18} className="text-purple-400 animate-spin" /><p className="text-[10px] text-gray-500">Uploading…</p></>
                  : <>
                      <Upload size={18} className="text-gray-600" />
                      <p className="text-[10px] text-gray-500">Drop a file or <span className="text-purple-400">click to browse</span></p>
                      <p className="text-[9px] text-gray-700">PDF · DOCX · TXT · MD · CSV · JSON</p>
                    </>}
              </div>

              {uploadError && (
                <p className="flex-shrink-0 text-[10px] text-red-400 flex items-center gap-1">
                  <AlertCircle size={10} /> {uploadError}
                </p>
              )}

              {/* File list */}
              <div className="flex-shrink-0 flex items-center justify-between">
                <span className="text-[10px] text-gray-600">{files.length} document{files.length !== 1 ? 's' : ''} in knowledge base</span>
                <button onClick={loadFiles} disabled={filesLoading} className="text-[9px] text-gray-600 hover:text-gray-400 flex items-center gap-1 transition-colors">
                  <RefreshCw size={9} className={filesLoading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-1.5">
                {filesLoading && files.length === 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-gray-600 py-4 justify-center">
                    <Loader2 size={11} className="animate-spin" /> Loading documents…
                  </div>
                )}
                {!filesLoading && files.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <FileText size={20} className="text-gray-700 mb-2" />
                    <p className="text-[10px] text-gray-600">No documents yet</p>
                    <p className="text-[9px] text-gray-700 mt-1">Upload Revenue Rush docs above to get started</p>
                  </div>
                )}
                {files.map(f => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 px-3 py-2 bg-[#0d0f1a] rounded-lg border border-[#1e2030] hover:border-[#2a2d3a] transition-colors group"
                  >
                    <FileText size={12} className="text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-300 truncate">{f.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={f.status} />
                        <span className="text-[9px] text-gray-700">{fmtSize(f.size)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteFile(f.id, f.name)}
                      disabled={deletingId === f.id}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-700 hover:text-red-400 transition-all disabled:opacity-40"
                      title="Remove from knowledge base"
                    >
                      {deletingId === f.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Trash2 size={11} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

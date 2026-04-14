'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  Film,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  FolderOpen,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Copy,
  Check,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FrameioProject {
  id:          string
  name:        string
  assetCount?: number
  updatedAt?:  string
}

interface FrameioAsset {
  id:           string
  name:         string
  type:         string
  reviewLink?:  string
  commentCount: number
  thumb?:       string
  status?:      string
}

interface FrameioData {
  projects: FrameioProject[]
}

interface FrameioAssetsData {
  assets: FrameioAsset[]
}

interface FrameioPanelProps {
  onAction: (prompt: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    file:    'File',
    video:   'Video',
    image:   'Image',
    audio:   'Audio',
    folder:  'Folder',
    review:  'Review',
    version: 'Version',
  }
  return map[type.toLowerCase()] ?? type
}

function assetTypeColor(type: string): string {
  const t = type.toLowerCase()
  if (t === 'video')   return 'bg-red-900/40 text-red-300 border-red-800/40'
  if (t === 'image')   return 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40'
  if (t === 'audio')   return 'bg-purple-900/40 text-purple-300 border-purple-800/40'
  if (t === 'folder')  return 'bg-amber-900/40 text-amber-300 border-amber-800/40'
  if (t === 'review')  return 'bg-sky-900/40 text-sky-300 border-sky-800/40'
  return 'bg-slate-800/60 text-slate-300 border-slate-700/40'
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl border border-[#1e2030] bg-[#111321] animate-pulse"
        />
      ))}
    </div>
  )
}

// ─── Project row ──────────────────────────────────────────────────────────────

interface ProjectRowProps {
  project:   FrameioProject
  onSelect:  (project: FrameioProject) => void
}

function ProjectRow({ project, onSelect }: ProjectRowProps) {
  return (
    <button
      onClick={() => onSelect(project)}
      className="w-full flex items-center gap-3 rounded-xl border border-[#1e2030] bg-[#111321] px-4 py-3 text-left hover:border-sky-800/60 hover:bg-[#141622] transition-colors group"
    >
      <FolderOpen size={16} className="flex-shrink-0 text-amber-400 group-hover:text-amber-300 transition-colors" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
          {project.name}
        </p>
        {(project.assetCount != null || project.updatedAt) && (
          <p className="text-xs text-gray-500 mt-0.5">
            {project.assetCount != null && `${project.assetCount} assets`}
            {project.assetCount != null && project.updatedAt && ' · '}
            {project.updatedAt && new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>
      <ChevronRight size={14} className="flex-shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors" />
    </button>
  )
}

// ─── Asset row ────────────────────────────────────────────────────────────────

interface AssetRowProps {
  asset:        FrameioAsset
  onAction:     (prompt: string) => void
  onTranscribe: (asset: FrameioAsset) => void
  projectName:  string
  transcribing: boolean
}

function AssetRow({ asset, onAction, onTranscribe, projectName, transcribing }: AssetRowProps) {
  const isMedia = ['video', 'audio', 'file'].includes(asset.type.toLowerCase())
  return (
    <div className="rounded-xl border border-[#1e2030] bg-[#111321] p-3">
      {/* Top row: name + type badge */}
      <div className="flex items-start gap-2 mb-2">
        <Film size={14} className="flex-shrink-0 text-gray-500 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 leading-snug">{asset.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${assetTypeColor(asset.type)}`}
            >
              {assetTypeLabel(asset.type)}
            </span>
            {asset.status && (
              <span className="text-[10px] text-gray-500">{asset.status}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats + links */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <MessageSquare size={11} />
          {asset.commentCount} {asset.commentCount === 1 ? 'comment' : 'comments'}
        </span>
        {asset.reviewLink && (
          <a
            href={asset.reviewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink size={11} />
            Review Link
          </a>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() =>
            onAction(
              `Review the Frame.io asset "${asset.name}" from project "${projectName}". Check for creative alignment, visual quality, and brand consistency. Provide detailed feedback.${asset.reviewLink ? ` Review link: ${asset.reviewLink}` : ''}`
            )
          }
          className="flex-1 min-w-[80px] rounded-lg border border-red-900/50 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/35 hover:border-red-700/60 transition-colors"
        >
          Review with HARRY
        </button>
        <button
          onClick={() =>
            onAction(
              `Perform a QC check on the Frame.io asset "${asset.name}" from project "${projectName}". Scrutinise for technical errors, compliance issues, inconsistencies, and anything that should be flagged before delivery.${asset.reviewLink ? ` Review link: ${asset.reviewLink}` : ''}`
            )
          }
          className="flex-1 min-w-[80px] rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700/40 hover:border-zinc-600/60 transition-colors"
        >
          QC with MOODY
        </button>
        {isMedia && (
          <button
            onClick={() => onTranscribe(asset)}
            disabled={transcribing}
            className="flex items-center gap-1 rounded-lg border border-teal-900/50 bg-teal-900/20 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-900/35 hover:border-teal-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {transcribing ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
            Transcribe
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Error block ──────────────────────────────────────────────────────────────

interface ErrorBlockProps {
  message:  string
  onRetry:  () => void
}

function ErrorBlock({ message, onRetry }: ErrorBlockProps) {
  const isSetup   = message.includes('not configured') || message.includes('setup')
  const is401     = message.includes('401') || message.includes('Unauthorized')
  const isSetupIssue = isSetup || is401

  return (
    <div className={`flex flex-col items-center gap-3 rounded-xl border px-6 py-8 text-center ${
      isSetupIssue ? 'border-amber-800/40 bg-amber-900/10' : 'border-red-900/40 bg-red-900/10'
    }`}>
      <AlertTriangle size={28} className={isSetupIssue ? 'text-amber-400' : 'text-red-400'} />
      <div>
        <p className={`text-sm font-medium ${isSetupIssue ? 'text-amber-300' : 'text-red-300'}`}>
          {isSetupIssue ? 'Frame.io token needed' : 'Could not load Frame.io data'}
        </p>
        {isSetupIssue ? (
          <div className="mt-2 text-left space-y-2 max-w-xs mx-auto">
            <p className="text-xs text-amber-400/80">To connect Frame.io:</p>
            <ol className="text-xs text-amber-500/70 space-y-1 list-decimal list-inside">
              <li>Go to <span className="font-mono text-amber-400">frameio.com → Account → Developer</span></li>
              <li>Create a <strong className="text-amber-300">Developer Token</strong> (starts with <span className="font-mono">fio-u-</span>)</li>
              <li>Add it to Vercel as <span className="font-mono text-amber-300">FRAMEIO_TOKEN</span></li>
              <li>Redeploy on Vercel</li>
            </ol>
          </div>
        ) : (
          <p className="mt-1 text-xs text-red-400/70 max-w-xs mx-auto">{message}</p>
        )}
      </div>
      <button
        onClick={onRetry}
        className={`mt-1 rounded-lg border px-4 py-1.5 text-xs transition-colors ${
          isSetupIssue
            ? 'border-amber-800/50 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50'
            : 'border-red-800/50 bg-red-900/30 text-red-300 hover:bg-red-900/50'
        }`}
      >
        Try Again
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TranscriptResult { transcript: string; summary: string; assetName: string }

export function FrameioPanel({ onAction }: FrameioPanelProps) {
  const [projects,  setProjects]  = useState<FrameioProject[]>([])
  const [assets,    setAssets]    = useState<FrameioAsset[] | null>(null)
  const [selected,  setSelected]  = useState<FrameioProject | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [assetLoading, setAssetLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [transcribingId, setTranscribingId] = useState<string | null>(null)
  const [transcriptResult, setTranscriptResult] = useState<TranscriptResult | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch project list on mount
  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelected(null)
    setAssets(null)

    try {
      const res = await fetch('/api/frameio')
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(body || `Request failed with status ${res.status}`)
      }
      const json: FrameioData = await res.json()
      setProjects(json.projects ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch assets for a selected project
  const fetchAssets = useCallback(async (project: FrameioProject) => {
    setSelected(project)
    setAssetLoading(true)
    setAssetError(null)
    setAssets(null)

    try {
      const res = await fetch(`/api/frameio?projectId=${encodeURIComponent(project.id)}`)
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(body || `Request failed with status ${res.status}`)
      }
      const json: FrameioAssetsData = await res.json()
      setAssets(json.assets ?? [])
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Failed to load assets')
    } finally {
      setAssetLoading(false)
    }
  }, [])

  const transcribeAsset = useCallback(async (asset: FrameioAsset) => {
    setTranscribingId(asset.id)
    setTranscriptResult(null)
    try {
      const res = await fetch('/api/frameio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: asset.id, assetName: asset.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
      setTranscriptResult(data)
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Transcription failed')
    } finally {
      setTranscribingId(null)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // ── Panel shell ──
  return (
    <div className="rounded-2xl border border-[#1e2030] bg-[#0d0f1a] p-5 flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {selected && (
            <button
              onClick={() => { setSelected(null); setAssets(null); setAssetError(null) }}
              className="flex items-center justify-center rounded-lg border border-[#1e2030] bg-[#111321] p-1.5 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors mr-1"
              aria-label="Back to projects"
            >
              <ArrowLeft size={13} />
            </button>
          )}
          <Film size={18} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-gray-200">
            Frame.io
            {selected && (
              <span className="ml-2 text-xs font-normal text-gray-500 truncate max-w-[160px] inline-block align-middle">
                {selected.name}
              </span>
            )}
          </h2>
        </div>
      </div>

      {/* ── Projects view ── */}
      {!selected && (
        <>
          {loading && <SkeletonList count={4} />}

          {!loading && error && (
            <ErrorBlock message={error} onRetry={fetchProjects} />
          )}

          {!loading && !error && projects.length === 0 && (
            <p className="py-6 text-center text-xs text-gray-500">No projects found.</p>
          )}

          {!loading && !error && projects.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 mb-3">Projects</p>
              {projects.map(p => (
                <ProjectRow key={p.id} project={p} onSelect={fetchAssets} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Assets view ── */}
      {selected && (
        <>
          {assetLoading && <SkeletonList count={3} />}

          {!assetLoading && assetError && (
            <ErrorBlock message={assetError} onRetry={() => fetchAssets(selected)} />
          )}

          {!assetLoading && !assetError && assets !== null && assets.length === 0 && (
            <p className="py-6 text-center text-xs text-gray-500">No assets in this project.</p>
          )}

          {!assetLoading && !assetError && assets && assets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 mb-3">
                {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
              </p>
              {transcriptResult && (
                <div className="mb-3 rounded-xl border border-teal-800/40 bg-teal-900/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={10} /> Transcript — {transcriptResult.assetName}
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { navigator.clipboard.writeText(transcriptResult.transcript); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                        className="flex items-center gap-1 text-[9px] text-gray-500 hover:text-gray-300 border border-[#2a2d3a] rounded px-2 py-0.5 transition-colors"
                      >
                        {copied ? <Check size={9} /> : <Copy size={9} />} {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => setTranscriptResult(null)}
                        className="text-[9px] text-gray-600 hover:text-gray-400 border border-[#2a2d3a] rounded px-2 py-0.5 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {transcriptResult.summary && (
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">AI Summary</p>
                      <p className="text-[11px] text-gray-300 leading-relaxed">{transcriptResult.summary}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Full Transcript</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed max-h-40 overflow-y-auto [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a]">{transcriptResult.transcript}</p>
                  </div>
                  <button
                    onClick={() => onAction(`@harry I've transcribed the video "${transcriptResult.assetName}". Here is the transcript:\n\n${transcriptResult.transcript.slice(0, 3000)}\n\nPlease review it for content quality, messaging clarity, and brand alignment.`)}
                    className="w-full text-[10px] py-1.5 rounded-lg border border-red-900/40 bg-red-900/15 text-red-300 hover:bg-red-900/25 transition-colors"
                  >
                    Send to HARRY for review
                  </button>
                </div>
              )}
              {assets.map(a => (
                <AssetRow
                  key={a.id}
                  asset={a}
                  onAction={onAction}
                  onTranscribe={transcribeAsset}
                  projectName={selected.name}
                  transcribing={transcribingId === a.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

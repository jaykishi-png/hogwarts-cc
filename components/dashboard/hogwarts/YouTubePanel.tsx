'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  RefreshCw,
  Play,
  Eye,
  ThumbsUp,
  MessageCircle,
  PlayCircle as Youtube,
  AlertTriangle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelStats {
  subscribers:  number
  totalViews:   number
  videoCount:   number
  channelTitle: string
}

interface Video {
  id:           string
  title:        string
  thumbnail:    string
  views:        number
  likes:        number
  comments:     number
  publishedAt:  string
  url:          string
}

interface YouTubeData {
  channel: ChannelStats
  videos:  Video[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="rounded-xl border border-[#1e2030] bg-[#111321] p-4 animate-pulse"
        >
          <div className="h-3 w-16 rounded bg-[#1e2030] mb-3" />
          <div className="h-6 w-20 rounded bg-[#1e2030]" />
        </div>
      ))}
    </div>
  )
}

function SkeletonVideoList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border border-[#1e2030] bg-[#111321] p-3 animate-pulse"
        >
          <div className="h-16 w-28 flex-shrink-0 rounded-lg bg-[#1e2030]" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-3/4 rounded bg-[#1e2030]" />
            <div className="h-3 w-1/2 rounded bg-[#1e2030]" />
            <div className="flex gap-4 mt-2">
              <div className="h-3 w-12 rounded bg-[#1e2030]" />
              <div className="h-3 w-12 rounded bg-[#1e2030]" />
              <div className="h-3 w-12 rounded bg-[#1e2030]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:   string
  value:   string
  icon:    React.ReactNode
  accent:  string
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-[#1e2030] bg-[#111321] p-4 flex flex-col gap-2`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${accent}`}>
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold text-white tracking-tight">{value}</p>
    </div>
  )
}

// ─── Video row ────────────────────────────────────────────────────────────────

function VideoRow({ video }: { video: Video }) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-xl border border-[#1e2030] bg-[#111321] p-3 hover:border-red-800/60 hover:bg-[#141622] transition-colors group"
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-28 flex-shrink-0 rounded-lg overflow-hidden bg-[#1e2030]">
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-600">
            <Play size={20} />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <Play
            size={18}
            className="text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white"
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
          {video.title}
        </p>
        <p className="mt-1 text-xs text-gray-500">{formatDate(video.publishedAt)}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Eye size={11} />
            {formatNumber(video.views)}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp size={11} />
            {formatNumber(video.likes)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={11} />
            {formatNumber(video.comments)}
          </span>
        </div>
      </div>
    </a>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function YouTubePanel() {
  const [data,     setData]     = useState<YouTubeData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else           setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/analytics/youtube')
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(body || `Request failed with status ${res.status}`)
      }
      const json: YouTubeData = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load YouTube data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Panel shell ──
  return (
    <div className="rounded-2xl border border-[#1e2030] bg-[#0d0f1a] p-5 flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Youtube size={18} className="text-red-500" />
          <h2 className="text-sm font-semibold text-gray-200">
            YouTube Analytics
            {data?.channel.channelTitle && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                {data.channel.channelTitle}
              </span>
            )}
          </h2>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-[#1e2030] bg-[#111321] px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing
            ? <Loader2 size={13} className="animate-spin" />
            : <RefreshCw size={13} />
          }
          Refresh
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <>
          <SkeletonStatCards />
          <SkeletonVideoList />
        </>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-900/40 bg-red-900/10 px-6 py-8 text-center">
          <AlertTriangle size={28} className="text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-300">Could not load YouTube data</p>
            <p className="mt-1 text-xs text-red-400/70 max-w-xs mx-auto">{error}</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="mt-1 rounded-lg border border-red-800/50 bg-red-900/30 px-4 py-1.5 text-xs text-red-300 hover:bg-red-900/50 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Data state */}
      {!loading && !error && data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard
              label="Subscribers"
              value={formatNumber(data.channel.subscribers)}
              icon={<Youtube size={11} />}
              accent="text-red-400"
            />
            <StatCard
              label="Total Views"
              value={formatNumber(data.channel.totalViews)}
              icon={<Eye size={11} />}
              accent="text-sky-400"
            />
            <StatCard
              label="Videos"
              value={formatNumber(data.channel.videoCount)}
              icon={<Play size={11} />}
              accent="text-emerald-400"
            />
          </div>

          {/* Video list */}
          {data.videos.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">No recent videos found.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 mb-3">Recent Videos</p>
              {data.videos.map(v => (
                <VideoRow key={v.id} video={v} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

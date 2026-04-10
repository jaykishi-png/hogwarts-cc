'use client'

import useSWR from 'swr'
import { AlertTriangle, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface MondayStatusCount {
  boardName: string
  boardId: string
  needsReview: number
  inProgress: number
  done: number
  stale: StaleItem[]
}

interface StaleItem {
  title: string
  itemId: string
  boardId: string
  updatedAt: string
}

export function BottleneckView() {
  const { data, isLoading, error } = useSWR<{ boards: MondayStatusCount[] }>(
    '/api/monday/bottleneck',
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-gray-500" />
      </div>
    )
  }

  if (error || !data?.boards?.length) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        No Monday data available
      </p>
    )
  }

  const totalNeedsReview = data.boards.reduce((s, b) => s + b.needsReview, 0)
  const totalStale = data.boards.reduce((s, b) => s + b.stale.length, 0)

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-pink-900/20 border border-pink-800/40 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-pink-400">{totalNeedsReview}</p>
          <p className="text-[10px] text-pink-300/70 mt-0.5">Needs Review</p>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-yellow-400">{totalStale}</p>
          <p className="text-[10px] text-yellow-300/70 mt-0.5">Stale 48h+</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-blue-400">{data.boards.length}</p>
          <p className="text-[10px] text-blue-300/70 mt-0.5">Active Boards</p>
        </div>
      </div>

      {/* Board rows */}
      <div className="space-y-2">
        {data.boards
          .sort((a, b) => b.needsReview - a.needsReview)
          .map(board => (
            <div key={board.boardId} className="bg-[#13151e] border border-[#2a2d3a] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-300 truncate">{board.boardName}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {board.needsReview > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-pink-400">
                      <AlertTriangle size={10} />
                      {board.needsReview}
                    </span>
                  )}
                  {board.inProgress > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-400">
                      <Loader2 size={10} />
                      {board.inProgress}
                    </span>
                  )}
                  {board.done > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <CheckCircle2 size={10} />
                      {board.done}
                    </span>
                  )}
                </div>
              </div>

              {/* Stale items */}
              {board.stale.length > 0 && (
                <div className="space-y-1 border-t border-[#2a2d3a] pt-2 mt-2">
                  {board.stale.map(item => (
                    <div key={item.itemId} className="flex items-start gap-1.5">
                      <Clock size={10} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-400 leading-snug flex-1 truncate">{item.title}</p>
                      <span className="text-[10px] text-yellow-600 flex-shrink-0">
                        {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

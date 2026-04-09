'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { Task, TaskCreateInput, TaskUpdateInput, ManualPriority } from '@/types/task'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useTasks(view = 'today') {
  const { data, error, isLoading, mutate } = useSWR<{ tasks: Task[] }>(
    `/api/tasks?view=${view}`,
    fetcher,
    { refreshInterval: 60_000 } // re-fetch every 60s in background
  )

  const tasks = data?.tasks ?? []

  const completeTask = useCallback(async (id: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    mutate()
  }, [mutate])

  const deferTask = useCallback(async (id: string, until: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'deferred', deferred_until: until }),
    })
    mutate()
  }, [mutate])

  const pinTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id)
    const newPriority = task?.manual_priority === 'pinned' ? null : 'pinned'
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_priority: newPriority }),
    })
    mutate()
  }, [tasks, mutate])

  const notTodayTask = useCallback(async (id: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_priority: 'not_today' }),
    })
    mutate()
  }, [mutate])

  const setPriority = useCallback(async (id: string, priority: ManualPriority | null) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_priority: priority }),
    })
    mutate()
  }, [mutate])

  const confirmTask = useCallback(async (id: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confidence: 1.0 }),
    })
    mutate()
  }, [mutate])

  const dismissTask = useCallback(async (id: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    mutate()
  }, [mutate])

  const addTask = useCallback(async (input: TaskCreateInput) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    mutate()
  }, [mutate])

  const updateTask = useCallback(async (id: string, updates: TaskUpdateInput) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    mutate()
  }, [mutate])

  return {
    tasks,
    isLoading,
    error,
    refresh: mutate,
    completeTask,
    deferTask,
    pinTask,
    notTodayTask,
    setPriority,
    confirmTask,
    dismissTask,
    addTask,
    updateTask,
  }
}

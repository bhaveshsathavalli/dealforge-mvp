// src/app/(app)/overview/page.tsx
'use client'
import { useState } from 'react'

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [runId, setRunId] = useState<string | null>(null)

  const startRun = async () => {
    setLoading(true); setMessage(''); setRunId(null)
    try {
      // 1) Ensure a project exists
      const resProject = await fetch('/api/project/ensure', { method: 'POST', cache: 'no-store' })
      const { projectId, error: ensureErr } = (await resProject.json()) as {
        projectId?: string; error?: string
      }
      if (!resProject.ok || !projectId) throw new Error(ensureErr || 'Failed to ensure project')

      // 2) Start the run (extra fields like `query` are fine)
      const res = await fetch('/api/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ projectId, query: 'tableau vs power bi' }),
      })
      const { runId, error: startErr } = (await res.json()) as { runId?: string; error?: string }
      if (!res.ok || !runId) throw new Error(startErr || 'Failed to start run')

      setRunId(runId)
      setMessage('Run started. It will finish in under a minute…')
    } catch (e: any) {
      setMessage(e?.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="text-gray-600">Kick off an analysis to collect buyer conversations and comparisons.</p>
      <button onClick={startRun} disabled={loading} className="px-3 py-2 bg-black text-white rounded disabled:opacity-60">
        {loading ? 'Starting…' : 'Run Analysis'}
      </button>
      {message && <p className="text-sm text-gray-700">{message}</p>}
      {runId && <p className="text-sm">Run ID: <code>{runId}</code></p>}
    </div>
  )
}

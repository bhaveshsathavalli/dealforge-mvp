'use client'

import { useState, useTransition } from 'react'
import { startCompareRun } from '@/app/runs/actions'
import { Button } from '@/components/ui/button'

type Competitor = { id: string; name: string }

interface StartRunModalProps {
  competitors: Competitor[]
  triggerText?: string
  triggerClassName?: string
}

export default function StartRunModal({ 
  competitors, 
  triggerText = "Run",
  triggerClassName = "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
}: StartRunModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')
  const [pending, startTransition] = useTransition()

  const handleRun = () => {
    if (!selectedId) return
    
    startTransition(async () => {
      try {
        await startCompareRun(selectedId)
      } catch (error) {
        console.error('Failed to start compare run:', error)
        // Error will be handled by the server action redirect
      }
    })
  }

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerText}
      </Button>
      
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[520px] rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
            <h2 className="mb-2 text-2xl font-semibold">Run Competitor Analysis</h2>
            <p className="mb-4 text-sm text-neutral-500">
              Select a competitor to compare against your product.
            </p>
            
            <select
              className="w-full rounded border border-gray-300 px-3 py-2 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select competitor…</option>
              {competitors.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRun}
                disabled={!selectedId || pending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {pending ? 'Starting…' : 'Run'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


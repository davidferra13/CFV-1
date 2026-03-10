'use client'

import { useState, useTransition } from 'react'
import { markSOPComplete, type SOP, SOP_CATEGORY_LABELS } from '@/lib/training/sop-actions'

type Props = {
  sop: SOP
  staffMemberId?: string // If provided, show "Mark as Read" button
  alreadyCompleted?: boolean
  onBack?: () => void
}

export function SOPViewer({ sop, staffMemberId, alreadyCompleted = false, onBack }: Props) {
  const [completed, setCompleted] = useState(alreadyCompleted)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleMarkComplete() {
    if (!staffMemberId) return
    setError(null)

    startTransition(async () => {
      try {
        const result = await markSOPComplete(sop.id, staffMemberId)
        if (!result.success) {
          setError(result.error || 'Failed to mark as complete')
          return
        }
        setCompleted(true)
      } catch {
        setError('Failed to mark as complete')
      }
    })
  }

  // Simple markdown rendering (bold, headers, lists, code blocks)
  function renderContent(text: string) {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let inCodeBlock = false
    let codeLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${i}`}
              className="rounded bg-zinc-900 p-3 text-xs text-zinc-300 font-mono overflow-x-auto my-2"
            >
              {codeLines.join('\n')}
            </pre>
          )
          codeLines = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeLines.push(line)
        continue
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-sm font-semibold text-white mt-4 mb-1">
            {line.slice(4)}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-base font-semibold text-white mt-4 mb-1">
            {line.slice(3)}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-lg font-bold text-white mt-4 mb-2">
            {line.slice(2)}
          </h1>
        )
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={i} className="text-sm text-zinc-300 ml-4 list-disc">
            {line.slice(2)}
          </li>
        )
      } else if (/^\d+\.\s/.test(line)) {
        elements.push(
          <li key={i} className="text-sm text-zinc-300 ml-4 list-decimal">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        )
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />)
      } else {
        elements.push(
          <p key={i} className="text-sm text-zinc-300">
            {line}
          </p>
        )
      }
    }

    return elements
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {onBack && (
            <button onClick={onBack} className="text-xs text-zinc-400 hover:text-zinc-300 mb-2">
              &larr; Back to library
            </button>
          )}
          <h2 className="text-lg font-semibold text-white">{sop.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
              {SOP_CATEGORY_LABELS[sop.category]}
            </span>
            <span className="text-xs text-zinc-500">Version {sop.version}</span>
            {sop.required_for_roles && sop.required_for_roles.length > 0 && (
              <span className="text-xs text-zinc-500">
                Required for: {sop.required_for_roles.join(', ')}
              </span>
            )}
          </div>
        </div>

        {staffMemberId && (
          <div>
            {completed ? (
              <span className="rounded-md bg-green-500/20 border border-green-500/30 px-3 py-1.5 text-sm text-green-300">
                Completed
              </span>
            ) : (
              <button
                onClick={handleMarkComplete}
                disabled={isPending}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {isPending ? 'Marking...' : 'Mark as Read'}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-1">
        {renderContent(sop.content)}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { ListOrdered, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generatePrepTimeline, type PrepTimeline } from '@/lib/ai/prep-timeline'
import { toast } from 'sonner'

export function PrepTimelinePanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<PrepTimeline | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await generatePrepTimeline(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Prep timeline generation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-700">Prep Timeline</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Planning...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Prep Plan
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Backward-scheduled prep plan — from service time through all recipe prep needs.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-700">Prep Timeline</span>
          <Badge variant="info">Start by {result.suggestedStartTime}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>{result.totalPrepHours}h total prep</span>
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Regenerate'}
          </Button>
        </div>
      </div>

      {result.criticalPath.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2">
          <div className="flex items-center gap-1 text-xs font-medium text-amber-800 mb-1">
            <AlertCircle className="w-3 h-3" />
            Critical Path (cannot be delayed)
          </div>
          <ul className="space-y-0.5">
            {result.criticalPath.map((task, i) => (
              <li key={i} className="text-xs text-amber-700">
                • {task}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1">
        {result.tasks.map((task, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-1.5 border-b border-stone-50 last:border-0"
          >
            <div className="w-16 flex-shrink-0 text-xs font-mono text-stone-600">{task.time}</div>
            <div className="w-14 flex-shrink-0 text-[11px] text-stone-400">{task.duration}</div>
            <div className="flex-1">
              <div className="text-sm text-stone-700">{task.task}</div>
              {task.recipe && <div className="text-[11px] text-stone-400">for: {task.recipe}</div>}
              {task.notes && <div className="text-[11px] text-amber-600">{task.notes}</div>}
            </div>
            {task.canParallelize && (
              <div className="flex-shrink-0 text-[10px] text-blue-500 bg-blue-50 px-1 rounded">
                parallel
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-stone-400">
        Draft · Adjust timing based on your kitchen and setup
      </p>
    </div>
  )
}

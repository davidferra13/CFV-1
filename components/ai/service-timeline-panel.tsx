'use client'

import { useState } from 'react'
import { Clock, Printer, Loader2, Sparkles, Users, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generateServiceTimeline, type ServiceTimeline } from '@/lib/ai/service-timeline'
import { toast } from 'sonner'

export function ServiceTimelinePanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<ServiceTimeline | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPrint, setShowPrint] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await generateServiceTimeline(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Timeline generation failed')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    if (!result?.printReady) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(
      `<html><body><pre style="font-family:monospace;font-size:12px;line-height:1.6">${result.printReady}</pre></body></html>`
    )
    w.document.close()
    w.print()
  }

  const whoIcon = (who: string) =>
    who === 'Staff' ? (
      <Users className="w-3 h-3 text-blue-500" />
    ) : who === 'Chef' ? (
      <ChefHat className="w-3 h-3 text-amber-600" />
    ) : (
      <span className="text-[10px] text-stone-500">Both</span>
    )

  if (!result) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-700">Service Run-of-Show</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Timeline
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Minute-by-minute execution plan from chef arrival through post-service cleanup.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-700">Service Run-of-Show</span>
          <Badge variant="info">{result.entries.length} steps</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handlePrint}>
            <Printer className="w-3 h-3 mr-1" />
            Print
          </Button>
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Regenerate'}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {result.entries.map((entry, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-1.5 border-b border-stone-50 last:border-0"
          >
            <div className="w-16 flex-shrink-0 text-xs font-mono text-stone-600">{entry.time}</div>
            <div className="w-12 flex-shrink-0 text-[11px] text-stone-400">{entry.duration}</div>
            <div className="flex-1 text-sm text-stone-700">{entry.task}</div>
            <div className="flex-shrink-0">{whoIcon(entry.who)}</div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-stone-400">
        Draft · Review and adjust times before sharing with staff
      </p>
    </div>
  )
}

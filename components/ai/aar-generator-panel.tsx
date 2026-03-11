'use client'

import { useState } from 'react'
import { ClipboardList, Loader2, Bot, CheckCircle, AlertCircle } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generateAARDraft, type AARDraft } from '@/lib/ai/aar-generator'
import { toast } from 'sonner'

export function AARGeneratorPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<AARDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'summary' | 'full'>('summary')

  async function run() {
    setLoading(true)
    try {
      const data = await generateAARDraft(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AAR generation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">After-Action Report</span>
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
                <Bot className="w-3 h-3 mr-1" />
                Generate AAR Draft
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Full after-action report — what worked, what to improve, financial reflection, next-time
          list.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">After-Action Report</span>
          <Badge variant="warning">Draft</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('summary')}
            className={`text-xs px-2 py-1 rounded ${tab === 'summary' ? 'bg-stone-800 font-medium' : 'text-stone-500'}`}
          >
            Summary
          </button>
          <button
            onClick={() => setTab('full')}
            className={`text-xs px-2 py-1 rounded ${tab === 'full' ? 'bg-stone-800 font-medium' : 'text-stone-500'}`}
          >
            Full Report
          </button>
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Regenerate'}
          </Button>
        </div>
      </div>

      {tab === 'summary' && (
        <div className="space-y-3">
          <p className="text-sm text-stone-300">{result.executiveSummary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1 text-xs font-medium text-green-200 mb-1">
                <CheckCircle className="w-3 h-3" />
                What Went Well
              </div>
              <ul className="space-y-0.5">
                {result.whatWentWell.map((item, i) => (
                  <li key={i} className="text-xs text-stone-400">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs font-medium text-amber-200 mb-1">
                <AlertCircle className="w-3 h-3" />
                Areas to Improve
              </div>
              <ul className="space-y-0.5">
                {result.whatCouldImprove.map((item, i) => (
                  <li key={i} className="text-xs text-stone-400">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {result.nextTimeList.length > 0 && (
            <div>
              <div className="text-xs font-medium text-stone-400 mb-1">Next Time I'll...</div>
              <ul className="space-y-0.5">
                {result.nextTimeList.map((item, i) => (
                  <li key={i} className="text-xs text-stone-400">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-stone-400 border-t border-stone-800 pt-2">
            <span className="font-medium">Financial:</span> {result.financialReflection}
          </div>
        </div>
      )}

      {tab === 'full' && (
        <pre className="text-xs text-stone-300 whitespace-pre-wrap bg-stone-800 rounded p-3 max-h-72 overflow-y-auto font-sans leading-relaxed">
          {result.fullNarrative}
        </pre>
      )}

      <p className="text-[11px] text-stone-400">
        Auto draft · {new Date(result.generatedAt).toLocaleDateString()} · Edit before finalizing
        your AAR
      </p>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { TrendingUp, Loader2 } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { scoreInquiry, type LeadScore } from '@/lib/ai/lead-scoring'
import { toast } from 'sonner'

const TIER_COLORS: Record<string, string> = {
  hot: 'text-red-700 bg-red-950 border border-red-200',
  warm: 'text-amber-700 bg-amber-950 border border-amber-200',
  cold: 'text-brand-700 bg-brand-950 border border-brand-200',
}

export function LeadScoreBadge({
  inquiryId,
  compact = false,
}: {
  inquiryId: string
  compact?: boolean
}) {
  const [score, setScore] = useState<LeadScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await scoreInquiry(inquiryId)
      setScore(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lead scoring failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader2 className="w-3 h-3 animate-spin text-stone-400" />

  if (!score) {
    return compact ? (
      <button onClick={run} className="text-xs-tight text-stone-400 hover:text-brand-600">
        Score lead
      </button>
    ) : (
      <Button variant="ghost" onClick={run}>
        <TrendingUp className="w-3 h-3 mr-1" />
        Score Lead
      </Button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[score.tier]}`}
      >
        <TrendingUp className="w-3 h-3" />
        {score.score} · {score.tier}
      </button>

      {showDetail && (
        <div className="absolute top-6 right-0 z-20 w-64 bg-stone-900 border border-stone-700 rounded-lg shadow-lg p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-stone-300">Lead Score: {score.score}/100</span>
            <button
              onClick={() => setShowDetail(false)}
              className="text-stone-400 hover:text-stone-400"
            >
              ✕
            </button>
          </div>
          <p className="text-stone-400">{score.recommendation}</p>
          {score.factors.length > 0 && (
            <div>
              <div className="text-green-700 font-medium mb-0.5">Score Factors</div>
              {score.factors.map((f, i) => (
                <div key={i} className="text-stone-400">
                  + {f}
                </div>
              ))}
            </div>
          )}
          <div className="text-stone-500 text-xxs">Scored by GOLDMINE formula (deterministic)</div>
        </div>
      )}
    </div>
  )
}

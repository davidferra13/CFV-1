'use client'

import { useState } from 'react'
import { MessageSquare, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { analyzeClientSentiment, type SentimentAnalysis } from '@/lib/ai/sentiment-analysis'
import { toast } from 'sonner'

const SENTIMENT_COLORS: Record<string, string> = {
  very_positive: 'text-green-700',
  positive: 'text-emerald-600',
  neutral: 'text-stone-500',
  negative: 'text-amber-700',
  very_negative: 'text-red-700',
}

const SENTIMENT_LABELS: Record<string, string> = {
  very_positive: 'Very Positive',
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  very_negative: 'At Risk',
}

export function SentimentBadge({ clientId }: { clientId: string }) {
  const [analysis, setAnalysis] = useState<SentimentAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await analyzeClientSentiment(clientId)
      setAnalysis(data)
    } catch (err) {
      toast.error('Sentiment analysis failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader2 className="w-3 h-3 animate-spin text-stone-400" />

  if (!analysis) {
    return (
      <button
        onClick={run}
        className="text-[11px] text-stone-400 hover:text-brand-600 flex items-center gap-1"
      >
        <MessageSquare className="w-3 h-3" />
        Analyze sentiment
      </button>
    )
  }

  const TrendIcon =
    analysis.trend === 'improving'
      ? TrendingUp
      : analysis.trend === 'declining'
        ? TrendingDown
        : Minus

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className={`flex items-center gap-1 text-xs font-medium ${SENTIMENT_COLORS[analysis.overallSentiment]}`}
      >
        <MessageSquare className="w-3 h-3" />
        {SENTIMENT_LABELS[analysis.overallSentiment]}
        <TrendIcon className="w-3 h-3" />
        {analysis.riskFlag && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
      </button>

      {showDetail && (
        <div className="absolute top-6 left-0 z-20 w-72 bg-white border border-stone-200 rounded-lg shadow-lg p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Client Sentiment</span>
            <button onClick={() => setShowDetail(false)} className="text-stone-400">
              ✕
            </button>
          </div>

          {analysis.riskFlag && analysis.riskReason && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-red-800">
              <div className="font-medium mb-0.5">Risk Detected</div>
              {analysis.riskReason}
              {analysis.actionRecommendation && (
                <div className="mt-1 text-red-700">Action: {analysis.actionRecommendation}</div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              Overall:{' '}
              <span className={SENTIMENT_COLORS[analysis.overallSentiment]}>
                {SENTIMENT_LABELS[analysis.overallSentiment]}
              </span>
            </div>
            <div>Trend: {analysis.trend}</div>
          </div>

          <div className="text-stone-400 text-[10px]">
            {analysis.messageSentiments.length} messages analyzed · Confidence:{' '}
            {analysis.confidence}
          </div>
        </div>
      )}
    </div>
  )
}

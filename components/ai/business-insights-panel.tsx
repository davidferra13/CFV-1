'use client'

import { useState } from 'react'
import { BarChart3, Loader2, Sparkles, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getBusinessInsights,
  type BusinessInsights,
  type InsightCard,
} from '@/lib/ai/business-insights'
import { toast } from 'sonner'

const HEALTH_COLORS: Record<
  string,
  { badge: 'success' | 'info' | 'warning' | 'error'; bg: string }
> = {
  thriving: { badge: 'success', bg: 'bg-green-950 border-green-200' },
  healthy: { badge: 'info', bg: 'bg-blue-950 border-blue-200' },
  needs_attention: { badge: 'warning', bg: 'bg-amber-950 border-amber-200' },
  at_risk: { badge: 'error', bg: 'bg-red-950 border-red-200' },
}

const PRIORITY_ICONS: Record<string, any> = {
  high: AlertCircle,
  medium: TrendingUp,
  low: TrendingDown,
}

export function BusinessInsightsPanel() {
  const [result, setResult] = useState<BusinessInsights | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await getBusinessInsights()
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Business insights failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Business Insights</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Get Insights
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Analyzes your revenue, pipeline, clients, and seasonality with actionable recommendations.
        </p>
      </div>
    )
  }

  const health = HEALTH_COLORS[result.healthLabel] ?? HEALTH_COLORS.healthy

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">Business Insights</span>
          <Badge variant={health.badge}>{result.healthLabel.replace('_', ' ')}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Score: {result.healthScore}/100</span>
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className={`border rounded-lg p-3 ${health.bg}`}>
        <p className="text-sm font-medium text-stone-200">{result.headline}</p>
      </div>

      <div className="space-y-2">
        {result.insights.map((card, i) => {
          const Icon = PRIORITY_ICONS[card.priority] ?? TrendingUp
          return (
            <div key={i} className="border border-stone-800 rounded p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Icon
                  className={`w-3 h-3 ${card.priority === 'high' ? 'text-red-500' : card.priority === 'medium' ? 'text-amber-500' : 'text-stone-400'}`}
                />
                <span className="text-xs font-medium text-stone-300">{card.title}</span>
                <span className="text-[10px] text-stone-400 bg-stone-800 rounded px-1">
                  {card.category}
                </span>
              </div>
              <p className="text-xs text-stone-400">{card.insight}</p>
              <p className="text-xs text-brand-400 font-medium">→ {card.action}</p>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-stone-400">
        Suggested · Confidence: {result.confidence} · Not financial advice
      </p>
    </div>
  )
}

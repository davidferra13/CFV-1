'use client'

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { getBusinessHealthInsights } from '@/lib/dashboard/health-actions'
import type { BusinessInsights, InsightCard } from '@/lib/formulas/business-insights'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'

// -- Score ring (SVG) --------------------------------------------------------

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width="100" height="100" className="shrink-0">
      {/* Background ring */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="rgba(120,113,108,0.2)"
        strokeWidth="8"
      />
      {/* Score arc */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        className="transition-all duration-700 ease-out"
      />
      {/* Score text */}
      <text
        x="50"
        y="46"
        textAnchor="middle"
        className="fill-stone-100 text-2xl font-bold"
        style={{ fontSize: '24px', fontWeight: 700 }}
      >
        {score}
      </text>
      <text
        x="50"
        y="62"
        textAnchor="middle"
        className="fill-stone-500"
        style={{ fontSize: '10px' }}
      >
        / 100
      </text>
    </svg>
  )
}

// -- Helpers -----------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981' // emerald
  if (score >= 60) return '#b15c26' // brand
  if (score >= 40) return '#f59e0b' // amber
  return '#ef4444' // red
}

function healthBadgeVariant(label: string): 'success' | 'info' | 'warning' | 'error' {
  switch (label) {
    case 'thriving':
      return 'success'
    case 'healthy':
      return 'info'
    case 'needs_attention':
      return 'warning'
    case 'at_risk':
      return 'error'
    default:
      return 'info'
  }
}

function healthLabelText(label: string): string {
  switch (label) {
    case 'thriving':
      return 'Thriving'
    case 'healthy':
      return 'Healthy'
    case 'needs_attention':
      return 'Needs Attention'
    case 'at_risk':
      return 'At Risk'
    default:
      return label
  }
}

function priorityVariant(priority: InsightCard['priority']): 'error' | 'warning' | 'default' {
  switch (priority) {
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    case 'low':
      return 'default'
  }
}

function confidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'High confidence (10+ events, 10+ inquiries)'
    case 'medium':
      return 'Medium confidence (3+ events)'
    case 'low':
      return 'Low confidence (limited data so far)'
    default:
      return confidence
  }
}

// -- Widget ------------------------------------------------------------------

export function HealthScoreWidget() {
  const [insights, setInsights] = useState<BusinessInsights | null>(null)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getBusinessHealthInsights()
        setInsights(result)
      } catch (err) {
        console.error('[HealthScoreWidget] Failed to load insights', err)
        setError(true)
      }
    })
  }, [])

  if (error) {
    return (
      <CollapsibleWidget widgetId="business_insights" title="Business Health Score">
        <p className="text-sm text-red-400">Could not load business insights.</p>
      </CollapsibleWidget>
    )
  }

  if (isPending || !insights) {
    return (
      <CollapsibleWidget widgetId="business_insights" title="Business Health Score">
        <div className="flex items-center gap-3 py-4">
          <div className="w-[100px] h-[100px] rounded-full bg-stone-700/30 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-stone-700/30 rounded animate-pulse w-2/3" />
            <div className="h-3 bg-stone-700/30 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </CollapsibleWidget>
    )
  }

  const topInsights = insights.insights.slice(0, 3)
  const color = scoreColor(insights.healthScore)

  return (
    <CollapsibleWidget widgetId="business_insights" title="Business Health Score">
      {/* Score + headline row */}
      <div className="flex items-center gap-4 mb-4">
        <ScoreRing score={insights.healthScore} color={color} />
        <div className="min-w-0 flex-1">
          <Badge variant={healthBadgeVariant(insights.healthLabel)}>
            {healthLabelText(insights.healthLabel)}
          </Badge>
          <p className="text-sm font-medium text-stone-200 mt-2">{insights.headline}</p>
          <p className="text-xs text-stone-500 mt-1">{confidenceLabel(insights.confidence)}</p>
        </div>
      </div>

      {/* Top insight cards */}
      {topInsights.length > 0 && (
        <div className="space-y-3">
          {topInsights.map((card, i) => (
            <div key={i} className="rounded-lg border border-stone-700/60 bg-stone-800/40 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={priorityVariant(card.priority)}>{card.priority}</Badge>
                <span className="text-sm font-semibold text-stone-200 truncate">{card.title}</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">{card.insight}</p>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">{card.action}</p>
            </div>
          ))}
        </div>
      )}
    </CollapsibleWidget>
  )
}

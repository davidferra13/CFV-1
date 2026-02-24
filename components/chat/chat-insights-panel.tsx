'use client'

import { useState, useTransition } from 'react'
import {
  Sparkles,
  Check,
  X,
  Calendar,
  AlertTriangle,
  Utensils,
  MapPin,
  Users,
  DollarSign,
  MessageSquare,
  Heart,
} from 'lucide-react'
import { acceptInsight, dismissInsight } from '@/lib/insights/actions'
import type { ChatInsight, InsightType } from '@/lib/insights/actions'

const INSIGHT_ICONS: Record<InsightType, React.ReactNode> = {
  inquiry_intent: <MessageSquare className="w-3.5 h-3.5" />,
  dietary_preference: <Utensils className="w-3.5 h-3.5" />,
  allergy_mention: <AlertTriangle className="w-3.5 h-3.5" />,
  important_date: <Calendar className="w-3.5 h-3.5" />,
  guest_count: <Users className="w-3.5 h-3.5" />,
  event_detail: <Calendar className="w-3.5 h-3.5" />,
  budget_mention: <DollarSign className="w-3.5 h-3.5" />,
  location_mention: <MapPin className="w-3.5 h-3.5" />,
  general_preference: <Heart className="w-3.5 h-3.5" />,
}

const INSIGHT_COLORS: Record<InsightType, string> = {
  inquiry_intent: 'text-brand-600',
  dietary_preference: 'text-orange-600',
  allergy_mention: 'text-red-600',
  important_date: 'text-purple-600',
  guest_count: 'text-blue-600',
  event_detail: 'text-blue-600',
  budget_mention: 'text-emerald-600',
  location_mention: 'text-teal-600',
  general_preference: 'text-pink-600',
}

interface ChatInsightsPanelProps {
  initialInsights: ChatInsight[]
}

export function ChatInsightsPanel({ initialInsights }: ChatInsightsPanelProps) {
  const [insights, setInsights] = useState(initialInsights)
  const [isPending, startTransition] = useTransition()

  const handleAccept = async (insightId: string) => {
    startTransition(async () => {
      await acceptInsight(insightId, { apply_to: 'note' })
      setInsights((prev) => prev.filter((i) => i.id !== insightId))
    })
  }

  const handleDismiss = async (insightId: string) => {
    startTransition(async () => {
      await dismissInsight(insightId)
      setInsights((prev) => prev.filter((i) => i.id !== insightId))
    })
  }

  if (insights.length === 0) return null

  return (
    <div className="px-3 pb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-amber-500" />
        <span className="text-xs font-medium text-amber-700">Smart Suggestions</span>
        <span className="text-[10px] text-amber-500">({insights.length})</span>
      </div>

      <div className="space-y-1.5">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="p-2 rounded-lg border border-dashed border-amber-200 bg-amber-950/50"
          >
            <div className="flex items-start gap-2">
              <span className={`flex-shrink-0 mt-0.5 ${INSIGHT_COLORS[insight.insight_type]}`}>
                {INSIGHT_ICONS[insight.insight_type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-stone-200">{insight.title}</p>
                {insight.detail && (
                  <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">{insight.detail}</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-amber-600">
                    {Math.round(insight.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 mt-1.5 ml-5">
              <button
                type="button"
                onClick={() => handleAccept(insight.id)}
                disabled={isPending}
                className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-green-700 bg-green-900 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
              >
                <Check className="w-2.5 h-2.5" />
                Save as Note
              </button>
              <button
                type="button"
                onClick={() => handleDismiss(insight.id)}
                disabled={isPending}
                className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-stone-500 bg-stone-800 rounded hover:bg-stone-700 disabled:opacity-50 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

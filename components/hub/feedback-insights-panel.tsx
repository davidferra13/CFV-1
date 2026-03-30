'use client'

import { useState, useEffect } from 'react'
import {
  getFeedbackInsights,
  getMealHistory,
  type FeedbackInsight,
  type MealHistoryEntry,
} from '@/lib/hub/meal-board-actions'

interface FeedbackInsightsPanelProps {
  groupId: string
  isChefOrAdmin: boolean
}

const SCORE_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] text-stone-400">{label}</span>
      <div className="flex-1 rounded-full bg-stone-800 h-1.5">
        <div
          className={`h-1.5 rounded-full ${color} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-8 text-right text-[10px] text-stone-500">{score}</span>
    </div>
  )
}

export function FeedbackInsightsPanel({ groupId, isChefOrAdmin }: FeedbackInsightsPanelProps) {
  const [insights, setInsights] = useState<FeedbackInsight | null>(null)
  const [history, setHistory] = useState<MealHistoryEntry[]>([])
  const [tab, setTab] = useState<'insights' | 'history'>('insights')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isChefOrAdmin) return
    Promise.all([getFeedbackInsights({ groupId }), getMealHistory({ groupId, limit: 30 })])
      .then(([i, h]) => {
        setInsights(i)
        setHistory(h)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId, isChefOrAdmin])

  if (!isChefOrAdmin) return null
  if (loading) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-stone-800" />
      </div>
    )
  }
  if (!insights || insights.totalFeedback === 0) return null

  const trendIcon =
    insights.recentTrend === 'improving' ? '📈' : insights.recentTrend === 'declining' ? '📉' : '➡️'
  const trendColor =
    insights.recentTrend === 'improving'
      ? 'text-emerald-400'
      : insights.recentTrend === 'declining'
        ? 'text-red-400'
        : 'text-stone-400'

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-4">
      {/* Tab toggle */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setTab('insights')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            tab === 'insights'
              ? 'bg-[var(--hub-primary,#e88f47)] text-white'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Insights
        </button>
        <button
          onClick={() => setTab('history')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            tab === 'history'
              ? 'bg-[var(--hub-primary,#e88f47)] text-white'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Dish History
        </button>
        <span className="ml-auto text-[10px] text-stone-600">Chef only</span>
      </div>

      {tab === 'insights' ? (
        <div className="space-y-3">
          {/* Overall score */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-stone-100">{insights.overallScore}</div>
              <div className="text-[10px] text-stone-500">/ 100</div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-stone-300">
                {insights.totalFeedback} reactions across {insights.totalMeals} meals
              </p>
              <p className={`text-[10px] ${trendColor}`}>
                {trendIcon}{' '}
                {insights.recentTrend === 'improving'
                  ? 'Trending up'
                  : insights.recentTrend === 'declining'
                    ? 'Trending down'
                    : 'Holding steady'}
              </p>
            </div>
          </div>

          {/* Category breakdown */}
          {insights.categoryBreakdown.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
                By meal
              </p>
              {insights.categoryBreakdown.map((cat) => (
                <ScoreBar
                  key={cat.category}
                  score={cat.avgScore}
                  label={SCORE_LABEL[cat.category] ?? cat.category}
                />
              ))}
            </div>
          )}

          {/* Top dishes */}
          {insights.topDishes.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-500">
                Family favorites
              </p>
              <div className="space-y-0.5">
                {insights.topDishes.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-stone-200">{d.title}</span>
                    <span
                      className={`text-[10px] ${d.score >= 75 ? 'text-emerald-400' : 'text-stone-500'}`}
                    >
                      {d.score}/100 ({d.count}x)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dishes to reconsider */}
          {insights.bottomDishes.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-500">
                May want to skip
              </p>
              <div className="space-y-0.5">
                {insights.bottomDishes.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-stone-400">{d.title}</span>
                    <span className="text-[10px] text-red-400">
                      {d.score}/100 ({d.count}x)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Dish History tab */
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {history.length === 0 ? (
            <p className="py-4 text-center text-xs text-stone-600">No meal history yet</p>
          ) : (
            history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-stone-800/50"
              >
                <div className="flex-1">
                  <span className="text-xs font-medium text-stone-200">{h.title}</span>
                  <span className="ml-1 text-[10px] text-stone-600">{h.times_served}x served</span>
                </div>
                <div className="flex items-center gap-2">
                  {h.loved_pct > 0 && (
                    <span className="text-[10px] text-emerald-400">❤️ {h.loved_pct}%</span>
                  )}
                  {h.avg_score > 0 && (
                    <span
                      className={`text-[10px] ${h.avg_score >= 75 ? 'text-emerald-400' : h.avg_score >= 50 ? 'text-amber-400' : 'text-red-400'}`}
                    >
                      {h.avg_score}/100
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

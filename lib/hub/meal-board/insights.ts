'use server'

import { createServerClient } from '@/lib/db/server'
import type { FeedbackInsight, MealHistoryEntry } from './contracts'
import { hasManagerAccess, liso as _liso } from './shared'

function emptyFeedbackInsight(): FeedbackInsight {
  return {
    totalMeals: 0,
    totalFeedback: 0,
    overallScore: 0,
    topDishes: [],
    bottomDishes: [],
    categoryBreakdown: [],
    recentTrend: 'stable',
  }
}

export async function getFeedbackInsights(input: {
  groupId: string
  profileToken?: string
  lookbackDays?: number
}): Promise<FeedbackInsight> {
  const db: any = createServerClient({ admin: true })
  if (!(await hasManagerAccess(db, input.groupId, input.profileToken))) {
    return emptyFeedbackInsight()
  }

  const lookback = input.lookbackDays ?? 30

  const _cdn = new Date()
  const cutoffStr = _liso(new Date(_cdn.getFullYear(), _cdn.getMonth(), _cdn.getDate() - lookback))

  const { data: meals } = await db
    .from('hub_meal_board')
    .select('id, title, meal_type, meal_date, dietary_tags')
    .eq('group_id', input.groupId)
    .gte('meal_date', cutoffStr)
    .neq('status', 'cancelled')
    .order('meal_date', { ascending: false })

  if (!meals || meals.length === 0) {
    return emptyFeedbackInsight()
  }

  const mealIds = meals.map((m: any) => m.id)
  const { data: feedback } = await db
    .from('hub_meal_feedback')
    .select('meal_entry_id, reaction')
    .in('meal_entry_id', mealIds)

  const feedbackList = feedback ?? []
  const scoreMap: Record<string, number> = { loved: 100, liked: 75, neutral: 50, disliked: 0 }

  const mealScores: Record<
    string,
    { title: string; scores: number[]; mealType: string; date: string }
  > = {}
  for (const m of meals) {
    mealScores[m.id] = { title: m.title, scores: [], mealType: m.meal_type, date: m.meal_date }
  }

  let totalScore = 0
  for (const fb of feedbackList) {
    const s = scoreMap[fb.reaction] ?? 50
    totalScore += s
    if (mealScores[fb.meal_entry_id]) mealScores[fb.meal_entry_id].scores.push(s)
  }

  // Aggregate per dish title
  const dishAgg: Record<string, { title: string; totalScore: number; count: number }> = {}
  for (const ms of Object.values(mealScores)) {
    if (ms.scores.length === 0) continue
    const key = ms.title.toLowerCase().trim()
    if (!dishAgg[key]) dishAgg[key] = { title: ms.title, totalScore: 0, count: 0 }
    const avg = ms.scores.reduce((a, b) => a + b, 0) / ms.scores.length
    dishAgg[key].totalScore += avg
    dishAgg[key].count += 1
  }

  const dishList = Object.values(dishAgg)
    .map((d) => ({ title: d.title, score: Math.round(d.totalScore / d.count), count: d.count }))
    .sort((a, b) => b.score - a.score)

  // Category breakdown
  const catAgg: Record<string, { totalScore: number; count: number }> = {}
  for (const ms of Object.values(mealScores)) {
    if (ms.scores.length === 0) continue
    if (!catAgg[ms.mealType]) catAgg[ms.mealType] = { totalScore: 0, count: 0 }
    const avg = ms.scores.reduce((a, b) => a + b, 0) / ms.scores.length
    catAgg[ms.mealType].totalScore += avg
    catAgg[ms.mealType].count += 1
  }

  const categoryBreakdown = Object.entries(catAgg).map(([cat, a]) => ({
    category: cat,
    avgScore: Math.round(a.totalScore / a.count),
    count: a.count,
  }))

  // Trend: first half vs second half
  const _mdn = new Date()
  const midStr = _liso(
    new Date(_mdn.getFullYear(), _mdn.getMonth(), _mdn.getDate() - Math.floor(lookback / 2))
  )
  let fTotal = 0,
    fCount = 0,
    sTotal = 0,
    sCount = 0
  for (const ms of Object.values(mealScores)) {
    if (ms.scores.length === 0) continue
    const avg = ms.scores.reduce((a, b) => a + b, 0) / ms.scores.length
    if (ms.date < midStr) {
      fTotal += avg
      fCount++
    } else {
      sTotal += avg
      sCount++
    }
  }
  const diff = (sCount > 0 ? sTotal / sCount : 50) - (fCount > 0 ? fTotal / fCount : 50)
  const recentTrend: 'improving' | 'stable' | 'declining' =
    diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable'

  return {
    totalMeals: meals.length,
    totalFeedback: feedbackList.length,
    overallScore: feedbackList.length > 0 ? Math.round(totalScore / feedbackList.length) : 0,
    topDishes: dishList.slice(0, 5),
    bottomDishes: dishList.filter((d) => d.score < 50).slice(0, 3),
    categoryBreakdown,
    recentTrend,
  }
}
export async function getMealHistory(input: {
  groupId: string
  profileToken?: string
  limit?: number
}): Promise<MealHistoryEntry[]> {
  const db: any = createServerClient({ admin: true })
  if (!(await hasManagerAccess(db, input.groupId, input.profileToken))) return []

  const { data: meals } = await db
    .from('hub_meal_board')
    .select('id, title, meal_type, meal_date')
    .eq('group_id', input.groupId)
    .neq('status', 'cancelled')
    .order('meal_date', { ascending: false })

  if (!meals || meals.length === 0) return []

  const mealIds = meals.map((m: any) => m.id)
  const { data: feedback } = await db
    .from('hub_meal_feedback')
    .select('meal_entry_id, reaction')
    .in('meal_entry_id', mealIds)

  const feedbackList = feedback ?? []
  const scoreMap: Record<string, number> = { loved: 100, liked: 75, neutral: 50, disliked: 0 }

  const fbByMeal: Record<string, { reaction: string }[]> = {}
  for (const fb of feedbackList) {
    if (!fbByMeal[fb.meal_entry_id]) fbByMeal[fb.meal_entry_id] = []
    fbByMeal[fb.meal_entry_id].push(fb)
  }

  const agg: Record<
    string,
    { title: string; mealType: string; dates: string[]; scores: number[]; lovedCount: number }
  > = {}
  for (const m of meals) {
    const key = m.title.toLowerCase().trim()
    if (!agg[key])
      agg[key] = { title: m.title, mealType: m.meal_type, dates: [], scores: [], lovedCount: 0 }
    agg[key].dates.push(m.meal_date)
    for (const fb of fbByMeal[m.id] ?? []) {
      agg[key].scores.push(scoreMap[fb.reaction] ?? 50)
      if (fb.reaction === 'loved') agg[key].lovedCount++
    }
  }

  const results: MealHistoryEntry[] = Object.values(agg).map((a) => ({
    title: a.title,
    meal_type: a.mealType,
    times_served: a.dates.length,
    last_served: a.dates.sort().reverse()[0],
    avg_score:
      a.scores.length > 0 ? Math.round(a.scores.reduce((x, y) => x + y, 0) / a.scores.length) : 0,
    total_feedback: a.scores.length,
    loved_pct: a.scores.length > 0 ? Math.round((a.lovedCount / a.scores.length) * 100) : 0,
  }))

  results.sort((a, b) => b.avg_score - a.avg_score)
  return results.slice(0, input.limit ?? 50)
}

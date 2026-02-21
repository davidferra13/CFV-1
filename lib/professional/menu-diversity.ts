// Pure computation — no server dependency, no 'use server'
// Menu diversity analysis for the professional momentum dashboard

export type MenuDiversitySignal = {
  uniqueDishesLast90d: number
  totalServingsLast90d: number
  repetitionRate: number // 0-1, higher = more repetition
  topRepeatedDishes: Array<{ name: string; count: number }>
  diversityLevel: 'high' | 'moderate' | 'low'
}

export function computeMenuDiversity(
  dishServings: Array<{ dish_name: string; served_at: string }>
): MenuDiversitySignal {
  const now = new Date()
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const recent = dishServings.filter((d) => new Date(d.served_at) >= cutoff)

  const totalServingsLast90d = recent.length

  const dishCounts: Record<string, number> = {}
  for (const { dish_name } of recent) {
    const key = dish_name.toLowerCase().trim()
    dishCounts[key] = (dishCounts[key] ?? 0) + 1
  }

  const uniqueDishesLast90d = Object.keys(dishCounts).length

  const repetitionRate =
    totalServingsLast90d === 0 ? 0 : 1 - uniqueDishesLast90d / totalServingsLast90d

  const topRepeatedDishes = Object.entries(dishCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const ratio = totalServingsLast90d === 0 ? 1 : uniqueDishesLast90d / totalServingsLast90d

  let diversityLevel: 'high' | 'moderate' | 'low'
  if (ratio >= 0.6) {
    diversityLevel = 'high'
  } else if (ratio < 0.3) {
    diversityLevel = 'low'
  } else {
    diversityLevel = 'moderate'
  }

  return {
    uniqueDishesLast90d,
    totalServingsLast90d,
    repetitionRate,
    topRepeatedDishes,
    diversityLevel,
  }
}

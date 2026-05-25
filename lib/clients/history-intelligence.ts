'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface ClientPattern {
  type: 'guest_count' | 'cuisine' | 'frequency' | 'budget' | 'seasonal' | 'standing_request'
  label: string
  detail: string
  confidence: 'high' | 'medium' | 'low'
}

export async function getClientPatterns(clientId: string): Promise<ClientPattern[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select(
      'id, guest_count, occasion, event_date, cuisine_type, budget_cents, quoted_price_cents, vibe_atmosphere, status'
    )
    .eq('tenant_id', chef.tenantId!)
    .eq('client_id', clientId)
    .in('status', ['completed', 'accepted', 'paid', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: false })
    .limit(50)

  if (!events || events.length < 2) return []

  const patterns: ClientPattern[] = []

  const withGuests = events.filter((e: any) => e.guest_count != null && e.guest_count > 0)
  if (withGuests.length >= 2) {
    const avg = Math.round(
      withGuests.reduce((s: number, e: any) => s + e.guest_count, 0) / withGuests.length
    )
    const min = Math.min(...withGuests.map((e: any) => e.guest_count))
    const max = Math.max(...withGuests.map((e: any) => e.guest_count))
    patterns.push({
      type: 'guest_count',
      label: 'Guest count',
      detail:
        min === max
          ? `Consistently ${avg} guests`
          : `Averages ${avg} guests (range: ${min} to ${max})`,
      confidence: withGuests.length >= 4 ? 'high' : 'medium',
    })
  }

  const cuisines = events.map((e: any) => e.cuisine_type).filter(Boolean) as string[]
  if (cuisines.length >= 2) {
    const counts: Record<string, number> = {}
    for (const c of cuisines) counts[c] = (counts[c] || 0) + 1
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const top = sorted[0]
    if (top && top[1] >= 2) {
      patterns.push({
        type: 'cuisine',
        label: 'Cuisine preference',
        detail: `${top[0]} (${top[1]} of ${cuisines.length} events)`,
        confidence: top[1] / cuisines.length > 0.5 ? 'high' : 'medium',
      })
    }
  }

  const withDates = events
    .filter((e: any) => e.event_date)
    .map((e: any) => new Date(e.event_date).getTime())
    .sort((a: number, b: number) => a - b)
  if (withDates.length >= 3) {
    const gaps: number[] = []
    for (let i = 1; i < withDates.length; i++) {
      gaps.push(Math.round((withDates[i] - withDates[i - 1]) / 86_400_000))
    }
    const avgGap = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length)
    if (avgGap <= 14) {
      patterns.push({
        type: 'frequency',
        label: 'Booking frequency',
        detail: `Every ~${avgGap} days (very frequent)`,
        confidence: 'high',
      })
    } else if (avgGap <= 60) {
      const weeks = Math.round(avgGap / 7)
      patterns.push({
        type: 'frequency',
        label: 'Booking frequency',
        detail: `Every ~${weeks} weeks`,
        confidence: gaps.length >= 4 ? 'high' : 'medium',
      })
    } else {
      const months = Math.round(avgGap / 30)
      patterns.push({
        type: 'frequency',
        label: 'Booking frequency',
        detail: `Every ~${months} months`,
        confidence: 'medium',
      })
    }
  }

  const withBudget = events.filter((e: any) => e.budget_cents || e.quoted_price_cents)
  if (withBudget.length >= 2) {
    const amounts = withBudget.map((e: any) => (e.quoted_price_cents || e.budget_cents) as number)
    const avg = Math.round(amounts.reduce((s: number, a: number) => s + a, 0) / amounts.length)
    const recent = amounts.slice(0, Math.min(3, amounts.length))
    const older = amounts.slice(Math.min(3, amounts.length))
    let trend = ''
    if (older.length > 0) {
      const recentAvg = recent.reduce((s: number, a: number) => s + a, 0) / recent.length
      const olderAvg = older.reduce((s: number, a: number) => s + a, 0) / older.length
      const pctChange = Math.round(((recentAvg - olderAvg) / olderAvg) * 100)
      if (pctChange > 10) trend = ` (trending up ${pctChange}%)`
      else if (pctChange < -10) trend = ` (trending down ${Math.abs(pctChange)}%)`
    }
    patterns.push({
      type: 'budget',
      label: 'Budget',
      detail: `Averages $${(avg / 100).toFixed(0)} per event${trend}`,
      confidence: withBudget.length >= 4 ? 'high' : 'medium',
    })
  }

  const seasonMap: Record<string, string> = {
    '0': 'Winter',
    '1': 'Winter',
    '2': 'Spring',
    '3': 'Spring',
    '4': 'Spring',
    '5': 'Summer',
    '6': 'Summer',
    '7': 'Summer',
    '8': 'Fall',
    '9': 'Fall',
    '10': 'Fall',
    '11': 'Winter',
  }
  const seasonCounts: Record<string, number> = {}
  for (const e of events) {
    if (!e.event_date) continue
    const month = new Date(e.event_date).getMonth()
    const season = seasonMap[String(month)]
    seasonCounts[season] = (seasonCounts[season] || 0) + 1
  }
  const seasonEntries = Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])
  if (seasonEntries.length > 0 && seasonEntries[0][1] >= 2 && events.length >= 3) {
    const topSeason = seasonEntries[0]
    const pct = Math.round((topSeason[1] / events.length) * 100)
    if (pct >= 40) {
      patterns.push({
        type: 'seasonal',
        label: 'Seasonal preference',
        detail: `${topSeason[0]} (${pct}% of events)`,
        confidence: pct >= 60 ? 'high' : 'medium',
      })
    }
  }

  return patterns
}

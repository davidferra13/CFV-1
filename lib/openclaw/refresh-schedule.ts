'use server'

/**
 * Adaptive Refresh Cadence
 * Uses volatility data to determine how often each ingredient
 * needs re-scraping. High-volatility = daily, low = monthly.
 *
 * Generates a refresh-priorities.json that the Pi cron can read.
 */

import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

interface RefreshPriority {
  ingredientId: string
  name: string
  volatilityBand: string
  intervalHours: number
  label: string
  lastPriceDate: string | null
  needsRefresh: boolean
}

export interface RefreshSchedule {
  ingredients: RefreshPriority[]
  summary: {
    daily: number
    weekly: number
    monthly: number
    unknown: number
  }
  generatedAt: string
}

function getRefreshCadence(volatilityBand: string | null): {
  intervalHours: number
  label: string
} {
  switch (volatilityBand) {
    case 'high':
      return { intervalHours: 24, label: 'daily' }
    case 'medium':
      return { intervalHours: 168, label: 'weekly' }
    case 'low':
      return { intervalHours: 720, label: 'monthly' }
    default:
      return { intervalHours: 168, label: 'weekly' }
  }
}

/**
 * Get the refresh schedule for all ingredients with volatility data.
 * Admin only.
 */
export async function getRefreshSchedule(): Promise<RefreshSchedule> {
  await requireAdmin()

  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (i.name)
      i.id,
      i.name,
      i.price_volatility_band,
      i.last_price_date
    FROM ingredients i
    WHERE i.archived = false
      AND i.last_price_cents IS NOT NULL
    ORDER BY i.name, i.last_price_date DESC
  `)) as unknown as Array<{
    id: string
    name: string
    price_volatility_band: string | null
    last_price_date: string | null
  }>

  const now = Date.now()
  let daily = 0,
    weekly = 0,
    monthly = 0,
    unknown = 0

  const ingredients: RefreshPriority[] = rows.map((row) => {
    const cadence = getRefreshCadence(row.price_volatility_band)

    // Check if this ingredient needs a refresh
    let needsRefresh = true
    if (row.last_price_date) {
      const ageMs = now - new Date(row.last_price_date).getTime()
      const ageHours = ageMs / (1000 * 60 * 60)
      needsRefresh = ageHours > cadence.intervalHours
    }

    switch (cadence.label) {
      case 'daily':
        daily++
        break
      case 'weekly':
        weekly++
        break
      case 'monthly':
        monthly++
        break
      default:
        unknown++
    }

    return {
      ingredientId: row.id,
      name: row.name,
      volatilityBand: row.price_volatility_band || 'unknown',
      intervalHours: cadence.intervalHours,
      label: cadence.label,
      lastPriceDate: row.last_price_date,
      needsRefresh,
    }
  })

  return {
    ingredients,
    summary: { daily, weekly, monthly, unknown },
    generatedAt: new Date().toISOString(),
  }
}

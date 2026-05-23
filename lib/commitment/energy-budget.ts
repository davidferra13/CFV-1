import { createServerClient } from '@/lib/db/server'

// #56 Energy Budget
// Emotional energy tracking beyond time. Track high-energy event caps,
// difficult client limits, creative energy reserves, admin energy
// boundaries. Score 1-10 per event.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export type EnergyCategory =
  | 'high_energy_event'
  | 'difficult_client'
  | 'creative_work'
  | 'admin_work'
  | 'travel'
  | 'general'

export interface EnergyExpenditure {
  id: string
  tenantId: string
  eventId: string | null
  category: EnergyCategory
  score: number
  notes: string | null
  date: string
  createdAt: Date
}

export interface EnergyBudget {
  tenantId: string
  period: string
  totalBudget: number
  spent: number
  remaining: number
  byCategory: Record<EnergyCategory, { spent: number; cap: number }>
  expenditures: EnergyExpenditure[]
}

export interface EnergyCapacityCheck {
  date: string
  hasCapacity: boolean
  currentLoad: number
  maxLoad: number
  warning: string | null
}

export interface EnergyReport {
  tenantId: string
  periodStart: string
  periodEnd: string
  averageDaily: number
  peakDay: { date: string; total: number } | null
  lowDay: { date: string; total: number } | null
  categoryBreakdown: Record<EnergyCategory, number>
  trend: 'improving' | 'stable' | 'declining'
  recommendations: string[]
}

const DEFAULT_CAPS: Record<EnergyCategory, number> = {
  high_energy_event: 30,
  difficult_client: 15,
  creative_work: 25,
  admin_work: 20,
  travel: 15,
  general: 20,
}

const WEEKLY_BUDGET = 70

function mapExpenditureRow(row: any): EnergyExpenditure {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id ?? null,
    category: row.category,
    score: row.score,
    notes: row.notes ?? null,
    date: row.date,
    createdAt: new Date(row.created_at),
  }
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  const day = start.getDay()
  start.setDate(start.getDate() - day)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  return { start, end }
}

export async function getEnergyBudget(
  tenantId: string,
  period: 'week' | 'month' = 'week'
): Promise<EnergyBudget> {
  const client = createServerClient()
  const now = new Date()

  let startDate: Date
  let endDate: Date

  if (period === 'week') {
    const bounds = getWeekBounds(now)
    startDate = bounds.start
    endDate = bounds.end
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }

  const { data: rows } = await client
    .from('commitment_energy_log' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lt('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  const expenditures = (rows || []).map(mapExpenditureRow)

  const byCategory: Record<EnergyCategory, { spent: number; cap: number }> = {
    high_energy_event: { spent: 0, cap: DEFAULT_CAPS.high_energy_event },
    difficult_client: { spent: 0, cap: DEFAULT_CAPS.difficult_client },
    creative_work: { spent: 0, cap: DEFAULT_CAPS.creative_work },
    admin_work: { spent: 0, cap: DEFAULT_CAPS.admin_work },
    travel: { spent: 0, cap: DEFAULT_CAPS.travel },
    general: { spent: 0, cap: DEFAULT_CAPS.general },
  }

  let totalSpent = 0
  for (const e of expenditures) {
    totalSpent += e.score
    const cat = e.category as EnergyCategory
    if (byCategory[cat]) {
      byCategory[cat].spent += e.score
    }
  }

  const budget = period === 'week' ? WEEKLY_BUDGET : WEEKLY_BUDGET * 4

  return {
    tenantId,
    period,
    totalBudget: budget,
    spent: totalSpent,
    remaining: Math.max(0, budget - totalSpent),
    byCategory,
    expenditures,
  }
}

export async function recordEnergyExpenditure(
  tenantId: string,
  eventId: string | null,
  energyScore: number,
  category: EnergyCategory = 'general',
  notes: string | null = null
): Promise<EnergyExpenditure> {
  const client = createServerClient()
  const now = new Date()
  const score = Math.max(1, Math.min(10, Math.round(energyScore)))
  const id = generateId()

  await client.from('commitment_energy_log' as any).insert({
    id,
    tenant_id: tenantId,
    event_id: eventId,
    category,
    score,
    notes,
    date: now.toISOString().split('T')[0],
    created_at: now.toISOString(),
  })

  return {
    id,
    tenantId,
    eventId,
    category,
    score,
    notes,
    date: now.toISOString().split('T')[0],
    createdAt: now,
  }
}

export async function checkEnergyCapacity(
  tenantId: string,
  date: Date = new Date()
): Promise<EnergyCapacityCheck> {
  const client = createServerClient()
  const dateStr = date.toISOString().split('T')[0]

  const { data: rows } = await client
    .from('commitment_energy_log' as any)
    .select('score')
    .eq('tenant_id', tenantId)
    .eq('date', dateStr)

  const dailySpent = (rows || []).reduce((sum: number, r: any) => sum + (r.score || 0), 0)
  const dailyMax = 10
  const hasCapacity = dailySpent < dailyMax

  let warning: string | null = null
  if (dailySpent >= dailyMax) {
    warning = 'Daily energy budget exhausted. Adding more work today risks burnout.'
  } else if (dailySpent >= dailyMax * 0.8) {
    warning = 'Energy at ' + Math.round((dailySpent / dailyMax) * 100) + '% for today. Consider lighter tasks.'
  }

  return {
    date: dateStr,
    hasCapacity,
    currentLoad: dailySpent,
    maxLoad: dailyMax,
    warning,
  }
}

export async function getEnergyReport(
  tenantId: string,
  days: number = 30
): Promise<EnergyReport> {
  const client = createServerClient()
  const endDate = new Date()
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const { data: rows } = await client
    .from('commitment_energy_log' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  const expenditures = (rows || []).map(mapExpenditureRow)

  const dailyTotals = new Map<string, number>()
  const categoryTotals: Record<EnergyCategory, number> = {
    high_energy_event: 0,
    difficult_client: 0,
    creative_work: 0,
    admin_work: 0,
    travel: 0,
    general: 0,
  }

  for (const e of expenditures) {
    dailyTotals.set(e.date, (dailyTotals.get(e.date) || 0) + e.score)
    const cat = e.category as EnergyCategory
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.score
  }

  const dailyValues = [...dailyTotals.entries()]
  const totalDays = dailyValues.length || 1
  const totalEnergy = dailyValues.reduce((sum: number, entry: [string, number]) => sum + entry[1], 0)
  const averageDaily = Math.round((totalEnergy / totalDays) * 10) / 10

  let peakDay: { date: string; total: number } | null = null
  let lowDay: { date: string; total: number } | null = null

  for (const [date, total] of dailyValues) {
    if (!peakDay || total > peakDay.total) peakDay = { date, total }
    if (!lowDay || total < lowDay.total) lowDay = { date, total }
  }

  const midpoint = Math.floor(dailyValues.length / 2)
  const firstHalf = dailyValues.slice(0, midpoint)
  const secondHalf = dailyValues.slice(midpoint)

  const firstAvg =
    firstHalf.length > 0
      ? firstHalf.reduce((s: number, entry: [string, number]) => s + entry[1], 0) / firstHalf.length
      : 0
  const secondAvg =
    secondHalf.length > 0
      ? secondHalf.reduce((s: number, entry: [string, number]) => s + entry[1], 0) / secondHalf.length
      : 0

  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (secondAvg < firstAvg * 0.85) trend = 'improving'
  else if (secondAvg > firstAvg * 1.15) trend = 'declining'

  const recommendations: string[] = []
  if (categoryTotals.difficult_client > DEFAULT_CAPS.difficult_client * 2) {
    recommendations.push(
      'Difficult client energy is very high. Consider setting client boundaries or reducing difficult bookings.'
    )
  }
  if (averageDaily > 8) {
    recommendations.push(
      'Average daily energy expenditure is high. Schedule recovery days between intense events.'
    )
  }
  if (trend === 'declining') {
    recommendations.push(
      'Energy trend is declining. Consider reducing commitments or taking a recovery period.'
    )
  }
  if (categoryTotals.admin_work > categoryTotals.creative_work * 2) {
    recommendations.push(
      'Admin work consumes disproportionate energy. Look for automation or delegation opportunities.'
    )
  }

  return {
    tenantId,
    periodStart: startDate.toISOString().split('T')[0],
    periodEnd: endDate.toISOString().split('T')[0],
    averageDaily,
    peakDay,
    lowDay,
    categoryBreakdown: categoryTotals,
    trend,
    recommendations,
  }
}
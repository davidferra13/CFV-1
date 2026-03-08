// Capacity Planning - Pure Calculation Engine
// Analyzes chef workload, utilization, and burnout risk from existing data.
// NOT a server action file. Called by capacity-actions.ts.

// ============================================
// Types
// ============================================

export interface CapacityAnalysis {
  weeklyHoursUsed: number
  weeklyHoursAvailable: number
  weeklyHoursRemaining: number
  utilizationPercent: number

  commitments: {
    recurringWeekly: number
    averageOneOffPerWeek: number
    travelHoursPerWeek: number
    adminHoursPerWeek: number
  }

  canTakeMore: boolean
  additionalEventsPerWeek: number
  additionalMealPrepClients: number

  burnoutRisk: 'low' | 'moderate' | 'high'
  burnoutFactors: string[]

  recommendations: string[]
}

export interface CapacityTrendWeek {
  weekStart: string
  weekEnd: string
  hoursUsed: number
  hoursAvailable: number
  utilizationPercent: number
  eventCount: number
}

export interface TimeBreakdown {
  category: string
  minutes: number
  color: string
}

export interface EventDataPoint {
  id: string
  eventDate: string
  status: string
  timePrepMinutes: number | null
  timeServiceMinutes: number | null
  timeShoppingMinutes: number | null
  timeTravelMinutes: number | null
  timeResetMinutes: number | null
  guestCount: number
}

export interface RecurringServiceData {
  id: string
  frequency: string
  status: string
  serviceType: string
  dayOfWeek: unknown
}

export interface CalendarBlockData {
  id: string
  startDate: string
  endDate: string
  blocksBookings: boolean
  entryType: string
}

// ============================================
// Constants
// ============================================

const DEFAULT_WEEKLY_HOURS = 40
const ADMIN_OVERHEAD_PERCENT = 0.18 // 18% of cooking/service time
const DEFAULT_EVENT_HOURS = 5 // fallback when no time tracking data
const DEFAULT_MEAL_PREP_HOURS = 3 // hours per weekly meal prep client
const BURNOUT_HIGH_THRESHOLD = 85
const BURNOUT_MODERATE_THRESHOLD = 65
const MAX_HEALTHY_CONSECUTIVE_DAYS = 10
const MAX_HEALTHY_DAYS_PER_WEEK = 6

// ============================================
// Main Analysis
// ============================================

export function computeCapacityAnalysis(
  events: EventDataPoint[],
  recurringServices: RecurringServiceData[],
  calendarBlocks: CalendarBlockData[],
  weeklyHoursAvailable: number | null,
  lookbackDays: number,
): CapacityAnalysis {
  const available = weeklyHoursAvailable ?? DEFAULT_WEEKLY_HOURS
  const weeks = Math.max(1, lookbackDays / 7)

  // Separate completed/active events for hour calculation
  const relevantEvents = events.filter(
    (e) => e.status !== 'draft' && e.status !== 'cancelled'
  )

  // Calculate total minutes from events
  const totalCookingMinutes = relevantEvents.reduce((sum, e) => {
    const prep = e.timePrepMinutes ?? 0
    const service = e.timeServiceMinutes ?? 0
    const reset = e.timeResetMinutes ?? 0
    // If no time data at all, use default estimate
    if (prep === 0 && service === 0 && reset === 0) {
      return sum + DEFAULT_EVENT_HOURS * 60
    }
    return sum + prep + service + reset
  }, 0)

  const totalTravelMinutes = relevantEvents.reduce(
    (sum, e) => sum + (e.timeTravelMinutes ?? 0),
    0
  )

  const totalShoppingMinutes = relevantEvents.reduce(
    (sum, e) => sum + (e.timeShoppingMinutes ?? 0),
    0
  )

  // Admin overhead: estimated from cooking time
  const adminMinutes = totalCookingMinutes * ADMIN_OVERHEAD_PERCENT

  const totalMinutesUsed =
    totalCookingMinutes + totalTravelMinutes + totalShoppingMinutes + adminMinutes

  const weeklyMinutesUsed = totalMinutesUsed / weeks
  const weeklyHoursUsed = Math.round((weeklyMinutesUsed / 60) * 10) / 10

  // Recurring commitments
  const activeRecurring = recurringServices.filter((s) => s.status === 'active')
  const recurringWeekly = activeRecurring.length

  // Average one-off events per week
  const oneOffCount = relevantEvents.length - countRecurringEvents(relevantEvents, activeRecurring)
  const averageOneOffPerWeek = Math.round((oneOffCount / weeks) * 10) / 10

  // Travel and admin per week
  const travelHoursPerWeek = Math.round((totalTravelMinutes / weeks / 60) * 10) / 10
  const adminHoursPerWeek = Math.round((adminMinutes / weeks / 60) * 10) / 10

  // Utilization
  const weeklyHoursRemaining = Math.max(0, available - weeklyHoursUsed)
  const utilizationPercent = Math.min(100, Math.round((weeklyHoursUsed / available) * 100))

  // Additional capacity
  const avgHoursPerEvent = relevantEvents.length > 0
    ? totalMinutesUsed / relevantEvents.length / 60
    : DEFAULT_EVENT_HOURS
  const additionalEventsPerWeek = avgHoursPerEvent > 0
    ? Math.floor(weeklyHoursRemaining / avgHoursPerEvent)
    : 0
  const additionalMealPrepClients = Math.floor(weeklyHoursRemaining / DEFAULT_MEAL_PREP_HOURS)
  const canTakeMore = weeklyHoursRemaining >= avgHoursPerEvent

  // Burnout analysis
  const { burnoutRisk, burnoutFactors } = computeBurnoutRisk(
    utilizationPercent,
    events,
    calendarBlocks,
    weeks,
  )

  // Recommendations
  const recommendations = generateRecommendations(
    utilizationPercent,
    burnoutFactors,
    travelHoursPerWeek,
    weeklyHoursUsed,
    available,
    additionalEventsPerWeek,
    averageOneOffPerWeek,
    recurringWeekly,
    events,
  )

  return {
    weeklyHoursUsed,
    weeklyHoursAvailable: available,
    weeklyHoursRemaining,
    utilizationPercent,
    commitments: {
      recurringWeekly,
      averageOneOffPerWeek,
      travelHoursPerWeek,
      adminHoursPerWeek,
    },
    canTakeMore,
    additionalEventsPerWeek,
    additionalMealPrepClients,
    burnoutRisk,
    burnoutFactors,
    recommendations,
  }
}

// ============================================
// Time Breakdown for Charts
// ============================================

export function computeTimeBreakdown(
  events: EventDataPoint[],
  lookbackDays: number,
): TimeBreakdown[] {
  const weeks = Math.max(1, lookbackDays / 7)
  const relevant = events.filter(
    (e) => e.status !== 'draft' && e.status !== 'cancelled'
  )

  const totalPrep = relevant.reduce((s, e) => s + (e.timePrepMinutes ?? 0), 0)
  const totalService = relevant.reduce((s, e) => s + (e.timeServiceMinutes ?? 0), 0)
  const totalTravel = relevant.reduce((s, e) => s + (e.timeTravelMinutes ?? 0), 0)
  const totalShopping = relevant.reduce((s, e) => s + (e.timeShoppingMinutes ?? 0), 0)
  const totalReset = relevant.reduce((s, e) => s + (e.timeResetMinutes ?? 0), 0)
  const totalCooking = totalPrep + totalService + totalReset
  const adminMinutes = totalCooking * ADMIN_OVERHEAD_PERCENT

  // For events with no time tracking, estimate
  const untracked = relevant.filter(
    (e) =>
      !e.timePrepMinutes &&
      !e.timeServiceMinutes &&
      !e.timeShoppingMinutes &&
      !e.timeTravelMinutes &&
      !e.timeResetMinutes
  )
  const untrackedServiceMinutes = untracked.length * DEFAULT_EVENT_HOURS * 60 * 0.5
  const untrackedPrepMinutes = untracked.length * DEFAULT_EVENT_HOURS * 60 * 0.3
  const untrackedOtherMinutes = untracked.length * DEFAULT_EVENT_HOURS * 60 * 0.2

  const breakdown: TimeBreakdown[] = [
    { category: 'Cooking & Service', minutes: Math.round((totalService + untrackedServiceMinutes) / weeks), color: '#8b5cf6' },
    { category: 'Prep', minutes: Math.round((totalPrep + untrackedPrepMinutes) / weeks), color: '#06b6d4' },
    { category: 'Shopping', minutes: Math.round((totalShopping + untrackedOtherMinutes * 0.5) / weeks), color: '#f59e0b' },
    { category: 'Travel', minutes: Math.round((totalTravel + untrackedOtherMinutes * 0.3) / weeks), color: '#10b981' },
    { category: 'Reset & Cleanup', minutes: Math.round(totalReset / weeks), color: '#ef4444' },
    { category: 'Admin', minutes: Math.round(adminMinutes / weeks), color: '#64748b' },
  ].filter((b) => b.minutes > 0)

  return breakdown
}

// ============================================
// Weekly Trend
// ============================================

export function computeWeeklyTrend(
  events: EventDataPoint[],
  weeklyHoursAvailable: number | null,
  weeks: number,
): CapacityTrendWeek[] {
  const available = weeklyHoursAvailable ?? DEFAULT_WEEKLY_HOURS
  const now = new Date()
  const trend: CapacityTrendWeek[] = []

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - w * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const weekEvents = events.filter((e) => {
      if (e.status === 'draft' || e.status === 'cancelled') return false
      return e.eventDate >= weekStartStr && e.eventDate <= weekEndStr
    })

    const minutes = weekEvents.reduce((sum, e) => {
      const prep = e.timePrepMinutes ?? 0
      const service = e.timeServiceMinutes ?? 0
      const travel = e.timeTravelMinutes ?? 0
      const shopping = e.timeShoppingMinutes ?? 0
      const reset = e.timeResetMinutes ?? 0
      if (prep === 0 && service === 0 && travel === 0 && shopping === 0 && reset === 0) {
        return sum + DEFAULT_EVENT_HOURS * 60
      }
      return sum + prep + service + travel + shopping + reset
    }, 0)

    // Add admin overhead
    const totalMinutes = minutes * (1 + ADMIN_OVERHEAD_PERCENT)
    const hoursUsed = Math.round((totalMinutes / 60) * 10) / 10

    trend.push({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      hoursUsed,
      hoursAvailable: available,
      utilizationPercent: Math.min(100, Math.round((hoursUsed / available) * 100)),
      eventCount: weekEvents.length,
    })
  }

  return trend
}

// ============================================
// Scenario Planning
// ============================================

export function simulateAdditionalLoad(
  baseAnalysis: CapacityAnalysis,
  additionalMealPrepClients: number,
  additionalOneOffEvents: number,
): CapacityAnalysis {
  const addedMealPrepHours = additionalMealPrepClients * DEFAULT_MEAL_PREP_HOURS
  const avgEventHours = baseAnalysis.weeklyHoursUsed > 0 && (baseAnalysis.commitments.averageOneOffPerWeek + baseAnalysis.commitments.recurringWeekly) > 0
    ? baseAnalysis.weeklyHoursUsed / (baseAnalysis.commitments.averageOneOffPerWeek + baseAnalysis.commitments.recurringWeekly)
    : DEFAULT_EVENT_HOURS
  const addedEventHours = additionalOneOffEvents * avgEventHours

  const newWeeklyUsed = baseAnalysis.weeklyHoursUsed + addedMealPrepHours + addedEventHours
  const newRemaining = Math.max(0, baseAnalysis.weeklyHoursAvailable - newWeeklyUsed)
  const newUtilization = Math.min(100, Math.round((newWeeklyUsed / baseAnalysis.weeklyHoursAvailable) * 100))

  const { burnoutRisk, burnoutFactors } = computeBurnoutFromUtilization(newUtilization, baseAnalysis.burnoutFactors)

  return {
    ...baseAnalysis,
    weeklyHoursUsed: Math.round(newWeeklyUsed * 10) / 10,
    weeklyHoursRemaining: Math.round(newRemaining * 10) / 10,
    utilizationPercent: newUtilization,
    commitments: {
      ...baseAnalysis.commitments,
      recurringWeekly: baseAnalysis.commitments.recurringWeekly + additionalMealPrepClients,
      averageOneOffPerWeek: baseAnalysis.commitments.averageOneOffPerWeek + additionalOneOffEvents,
    },
    canTakeMore: newRemaining >= avgEventHours,
    additionalEventsPerWeek: avgEventHours > 0 ? Math.floor(newRemaining / avgEventHours) : 0,
    additionalMealPrepClients: Math.floor(newRemaining / DEFAULT_MEAL_PREP_HOURS),
    burnoutRisk,
    burnoutFactors,
    recommendations: generateRecommendationsFromUtilization(newUtilization, burnoutFactors),
  }
}

// ============================================
// Day Heatmap
// ============================================

export interface DayHeatmapEntry {
  date: string
  eventCount: number
  totalMinutes: number
  intensity: 'free' | 'light' | 'moderate' | 'busy' | 'overloaded'
}

export function computeDayHeatmap(
  events: EventDataPoint[],
  lookbackDays: number,
): DayHeatmapEntry[] {
  const now = new Date()
  const entries: DayHeatmapEntry[] = []
  const eventsByDate = new Map<string, EventDataPoint[]>()

  const relevant = events.filter(
    (e) => e.status !== 'draft' && e.status !== 'cancelled'
  )

  for (const e of relevant) {
    const existing = eventsByDate.get(e.eventDate) ?? []
    existing.push(e)
    eventsByDate.set(e.eventDate, existing)
  }

  for (let d = lookbackDays - 1; d >= 0; d--) {
    const date = new Date(now)
    date.setDate(date.getDate() - d)
    const dateStr = date.toISOString().split('T')[0]
    const dayEvents = eventsByDate.get(dateStr) ?? []

    const totalMinutes = dayEvents.reduce((sum, e) => {
      const prep = e.timePrepMinutes ?? 0
      const service = e.timeServiceMinutes ?? 0
      const travel = e.timeTravelMinutes ?? 0
      const shopping = e.timeShoppingMinutes ?? 0
      const reset = e.timeResetMinutes ?? 0
      if (prep === 0 && service === 0 && travel === 0 && shopping === 0 && reset === 0) {
        return sum + DEFAULT_EVENT_HOURS * 60
      }
      return sum + prep + service + travel + shopping + reset
    }, 0)

    let intensity: DayHeatmapEntry['intensity'] = 'free'
    if (totalMinutes > 600) intensity = 'overloaded' // 10+ hours
    else if (totalMinutes > 420) intensity = 'busy' // 7+ hours
    else if (totalMinutes > 240) intensity = 'moderate' // 4+ hours
    else if (totalMinutes > 0) intensity = 'light'

    entries.push({
      date: dateStr,
      eventCount: dayEvents.length,
      totalMinutes,
      intensity,
    })
  }

  return entries
}

// ============================================
// Helpers
// ============================================

function countRecurringEvents(
  events: EventDataPoint[],
  recurringServices: RecurringServiceData[],
): number {
  // Estimate: if we have recurring services, some events are likely from those
  // Without a direct link, estimate based on frequency
  return Math.min(events.length, recurringServices.length * (events.length > 0 ? 1 : 0))
}

function computeBurnoutRisk(
  utilizationPercent: number,
  events: EventDataPoint[],
  _calendarBlocks: CalendarBlockData[],
  _weeks: number,
): { burnoutRisk: CapacityAnalysis['burnoutRisk']; burnoutFactors: string[] } {
  const factors: string[] = []

  // Check utilization
  if (utilizationPercent >= BURNOUT_HIGH_THRESHOLD) {
    factors.push(`Utilization at ${utilizationPercent}% (above ${BURNOUT_HIGH_THRESHOLD}% threshold)`)
  }

  // Check consecutive work days
  const relevantEvents = events.filter(
    (e) => e.status !== 'draft' && e.status !== 'cancelled'
  )
  const eventDates = new Set(relevantEvents.map((e) => e.eventDate))
  const sortedDates = Array.from(eventDates).sort()

  if (sortedDates.length > 1) {
    let maxConsecutive = 1
    let currentConsecutive = 1

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1])
      const curr = new Date(sortedDates[i])
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

      if (diffDays === 1) {
        currentConsecutive++
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
      } else {
        currentConsecutive = 1
      }
    }

    if (maxConsecutive >= MAX_HEALTHY_CONSECUTIVE_DAYS) {
      factors.push(`Worked ${maxConsecutive} consecutive days without a break`)
    }
  }

  // Check days per week
  const recentDates = sortedDates.slice(-14)
  if (recentDates.length > 0) {
    // Count unique days in last 2 weeks
    const uniqueDaysPerWeek = recentDates.length / 2
    if (uniqueDaysPerWeek >= MAX_HEALTHY_DAYS_PER_WEEK) {
      factors.push(`Working ${Math.round(uniqueDaysPerWeek)} days per week on average`)
    }
  }

  // Check no rest days in last 14 days
  if (sortedDates.length >= 14) {
    const last14 = sortedDates.slice(-14)
    const startDate = new Date(last14[0])
    const endDate = new Date(last14[last14.length - 1])
    const totalDays = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    if (last14.length >= totalDays - 1) {
      factors.push('No rest days in the last 14 days')
    }
  }

  let burnoutRisk: CapacityAnalysis['burnoutRisk'] = 'low'
  if (utilizationPercent >= BURNOUT_HIGH_THRESHOLD || factors.length >= 3) {
    burnoutRisk = 'high'
  } else if (utilizationPercent >= BURNOUT_MODERATE_THRESHOLD || factors.length >= 1) {
    burnoutRisk = 'moderate'
  }

  return { burnoutRisk, burnoutFactors: factors }
}

function computeBurnoutFromUtilization(
  newUtilization: number,
  existingFactors: string[],
): { burnoutRisk: CapacityAnalysis['burnoutRisk']; burnoutFactors: string[] } {
  const factors = [...existingFactors]

  if (newUtilization >= BURNOUT_HIGH_THRESHOLD) {
    if (!factors.some((f) => f.includes('Utilization'))) {
      factors.push(`Projected utilization at ${newUtilization}% (above ${BURNOUT_HIGH_THRESHOLD}% threshold)`)
    }
  }

  let burnoutRisk: CapacityAnalysis['burnoutRisk'] = 'low'
  if (newUtilization >= BURNOUT_HIGH_THRESHOLD || factors.length >= 3) {
    burnoutRisk = 'high'
  } else if (newUtilization >= BURNOUT_MODERATE_THRESHOLD || factors.length >= 1) {
    burnoutRisk = 'moderate'
  }

  return { burnoutRisk, burnoutFactors: factors }
}

function generateRecommendations(
  utilizationPercent: number,
  burnoutFactors: string[],
  travelHoursPerWeek: number,
  weeklyHoursUsed: number,
  weeklyHoursAvailable: number,
  additionalEventsPerWeek: number,
  averageOneOffPerWeek: number,
  recurringWeekly: number,
  events: EventDataPoint[],
): string[] {
  const recs: string[] = []

  if (additionalEventsPerWeek > 0 && utilizationPercent < BURNOUT_HIGH_THRESHOLD) {
    recs.push(`You could take on ${additionalEventsPerWeek} more event${additionalEventsPerWeek === 1 ? '' : 's'} per week based on your current schedule.`)
  }

  if (utilizationPercent < 40) {
    recs.push('You have significant open capacity. Consider reaching out to past clients or adding recurring meal prep services.')
  }

  if (travelHoursPerWeek > weeklyHoursUsed * 0.15 && travelHoursPerWeek > 2) {
    recs.push(`Travel takes ${Math.round(travelHoursPerWeek)} hours/week (${Math.round((travelHoursPerWeek / weeklyHoursUsed) * 100)}% of your time). Consider prioritizing clients closer to home.`)
  }

  // Find busiest day of week
  const dayCountMap = new Map<number, { count: number; minutes: number }>()
  const relevant = events.filter(
    (e) => e.status !== 'draft' && e.status !== 'cancelled'
  )
  for (const e of relevant) {
    const dow = new Date(e.eventDate).getDay()
    const existing = dayCountMap.get(dow) ?? { count: 0, minutes: 0 }
    existing.count++
    const mins =
      (e.timePrepMinutes ?? 0) +
      (e.timeServiceMinutes ?? 0) +
      (e.timeTravelMinutes ?? 0) +
      (e.timeShoppingMinutes ?? 0) +
      (e.timeResetMinutes ?? 0) || DEFAULT_EVENT_HOURS * 60
    existing.minutes += mins
    dayCountMap.set(dow, existing)
  }

  if (dayCountMap.size > 0) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    let busiestDay = 0
    let busiestMinutes = 0
    for (const [dow, data] of dayCountMap) {
      if (data.minutes > busiestMinutes) {
        busiestDay = dow
        busiestMinutes = data.minutes
      }
    }
    const avgBusiest = Math.round(busiestMinutes / Math.max(1, dayCountMap.get(busiestDay)!.count) / 60)
    if (avgBusiest > 8) {
      recs.push(`Your busiest day is ${dayNames[busiestDay]} (avg ${avgBusiest} hrs). Consider spreading events more evenly.`)
    }
  }

  // Burnout-specific recommendations
  for (const factor of burnoutFactors) {
    if (factor.includes('consecutive days')) {
      recs.push('Schedule at least one rest day per week to prevent burnout.')
    }
    if (factor.includes('No rest days')) {
      recs.push('You have not had a day off recently. Block off some personal time on your calendar.')
    }
  }

  if (utilizationPercent >= BURNOUT_HIGH_THRESHOLD) {
    recs.push('Your schedule is very full. Consider raising your rates or being more selective with bookings.')
  }

  if (recurringWeekly > 0 && averageOneOffPerWeek > recurringWeekly * 2) {
    recs.push('Most of your work is one-off events. Converting some to recurring clients would make your schedule more predictable.')
  }

  return recs
}

function generateRecommendationsFromUtilization(
  utilization: number,
  burnoutFactors: string[],
): string[] {
  const recs: string[] = []

  if (utilization >= BURNOUT_HIGH_THRESHOLD) {
    recs.push('This scenario would push you into a high burnout risk zone. Consider if the additional revenue justifies the workload.')
  } else if (utilization >= BURNOUT_MODERATE_THRESHOLD) {
    recs.push('This scenario brings you to moderate utilization. Manageable, but watch for fatigue.')
  } else {
    recs.push('This workload level is sustainable. You would still have buffer for unexpected bookings.')
  }

  for (const factor of burnoutFactors) {
    if (factor.includes('consecutive')) {
      recs.push('Your existing consecutive work pattern compounds the risk. Ensure rest days are protected.')
    }
  }

  return recs
}

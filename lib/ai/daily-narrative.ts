// AI Daily Report Narrative Generator
// Transforms structured daily report data into a conversational morning briefing.
// Non-blocking: callers wrap this in a safe() fallback.

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'
import type { DailyReportContent } from '@/lib/reports/types'

const NarrativeSchema = z.object({
  narrative: z.string(),
})

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm
}

function listItems(items: string[], limit = 4): string {
  const visible = items.slice(0, limit)
  const remaining = items.length - visible.length
  return remaining > 0 ? `${visible.join('; ')}; plus ${remaining} more` : visible.join('; ')
}

function formatEvent(event: DailyReportContent['eventsToday'][number]): string {
  const occasion = event.occasion?.trim() || 'Event'
  const guestCount =
    event.guestCount === null
      ? 'guest count TBD'
      : `${event.guestCount} ${plural(event.guestCount, 'guest')}`
  const serveTime = event.serveTime?.trim() || 'time TBD'
  return `${occasion} for ${event.clientName}, ${guestCount}, ${serveTime}, status ${event.status}`
}

function formatSignedPercent(value: number): string {
  if (value > 0) return `up ${value}% vs last month`
  if (value < 0) return `down ${Math.abs(value)}% vs last month`
  return 'flat vs last month'
}

function formatHours(hours: number | null): string {
  if (hours === null) return 'no response time average available'
  return `${hours} ${plural(hours, 'hour')} average response time`
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

function summarizeEventsToday(data: DailyReportContent): string {
  if (data.eventsToday.length === 0) {
    return 'Events today: No events are scheduled today, so the calendar has room for prep, admin, or follow-up work.'
  }

  return `Events today: ${data.eventsToday.length} ${plural(data.eventsToday.length, 'event')} on the calendar. ${listItems(data.eventsToday.map(formatEvent), 5)}.`
}

function summarizeUpcomingEvents(data: DailyReportContent): string {
  const conflictSummary =
    data.scheduleConflicts.length === 0
      ? 'No multi-event days are flagged in the next 30 days.'
      : `Schedule pressure is showing on ${listItems(
          data.scheduleConflicts.map(
            (conflict) =>
              `${conflict.date} with ${conflict.eventCount} ${plural(conflict.eventCount, 'event')}`
          ),
          3
        )}.`

  return `Upcoming events: ${data.upcomingEventsNext7d} ${plural(data.upcomingEventsNext7d, 'event')} in the next 7 days. ${conflictSummary}`
}

function summarizeRevenue(data: DailyReportContent): string {
  return `Revenue: ${formatCents(data.paymentsReceivedTodayCents)} received today, ${formatCents(data.monthRevenueToDateCents)} month to date, ${formatSignedPercent(data.monthOverMonthChangePercent)}. Outstanding balance is ${formatCents(data.outstandingBalanceCents)}. Weighted pipeline forecast is ${formatCents(data.pipelineForecastCents)}.`
}

function summarizePipelineHealth(data: DailyReportContent): string {
  const inquiryStats = Object.entries(data.inquiryStats)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${count} ${formatStatusLabel(status)}`)

  const queueSummary =
    inquiryStats.length === 0
      ? 'No active inquiry status counts are present.'
      : `Inquiry queue has ${inquiryStats.join(', ')}.`

  const expiringQuotes =
    data.expiringQuoteDetails.length === 0
      ? `${data.quotesExpiringSoon} ${plural(data.quotesExpiringSoon, 'quote')} expire this week.`
      : `${data.quotesExpiringSoon} ${plural(data.quotesExpiringSoon, 'quote')} expire this week: ${listItems(
          data.expiringQuoteDetails.map(
            (quote) =>
              `${quote.clientName}, ${formatCents(quote.amountCents)}, valid until ${quote.validUntil}`
          ),
          3
        )}.`

  return `Pipeline health: ${data.newInquiriesToday} new ${plural(data.newInquiriesToday, 'inquiry', 'inquiries')} today. ${queueSummary} ${data.staleFollowUps} stale ${plural(data.staleFollowUps, 'follow-up')} need attention. ${expiringQuotes} ${data.overdueResponses} ${plural(data.overdueResponses, 'response')} are overdue by more than 24 hours.`
}

function summarizeOperations(data: DailyReportContent): string {
  const foodCost =
    data.foodCostAvgPercent === null
      ? 'Food cost average is not available in this report.'
      : `Food cost average is ${data.foodCostAvgPercent}% and trending ${data.foodCostTrending}.`

  return `Operations metrics: ${formatHours(data.avgResponseTimeHours)}. ${foodCost} Closure streak is ${data.closureStreak}, longest streak is ${data.longestStreak}, and ${data.openClosureTasks} ${plural(data.openClosureTasks, 'completed event has', 'completed events have')} open closure tasks.`
}

function summarizeClientSignals(data: DailyReportContent): string {
  const highIntent =
    data.highIntentVisits.length === 0
      ? 'No high-intent client visits were captured yesterday.'
      : `High-intent activity: ${listItems(
          data.highIntentVisits.map(
            (visit) => `${visit.clientName} ${formatStatusLabel(visit.eventType)} at ${visit.time}`
          ),
          4
        )}.`

  const milestones =
    data.upcomingMilestones.length === 0
      ? 'No client milestones are due in the next 14 days.'
      : `Upcoming milestones: ${listItems(
          data.upcomingMilestones.map((milestone) => `${milestone.clientName}, ${milestone.label}`),
          4
        )}.`

  const dormantClients =
    data.dormantClients.length === 0
      ? 'No dormant clients are flagged.'
      : `Dormant clients: ${listItems(
          data.dormantClients.map(
            (client) => `${client.clientName}, ${client.daysSinceLastEvent} days since last event`
          ),
          4
        )}.`

  return `Client signals: ${data.clientLoginsYesterday} client ${plural(data.clientLoginsYesterday, 'login')} yesterday. ${highIntent} ${milestones} ${dormantClients}`
}

function summarizePriorityActions(data: DailyReportContent): string {
  if (data.nextBestActions.length === 0) {
    return 'Priority actions: No next best actions are queued in this report.'
  }

  return `Priority actions: ${listItems(
    data.nextBestActions.map(
      (action) =>
        `${action.urgency} urgency, ${action.label} for ${action.clientName}: ${action.description}`
    ),
    5
  )}.`
}

function buildDataSummary(data: DailyReportContent): string {
  return [
    summarizeEventsToday(data),
    summarizeUpcomingEvents(data),
    summarizeRevenue(data),
    summarizePipelineHealth(data),
    summarizeOperations(data),
    summarizeClientSignals(data),
    summarizePriorityActions(data),
  ].join('\n\n')
}

function bold(value: string): string {
  return `**${value}**`
}

function bulletEvents(data: DailyReportContent): string {
  if (data.eventsToday.length === 0) {
    return `${bold('No events')} are scheduled today, leaving room for prep, admin, or follow-up.`
  }

  const eventWord = plural(data.eventsToday.length, 'event')
  const firstEvent = data.eventsToday[0]
  const firstEventSummary = formatEvent(firstEvent)
  const remaining = data.eventsToday.length - 1

  return remaining > 0
    ? `${bold(`${data.eventsToday.length} ${eventWord}`)} are scheduled today, starting with ${firstEventSummary}, plus ${remaining} more.`
    : `${bold('1 event')} is scheduled today: ${firstEventSummary}.`
}

function bulletRevenue(data: DailyReportContent): string {
  return `${bold(formatCents(data.paymentsReceivedTodayCents))} came in today, with ${bold(formatCents(data.monthRevenueToDateCents))} month to date and ${formatSignedPercent(data.monthOverMonthChangePercent)}.`
}

function bulletPipeline(data: DailyReportContent): string {
  const quoteText =
    data.quotesExpiringSoon > 0
      ? `${data.quotesExpiringSoon} ${plural(data.quotesExpiringSoon, 'quote')} expiring soon`
      : 'no quotes expiring soon'

  return `${bold(`${data.newInquiriesToday} new ${plural(data.newInquiriesToday, 'inquiry', 'inquiries')}`)} arrived today, with ${quoteText} and ${data.staleFollowUps} stale ${plural(data.staleFollowUps, 'follow-up')} to clear.`
}

function bulletOperations(data: DailyReportContent): string {
  const foodCost =
    data.foodCostAvgPercent === null
      ? 'food cost trend unavailable'
      : `${bold(`${data.foodCostAvgPercent}% food cost`)} trending ${data.foodCostTrending}`

  return `${bold(formatHours(data.avgResponseTimeHours))} is the current response signal, with ${foodCost} and ${data.openClosureTasks} open closure ${plural(data.openClosureTasks, 'task')}.`
}

function bulletClientSignals(data: DailyReportContent): string {
  const signalCount =
    data.highIntentVisits.length + data.upcomingMilestones.length + data.dormantClients.length

  if (signalCount === 0) {
    return `${bold('No client signals')} need immediate follow-up from yesterday's activity.`
  }

  return `${bold(`${signalCount} client ${plural(signalCount, 'signal')}`)} need review across high-intent visits, milestones, and dormant client follow-up.`
}

export function generateDailyNarrativeBullets(data: DailyReportContent): string[] {
  return [
    bulletEvents(data),
    bulletRevenue(data),
    bulletPipeline(data),
    bulletOperations(data),
    bulletClientSignals(data),
  ]
}

function stripEmDashes(text: string): string {
  return text.replace(/\u2014/g, ' - ').trim()
}

export async function generateDailyNarrative(data: DailyReportContent): Promise<string> {
  const summary = buildDataSummary(data)

  const result = await parseWithOllama(
    `You are a business intelligence assistant for a private chef. Write one natural morning briefing in 150-250 words from the data below. Be conversational, specific, and actionable. Cover today's events, upcoming events, revenue, pipeline health, operations metrics, client signals, and priority actions. Lead with the most important thing for the chef to know this morning. Mention client names only when they appear in the data. Do not invent facts, amounts, dates, or client details. Do not generate recipes, menus, or cooking suggestions. Never use em dashes. Return JSON: {"narrative": "..."}`,
    summary,
    NarrativeSchema,
    { modelTier: 'fast', maxTokens: 500, timeoutMs: 10000 }
  )

  return stripEmDashes(result.narrative)
}

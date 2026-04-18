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

function buildDataSummary(data: DailyReportContent): string {
  const lines: string[] = []

  // Schedule
  if (data.eventsToday.length > 0) {
    lines.push(
      `Events today: ${data.eventsToday.map((e) => `${e.occasion || 'Event'} for ${e.clientName} (${e.guestCount ?? '?'} guests, ${e.serveTime || 'time TBD'})`).join('; ')}`
    )
  } else {
    lines.push('No events scheduled today.')
  }
  lines.push(`${data.upcomingEventsNext7d} events in the next 7 days.`)

  // Revenue
  lines.push(
    `Revenue today: ${formatCents(data.paymentsReceivedTodayCents)}. MTD: ${formatCents(data.monthRevenueToDateCents)} (${data.monthOverMonthChangePercent > 0 ? '+' : ''}${data.monthOverMonthChangePercent}% vs last month).`
  )
  if (data.outstandingBalanceCents > 0) {
    lines.push(`Outstanding balance: ${formatCents(data.outstandingBalanceCents)}.`)
  }

  // Pipeline
  lines.push(
    `New inquiries today: ${data.newInquiriesToday}. Unread: ${data.inquiryStats['new'] || 0}. Awaiting your response: ${data.inquiryStats['awaiting_chef'] || 0}.`
  )
  if (data.staleFollowUps > 0) lines.push(`${data.staleFollowUps} stale follow-ups need attention.`)
  if (data.quotesExpiringSoon > 0)
    lines.push(`${data.quotesExpiringSoon} quotes expiring this week.`)
  if (data.overdueResponses > 0)
    lines.push(`${data.overdueResponses} inquiry responses overdue (>24h).`)

  // Operations
  if (data.foodCostAvgPercent !== null) {
    lines.push(`Food cost avg: ${data.foodCostAvgPercent}% (${data.foodCostTrending}).`)
  }
  if (data.openClosureTasks > 0)
    lines.push(`${data.openClosureTasks} events with open closure tasks.`)

  // Client signals
  if (data.highIntentVisits.length > 0) {
    lines.push(
      `High-intent: ${data.highIntentVisits.map((v) => `${v.clientName} (${v.eventType.replace(/_/g, ' ')})`).join(', ')}.`
    )
  }
  if (data.upcomingMilestones.length > 0) {
    lines.push(
      `Milestones: ${data.upcomingMilestones.map((m) => `${m.clientName} ${m.label}`).join(', ')}.`
    )
  }
  if (data.dormantClients.length > 0) {
    lines.push(
      `Dormant clients: ${data.dormantClients.map((c) => `${c.clientName} (${c.daysSinceLastEvent}d)`).join(', ')}.`
    )
  }
  if (data.scheduleConflicts.length > 0) {
    lines.push(
      `Schedule conflicts: ${data.scheduleConflicts.map((c) => `${c.date} (${c.eventCount} events)`).join(', ')}.`
    )
  }

  // Actions
  if (data.nextBestActions.length > 0) {
    lines.push(
      `Priority actions: ${data.nextBestActions.map((a) => `${a.label} - ${a.clientName}`).join('; ')}.`
    )
  }

  return lines.join('\n')
}

export async function generateDailyNarrative(data: DailyReportContent): Promise<string> {
  const summary = buildDataSummary(data)

  const result = await parseWithOllama(
    `You are a business intelligence assistant for a private chef. Write a 3-4 sentence morning briefing narrative from the data below. Be conversational, warm, and actionable. Highlight the most important thing first (urgent items, revenue milestones, or schedule). Mention client names when relevant. Never use em dashes. Return JSON: {"narrative": "..."}`,
    summary,
    NarrativeSchema,
    { modelTier: 'fast', maxTokens: 300, timeoutMs: 10000 }
  )

  return result.narrative
}

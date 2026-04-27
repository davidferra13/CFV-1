'use server'

// Birthday & Anniversary Alerts
// Scans personal_milestones for clients with upcoming birthdays or anniversaries
// within the next 14 days. Returns a sorted list for the dashboard widget.
// The personal_milestones field is a free-text string, so we look for patterns like:
//   "birthday: January 15", "anniversary: March 3", "born: 12/4", etc.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { addDays, format } from 'date-fns'

type UpcomingMilestone = {
  clientId: string
  clientName: string
  type: 'birthday' | 'anniversary' | 'milestone'
  label: string // Birthday, Wedding Anniversary, or custom label
  date: string // ISO date of next occurrence (this year or next)
  daysUntil: number // 0 = today, 1 = tomorrow, …
  noteText: string // original milestone text for display
}

// ─── Month name mapping ───────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
}

function parseMilestoneDate(text: string): { month: number; day: number } | null {
  // Try ISO format: 1985-04-23 or 04-23
  const isoFull = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoFull) return { month: parseInt(isoFull[2]), day: parseInt(isoFull[3]) }

  const isoShort = text.match(/(\d{1,2})-(\d{1,2})/)
  if (isoShort) return { month: parseInt(isoShort[1]), day: parseInt(isoShort[2]) }

  // "Month DD" or "DD Month"
  const monthWord = text.toLowerCase().match(/([a-z]+)\s+(\d{1,2})/)
  if (monthWord) {
    const m = MONTH_NAMES[monthWord[1]]
    if (m) return { month: m, day: parseInt(monthWord[2]) }
  }
  const dayMonth = text.toLowerCase().match(/(\d{1,2})\s+([a-z]+)/)
  if (dayMonth) {
    const m = MONTH_NAMES[dayMonth[2]]
    if (m) return { month: m, day: parseInt(dayMonth[1]) }
  }

  // MM/DD or M/D
  const slashDate = text.match(/(\d{1,2})\/(\d{1,2})/)
  if (slashDate) return { month: parseInt(slashDate[1]), day: parseInt(slashDate[2]) }

  return null
}

function nextOccurrence(month: number, day: number, today: Date): Date {
  const thisYear = new Date(today.getFullYear(), month - 1, day)
  if (thisYear >= today) return thisYear
  return new Date(today.getFullYear() + 1, month - 1, day)
}

/**
 * Get clients with birthdays or anniversaries within the next `lookaheadDays` days.
 * Parses personal_milestones as free-form text and extracts date patterns.
 */
export async function getUpcomingMilestones(lookaheadDays = 14): Promise<UpcomingMilestone[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, birthday, anniversary, personal_milestones')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizon = addDays(today, lookaheadDays)

  const results: UpcomingMilestone[] = []

  for (const client of clients ?? []) {
    if (client.birthday) {
      const birthday = new Date(client.birthday)
      const next = nextOccurrence(birthday.getMonth() + 1, birthday.getDate(), today)
      if (next <= horizon) {
        results.push({
          clientId: client.id,
          clientName: client.full_name,
          type: 'birthday',
          label: 'Birthday',
          date: format(next, 'yyyy-MM-dd'),
          daysUntil: Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
          noteText: 'Birthday',
        })
      }
    }

    if (client.anniversary) {
      const anniversary = new Date(client.anniversary)
      const next = nextOccurrence(anniversary.getMonth() + 1, anniversary.getDate(), today)
      if (next <= horizon) {
        results.push({
          clientId: client.id,
          clientName: client.full_name,
          type: 'anniversary',
          label: 'Anniversary',
          date: format(next, 'yyyy-MM-dd'),
          daysUntil: Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
          noteText: 'Anniversary',
        })
      }
    }

    const milestones = (client.personal_milestones as string | null) ?? ''
    if (!milestones.trim()) continue

    // Split into lines/segments
    const lines = milestones
      .split(/[;\n,]/)
      .map((l) => l.trim())
      .filter(Boolean)

    for (const line of lines) {
      const lower = line.toLowerCase()

      // Detect type
      let type: UpcomingMilestone['type'] = 'milestone'
      let label = 'Milestone'
      if (lower.includes('birthday') || lower.includes('born') || lower.includes('bday')) {
        type = 'birthday'
        label = 'Birthday'
      } else if (
        lower.includes('anniversary') ||
        lower.includes('wedding') ||
        lower.includes('married')
      ) {
        type = 'anniversary'
        label = lower.includes('wedding') ? 'Wedding Anniversary' : 'Anniversary'
      }

      if (type === 'birthday' && client.birthday) continue
      if (type === 'anniversary' && client.anniversary) continue

      const parsed = parseMilestoneDate(line)
      if (!parsed) continue

      const next = nextOccurrence(parsed.month, parsed.day, today)
      if (next > horizon) continue

      const daysUntil = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      results.push({
        clientId: client.id,
        clientName: client.full_name,
        type,
        label,
        date: format(next, 'yyyy-MM-dd'),
        daysUntil,
        noteText: line,
      })
    }
  }

  // Sort by days until
  results.sort((a, b) => a.daysUntil - b.daysUntil)
  return results.slice(0, 10)
}

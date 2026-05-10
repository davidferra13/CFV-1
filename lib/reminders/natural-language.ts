// Natural language reminder parser
// Pure utility, runs client-side. No server directives.

import type { RecurringRule, ReminderCategory } from './types'

export type ParsedReminder = {
  text: string
  due_date?: string // YYYY-MM-DD
  due_time?: string // HH:MM
  recurring_rule?: RecurringRule
  category?: ReminderCategory
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAY_ABBREVS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]
const MONTH_ABBREVS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]

// Category keyword mapping
const CATEGORY_KEYWORDS: { pattern: RegExp; category: ReminderCategory }[] = [
  { pattern: /\b(prep|mise en place|prepping)\b/i, category: 'prep' },
  { pattern: /\b(shop|buy|grocery|groceries|pick up|store)\b/i, category: 'shopping' },
  {
    pattern: /\b(call|email|follow up|follow-up|reach out|text|message|contact)\b/i,
    category: 'follow_up',
  },
  { pattern: /\b(client|customer|guest)\b/i, category: 'client' },
  { pattern: /\b(invoice|billing|tax|receipt|paperwork|contract|admin)\b/i, category: 'admin' },
  { pattern: /\b(personal|dentist|doctor|gym|laundry)\b/i, category: 'personal' },
]

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function getNextDayOfWeek(dayIndex: number): Date {
  const now = new Date()
  const current = now.getDay()
  let diff = dayIndex - current
  if (diff <= 0) diff += 7
  const target = new Date(now)
  target.setDate(target.getDate() + diff)
  return target
}

function parseTimeString(raw: string): string | null {
  // Patterns: 3pm, 3:00pm, 3:00 PM, 15:00
  const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!match) return null

  let hour = parseInt(match[1])
  const minute = match[2] ? parseInt(match[2]) : 0
  const meridiem = match[3]?.toLowerCase()

  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

  return `${pad2(hour)}:${pad2(minute)}`
}

function extractTime(input: string): { time: string | null; cleaned: string } {
  // "at 3pm", "at 3:00 PM", "at 15:00"
  const atTimeRe = /\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i
  const match = input.match(atTimeRe)
  if (match) {
    const time = parseTimeString(match[1])
    if (time) {
      return { time, cleaned: input.replace(match[0], '').trim() }
    }
  }

  // Standalone time: "3pm", "15:00" (only if clearly a time, not a number in context)
  const standaloneRe = /\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\b/i
  const standaloneMatch = input.match(standaloneRe)
  if (standaloneMatch) {
    const time = parseTimeString(standaloneMatch[1])
    if (time) {
      return { time, cleaned: input.replace(standaloneMatch[0], '').trim() }
    }
  }

  return { time: null, cleaned: input }
}

function extractRecurring(input: string): { rule: RecurringRule | null; cleaned: string } {
  // "every day" or "daily"
  const dailyRe = /\b(every\s+day|daily)\b/i
  if (dailyRe.test(input)) {
    return {
      rule: { frequency: 'daily' },
      cleaned: input.replace(dailyRe, '').trim(),
    }
  }

  // "every Monday", "every Mon and Wed", "every Monday, Wednesday, Friday"
  const everyDaysRe =
    /\bevery\s+((?:(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)(?:\s*(?:,|and)\s*)?)+)\b/i
  const everyDaysMatch = input.match(everyDaysRe)
  if (everyDaysMatch) {
    const dayStr = everyDaysMatch[1].toLowerCase()
    const days: number[] = []
    for (let i = 0; i < DAY_NAMES.length; i++) {
      if (dayStr.includes(DAY_NAMES[i]) || dayStr.includes(DAY_ABBREVS[i])) {
        days.push(i)
      }
    }
    if (days.length > 0) {
      return {
        rule: { frequency: 'weekly', days_of_week: days },
        cleaned: input.replace(everyDaysMatch[0], '').trim(),
      }
    }
  }

  // "weekly"
  const weeklyRe = /\bweekly\b/i
  if (weeklyRe.test(input)) {
    const today = new Date().getDay()
    return {
      rule: { frequency: 'weekly', days_of_week: [today] },
      cleaned: input.replace(weeklyRe, '').trim(),
    }
  }

  // "monthly" or "every month"
  const monthlyRe = /\b(monthly|every\s+month)\b/i
  if (monthlyRe.test(input)) {
    const today = new Date().getDate()
    return {
      rule: { frequency: 'monthly', day_of_month: today },
      cleaned: input.replace(monthlyRe, '').trim(),
    }
  }

  return { rule: null, cleaned: input }
}

function extractDate(input: string): { date: string | null; cleaned: string } {
  const now = new Date()

  // "today"
  if (/\btoday\b/i.test(input)) {
    return {
      date: formatDate(now),
      cleaned: input.replace(/\btoday\b/i, '').trim(),
    }
  }

  // "tomorrow"
  if (/\btomorrow\b/i.test(input)) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return {
      date: formatDate(d),
      cleaned: input.replace(/\btomorrow\b/i, '').trim(),
    }
  }

  // Day names: "Thursday", "next Monday"
  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayRe = new RegExp(`\\b(?:next\\s+)?(?:${DAY_NAMES[i]}|${DAY_ABBREVS[i]})\\b`, 'i')
    if (dayRe.test(input)) {
      return {
        date: formatDate(getNextDayOfWeek(i)),
        cleaned: input.replace(dayRe, '').trim(),
      }
    }
  }

  // "April 15" or "April 15th" or "Apr 15"
  for (let m = 0; m < MONTH_NAMES.length; m++) {
    const monthRe = new RegExp(
      `\\b(${MONTH_NAMES[m]}|${MONTH_ABBREVS[m]})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`,
      'i'
    )
    const match = input.match(monthRe)
    if (match) {
      const year = match[3] ? parseInt(match[3]) : now.getFullYear()
      const day = parseInt(match[2])
      if (day >= 1 && day <= 31) {
        const d = new Date(year, m, day)
        return {
          date: formatDate(d),
          cleaned: input.replace(match[0], '').trim(),
        }
      }
    }
  }

  // Numeric dates: "4/15", "4/15/2026"
  const numDateRe = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/
  const numMatch = input.match(numDateRe)
  if (numMatch) {
    const month = parseInt(numMatch[1]) - 1
    const day = parseInt(numMatch[2])
    let year = numMatch[3] ? parseInt(numMatch[3]) : now.getFullYear()
    if (year < 100) year += 2000
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day)
      return {
        date: formatDate(d),
        cleaned: input.replace(numMatch[0], '').trim(),
      }
    }
  }

  // ISO format: "2026-04-15"
  const isoRe = /\b(\d{4}-\d{2}-\d{2})\b/
  const isoMatch = input.match(isoRe)
  if (isoMatch) {
    return {
      date: isoMatch[1],
      cleaned: input.replace(isoMatch[0], '').trim(),
    }
  }

  return { date: null, cleaned: input }
}

function inferCategory(text: string): ReminderCategory | undefined {
  for (const { pattern, category } of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) {
      return category
    }
  }
  return undefined
}

function cleanText(text: string): string {
  // Strip common prefixes
  let cleaned = text
    .replace(/^remind\s+me\s+to\s+/i, '')
    .replace(/^reminder:\s*/i, '')
    .replace(/^todo:\s*/i, '')
    .replace(/^r:\s*/i, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Remove leading/trailing punctuation artifacts
  cleaned = cleaned.replace(/^[\s,\-:]+/, '').replace(/[\s,\-:]+$/, '')

  return cleaned
}

export function parseNaturalLanguageReminder(input: string): ParsedReminder {
  if (!input.trim()) {
    return { text: '' }
  }

  let working = input.trim()

  // Strip prefix first
  working = working
    .replace(/^remind\s+me\s+to\s+/i, '')
    .replace(/^reminder:\s*/i, '')
    .replace(/^todo:\s*/i, '')
    .replace(/^r:\s*/i, '')
    .trim()

  // Extract structured data (order matters: recurring before date)
  const recurringResult = extractRecurring(working)
  working = recurringResult.cleaned

  const timeResult = extractTime(working)
  working = timeResult.cleaned

  const dateResult = extractDate(working)
  working = dateResult.cleaned

  // Infer category from the original text
  const category = inferCategory(input)

  // Clean remaining text
  const text = cleanText(working)

  const result: ParsedReminder = { text: text || input.trim() }

  if (dateResult.date) result.due_date = dateResult.date
  if (timeResult.time) result.due_time = timeResult.time
  if (recurringResult.rule) result.recurring_rule = recurringResult.rule
  if (category) result.category = category

  return result
}

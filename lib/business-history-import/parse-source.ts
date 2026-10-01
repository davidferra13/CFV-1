import type { HistoricalInquiryFields } from './persist-inquiry'

function sourceTime(value: string | Date | null): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString()
  if (typeof value !== 'string') throw new Error('Historical source date is missing')
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (
    !parts ||
    !validDate(parts[1], parts[2], parts[3]) ||
    Number(parts[4]) > 23 ||
    Number(parts[5]) > 59 ||
    Number(parts[6]) > 59 ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error('Historical source date is invalid')
  }
  return new Date(value).toISOString()
}

function validDate(year: string, month: string, day: string): boolean {
  const y = Number(year),
    m = Number(month),
    d = Number(day)
  return m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Historical imports use only explicit source facts; uncertain details remain in the original message. */
export function parseHistoricalInquirySource(source: {
  fromAddress: string
  receivedAt: string | Date | null
  bodyPreview: string | null
}): {
  fields: HistoricalInquiryFields
  clientLead: { email: string; fullName: string | null } | null
  warnings: string[]
} {
  const firstContactAt = sourceTime(source.receivedAt)
  const body = source.bodyPreview ?? ''
  const warnings: string[] = []
  const envelope = /^\s*(.*?)\s*<([^<>]+)>\s*$/.exec(source.fromAddress)
  const email = (envelope?.[2] ?? source.fromAddress).trim().toLowerCase()
  const validEmail = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)
  const name = envelope?.[1].trim().replace(/^"|"$/g, '').trim() || null
  const [localPart, domain] = email.split('@')
  const systemSender =
    ['takeachef.com', 'privatechefmanager.com'].includes(domain) ||
    /^(?:no[._-]?reply|notifications?|support)$/.test(localPart)
  const clientLead = validEmail && !systemSender ? { email, fullName: name } : null
  if (!clientLead) warnings.push('sender_unresolved')

  const dates = [
    ...body.matchAll(
      /\b(?:dinner(?:\s+date)?|event(?:\s+date)?|booking(?:\s+date)?|date|on)\s*(?:[:=]|on)?\s*(\d{4})-(\d{2})-(\d{2})\b/gi
    ),
  ]
  const validDates = [
    ...new Set(
      dates
        .filter((match) => validDate(match[1], match[2], match[3]))
        .map((match) => `${match[1]}-${match[2]}-${match[3]}`)
    ),
  ]
  const confirmedDate =
    validDates.length === 1 && dates.every((match) => validDate(match[1], match[2], match[3]))
      ? validDates[0]
      : null
  if (!confirmedDate)
    warnings.push(dates.length ? 'date_conflicting_or_invalid' : 'date_unresolved')

  const counts = [
    ...body.matchAll(
      /\b(\d{1,4})\s+(?:guests|people|diners)\b|\b(?:guest\s+count|guests)\s*[:=]\s*(\d{1,4})\b/gi
    ),
  ].map((match) => Number(match[1] ?? match[2]))
  const uniqueCounts = [...new Set(counts)]
  const confirmedGuestCount =
    uniqueCounts.length === 1 && uniqueCounts[0] > 0 ? uniqueCounts[0] : null
  if (!confirmedGuestCount)
    warnings.push(counts.length ? 'guest_count_conflicting_or_invalid' : 'guest_count_unresolved')

  return { fields: { firstContactAt, confirmedDate, confirmedGuestCount }, clientLead, warnings }
}

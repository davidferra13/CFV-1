export type CalendarHandoffInput = {
  title: string
  start: string | Date
  end?: string | Date | null
  location?: string | null
  details?: string | null
}

function cleanText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function formatCalendarDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

export function normalizePhoneForHref(value: string | null | undefined): string {
  const phone = cleanText(value)
  if (!phone) return ''
  const hasLeadingPlus = phone.startsWith('+')
  const digits = phone.replace(/\D/g, '')
  return hasLeadingPlus ? `+${digits}` : digits
}

export function buildTelHref(value: string | null | undefined): string | null {
  const phone = normalizePhoneForHref(value)
  return phone ? `tel:${phone}` : null
}

export function buildSmsHref(value: string | null | undefined, body?: string): string | null {
  const phone = normalizePhoneForHref(value)
  if (!phone) return null
  const message = cleanText(body)
  return message ? `sms:${phone}?&body=${encodeURIComponent(message)}` : `sms:${phone}`
}

export function buildMailtoHref(
  email: string | null | undefined,
  options?: { subject?: string | null; body?: string | null }
): string | null {
  const address = cleanText(email)
  if (!address) return null

  const params = new URLSearchParams()
  const subject = cleanText(options?.subject)
  const body = cleanText(options?.body)
  if (subject) params.set('subject', subject)
  if (body) params.set('body', body)

  const query = params.toString()
  return query ? `mailto:${address}?${query}` : `mailto:${address}`
}

export function buildMapsSearchHref(input: {
  address?: string | null
  lat?: number | string | null
  lng?: number | string | null
}): string | null {
  const lat = cleanText(input.lat == null ? null : String(input.lat))
  const lng = cleanText(input.lng == null ? null : String(input.lng))
  const address = cleanText(input.address)
  const query = lat && lng ? `${lat},${lng}` : address
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null
}

export function buildMapsDirectionsHref(input: {
  address?: string | null
  lat?: number | string | null
  lng?: number | string | null
}): string | null {
  const lat = cleanText(input.lat == null ? null : String(input.lat))
  const lng = cleanText(input.lng == null ? null : String(input.lng))
  const address = cleanText(input.address)
  const destination = lat && lng ? `${lat},${lng}` : address
  return destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : null
}

export function buildGoogleCalendarHref(input: CalendarHandoffInput): string | null {
  const title = cleanText(input.title)
  const start = formatCalendarDate(input.start)
  const end = input.end ? formatCalendarDate(input.end) : start
  if (!title || !start) return null

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end || start}`,
  })

  const location = cleanText(input.location)
  const details = cleanText(input.details)
  if (location) params.set('location', location)
  if (details) params.set('details', details)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function normalizeExternalHref(value: string | null | undefined): string | null {
  const href = cleanText(value)
  if (!href) return null
  if (/^https?:\/\//i.test(href)) return href
  return `https://${href}`
}

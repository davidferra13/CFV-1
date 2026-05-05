// ICS Email Attachment Helper
// Builds an inline .ics calendar attachment for transactional emails.
// When attached, email clients (Gmail, Outlook, Apple Mail) show an
// "Add to Calendar" prompt directly in the email, no link click needed.

import { generateICS } from '@/lib/scheduling/generate-ics'

/**
 * Build an .ics attachment object compatible with sendEmail's attachments param.
 * Returns the attachment ready to spread into the sendEmail call.
 */
export function buildIcsAttachment(event: {
  id: string
  title: string
  eventDate: string // 'YYYY-MM-DD'
  startTime?: string
  endTime?: string
  location?: string
  description?: string
  guestCount?: number
  timezone?: string
}): { filename: string; content: string; contentType: string } {
  const icsContent = generateICS(event)

  const safeName = (event.title || 'event')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80)

  return {
    filename: `${safeName || 'event'}.ics`,
    content: icsContent,
    contentType: 'text/calendar; charset=utf-8; method=REQUEST',
  }
}

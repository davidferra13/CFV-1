// Event Ticketing - Guest List CSV Export

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { buildCsvSafe } from '@/lib/security/csv-sanitize'
import { formatCurrency } from '@/lib/utils/currency'

/**
 * Export the guest list for a ticketed event as CSV.
 * Returns the CSV string and a suggested filename.
 */
export async function exportGuestListCSV(eventId: string): Promise<{
  csv: string
  filename: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event belongs to this chef
  const { data: event } = await db
    .from('events')
    .select('id, title, occasion, event_date')
    .eq('id', eventId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!event) throw new Error('Event not found')

  // Fetch all tickets with ticket type info
  const { data: tickets } = await db
    .from('event_tickets')
    .select('*, ticket_type:event_ticket_types(name)')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: true })

  if (!tickets || tickets.length === 0) {
    throw new Error('No tickets to export')
  }

  const headers = [
    'Name',
    'Email',
    'Phone',
    'Ticket Type',
    'Quantity',
    'Total Paid',
    'Payment Status',
    'Dietary Restrictions',
    'Allergies',
    'Plus One',
    'Plus One Dietary',
    'Plus One Allergies',
    'Attended',
    'Source',
    'Notes',
    'Purchased At',
  ]

  const rows = tickets.map((t: any) => [
    t.buyer_name,
    t.buyer_email,
    t.buyer_phone,
    t.ticket_type?.name || 'General',
    t.quantity,
    formatCurrency(t.total_cents),
    t.payment_status,
    (t.dietary_restrictions || []).join('; '),
    (t.allergies || []).join('; '),
    t.plus_one_name || '',
    (t.plus_one_dietary || []).join('; '),
    (t.plus_one_allergies || []).join('; '),
    t.attended === true ? 'Yes' : t.attended === false ? 'No' : 'Pending',
    t.source,
    t.notes,
    t.created_at ? new Date(t.created_at).toLocaleDateString() : '',
  ])

  const csv = buildCsvSafe(headers, rows)
  const eventName = (event.title || event.occasion || 'event').replace(/[^a-zA-Z0-9]/g, '-')
  const date = event.event_date || new Date().toISOString().slice(0, 10)
  const filename = `guest-list-${eventName}-${date}.csv`

  return { csv, filename }
}

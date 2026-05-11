// GET /quotes/csv-export - Downloads all quotes as a CSV file.

import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { csvRowSafe as row } from '@/lib/security/csv-sanitize'

export async function GET() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: quotes, error } = await db
    .from('quotes')
    .select(
      'id, status, total_quoted_cents, guest_count_estimated, valid_until, pricing_notes, internal_notes, created_at, quote_name, client_id, event_id, clients:client_id (full_name), events:event_id (event_date, occasion)'
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (quotes ?? []) as any[]

  const header = row([
    'Quote #',
    'Client',
    'Occasion',
    'Event Date',
    'Guests',
    'Total ($)',
    'Status',
    'Valid Until',
    'Notes',
    'Created',
  ])

  const body = rows.map((q: any) => {
    const clientName = q.clients?.full_name ?? ''
    const occasion = q.events?.occasion ?? ''
    const eventDate = q.events?.event_date
      ? new Date(q.events.event_date).toLocaleDateString('en-US')
      : ''
    const totalDollars =
      q.total_quoted_cents != null ? `$${(q.total_quoted_cents / 100).toFixed(2)}` : ''
    const notes = q.pricing_notes || q.internal_notes || ''

    return row([
      q.quote_name || q.id?.slice(0, 8) || '',
      clientName,
      occasion,
      eventDate,
      q.guest_count_estimated ?? '',
      totalDollars,
      q.status ?? 'draft',
      q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-US') : '',
      notes,
      q.created_at ? new Date(q.created_at).toLocaleDateString('en-US') : '',
    ])
  })

  const csv = [header, ...body].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="quotes-${((_d) => `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(new Date())}.csv"`,
    },
  })
}

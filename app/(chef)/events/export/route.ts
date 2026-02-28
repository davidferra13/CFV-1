// GET /events/export — Downloads all events as a CSV file.

import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsv).join(',')
}

export async function GET() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select(
      `
      occasion, event_date, status, guest_count,
      quoted_price_cents, payment_status,
      clients:client_id (full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })

  const header = row([
    'Occasion',
    'Date',
    'Client',
    'Status',
    'Guests',
    'Quoted ($)',
    'Payment Status',
  ])
  const body = (events ?? []).map((e: any) =>
    row([
      e.occasion,
      e.event_date ? new Date(e.event_date).toLocaleDateString('en-US') : '',
      e.clients?.full_name ?? '',
      e.status,
      e.guest_count,
      e.quoted_price_cents != null ? (e.quoted_price_cents / 100).toFixed(2) : '',
      e.payment_status ?? '',
    ])
  )

  const csv = [header, ...body].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="events-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

// GET /finance/export — Downloads all ledger entries as a CSV file.
// Accepts ?year=YYYY to filter by year (default: current year).

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

export async function GET(request: Request) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10)

  const { data: entries } = await supabase
    .from('ledger_entries')
    .select(
      `
      created_at, received_at, entry_type, amount_cents,
      payment_method, description,
      events:event_id (occasion, event_date),
      clients:client_id (full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`)
    .order('created_at', { ascending: false })

  const header = row([
    'Date',
    'Type',
    'Client',
    'Event',
    'Amount ($)',
    'Payment Method',
    'Description',
  ])
  const body = (entries ?? []).map((e: any) => {
    const date = e.received_at ?? e.created_at
    return row([
      date ? new Date(date).toLocaleDateString('en-US') : '',
      e.entry_type,
      e.clients?.full_name ?? '',
      e.events?.occasion ?? '',
      e.amount_cents != null ? (e.amount_cents / 100).toFixed(2) : '',
      e.payment_method ?? '',
      e.description ?? '',
    ])
  })

  const csv = [header, ...body].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="financials-${year}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

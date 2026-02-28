// GET /clients/export — Downloads all clients as a CSV file.

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

  const { data: clients } = await supabase
    .from('clients')
    .select('full_name, email, phone, created_at, status, is_active')
    .eq('tenant_id', user.tenantId!)
    .order('full_name')

  const header = row(['Name', 'Email', 'Phone', 'Client Since', 'Status', 'Active'])
  const body = (clients ?? []).map((c: any) =>
    row([
      c.full_name,
      c.email,
      c.phone,
      c.created_at ? new Date(c.created_at).toLocaleDateString('en-US') : '',
      c.status ?? 'active',
      c.is_active ? 'Yes' : 'No',
    ])
  )

  const csv = [header, ...body].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

// GET /clients/csv-export - Downloads all clients as a CSV file.

import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { csvRowSafe as row } from '@/lib/security/csv-sanitize'

export async function GET() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: clients } = await db
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

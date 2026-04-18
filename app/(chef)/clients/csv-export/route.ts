// GET /clients/csv-export - Downloads all clients as a CSV file.

import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { csvRowSafe as row } from '@/lib/security/csv-sanitize'

export async function GET() {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch clients + LTV from financial view (ledger-derived, always current)
  const [clientsResult, financialsResult] = await Promise.all([
    db
      .from('clients')
      .select(
        'id, full_name, email, phone, created_at, status, dietary_restrictions, allergies, preferred_contact_method, referral_source, occupation, company, loyalty_tier, notes'
      )
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at', null)
      .order('full_name'),
    db
      .from('client_financial_summary')
      .select('client_id, lifetime_value_cents')
      .eq('tenant_id', user.tenantId!),
  ])

  const clients = clientsResult.data ?? []
  const ltvMap = new Map<string, number>()
  for (const f of (financialsResult.data ?? []) as {
    client_id: string
    lifetime_value_cents: number
  }[]) {
    ltvMap.set(f.client_id, f.lifetime_value_cents ?? 0)
  }

  const header = row([
    'Name',
    'Email',
    'Phone',
    'Client Since',
    'Status',
    'Active',
    'Dietary Restrictions',
    'Allergies',
    'Preferred Contact',
    'Referral Source',
    'Occupation',
    'Company',
    'Lifetime Value',
    'Loyalty Tier',
    'Notes',
  ])
  const body = clients.map((c: any) => {
    const ltv = ltvMap.get(c.id)
    return row([
      c.full_name,
      c.email,
      c.phone,
      c.created_at ? new Date(c.created_at).toLocaleDateString('en-US') : '',
      c.status ?? 'active',
      c.status !== 'dormant' ? 'Yes' : 'No',
      Array.isArray(c.dietary_restrictions) ? c.dietary_restrictions.join('; ') : '',
      Array.isArray(c.allergies) ? c.allergies.join('; ') : '',
      c.preferred_contact_method ?? '',
      c.referral_source ?? '',
      c.occupation ?? '',
      c.company ?? '',
      ltv != null ? `$${(ltv / 100).toFixed(2)}` : '',
      c.loyalty_tier ?? '',
      c.notes ?? '',
    ])
  })

  const csv = [header, ...body].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clients-${((_cced) => `${_cced.getFullYear()}-${String(_cced.getMonth() + 1).padStart(2, '0')}-${String(_cced.getDate()).padStart(2, '0')}`)(new Date())}.csv"`,
    },
  })
}

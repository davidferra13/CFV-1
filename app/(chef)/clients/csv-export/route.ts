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
    .select(
      'full_name, email, phone, created_at, status, is_active, dietary_restrictions, allergies, preferred_contact_method, referral_source, occupation, company, lifetime_value_cents, loyalty_tier, notes'
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .order('full_name')

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
  const body = (clients ?? []).map((c: any) =>
    row([
      c.full_name,
      c.email,
      c.phone,
      c.created_at ? new Date(c.created_at).toLocaleDateString('en-US') : '',
      c.status ?? 'active',
      c.is_active ? 'Yes' : 'No',
      Array.isArray(c.dietary_restrictions) ? c.dietary_restrictions.join('; ') : '',
      Array.isArray(c.allergies) ? c.allergies.join('; ') : '',
      c.preferred_contact_method ?? '',
      c.referral_source ?? '',
      c.occupation ?? '',
      c.company ?? '',
      c.lifetime_value_cents != null ? `$${(c.lifetime_value_cents / 100).toFixed(2)}` : '',
      c.loyalty_tier ?? '',
      c.notes ?? '',
    ])
  )

  const csv = [header, ...body].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clients-${((_cced) => `${_cced.getFullYear()}-${String(_cced.getMonth() + 1).padStart(2, '0')}-${String(_cced.getDate()).padStart(2, '0')}`)(new Date())}.csv"`,
    },
  })
}

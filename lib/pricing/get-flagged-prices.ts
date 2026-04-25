'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export async function getFlaggedPrices() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('ingredients')
    .select('id, name, cost_per_unit_cents, price_flag_new_cents, price_flag_reason, price_unit')
    .eq('tenant_id', user.tenantId!)
    .eq('price_flag_pending', true)

  return data ?? []
}

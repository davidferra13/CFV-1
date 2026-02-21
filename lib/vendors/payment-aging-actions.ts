'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { computeVendorAging } from '@/lib/vendors/payment-aging'
import type { VendorAgingEntry } from '@/lib/vendors/payment-aging'

export type { VendorAgingEntry }

export async function getVendorPaymentAging(): Promise<VendorAgingEntry[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  // Fetch unpaid expenses with vendor info
  const { data, error } = await (supabase as any)
    .from('expenses')
    .select('vendor_name, amount_cents, due_date, paid_at')
    .eq('tenant_id', tenantId)
    .is('paid_at', null)

  if (error) {
    console.warn('[vendor-aging] Could not fetch expenses:', error.message)
    return []
  }

  return computeVendorAging(data || [])
}

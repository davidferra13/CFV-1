'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { computeVendorAging } from '@/lib/vendors/payment-aging'
import type { VendorAgingEntry } from '@/lib/vendors/payment-aging'

export type { VendorAgingEntry }

export async function getVendorPaymentAging(): Promise<VendorAgingEntry[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  // Fetch expenses with vendor info — expenses table has no paid_at column,
  // so we use expense_date as the due-date proxy for aging buckets.
  const { data, error } = await supabase
    .from('expenses')
    .select('vendor_name, amount_cents, expense_date')
    .eq('tenant_id', tenantId)
    .not('vendor_name', 'is', null)

  if (error) {
    console.warn('[vendor-aging] Could not fetch expenses:', error.message)
    return []
  }

  return computeVendorAging(
    (data || []).map((d: any) => ({
      vendor_name: d.vendor_name ?? 'Unknown',
      amount_cents: d.amount_cents,
      due_date: d.expense_date,
    }))
  )
}

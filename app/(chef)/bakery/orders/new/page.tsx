import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { CakeOrderForm } from '@/components/bakery/cake-order-form'

export const metadata: Metadata = {
  title: 'New Bakery Order - ChefFlow',
  description: 'Create a custom cake, pastry, or bakery order.',
}

export default async function NewBakeryOrderPage() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch clients for the picker
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.tenantId!)
    .order('full_name')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-stone-100">New Bakery Order</h1>
      <CakeOrderForm clients={clients ?? []} />
    </div>
  )
}

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { RetainerForm } from '@/components/retainers/retainer-form'

export const metadata: Metadata = { title: 'New Retainer - ChefFlow' }

export default async function NewRetainerPage() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch clients for dropdown
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', user.tenantId!)
    .order('full_name', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">New Retainer</h1>
        <p className="text-stone-500 mt-1">Set up a recurring service agreement with a client</p>
      </div>

      <RetainerForm
        clients={(clients || []).map((c) => ({ id: c.id, full_name: c.full_name }))}
        mode="create"
      />
    </div>
  )
}

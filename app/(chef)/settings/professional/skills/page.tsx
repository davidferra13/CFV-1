import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { CapabilityInventory } from '@/components/professional/capability-inventory'

export default async function SkillsPage() {
  const chef = await requireChef()
  const supabase = createServerClient()
  const { data } = await supabase
    .from('chef_capability_inventory')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('capability_type')
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Capability Inventory</h1>
        <p className="text-sm text-stone-500 mt-1">
          Rate your confidence across cuisines, dietary needs, and techniques.
        </p>
      </div>
      <CapabilityInventory capabilities={data ?? []} />
    </div>
  )
}

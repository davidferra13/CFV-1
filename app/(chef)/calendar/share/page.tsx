import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { AvailabilityShareSettings } from '@/components/calendar/availability-share-settings'

export default async function CalendarSharePage() {
  const chef = await requireChef()
  const db: any = createServerClient()
  const { data: tokens } = await db
    .from('chef_availability_share_tokens')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Share Availability</h1>
        <p className="text-sm text-stone-500 mt-1">
          Generate a public link showing your availability without revealing event details.
        </p>
      </div>
      <AvailabilityShareSettings tokens={tokens ?? []} />
    </div>
  )
}

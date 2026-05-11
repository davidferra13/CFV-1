import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { SourcingSession } from '@/components/calling/sourcing-session'

export const metadata: Metadata = {
  title: 'Source Ingredients',
  description: 'Find ingredients by calling vendors automatically',
}

export default async function SourcingPage() {
  const user = await requireChef()
  const tenantId = (user as any).tenantId as string

  // Check if calling feature is enabled
  const db: any = createServerClient()
  const { data: featureFlag } = await db
    .from('chef_feature_flags')
    .select('enabled')
    .eq('chef_id', tenantId)
    .eq('flag_name', 'supplier_calling')
    .maybeSingle()

  if (!featureFlag?.enabled) {
    // Show access request page if not enabled
    const { CallAccessRequest } = await import('@/components/calling/call-access-request')
    return <CallAccessRequest />
  }

  // Load active sessions count for context
  const { count: activeSessions } = await db
    .from('sourcing_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', tenantId)
    .eq('status', 'in_progress')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-100">Source Ingredients</h1>
        <p className="text-sm text-stone-400 mt-1">
          Type what you need. The system calls vendors for you and reports back.
        </p>
      </div>
      <SourcingSession tenantId={tenantId} />
    </div>
  )
}

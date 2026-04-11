import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { CHEF_FEATURE_FLAGS, hasChefFeatureFlagWithDb } from '@/lib/features/chef-feature-flags'

export const metadata: Metadata = { title: 'Webhooks' }

export default async function WebhooksPage() {
  const user = await requireChef()
  const db = createServerClient()
  if (!(await hasChefFeatureFlagWithDb(db, user.entityId, CHEF_FEATURE_FLAGS.developerTools))) {
    redirect('/settings')
  }
  const [{ listWebhookSubscriptions }, { WebhookSettings }] = await Promise.all([
    import('@/lib/webhooks/actions'),
    import('@/components/settings/webhook-settings'),
  ])
  const endpoints = await listWebhookSubscriptions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Webhooks</h1>
        <p className="text-stone-400 mt-1">
          Send real-time data to external services when events occur in ChefFlow
        </p>
      </div>
      <WebhookSettings initialEndpoints={endpoints} />
    </div>
  )
}

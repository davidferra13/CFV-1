import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listWebhookSubscriptions } from '@/lib/webhooks/actions'
import { WebhookSettings } from '@/components/settings/webhook-settings'

export const metadata: Metadata = { title: 'Webhooks' }

export default async function WebhooksPage() {
  await requireChef()
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

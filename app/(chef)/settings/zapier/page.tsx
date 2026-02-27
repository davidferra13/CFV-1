import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { listWebhookSubscriptions } from '@/lib/integrations/zapier/zapier-webhooks'
import { ZapierSettings } from '@/components/settings/zapier-settings'

export const metadata: Metadata = { title: 'Zapier & Webhooks - ChefFlow' }

export default async function ZapierSettingsPage() {
  const subscriptions = await listWebhookSubscriptions()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Zapier & Webhooks</h1>
        <p className="text-stone-400 mt-1">
          Connect ChefFlow events to Zapier, Make, or any webhook-based automation platform. Events
          are signed with HMAC-SHA256 for security.
        </p>
      </div>

      <ZapierSettings initialSubscriptions={subscriptions} />
    </div>
  )
}

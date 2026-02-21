import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { WebhookManager } from '@/components/settings/webhook-manager'

export const metadata: Metadata = { title: 'Webhooks - ChefFlow' }

async function getWebhooks(tenantId: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('webhook_endpoints' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  return (data || []) as any[]
}

export default async function WebhooksPage() {
  const user = await requireChef()
  const endpoints = await getWebhooks(user.entityId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Webhooks</h1>
        <p className="text-stone-600 mt-1">Send real-time data to external services when events occur</p>
      </div>
      <WebhookManager endpoints={endpoints} />
    </div>
  )
}

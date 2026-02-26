'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

export async function createWebhookEndpoint(input: {
  url: string
  description?: string
  events: string[]
}) {
  const user = await requireChef()
  const supabase = createServerClient()
  const secret = randomBytes(32).toString('hex')
  const { error } = await supabase.from('webhook_endpoints' as any).insert({
    tenant_id: user.entityId,
    url: input.url,
    description: input.description,
    events: input.events,
    secret,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/settings/webhooks')
}

export async function deleteWebhookEndpoint(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()
  await supabase
    .from('webhook_endpoints' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.entityId)
  revalidatePath('/settings/webhooks')
}

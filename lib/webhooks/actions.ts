'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes, createHmac } from 'crypto'
import { validateWebhookUrl } from '@/lib/security/url-validation'
import type { WebhookSubscription, DeliveryLogEntry } from './types'

// ── List ──

export async function listWebhookSubscriptions(): Promise<WebhookSubscription[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('webhook_endpoints' as any)
    .select('*')
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as WebhookSubscription[]
}

// ── Create ──

export async function createWebhookEndpoint(input: {
  url: string
  description?: string
  events: string[]
}): Promise<{ secret: string }> {
  const user = await requireChef()

  // SECURITY: Validate URL to prevent SSRF - blocks private IPs, requires HTTPS
  const targetUrl = validateWebhookUrl(input.url).toString()

  const supabase: any = createServerClient()
  const secret = randomBytes(32).toString('hex')

  const { error } = await supabase.from('webhook_endpoints' as any).insert({
    tenant_id: user.entityId,
    url: targetUrl,
    description: input.description || null,
    events: input.events,
    secret,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/webhooks')
  return { secret }
}

// ── Update ──

export async function updateWebhookEndpoint(
  id: string,
  input: {
    url?: string
    events?: string[]
    is_active?: boolean
    description?: string
  }
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updateData: Record<string, unknown> = {}

  if (input.url !== undefined) {
    updateData.url = validateWebhookUrl(input.url).toString()
  }
  if (input.events !== undefined) {
    updateData.events = input.events
  }
  if (input.is_active !== undefined) {
    updateData.is_active = input.is_active
    // Reset failure count when re-enabling
    if (input.is_active) {
      updateData.failure_count = 0
    }
  }
  if (input.description !== undefined) {
    updateData.description = input.description
  }

  const { error } = await supabase
    .from('webhook_endpoints' as any)
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/webhooks')
}

// ── Delete ──

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('webhook_endpoints' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/webhooks')
}

// ── Test ──

export async function testWebhookEndpoint(id: string): Promise<{
  success: boolean
  status: number | null
  durationMs: number
  error?: string
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: endpoint, error: fetchError } = await supabase
    .from('webhook_endpoints' as any)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.entityId)
    .single()

  if (fetchError || !endpoint) throw new Error('Endpoint not found')

  const body = JSON.stringify({
    event: 'test.ping',
    data: {
      message: 'This is a test webhook from ChefFlow.',
      endpoint_id: id,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  })

  const signature = createHmac('sha256', endpoint.secret).update(body).digest('hex')
  const startMs = Date.now()
  let responseStatus: number | null = null
  let success = false
  let errorMessage: string | undefined

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ChefFlow-Signature': `sha256=${signature}`,
        'X-ChefFlow-Event': 'test.ping',
      },
      body,
      signal: controller.signal,
      redirect: 'error',
    })

    clearTimeout(timeout)
    responseStatus = response.status
    success = response.ok

    if (!response.ok) {
      errorMessage = `HTTP ${response.status}`
    }
  } catch (err) {
    errorMessage = String(err)
  }

  const durationMs = Date.now() - startMs

  // Log the test delivery
  try {
    await supabase.from('webhook_deliveries' as any).insert({
      endpoint_id: id,
      tenant_id: user.entityId,
      event_type: 'test.ping',
      payload: { test: true },
      response_status: responseStatus,
      duration_ms: durationMs,
      success,
      status: success ? 'delivered' : 'failed',
      delivered_at: success ? new Date().toISOString() : null,
    })
  } catch {
    // Non-blocking: test delivery log failure should not affect result
  }

  return { success, status: responseStatus, durationMs, error: errorMessage }
}

// ── Delivery Log ──

export async function getWebhookDeliveryLog(
  subscriptionId: string,
  limit = 20
): Promise<DeliveryLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify the subscription belongs to this chef
  const { data: endpoint } = await supabase
    .from('webhook_endpoints' as any)
    .select('id')
    .eq('id', subscriptionId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!endpoint) throw new Error('Endpoint not found')

  const { data, error } = await supabase
    .from('webhook_deliveries' as any)
    .select('*')
    .eq('endpoint_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data || []) as DeliveryLogEntry[]
}

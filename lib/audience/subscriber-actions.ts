'use server'

import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { headers } from 'next/headers'
import { z } from 'zod'

// ─── Public: subscribe to chef's future events ──────────────────────

const SubscribeSchema = z.object({
  chefId: z.string().uuid(),
  email: z.string().email().max(320),
  name: z.string().max(200).optional().or(z.literal('')),
  sourceEventId: z.string().uuid().optional(),
})

export async function subscribeToChefEvents(input: z.infer<typeof SubscribeSchema>): Promise<{
  success: boolean
  error?: string
}> {
  const validated = SubscribeSchema.parse(input)
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  try {
    await checkRateLimit(`audience-subscribe:${ip}`, 10, 10 * 60_000)
  } catch {
    return { success: false, error: 'Too many requests. Please try again later.' }
  }

  const db: any = createServerClient({ admin: true })
  const normalizedEmail = validated.email.toLowerCase().trim()

  // Upsert: if already subscribed, update name and resubscribe if unsubscribed
  const { data: existing } = await db
    .from('audience_subscribers')
    .select('id, unsubscribed_at')
    .eq('chef_id', validated.chefId)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing) {
    if (existing.unsubscribed_at) {
      await db
        .from('audience_subscribers')
        .update({
          unsubscribed_at: null,
          name: validated.name?.trim() || null,
          subscribed_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    }
    return { success: true }
  }

  const { error } = await db.from('audience_subscribers').insert({
    chef_id: validated.chefId,
    email: normalizedEmail,
    name: validated.name?.trim() || null,
    source: validated.sourceEventId ? 'public_event_page' : 'chef_profile',
    source_event_id: validated.sourceEventId ?? null,
  })

  if (error) {
    if (error.code === '23505') return { success: true } // duplicate, treat as success
    return { success: false, error: 'Failed to subscribe. Please try again.' }
  }

  return { success: true }
}

// ─── Public: unsubscribe ────────────────────────────────────────────

export async function unsubscribeFromChefEvents(input: {
  chefId: string
  email: string
}): Promise<{ success: boolean }> {
  const db: any = createServerClient({ admin: true })

  await db
    .from('audience_subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('chef_id', input.chefId)
    .eq('email', input.email.toLowerCase().trim())

  return { success: true }
}

// ─── Chef-side: get subscriber count ────────────────────────────────

export async function getAudienceSubscriberCount(chefId: string): Promise<number> {
  const db: any = createServerClient()

  const { count } = await db
    .from('audience_subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chefId)
    .is('unsubscribed_at', null)

  return count ?? 0
}

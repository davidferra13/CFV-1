'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getDinnerCircleConfig, normalizeDinnerCircleConfig } from './event-circle'
import type { DinnerCircleConfig, DinnerCircleVendorInquiry } from './types'

const CirclePatchSchema = z.object({
  eventId: z.string().uuid(),
  patch: z.record(z.string(), z.unknown()),
})

const VendorInterestSchema = z.object({
  shareToken: z.string().min(1),
  name: z.string().min(1).max(160),
  email: z.string().email().max(320),
  role: z.string().min(1).max(120),
  note: z.string().max(1200).optional().or(z.literal('')),
})

function deepMergeConfig(
  base: DinnerCircleConfig,
  patch: Record<string, unknown>
): DinnerCircleConfig {
  const merged: any = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = { ...(merged[key] ?? {}), ...(value as Record<string, unknown>) }
    } else {
      merged[key] = value
    }
  }
  return normalizeDinnerCircleConfig(merged)
}

async function assertEventOwner(db: any, eventId: string, tenantId: string) {
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) throw new Error('Event not found')
}

async function upsertCircleConfig(
  db: any,
  eventId: string,
  tenantId: string,
  config: DinnerCircleConfig
) {
  const { data: existing } = await db
    .from('event_share_settings')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  const payload = {
    event_id: eventId,
    tenant_id: tenantId,
    circle_config: config,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await db
      .from('event_share_settings')
      .update({ circle_config: config, updated_at: payload.updated_at })
      .eq('event_id', eventId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await db.from('event_share_settings').insert(payload)
  if (error) throw new Error(error.message)
}

export async function updateDinnerCircleConfig(input: z.infer<typeof CirclePatchSchema>) {
  const user = await requireChef()
  const validated = CirclePatchSchema.parse(input)
  const db: any = createServerClient()

  await assertEventOwner(db, validated.eventId, user.tenantId!)
  const current = await getDinnerCircleConfig(validated.eventId)
  const next = deepMergeConfig(current, validated.patch)

  await upsertCircleConfig(db, validated.eventId, user.tenantId!, next)
  revalidatePath(`/events/${validated.eventId}`)

  return { success: true, config: next }
}

export async function submitDinnerCircleVendorInterest(
  input: z.infer<typeof VendorInterestSchema>
) {
  const validated = VendorInterestSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const { data: share } = await db
    .from('event_share_settings')
    .select('event_id, tenant_id, circle_config')
    .eq('share_token', validated.shareToken)
    .single()

  if (!share) throw new Error('Event not found')

  const current = normalizeDinnerCircleConfig(share.circle_config ?? null)
  const inquiry: DinnerCircleVendorInquiry = {
    name: validated.name.trim(),
    email: validated.email.toLowerCase().trim(),
    role: validated.role.trim(),
    note: validated.note?.trim() || undefined,
    submittedAt: new Date().toISOString(),
  }
  const next = normalizeDinnerCircleConfig({
    ...current,
    vendorInquiries: [inquiry, ...(current.vendorInquiries ?? [])].slice(0, 50),
  })

  await upsertCircleConfig(db, share.event_id, share.tenant_id, next)
  revalidatePath(`/e/${validated.shareToken}`)

  return { success: true }
}

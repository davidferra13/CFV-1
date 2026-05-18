'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { AvailabilitySignalSchema } from './schemas'
import { availabilitySignalsTable } from './tables'
import type { CollabAvailabilitySignal } from './types'

export async function getCollabAvailabilitySignals(): Promise<CollabAvailabilitySignal[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data } = await availabilitySignalsTable(db)
    .select('*')
    .eq('chef_id', user.entityId)
    .order('date_start', { ascending: true })

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    date_start: row.date_start,
    date_end: row.date_end,
    region_text: row.region_text ?? null,
    cuisines: row.cuisines ?? [],
    max_guest_count: row.max_guest_count ?? null,
    status: row.status,
    share_with_trusted_only: row.share_with_trusted_only ?? true,
    note: row.note ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function upsertCollabAvailabilitySignal(
  input: z.infer<typeof AvailabilitySignalSchema>
) {
  const user = await requireChef()
  const validated = AvailabilitySignalSchema.parse(input)
  const db = createServerClient({ admin: true })

  if (validated.dateEnd < validated.dateStart) {
    throw new Error('End date must be after start date.')
  }

  if (validated.id) {
    const { error } = await availabilitySignalsTable(db)
      .update({
        date_start: validated.dateStart,
        date_end: validated.dateEnd,
        region_text: validated.regionText ?? null,
        cuisines: (validated.cuisines ?? []).filter(Boolean),
        max_guest_count: validated.maxGuestCount ?? null,
        status: validated.status,
        share_with_trusted_only: validated.shareWithTrustedOnly ?? true,
        note: validated.note ?? null,
      })
      .eq('id', validated.id)
      .eq('chef_id', user.entityId)

    if (error) {
      console.error('[upsertCollabAvailabilitySignal:update] Error:', error)
      throw new Error('Failed to update availability signal.')
    }
  } else {
    const { error } = await availabilitySignalsTable(db).insert({
      chef_id: user.entityId,
      date_start: validated.dateStart,
      date_end: validated.dateEnd,
      region_text: validated.regionText ?? null,
      cuisines: (validated.cuisines ?? []).filter(Boolean),
      max_guest_count: validated.maxGuestCount ?? null,
      status: validated.status,
      share_with_trusted_only: validated.shareWithTrustedOnly ?? true,
      note: validated.note ?? null,
    })

    if (error) {
      console.error('[upsertCollabAvailabilitySignal:insert] Error:', error)
      throw new Error('Failed to create availability signal.')
    }
  }

  revalidatePath('/network')
  return { success: true }
}

export async function deleteCollabAvailabilitySignal(signalId: string) {
  const user = await requireChef()
  z.string().uuid().parse(signalId)
  const db = createServerClient({ admin: true })

  const { error } = await availabilitySignalsTable(db)
    .delete()
    .eq('id', signalId)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[deleteCollabAvailabilitySignal] Error:', error)
    throw new Error('Failed to delete availability signal.')
  }

  revalidatePath('/network')
  return { success: true }
}

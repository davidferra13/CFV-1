'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

export async function getOrCreateAlcoholLog(eventId: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { data: existing, error: fetchError } = await db
    .from('event_alcohol_logs')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchError) {
    throw new Error('Failed to fetch alcohol log')
  }

  if (existing) {
    return existing
  }

  const { data: created, error: createError } = await db
    .from('event_alcohol_logs')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      log_entries: [],
    })
    .select()
    .single()

  if (createError || !created) {
    throw new Error('Failed to create alcohol log')
  }

  revalidatePath(`/events/${eventId}`)
  return created
}

export async function addAlcoholLogEntry(
  logId: string,
  entry: { drink_type: string; guests_served: number; notes?: string }
) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { data: log, error: fetchError } = await db
    .from('event_alcohol_logs')
    .select('*')
    .eq('id', logId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !log) {
    throw new Error('Alcohol log not found')
  }

  const existingEntries =
    (log.log_entries as Array<{
      id: string
      time: string
      drink_type: string
      guests_served: number
      notes: string | null
    }>) || []

  const newEntry = {
    id: randomUUID(),
    time: new Date().toISOString(),
    drink_type: entry.drink_type,
    guests_served: entry.guests_served,
    notes: entry.notes ?? null,
  }

  const updatedEntries = [...existingEntries, newEntry]

  const { error: updateError } = await db
    .from('event_alcohol_logs')
    .update({ log_entries: updatedEntries, updated_at: new Date().toISOString() })
    .eq('id', logId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    throw new Error('Failed to add log entry')
  }

  revalidatePath(`/events/${log.event_id}`)
}

export async function setLastCall(logId: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { data: log, error: fetchError } = await db
    .from('event_alcohol_logs')
    .select('event_id')
    .eq('id', logId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !log) {
    throw new Error('Alcohol log not found')
  }

  const { error: updateError } = await db
    .from('event_alcohol_logs')
    .update({
      last_call_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', logId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    throw new Error('Failed to set last call')
  }

  revalidatePath(`/events/${log.event_id}`)
}

export async function updateLogNotes(logId: string, notes: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const { data: log, error: fetchError } = await db
    .from('event_alcohol_logs')
    .select('event_id')
    .eq('id', logId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !log) {
    throw new Error('Alcohol log not found')
  }

  const { error: updateError } = await db
    .from('event_alcohol_logs')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', logId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    throw new Error('Failed to update log notes')
  }

  revalidatePath(`/events/${log.event_id}`)
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import type { ClientMemoryRow, ExtractedMemory } from './client-memory-types'

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CLIENT_MEMORY_CACHE_TAG = 'client-memory'

function memoryTag(clientId: string) {
  return `${CLIENT_MEMORY_CACHE_TAG}-${clientId}`
}

// ---------------------------------------------------------------------------
// Read (cached)
// ---------------------------------------------------------------------------

export async function getClientMemory(clientId: string): Promise<ClientMemoryRow[]> {
  const user = await requireChef()

  return unstable_cache(
    async (): Promise<ClientMemoryRow[]> => {
      const db: any = createAdminClient()
      const { data, error } = await db
        .from('client_memory')
        .select('*')
        .eq('tenant_id', user.tenantId!)
        .eq('client_id', clientId)
        .order('confidence', { ascending: false })

      if (error) throw new Error(`Failed to load client memory: ${error.message}`)
      return (data || []) as ClientMemoryRow[]
    },
    [`client-memory-${user.tenantId}-${clientId}`],
    {
      revalidate: 120,
      tags: [memoryTag(clientId)],
    }
  )()
}

// ---------------------------------------------------------------------------
// Write single memory (upsert by key)
// ---------------------------------------------------------------------------

export async function upsertClientMemory(input: {
  client_id: string
  key: string
  value: unknown
  confidence?: number
  source?: string
  source_event_id?: string | null
  pinned?: boolean
}): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date().toISOString()

  // Check if exists
  const { data: existing } = await db
    .from('client_memory')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', input.client_id)
    .eq('key', input.key)
    .single()

  if (existing) {
    const { error } = await db
      .from('client_memory')
      .update({
        value: input.value,
        confidence: input.confidence ?? 100,
        source: input.source ?? 'manual',
        source_event_id: input.source_event_id ?? null,
        pinned: input.pinned ?? false,
        last_seen_at: now,
        updated_at: now,
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) throw new Error(`Failed to update client memory: ${error.message}`)
  } else {
    const { error } = await db.from('client_memory').insert({
      tenant_id: user.tenantId!,
      client_id: input.client_id,
      key: input.key,
      value: input.value,
      confidence: input.confidence ?? 100,
      source: input.source ?? 'manual',
      source_event_id: input.source_event_id ?? null,
      pinned: input.pinned ?? false,
      last_seen_at: now,
    })

    if (error) throw new Error(`Failed to create client memory: ${error.message}`)
  }

  revalidateTag(memoryTag(input.client_id))
  return { success: true }
}

// ---------------------------------------------------------------------------
// Batch write (from AI extraction)
// ---------------------------------------------------------------------------

export async function batchUpsertClientMemory(input: {
  client_id: string
  memories: ExtractedMemory[]
  source: string
  source_event_id?: string | null
}): Promise<{ success: true; count: number }> {
  let count = 0
  for (const mem of input.memories) {
    await upsertClientMemory({
      client_id: input.client_id,
      key: mem.key,
      value: mem.value,
      confidence: mem.confidence ?? 80,
      source: input.source,
      source_event_id: input.source_event_id ?? null,
    })
    count++
  }
  return { success: true, count }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteClientMemory(input: {
  id: string
  client_id: string
}): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('client_memory')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete client memory: ${error.message}`)

  revalidateTag(memoryTag(input.client_id))
  return { success: true }
}

// ---------------------------------------------------------------------------
// Toggle pin
// ---------------------------------------------------------------------------

export async function togglePinClientMemory(input: {
  id: string
  client_id: string
  pinned: boolean
}): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('client_memory')
    .update({ pinned: input.pinned, updated_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to toggle pin: ${error.message}`)

  revalidateTag(memoryTag(input.client_id))
  return { success: true }
}

// ---------------------------------------------------------------------------
// Refresh last_seen_at (called when memory is confirmed still relevant)
// ---------------------------------------------------------------------------

export async function refreshMemoryTimestamp(input: {
  id: string
  client_id: string
}): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date().toISOString()
  const { error } = await db
    .from('client_memory')
    .update({ last_seen_at: now, confidence: 100, updated_at: now })
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to refresh memory: ${error.message}`)

  revalidateTag(memoryTag(input.client_id))
  return { success: true }
}

// ---------------------------------------------------------------------------
// Decay (called by daily cron or server action)
// ---------------------------------------------------------------------------

export async function decayStaleMemories(): Promise<{ success: true; affected: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Decay memories not seen in 90+ days, not pinned, confidence > 0
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const { data, error } = await db
    .from('client_memory')
    .select('id, client_id, confidence')
    .eq('tenant_id', user.tenantId!)
    .eq('pinned', false)
    .gt('confidence', 0)
    .lt('last_seen_at', cutoff.toISOString())

  if (error) throw new Error(`Failed to query stale memories: ${error.message}`)
  if (!data || data.length === 0) return { success: true, affected: 0 }

  const clientIds = new Set<string>()

  for (const row of data as { id: string; client_id: string; confidence: number }[]) {
    const newConfidence = Math.max(0, row.confidence - 10)
    await db
      .from('client_memory')
      .update({ confidence: newConfidence, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('tenant_id', user.tenantId!)
    clientIds.add(row.client_id)
  }

  // Bust cache for all affected clients
  for (const cid of clientIds) {
    revalidateTag(memoryTag(cid))
  }

  return { success: true, affected: data.length }
}

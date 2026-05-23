'use server'

// Chef Operating Loop: External Memory
// Lightweight capture and contextual resurfacing of chef observations.
// Not a formal notes system. Chef captures quick notes, observations, and
// preferences during operations. These persist and surface at decision points.
//
// Uses existing chef_captures table for storage; adds operating-loop-aware
// retrieval that surfaces relevant memories based on entity context.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────────

export type MemoryContext =
  | 'event'
  | 'client'
  | 'recipe'
  | 'menu'
  | 'ingredient'
  | 'vendor'
  | 'general'

export interface ExternalMemory {
  id: string
  content: string
  context: MemoryContext
  linkedEntityId: string | null
  linkedEntityType: string | null
  tags: string[]
  capturedAt: string
  surfacedCount: number
}

export interface MemorySurfaceResult {
  memories: ExternalMemory[]
  totalAvailable: number
}

// ── Capture ────────────────────────────────────────────────────────────────

/**
 * Quick-capture a chef observation into external memory.
 * Stores in chef_captures with operating-loop metadata for resurfacing.
 */
export async function captureMemory(input: {
  content: string
  context?: MemoryContext
  linkedEntityId?: string
  linkedEntityType?: string
  tags?: string[]
}): Promise<ExternalMemory> {
  if (!input.content?.trim()) {
    throw new Error('Memory content cannot be empty')
  }

  const user = await requireChef()
  const db: any = createServerClient()

  const context = input.context ?? 'general'
  const tags = [...(input.tags ?? []), 'operating-memory']

  const { data, error } = await db
    .from('chef_captures')
    .insert({
      tenant_id: user.tenantId!,
      capture_type: 'text',
      raw_content: input.content.trim(),
      tags,
      source: 'operating-loop',
      status: 'inbox',
      parsed_items: [
        {
          text: input.content.trim(),
          category: context,
          actionable: false,
        },
      ],
      photo_url: null,
    })
    .select()
    .single()

  if (error) {
    console.error('[external-memory] Capture error:', error)
    throw new Error('Failed to capture memory')
  }

  revalidatePath('/dashboard')

  return mapToExternalMemory(data, input.linkedEntityId ?? null, input.linkedEntityType ?? null)
}

// ── Surface ────────────────────────────────────────────────────────────────

/**
 * Surface relevant memories for a given entity context.
 * Returns memories tagged for this entity or general operating memories.
 */
export async function surfaceMemories(input: {
  context?: MemoryContext
  entityId?: string
  entityType?: string
  limit?: number
}): Promise<MemorySurfaceResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const limit = input.limit ?? 10

  // Fetch operating-loop memories for this tenant
  const { data, error } = await db
    .from('chef_captures')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .contains('tags', ['operating-memory'])
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[external-memory] Surface error:', error)
    return { memories: [], totalAvailable: 0 }
  }

  const allMemories: ExternalMemory[] = (data ?? []).map((row: any) =>
    mapToExternalMemory(row, null, null)
  )

  // Filter by context if specified
  const filtered = input.context
    ? allMemories.filter((m) => m.context === input.context || m.context === 'general')
    : allMemories

  return {
    memories: filtered.slice(0, limit),
    totalAvailable: filtered.length,
  }
}

/**
 * Surface memories relevant to a specific client.
 */
export async function surfaceClientMemories(
  clientId: string,
  limit: number = 5
): Promise<ExternalMemory[]> {
  const result = await surfaceMemories({
    context: 'client',
    entityId: clientId,
    entityType: 'client',
    limit,
  })
  return result.memories
}

/**
 * Surface memories relevant to a specific event.
 */
export async function surfaceEventMemories(
  eventId: string,
  limit: number = 5
): Promise<ExternalMemory[]> {
  const result = await surfaceMemories({
    context: 'event',
    entityId: eventId,
    entityType: 'event',
    limit,
  })
  return result.memories
}

// ── Dismiss ────────────────────────────────────────────────────────────────

/**
 * Archive a memory so it no longer surfaces.
 */
export async function dismissMemory(memoryId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_captures')
    .update({ status: 'archived' })
    .eq('id', memoryId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[external-memory] Dismiss error:', error)
    return { success: false }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mapToExternalMemory(
  row: any,
  linkedEntityId: string | null,
  linkedEntityType: string | null
): ExternalMemory {
  const parsedItems = row.parsed_items as Array<{ text: string; category: string }> | null
  const context: MemoryContext = (parsedItems?.[0]?.category as MemoryContext) ?? 'general'

  return {
    id: row.id,
    content: row.raw_content,
    context,
    linkedEntityId,
    linkedEntityType,
    tags: (row.tags as string[]) ?? [],
    capturedAt: row.created_at,
    surfacedCount: 0,
  }
}

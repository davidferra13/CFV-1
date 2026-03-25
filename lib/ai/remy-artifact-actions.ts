'use server'

// Remy Artifact Actions - save, list, pin, delete Remy's creations
// PRIVACY: Artifacts are tenant-scoped. RLS on the table enforces ownership.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RemyArtifact {
  id: string
  artifactType: string
  title: string
  content: string | null
  data: unknown
  sourceMessage: string | null
  sourceTaskType: string | null
  relatedClientId: string | null
  relatedEventId: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface SaveArtifactInput {
  artifactType: string
  title: string
  content?: string | null
  data?: unknown
  sourceMessage?: string | null
  sourceTaskType?: string | null
  relatedClientId?: string | null
  relatedEventId?: string | null
}

// ─── Save Artifact ─────────────────────────────────────────────────────────

export async function saveRemyArtifact(input: SaveArtifactInput): Promise<{ id: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('remy_artifacts')
    .insert({
      tenant_id: tenantId,
      artifact_type: input.artifactType,
      title: input.title,
      content: input.content ?? null,
      data: input.data ?? null,
      source_message: input.sourceMessage ?? null,
      source_task_type: input.sourceTaskType ?? null,
      related_client_id: input.relatedClientId ?? null,
      related_event_id: input.relatedEventId ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save artifact: ${error.message}`)
  return { id: data.id }
}

// ─── Save Remy Message (convenience wrapper for conversational responses) ──

export async function saveRemyMessage(input: {
  title: string
  content: string
  sourceMessage: string
}): Promise<{ id: string }> {
  return saveRemyArtifact({
    artifactType: 'conversation',
    title: input.title,
    content: input.content,
    sourceMessage: input.sourceMessage,
  })
}

// ─── Save Task Result ──────────────────────────────────────────────────────

export async function saveRemyTaskResult(input: {
  taskType: string
  taskName: string
  data: unknown
  sourceMessage?: string
}): Promise<{ id: string }> {
  return saveRemyArtifact({
    artifactType: 'task_result',
    title: input.taskName,
    data: input.data,
    sourceTaskType: input.taskType,
    sourceMessage: input.sourceMessage ?? null,
  })
}

// ─── List Artifacts ────────────────────────────────────────────────────────

export async function listRemyArtifacts(options?: {
  type?: string
  pinnedOnly?: boolean
  limit?: number
  offset?: number
}): Promise<{ artifacts: RemyArtifact[]; total: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  let query = db
    .from('remy_artifacts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.type) {
    query = query.eq('artifact_type', options.type)
  }

  if (options?.pinnedOnly) {
    query = query.eq('pinned', true)
  }

  const { data, error, count } = await query

  if (error) throw new Error(`Failed to list artifacts: ${error.message}`)

  const artifacts: RemyArtifact[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    artifactType: row.artifact_type as string,
    title: row.title as string,
    content: row.content as string | null,
    data: row.data,
    sourceMessage: row.source_message as string | null,
    sourceTaskType: row.source_task_type as string | null,
    relatedClientId: row.related_client_id as string | null,
    relatedEventId: row.related_event_id as string | null,
    pinned: row.pinned as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))

  return { artifacts, total: count ?? 0 }
}

// ─── Toggle Pin ────────────────────────────────────────────────────────────

export async function toggleArtifactPin(artifactId: string, pinned: boolean): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_artifacts')
    .update({ pinned })
    .eq('id', artifactId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to update artifact: ${error.message}`)
}

// ─── Update Title ──────────────────────────────────────────────────────────

export async function updateArtifactTitle(artifactId: string, title: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_artifacts')
    .update({ title })
    .eq('id', artifactId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to update artifact: ${error.message}`)
}

// ─── Delete Artifact ───────────────────────────────────────────────────────

export async function deleteRemyArtifact(artifactId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_artifacts')
    .delete()
    .eq('id', artifactId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete artifact: ${error.message}`)
}

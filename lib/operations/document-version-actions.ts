// Document Version Server Actions
// Chef-only: Version history for menus, quotes, recipes, contracts, and prep sheets
// Uses existing document_versions table (migration 20260310000001)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const EntityTypeEnum = z.enum(['menu', 'quote', 'recipe', 'contract', 'prep_sheet'])

const SaveDocumentVersionSchema = z.object({
  entityType: EntityTypeEnum,
  entityId: z.string().uuid('Entity ID must be a valid UUID'),
  content: z.record(z.string(), z.unknown()).or(z.string()),
  savedBy: z.string().optional(),
})

export type SaveDocumentVersionInput = z.infer<typeof SaveDocumentVersionSchema>
export type EntityType = z.infer<typeof EntityTypeEnum>

// ============================================
// RETURN TYPES
// ============================================

export type DocumentVersion = {
  id: string
  entityType: EntityType
  entityId: string
  versionNumber: number
  snapshot: Record<string, unknown>
  changeSummary: string | null
  createdBy: string | null
  createdAt: string
}

// ============================================
// HELPERS
// ============================================

function mapDocumentVersion(row: any): DocumentVersion {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    versionNumber: row.version_number,
    snapshot: row.snapshot ?? {},
    changeSummary: row.change_summary ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  }
}

// ============================================
// ACTIONS
// ============================================

/**
 * Save a new document version.
 * Automatically increments version_number based on existing versions.
 */
export async function saveDocumentVersion(input: SaveDocumentVersionInput) {
  const user = await requireChef()
  const validated = SaveDocumentVersionSchema.parse(input)
  const supabase: any = createServerClient()

  // Find the current highest version number for this entity
  const { data: existing } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', validated.entityType)
    .eq('entity_id', validated.entityId)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = existing && existing.length > 0 ? existing[0].version_number + 1 : 1

  // Normalize content to JSONB-compatible object
  const snapshot =
    typeof validated.content === 'string' ? { text: validated.content } : validated.content

  const { data, error } = await supabase
    .from('document_versions')
    .insert({
      tenant_id: user.tenantId!,
      entity_type: validated.entityType,
      entity_id: validated.entityId,
      version_number: nextVersion,
      snapshot,
      change_summary: validated.savedBy
        ? `Saved by ${validated.savedBy}`
        : `Version ${nextVersion}`,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[saveDocumentVersion] Error:', error)
    throw new Error('Failed to save document version')
  }

  revalidatePath(`/events`)
  return { success: true, version: mapDocumentVersion(data) }
}

/**
 * Get all versions of a document, ordered by version number descending (newest first).
 */
export async function getDocumentVersions(
  entityType: EntityType,
  entityId: string
): Promise<DocumentVersion[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version_number', { ascending: false })

  if (error) {
    console.error('[getDocumentVersions] Error:', error)
    throw new Error('Failed to fetch document versions')
  }

  return (data ?? []).map(mapDocumentVersion)
}

/**
 * Revert to a previous version by copying its snapshot forward as a new version.
 * This is non-destructive — it creates a new version with the old content.
 */
export async function revertToVersion(versionId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the version to revert to
  const { data: oldVersion, error: fetchError } = await supabase
    .from('document_versions')
    .select('*')
    .eq('id', versionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !oldVersion) {
    console.error('[revertToVersion] Fetch error:', fetchError)
    throw new Error('Version not found')
  }

  // Find the current highest version number for this entity
  const { data: latest } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', oldVersion.entity_type)
    .eq('entity_id', oldVersion.entity_id)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = latest && latest.length > 0 ? latest[0].version_number + 1 : 1

  // Create a new version with the old content
  const { data, error } = await supabase
    .from('document_versions')
    .insert({
      tenant_id: user.tenantId!,
      entity_type: oldVersion.entity_type,
      entity_id: oldVersion.entity_id,
      version_number: nextVersion,
      snapshot: oldVersion.snapshot,
      change_summary: `Reverted to version ${oldVersion.version_number}`,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[revertToVersion] Insert error:', error)
    throw new Error('Failed to revert to version')
  }

  revalidatePath(`/events`)
  return { success: true, version: mapDocumentVersion(data) }
}

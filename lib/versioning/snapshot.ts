'use server'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

export type SnapshotEntityType = 'menu' | 'quote' | 'recipe'

export interface DocumentVersion {
  id: string
  version_number: number
  snapshot: Record<string, unknown>
  change_summary: string | null
  created_at: string
}

export async function saveSnapshot(
  entityType: SnapshotEntityType,
  entityId: string,
  snapshot: Record<string, unknown>,
  changeSummary?: string
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get current max version for this entity
  const { data: latest } = await supabase
    .from('document_versions' as any)
    .select('version_number')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = ((latest as any)?.version_number || 0) + 1

  await supabase.from('document_versions' as any).insert({
    tenant_id: user.entityId,
    entity_type: entityType,
    entity_id: entityId,
    version_number: nextVersion,
    snapshot,
    change_summary: changeSummary || null,
    created_by: user.id,
  })
}

export async function getVersionHistory(
  entityType: SnapshotEntityType,
  entityId: string
): Promise<DocumentVersion[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('document_versions' as any)
    .select('id, version_number, snapshot, change_summary, created_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('tenant_id', user.entityId)
    .order('version_number', { ascending: false })
    .limit(20)

  return (data as unknown as DocumentVersion[]) || []
}

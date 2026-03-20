'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ==========================================
// TYPES
// ==========================================

export type MenuRevision = {
  id: string
  menu_id: string
  event_id: string
  tenant_id: string
  version: number
  revision_type: 'initial' | 'chef_update' | 'client_feedback' | 'allergen_resolution'
  snapshot: unknown
  changes_summary: string | null
  allergen_conflicts: unknown | null
  status: 'draft' | 'pending_review' | 'approved' | 'rejected'
  client_notes: string | null
  chef_notes: string | null
  created_by: string | null
  created_at: string
  approved_at: string | null
}

// ==========================================
// QUERIES
// ==========================================

export async function getRevisions(eventId: string): Promise<{
  data: MenuRevision[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('menu_revisions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('version', { ascending: false })

  if (error) {
    console.error('[getRevisions] Error:', error)
    return { data: null, error: 'Failed to fetch revisions' }
  }

  return { data: data as MenuRevision[], error: null }
}

export async function getRevisionById(id: string): Promise<{
  data: MenuRevision | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('menu_revisions')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.entityId)
    .single()

  if (error) {
    console.error('[getRevisionById] Error:', error)
    return { data: null, error: 'Revision not found' }
  }

  return { data: data as MenuRevision, error: null }
}

// ==========================================
// MUTATIONS
// ==========================================

export async function createRevision(input: {
  menu_id: string
  event_id: string
  revision_type: 'initial' | 'chef_update' | 'client_feedback' | 'allergen_resolution'
  snapshot: unknown
  changes_summary?: string
  chef_notes?: string
}): Promise<{ data: MenuRevision | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the next version number
  const { data: latest } = await supabase
    .from('menu_revisions')
    .select('version')
    .eq('menu_id', input.menu_id)
    .eq('tenant_id', user.entityId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = latest ? latest.version + 1 : 1

  const { data, error } = await supabase
    .from('menu_revisions')
    .insert({
      menu_id: input.menu_id,
      event_id: input.event_id,
      tenant_id: user.entityId,
      version: nextVersion,
      revision_type: input.revision_type,
      snapshot: input.snapshot,
      changes_summary: input.changes_summary || null,
      chef_notes: input.chef_notes || null,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[createRevision] Error:', error)
    return { data: null, error: 'Failed to create revision' }
  }

  revalidatePath(`/events/${input.event_id}`)
  return { data: data as MenuRevision, error: null }
}

export async function approveRevision(id: string): Promise<{
  data: MenuRevision | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('menu_revisions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[approveRevision] Error:', error)
    return { data: null, error: 'Failed to approve revision' }
  }

  revalidatePath(`/events/${data.event_id}`)
  return { data: data as MenuRevision, error: null }
}

export async function rejectRevision(
  id: string,
  notes?: string
): Promise<{ data: MenuRevision | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updateData: Record<string, unknown> = { status: 'rejected' }
  if (notes) updateData.client_notes = notes

  const { data, error } = await supabase
    .from('menu_revisions')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[rejectRevision] Error:', error)
    return { data: null, error: 'Failed to reject revision' }
  }

  revalidatePath(`/events/${data.event_id}`)
  return { data: data as MenuRevision, error: null }
}

'use server'

// Document & Folder Management — Server Actions
// PRIVACY: Document contents = business data → local only.
// CRUD for chef_folders + chef_documents management via Remy commands.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { ChefFolder, ChefDocument } from './document-management-types'

// ─── Folder Actions ────────────────────────────────────────────────────────────

/**
 * List all folders for the chef.
 */
export async function listFolders(): Promise<ChefFolder[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await (supabase
    .from('chef_folders' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('name', { ascending: true }) as any)

  return ((data ?? []) as any[]).map((f) => ({
    id: f.id,
    name: f.name,
    parentFolderId: f.parent_folder_id,
    color: f.color,
    icon: f.icon,
    documentCount: 0, // Will be enriched if needed
    createdAt: f.created_at,
  }))
}

/**
 * Create a new folder.
 */
export async function createFolder(
  name: string,
  parentFolderId?: string,
  color?: string,
  icon?: string
): Promise<{ success: boolean; folder?: ChefFolder; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await (supabase
    .from('chef_folders' as any)
    .insert({
      tenant_id: user.tenantId!,
      name: name.trim(),
      parent_folder_id: parentFolderId ?? null,
      color: color ?? null,
      icon: icon ?? null,
    })
    .select()
    .single() as any)

  if (error) {
    console.error('[doc-management] Create folder error:', error)
    return { success: false, error: (error as any).message }
  }

  return {
    success: true,
    folder: {
      id: data.id,
      name: data.name,
      parentFolderId: data.parent_folder_id,
      color: data.color,
      icon: data.icon,
      documentCount: 0,
      createdAt: data.created_at,
    },
  }
}

/**
 * Move a document to a folder.
 */
export async function moveDocumentToFolder(
  documentId: string,
  folderId: string | null
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('chef_documents')
    .update({ folder_id: folderId } as any)
    .eq('id', documentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[doc-management] Move document error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * List documents, optionally filtered by folder.
 */
export async function listDocuments(folderId?: string | null): Promise<ChefDocument[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('chef_documents')
    .select('id, title, type, folder_id, created_at, updated_at')
    .eq('tenant_id', user.tenantId!)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (folderId !== undefined) {
    if (folderId === null) {
      query = query.is('folder_id', null)
    } else {
      query = query.eq('folder_id', folderId)
    }
  }

  const { data } = await query

  return ((data ?? []) as any[]).map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    folderId: d.folder_id,
    folderName: null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }))
}

/**
 * Search documents by title.
 */
export async function searchDocuments(query: string): Promise<ChefDocument[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('chef_documents')
    .select('id, title, type, folder_id, created_at, updated_at')
    .eq('tenant_id', user.tenantId!)
    .ilike('title', `%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(20)

  return ((data ?? []) as any[]).map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    folderId: d.folder_id,
    folderName: null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }))
}

/**
 * Delete a folder (moves documents back to root, then deletes).
 */
export async function deleteFolder(
  folderId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Move documents out of folder first
  await supabase
    .from('chef_documents')
    .update({ folder_id: null } as any)
    .eq('folder_id', folderId)
    .eq('tenant_id', user.tenantId!)

  // Delete the folder
  const { error } = await (supabase
    .from('chef_folders' as any)
    .delete()
    .eq('id', folderId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) {
    console.error('[doc-management] Delete folder error:', error)
    return { success: false, error: (error as any).message }
  }

  return { success: true }
}

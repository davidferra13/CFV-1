'use server'

// Directory Admin Actions
// Only platform admins (ADMIN_EMAILS) can approve/revoke chefs for the public directory.

import { requireAdmin } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export type DirectoryCandidate = {
  id: string
  email: string
  display_name: string
  business_name: string
  slug: string | null
  profile_image_url: string | null
  directory_approved: boolean
  created_at: string
}

/**
 * List all chefs with their directory approval status.
 * Admin only.
 */
export async function getDirectoryCandidates(): Promise<DirectoryCandidate[]> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('chefs')
    .select(
      'id, email, display_name, business_name, slug, profile_image_url, directory_approved, created_at'
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getDirectoryCandidates]', error)
    throw new Error('Failed to load chef list')
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    email: c.email ?? '',
    display_name: c.display_name ?? '',
    business_name: c.business_name ?? '',
    slug: c.slug ?? null,
    profile_image_url: c.profile_image_url ?? null,
    directory_approved: c.directory_approved ?? false,
    created_at: c.created_at,
  }))
}

/**
 * Approve a chef for the public directory listing.
 * Admin only.
 */
export async function approveChefForDirectory(chefId: string): Promise<void> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  const { error } = await db.from('chefs').update({ directory_approved: true }).eq('id', chefId)

  if (error) {
    console.error('[approveChefForDirectory]', error)
    throw new Error('Failed to approve chef')
  }

  revalidateTag('directory-chefs')
  revalidatePath('/chefs')
  revalidatePath('/admin/directory')
}

/**
 * Revoke a chef's public directory listing.
 * Admin only.
 */
export async function revokeChefFromDirectory(chefId: string): Promise<void> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  const { error } = await db.from('chefs').update({ directory_approved: false }).eq('id', chefId)

  if (error) {
    console.error('[revokeChefFromDirectory]', error)
    throw new Error('Failed to revoke chef listing')
  }

  revalidateTag('directory-chefs')
  revalidatePath('/chefs')
  revalidatePath('/admin/directory')
}

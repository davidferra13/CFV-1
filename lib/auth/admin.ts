// Admin Access Control
// Platform-level gating separate from the chef/client/staff role system.
// Access is persisted in platform_admins and queried per-session.

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPersistedAdminAccessForAuthUser, type AdminAccessLevel } from '@/lib/auth/admin-access'

export type AdminUser = {
  id: string
  email: string
  accessLevel: AdminAccessLevel
}

/**
 * Resolve the current authenticated admin from the persisted platform_admins table.
 * Returns null for unauthenticated users and authenticated non-admins.
 */
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || !user.email) {
    return null
  }

  const access = await getPersistedAdminAccessForAuthUser(supabase as any, user.id)
  if (!access) {
    return null
  }

  return {
    id: user.id,
    email: user.email.toLowerCase(),
    accessLevel: access.accessLevel,
  }
}

/**
 * Require admin access. Throws/redirects if not authenticated or not present in platform_admins.
 * Use in app/(admin)/layout.tsx and admin server actions.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdminUser()
  if (!admin) {
    redirect('/auth/signin?redirect=/admin')
  }

  return admin
}

/**
 * Non-throwing check â€” use to conditionally render admin links in shared layouts.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const admin = await getCurrentAdminUser()
    return admin !== null
  } catch {
    return false
  }
}

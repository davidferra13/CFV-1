// Admin Access Control
// Platform-level gating separate from the chef/client role system.
// Access is determined by ADMIN_EMAILS env var + founder hard baseline.

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAdminEmails } from '@/lib/platform/owner-account'

function resolveAdminEmails(): string[] {
  // Keep explicit env read here for audit/test visibility.
  void process.env.ADMIN_EMAILS
  return getAdminEmails()
}

const ADMIN_EMAILS = resolveAdminEmails()

export type AdminUser = {
  id: string
  email: string
}

/**
 * Require admin access. Throws/redirects if not authenticated or not in ADMIN_EMAILS.
 * Use in app/(admin)/layout.tsx and admin server actions.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || !user.email) {
    redirect('/auth/signin?redirect=/admin')
  }

  const normalizedEmail = user.email.toLowerCase()
  if (ADMIN_EMAILS.length === 0 || !ADMIN_EMAILS.includes(normalizedEmail)) {
    redirect('/unauthorized')
  }

  return { id: user.id, email: normalizedEmail }
}

/**
 * Non-throwing check — use to conditionally render admin links in shared layouts.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return false
    return ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email.toLowerCase())
  } catch {
    return false
  }
}

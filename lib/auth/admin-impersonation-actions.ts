'use server'

// Admin Impersonation - Server Actions
// Start/stop impersonating a chef. Only admins can use these.
// Every start is logged to admin_audit_log (immutable, append-only).

import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const IMPERSONATE_COOKIE = 'chefflow-admin-impersonate'

/**
 * Start impersonating a chef. Sets the cookie and logs to audit trail.
 */
export async function startImpersonation(
  targetChefId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  // Verify the target chef exists
  const { data: chef } = await supabase
    .from('chefs')
    .select('id, business_name, email')
    .eq('id', targetChefId)
    .single()

  if (!chef) {
    return { success: false, error: 'Chef not found' }
  }

  // Set impersonation cookie
  const store = cookies()
  store.set(IMPERSONATE_COOKIE, targetChefId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 4, // 4 hours max, then auto-expires for safety
  })

  // Log to immutable audit trail
  await supabase.from('admin_audit_log').insert({
    actor_email: admin.email,
    actor_user_id: admin.id,
    action_type: 'impersonation_start',
    target_id: targetChefId,
    target_type: 'chef',
    details: {
      chef_name: chef.business_name,
      chef_email: chef.email,
    },
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Stop impersonating. Clears the cookie and logs to audit trail.
 */
export async function stopImpersonation(): Promise<void> {
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  // Read current target before clearing
  const store = cookies()
  const targetChefId = store.get(IMPERSONATE_COOKIE)?.value

  // Clear cookie
  store.delete(IMPERSONATE_COOKIE)

  // Log to audit trail
  if (targetChefId) {
    await supabase.from('admin_audit_log').insert({
      actor_email: admin.email,
      actor_user_id: admin.id,
      action_type: 'impersonation_stop',
      target_id: targetChefId,
      target_type: 'chef',
      details: {},
    })
  }

  revalidatePath('/', 'layout')
}

/**
 * Get the impersonated chef's display info (for the banner).
 * Returns null if not impersonating.
 */
export async function getImpersonatedChefInfo(): Promise<{
  id: string
  businessName: string | null
  email: string | null
} | null> {
  try {
    await requireAdmin()
  } catch {
    return null
  }

  const store = cookies()
  const targetChefId = store.get(IMPERSONATE_COOKIE)?.value
  if (!targetChefId) return null

  const supabase = createAdminClient()
  const { data: chef } = await supabase
    .from('chefs')
    .select('id, business_name, email')
    .eq('id', targetChefId)
    .single()

  if (!chef) return null

  return {
    id: chef.id,
    businessName: chef.business_name,
    email: chef.email,
  }
}

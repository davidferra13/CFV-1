'use server'

// Admin Client Impersonation - Server Actions
// Start/stop impersonating a client. Only admins can use these.
// Every start/stop is logged to admin_audit_log (immutable, append-only).

import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const CLIENT_IMPERSONATE_COOKIE = 'chefflow-admin-impersonate-client'

/**
 * Start impersonating a client. Sets the cookie and logs to audit trail.
 */
export async function startClientImpersonation(
  targetClientId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  // Verify the target client exists
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, email, tenant_id')
    .eq('id', targetClientId)
    .single()

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Set client impersonation cookie
  const store = cookies()
  store.set(CLIENT_IMPERSONATE_COOKIE, targetClientId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 4, // 4 hours max, then auto-expires for safety
  })

  // Log to immutable audit trail
  await supabase.from('admin_audit_log').insert({
    actor_email: admin.email,
    actor_user_id: admin.id,
    action_type: 'client_impersonation_start',
    target_id: targetClientId,
    target_type: 'client',
    details: {
      client_name: client.full_name,
      client_email: client.email,
      chef_tenant_id: client.tenant_id,
    },
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Stop impersonating a client. Clears the cookie and logs to audit trail.
 */
export async function stopClientImpersonation(): Promise<void> {
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  // Read current target before clearing
  const store = cookies()
  const targetClientId = store.get(CLIENT_IMPERSONATE_COOKIE)?.value

  // Clear cookie
  store.delete(CLIENT_IMPERSONATE_COOKIE)

  // Log to audit trail
  if (targetClientId) {
    await supabase.from('admin_audit_log').insert({
      actor_email: admin.email,
      actor_user_id: admin.id,
      action_type: 'client_impersonation_stop',
      target_id: targetClientId,
      target_type: 'client',
      details: {},
    })
  }

  revalidatePath('/', 'layout')
}

/**
 * Get the impersonated client's display info (for the banner).
 * Returns null if not impersonating a client.
 */
export async function getImpersonatedClientInfo(): Promise<{
  id: string
  fullName: string | null
  email: string | null
  chefBusinessName: string | null
} | null> {
  try {
    await requireAdmin()
  } catch {
    return null
  }

  const store = cookies()
  const targetClientId = store.get(CLIENT_IMPERSONATE_COOKIE)?.value
  if (!targetClientId) return null

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, email, tenant_id')
    .eq('id', targetClientId)
    .single()

  if (!client) return null

  // Also get the chef's business name for context
  let chefBusinessName: string | null = null
  if (client.tenant_id) {
    const { data: chef } = await supabase
      .from('chefs')
      .select('business_name')
      .eq('id', client.tenant_id)
      .single()
    chefBusinessName = chef?.business_name ?? null
  }

  return {
    id: client.id,
    fullName: client.full_name,
    email: client.email,
    chefBusinessName,
  }
}

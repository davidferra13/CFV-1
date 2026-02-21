'use server'

// Admin Chef Management Actions — deactivation, reactivation, ledger corrections
// All mutations require admin auth and are audit-logged.

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { logAdminAction } from './audit'
import { revalidatePath } from 'next/cache'

// ─── Account Status ──────────────────────────────────────────────────────────

/**
 * Suspend a chef account. Prevents portal login by blocking requireChef().
 */
export async function suspendChef(
  chefId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const supabase: any = createAdminClient()

  const { error } = await supabase
    .from('chefs')
    .update({ account_status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', chefId)

  if (error) {
    console.error('[Admin] suspendChef error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'account_deactivated',
    targetId: chefId,
    targetType: 'chef',
    details: { reason: 'admin suspension' },
  })

  revalidatePath(`/admin/users/${chefId}`)
  revalidatePath('/admin/users')
  return { success: true }
}

/**
 * Reactivate a previously suspended chef account.
 */
export async function reactivateChef(
  chefId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const supabase: any = createAdminClient()

  const { error } = await supabase
    .from('chefs')
    .update({ account_status: 'active', updated_at: new Date().toISOString() })
    .eq('id', chefId)

  if (error) {
    console.error('[Admin] reactivateChef error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'account_reactivated',
    targetId: chefId,
    targetType: 'chef',
    details: {},
  })

  revalidatePath(`/admin/users/${chefId}`)
  revalidatePath('/admin/users')
  return { success: true }
}

// ─── Admin Ledger Corrections ────────────────────────────────────────────────

/**
 * Issue an admin credit or adjustment to a chef's ledger.
 * Appends a new immutable ledger entry of type 'adjustment'.
 * This is the correct, additive approach — the ledger is never modified.
 */
export async function issueAdminCredit(params: {
  chefId: string
  eventId?: string
  amountCents: number
  description: string
}): Promise<{ success: boolean; error?: string }> {
  const { chefId, eventId, amountCents, description } = params

  if (!description.trim()) {
    return { success: false, error: 'A description is required for all admin credits.' }
  }
  if (amountCents === 0) {
    return { success: false, error: 'Amount cannot be zero.' }
  }

  const admin = await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('ledger_entries').insert({
    tenant_id: chefId,
    event_id: eventId ?? null,
    entry_type: 'adjustment',
    amount_cents: amountCents,
    description: `[Admin Credit] ${description.trim()} — issued by ${admin.email}`,
  } as any)

  if (error) {
    console.error('[Admin] issueAdminCredit error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: 'admin_toggled_flag', // closest available — ideally add 'admin_ledger_correction' in future
    targetId: chefId,
    targetType: 'chef',
    details: { type: 'ledger_correction', amountCents, description, eventId },
  })

  revalidatePath(`/admin/users/${chefId}`)
  return { success: true }
}

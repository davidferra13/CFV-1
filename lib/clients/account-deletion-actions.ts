'use server'

// Q57: Client account deletion (GDPR Article 17) + data export (Article 20)
// Soft-delete with 30-day grace period. Financial records retained 7 years.

import { revalidatePath } from 'next/cache'
import { requireClient, type AuthUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'
import type { ClientDeletionStatus } from './account-deletion-types'

type ClientAuditAction = 'deletion_requested' | 'deletion_cancelled' | 'data_exported'

type ClientAuditRecord = {
  auth_user_id: string | null
  email: string
  full_name: string
  tenant_id: string | null
}

function requireClientTenant(user: AuthUser): string {
  if (!user.tenantId) {
    throw new Error('Client account is missing tenant context. Please contact support.')
  }
  return user.tenantId
}

function scopeTenant(query: any, tenantId: string) {
  return query.eq('tenant_id', tenantId)
}

function getDbErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'Unknown database error'
}

async function readRequiredData<T>(label: string, query: any): Promise<T> {
  const { data, error } = await query

  if (error) {
    const message = getDbErrorMessage(error)
    console.error(`[client-data-export] ${label} query failed:`, message)
    throw new Error(`Failed to export ${label}.`)
  }

  return data as T
}

async function writeClientDeletionAudit(input: {
  user: AuthUser
  client: ClientAuditRecord
  action: ClientAuditAction
  metadata?: Record<string, unknown>
}) {
  const tenantId = requireClientTenant(input.user)

  const adminClient: any = createServerClient({ admin: true })
  const { error } = await adminClient.from('account_deletion_audit').insert({
    chef_id: tenantId,
    auth_user_id: input.client.auth_user_id || input.user.authUserId || input.user.id,
    email: input.client.email || input.user.email,
    business_name: `Client: ${input.client.full_name || 'Unknown'}`,
    action: input.action,
    metadata: {
      client_id: input.user.entityId,
      ...input.metadata,
    },
    performed_by: 'client',
  })

  if (error) {
    const message = getDbErrorMessage(error)
    console.error('[client-deletion-audit] Failed to write audit entry:', {
      action: input.action,
      clientId: input.user.entityId,
      message,
    })
    throw new Error('Failed to record account deletion audit trail.')
  }
}

export async function getClientDeletionStatus(): Promise<ClientDeletionStatus> {
  const user = await requireClient()
  const tenantId = requireClientTenant(user)
  const db: any = createServerClient()

  const { data: client, error } = await scopeTenant(
    db
      .from('clients')
      .select('account_deletion_requested_at, account_deletion_scheduled_for')
      .eq('id', user.entityId),
    tenantId
  ).single()

  if (error) {
    console.error('[client-deletion] Status query failed:', getDbErrorMessage(error))
    throw new Error('Failed to load account deletion status.')
  }

  if (!client?.account_deletion_requested_at) {
    return { isPending: false, requestedAt: null, scheduledFor: null, daysRemaining: null }
  }

  const scheduledFor = client.account_deletion_scheduled_for
  const daysRemaining = scheduledFor
    ? Math.max(
        0,
        Math.ceil((new Date(scheduledFor).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null

  return {
    isPending: true,
    requestedAt: client.account_deletion_requested_at,
    scheduledFor,
    daysRemaining,
  }
}

export async function requestClientAccountDeletion(
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const tenantId = requireClientTenant(user)
  const db: any = createServerClient()

  await checkRateLimit(`client-deletion:${user.id}`, 3, 60 * 60 * 1000)

  const { data: client, error: clientError } = await scopeTenant(
    db
      .from('clients')
      .select('auth_user_id, email, full_name, tenant_id, account_deletion_requested_at')
      .eq('id', user.entityId),
    tenantId
  ).single()

  if (clientError) {
    console.error('[client-deletion] Client lookup failed:', getDbErrorMessage(clientError))
    return { success: false, error: 'Failed to load client account.' }
  }

  if (client?.account_deletion_requested_at) {
    return { success: false, error: 'Deletion already requested.' }
  }

  const now = new Date()
  const scheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

  const { error } = await scopeTenant(
    db
      .from('clients')
      .update({
        account_deletion_requested_at: now.toISOString(),
        account_deletion_scheduled_for: scheduledFor.toISOString(),
        deletion_reason: reason?.trim().slice(0, 500) || null,
      })
      .eq('id', user.entityId),
    tenantId
  )

  if (error) {
    console.error('[client-deletion] Failed:', getDbErrorMessage(error))
    return { success: false, error: 'Failed to process request.' }
  }

  try {
    await writeClientDeletionAudit({
      user,
      client,
      action: 'deletion_requested',
      metadata: {
        reason: reason?.trim().slice(0, 500) || null,
        scheduled_for: scheduledFor.toISOString(),
      },
    })
  } catch (err) {
    console.error('[client-deletion] Audit failed after deletion request:', err)
    return { success: false, error: 'Failed to record deletion request audit trail.' }
  }

  revalidatePath('/my-profile/delete-account')

  return { success: true }
}

export async function cancelClientAccountDeletion(): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const tenantId = requireClientTenant(user)
  const db: any = createServerClient()

  const { data: client, error: clientError } = await scopeTenant(
    db
      .from('clients')
      .select('auth_user_id, email, full_name, tenant_id, account_deletion_requested_at')
      .eq('id', user.entityId),
    tenantId
  ).single()

  if (clientError) {
    console.error('[client-deletion] Cancel lookup failed:', getDbErrorMessage(clientError))
    return { success: false, error: 'Failed to load client account.' }
  }

  const { error } = await scopeTenant(
    db
      .from('clients')
      .update({
        account_deletion_requested_at: null,
        account_deletion_scheduled_for: null,
        account_deletion_cancelled_at: new Date().toISOString(),
        deletion_reason: null,
      })
      .eq('id', user.entityId),
    tenantId
  )

  if (error) {
    console.error('[client-deletion] Cancel failed:', getDbErrorMessage(error))
    return { success: false, error: 'Failed to cancel.' }
  }

  try {
    await writeClientDeletionAudit({
      user,
      client,
      action: 'deletion_cancelled',
      metadata: {
        had_pending_request: Boolean(client?.account_deletion_requested_at),
      },
    })
  } catch (err) {
    console.error('[client-deletion] Audit failed after deletion cancellation:', err)
    return { success: false, error: 'Failed to record deletion cancellation audit trail.' }
  }

  revalidatePath('/my-profile/delete-account')

  return { success: true }
}

/**
 * GDPR Article 20: Data portability export.
 * Returns all client-owned data as JSON.
 */
export async function exportClientData(): Promise<{ data: Record<string, any> }> {
  const user = await requireClient()
  const tenantId = requireClientTenant(user)
  const db: any = createServerClient()

  await checkRateLimit(`client-export:${user.id}`, 3, 60 * 60 * 1000)

  const clientQuery = scopeTenant(
    db.from('clients').select('*').eq('id', user.entityId),
    tenantId
  ).single()

  const client = await readRequiredData<any>('client profile', clientQuery)

  const events = await readRequiredData<any[]>(
    'events',
    scopeTenant(
      db
        .from('events')
        .select(
          'id, occasion, event_date, guest_count, status, serve_time, location_address, location_city, location_state, created_at'
        )
        .eq('client_id', user.entityId)
        .order('event_date', { ascending: false }),
      tenantId
    )
  )

  const inquiries = await readRequiredData<any[]>(
    'inquiries',
    scopeTenant(
      db
        .from('inquiries')
        .select(
          'id, channel, confirmed_occasion, confirmed_date, confirmed_guest_count, status, created_at'
        )
        .eq('client_id', user.entityId)
        .order('created_at', { ascending: false }),
      tenantId
    )
  )

  const quotes = await readRequiredData<any[]>(
    'quotes',
    scopeTenant(
      db
        .from('quotes')
        .select('id, total_quoted_cents, status, version, created_at, valid_until')
        .eq('client_id', user.entityId)
        .order('created_at', { ascending: false }),
      tenantId
    )
  )

  const messages = await readRequiredData<any[]>(
    'messages',
    scopeTenant(
      db
        .from('messages')
        .select('id, direction, channel, subject, body, status, sent_at, created_at')
        .eq('client_id', user.entityId)
        .order('created_at', { ascending: true }),
      tenantId
    )
  )

  const allergyRecords = await readRequiredData<any[]>(
    'allergy records',
    scopeTenant(
      db
        .from('client_allergy_records')
        .select('allergen, severity, source, confirmed_by_chef, notes, created_at')
        .eq('client_id', user.entityId),
      tenantId
    )
  )

  const clientNotes = await readRequiredData<any[]>(
    'client notes',
    scopeTenant(
      db
        .from('client_notes')
        .select('note_text, category, pinned, created_at')
        .eq('client_id', user.entityId),
      tenantId
    )
  )

  const photos = await readRequiredData<any[]>(
    'photo metadata',
    scopeTenant(
      db
        .from('client_photos')
        .select('caption, category, created_at')
        .eq('client_id', user.entityId)
        .is('deleted_at', null),
      tenantId
    )
  )

  const tasteProfile = await readRequiredData<any[]>(
    'taste profile',
    scopeTenant(
      db.from('client_taste_profiles').select('*').eq('client_id', user.entityId).limit(1),
      tenantId
    )
  )

  const kitchenInventory = await readRequiredData<any[]>(
    'kitchen inventory',
    scopeTenant(
      db
        .from('client_kitchen_inventory')
        .select('category, item_name, quantity, notes')
        .eq('client_id', user.entityId),
      tenantId
    )
  )

  const intakeResponses = await readRequiredData<any[]>(
    'intake responses',
    scopeTenant(
      db
        .from('client_intake_responses')
        .select('responses, submitted_at, applied_at')
        .eq('client_id', user.entityId),
      tenantId
    )
  )

  const mealRequests = await readRequiredData<any[]>(
    'meal requests',
    scopeTenant(
      db
        .from('client_meal_requests')
        .select('request_type, dish_name, notes, status, created_at')
        .eq('client_id', user.entityId),
      tenantId
    )
  )

  const referrals = await readRequiredData<any[]>(
    'referrals',
    scopeTenant(
      db
        .from('client_referrals')
        .select('referral_code, status, created_at')
        .eq('referrer_client_id', user.entityId),
      tenantId
    )
  )

  const ndaRecords = await readRequiredData<any[]>(
    'NDA records',
    scopeTenant(
      db
        .from('client_ndas')
        .select('nda_type, status, signed_date, expiry_date, created_at')
        .eq('client_id', user.entityId),
      tenantId
    )
  )

  const ledgerEntries = await readRequiredData<any[]>(
    'financial records',
    scopeTenant(
      db
        .from('ledger_entries')
        .select('entry_type, amount_cents, description, created_at')
        .eq('client_id', user.entityId),
      tenantId
    )
  )

  await writeClientDeletionAudit({
    user,
    client,
    action: 'data_exported',
    metadata: {
      exported_sections: [
        'profile',
        'events',
        'inquiries',
        'quotes',
        'messages',
        'allergyRecords',
        'notes',
        'photos',
        'tasteProfile',
        'kitchenInventory',
        'intakeResponses',
        'mealRequests',
        'referrals',
        'ndaRecords',
        'financialRecords',
      ],
    },
  })

  const sanitized = { ...client }
  delete sanitized.tenant_id
  delete sanitized.portal_access_token
  delete sanitized.portal_access_token_hash
  delete sanitized.stripe_customer_id

  return {
    data: {
      exportedAt: new Date().toISOString(),
      profile: sanitized,
      events,
      inquiries,
      quotes,
      messages,
      allergyRecords,
      notes: clientNotes,
      photos,
      tasteProfile: tasteProfile?.[0] || null,
      kitchenInventory,
      intakeResponses,
      mealRequests,
      referrals,
      ndaRecords,
      financialRecords: ledgerEntries,
    },
  }
}

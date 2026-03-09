'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { checkRateLimit } from '@/lib/rateLimit'
import { ClientAccountDeletionCancelledEmail } from '@/lib/email/templates/client-account-deletion-cancelled'
import { ClientAccountDeletionRequestedEmail } from '@/lib/email/templates/client-account-deletion-requested'

const ClientNotificationPreferencesSchema = z.object({
  marketingEmails: z.boolean(),
  eventUpdates: z.boolean(),
  paymentReceipts: z.boolean(),
  loyaltyUpdates: z.boolean(),
  postEventFollowups: z.boolean(),
  availabilitySignals: z.boolean(),
})

export type ClientNotificationPreferences = z.infer<typeof ClientNotificationPreferencesSchema>

export type ClientDeletionStatus = {
  isPending: boolean
  requestedAt: string | null
  scheduledFor: string | null
  cancelledAt: string | null
  daysRemaining: number | null
  reason: string | null
}

export type ClientRecentSession = {
  id: string
  occurredAt: string
  pagePath: string | null
  deviceLabel: string | null
  locationLabel: string | null
  eventType: string
}

const EMAIL_CATEGORY_MAP = {
  eventUpdates: 'event',
  paymentReceipts: 'payment',
  loyaltyUpdates: 'loyalty',
  postEventFollowups: 'review',
} as const

function computeDaysRemaining(scheduledFor: string | null): number | null {
  if (!scheduledFor) return null
  const scheduledDate = new Date(scheduledFor)
  const diffMs = scheduledDate.getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

function buildLocationLabel(metadata: Record<string, unknown>): string | null {
  const city = typeof metadata.location_city === 'string' ? metadata.location_city : null
  const region = typeof metadata.location_region === 'string' ? metadata.location_region : null
  const country = typeof metadata.location_country === 'string' ? metadata.location_country : null

  const primary = [city, region].filter(Boolean).join(', ')
  if (primary && country) return `${primary}, ${country}`
  return primary || country || null
}

async function sendDeletionRequestedEmail(input: {
  email: string | null
  fullName: string | null
  scheduledFor: string
}) {
  if (!input.email) return

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

  await sendEmail({
    to: input.email,
    subject: 'Your ChefFlow account deletion request is scheduled',
    react: ClientAccountDeletionRequestedEmail({
      name: input.fullName || 'there',
      scheduledFor: input.scheduledFor,
      manageUrl: `${siteUrl}/my-profile`,
    }),
  })
}

async function sendDeletionCancelledEmail(input: {
  email: string | null
  fullName: string | null
}) {
  if (!input.email) return

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

  await sendEmail({
    to: input.email,
    subject: 'Your ChefFlow deletion request was cancelled',
    react: ClientAccountDeletionCancelledEmail({
      name: input.fullName || 'there',
      manageUrl: `${siteUrl}/my-profile`,
    }),
  })
}

export async function getMyNotificationPreferences(): Promise<ClientNotificationPreferences> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const [{ data: client }, { data: rows }] = await Promise.all([
    supabase
      .from('clients')
      .select('marketing_unsubscribed, availability_signal_notifications')
      .eq('id', user.entityId)
      .single(),
    supabase
      .from('notification_preferences')
      .select('category, email_enabled')
      .eq('auth_user_id', user.id)
      .in('category', Object.values(EMAIL_CATEGORY_MAP)),
  ])

  const preferenceMap = new Map<string, boolean | null>(
    ((rows || []) as Array<{ category: string; email_enabled: boolean | null }>).map((row) => [
      row.category,
      row.email_enabled,
    ])
  )

  return {
    marketingEmails: !(client?.marketing_unsubscribed ?? false),
    eventUpdates: preferenceMap.get('event') ?? true,
    paymentReceipts: preferenceMap.get('payment') ?? true,
    loyaltyUpdates: preferenceMap.get('loyalty') ?? true,
    postEventFollowups: preferenceMap.get('review') ?? true,
    availabilitySignals: client?.availability_signal_notifications ?? true,
  }
}

export async function updateMyNotificationPreferences(
  input: ClientNotificationPreferences
): Promise<{ success: true }> {
  const user = await requireClient()
  const validated = ClientNotificationPreferencesSchema.parse(input)
  const supabase: any = createServerClient()

  const { error: clientUpdateError } = await supabase
    .from('clients')
    .update({
      marketing_unsubscribed: !validated.marketingEmails,
      marketing_unsubscribed_at: validated.marketingEmails ? null : new Date().toISOString(),
      availability_signal_notifications: validated.availabilitySignals,
    })
    .eq('id', user.entityId)

  if (clientUpdateError) {
    console.error('[updateMyNotificationPreferences] Client update failed:', clientUpdateError)
    throw new Error('Failed to update notification preferences')
  }

  if (user.tenantId) {
    const categoryEntries = Object.entries(EMAIL_CATEGORY_MAP) as Array<
      [
        keyof typeof EMAIL_CATEGORY_MAP,
        (typeof EMAIL_CATEGORY_MAP)[keyof typeof EMAIL_CATEGORY_MAP],
      ]
    >

    const { data: existingRows, error: existingRowsError } = await supabase
      .from('notification_preferences')
      .select('id, category')
      .eq('auth_user_id', user.id)
      .in('category', Object.values(EMAIL_CATEGORY_MAP))

    if (existingRowsError) {
      console.error(
        '[updateMyNotificationPreferences] Preference lookup failed:',
        existingRowsError
      )
      throw new Error('Failed to update notification preferences')
    }

    const existingByCategory = new Map<string, string>(
      ((existingRows || []) as Array<{ id: string; category: string }>).map((row) => [
        row.category,
        row.id,
      ])
    )

    for (const [inputKey, category] of categoryEntries) {
      const emailEnabled = validated[inputKey]
      const existingId = existingByCategory.get(category)

      if (existingId) {
        const { error } = await supabase
          .from('notification_preferences')
          .update({
            email_enabled: emailEnabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingId)

        if (error) {
          console.error('[updateMyNotificationPreferences] Preference update failed:', {
            category,
            error,
          })
          throw new Error('Failed to update notification preferences')
        }
      } else {
        const { error } = await supabase.from('notification_preferences').insert({
          tenant_id: user.tenantId,
          auth_user_id: user.id,
          category,
          email_enabled: emailEnabled,
        })

        if (error) {
          console.error('[updateMyNotificationPreferences] Preference insert failed:', {
            category,
            error,
          })
          throw new Error('Failed to update notification preferences')
        }
      }
    }
  }

  revalidatePath('/my-profile')
  return { success: true }
}

export async function getMyDeletionStatus(): Promise<ClientDeletionStatus> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select(
      'account_deletion_requested_at, account_deletion_scheduled_for, account_deletion_cancelled_at, deletion_reason'
    )
    .eq('id', user.entityId)
    .single()

  if (error || !client?.account_deletion_requested_at) {
    return {
      isPending: false,
      requestedAt: null,
      scheduledFor: null,
      cancelledAt: null,
      daysRemaining: null,
      reason: null,
    }
  }

  return {
    isPending: true,
    requestedAt: client.account_deletion_requested_at,
    scheduledFor: client.account_deletion_scheduled_for,
    cancelledAt: client.account_deletion_cancelled_at,
    daysRemaining: computeDaysRemaining(client.account_deletion_scheduled_for),
    reason: client.deletion_reason,
  }
}

export async function getMyRecentSessionHistory(): Promise<ClientRecentSession[]> {
  const user = await requireClient()
  const adminSupabase: any = createServerClient({ admin: true })

  const { data, error } = await adminSupabase
    .from('activity_events')
    .select('id, event_type, created_at, metadata')
    .eq('actor_id', user.id)
    .eq('client_id', user.entityId)
    .in('event_type', ['portal_login', 'page_viewed', 'payment_page_visited'])
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    console.error('[getMyRecentSessionHistory] Failed to load recent activity:', error)
    return []
  }

  const rows = (
    (data ?? []) as Array<{
      id: string
      event_type: string
      created_at: string
      metadata: Record<string, unknown> | null
    }>
  ).filter((row) => row.event_type === 'portal_login')

  const relevantRows = (rows.length > 0 ? rows : (data ?? [])).slice(0, 5)

  return relevantRows.map((row) => {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>

    return {
      id: row.id,
      occurredAt: row.created_at,
      pagePath: typeof metadata.page_path === 'string' ? metadata.page_path : null,
      deviceLabel: typeof metadata.device_label === 'string' ? metadata.device_label : null,
      locationLabel: buildLocationLabel(metadata),
      eventType: row.event_type,
    }
  })
}

export async function requestAccountDeletion(reason?: string): Promise<{ success: true }> {
  const user = await requireClient()
  const adminSupabase: any = createServerClient({ admin: true })

  await checkRateLimit(`client-account-deletion:${user.id}`, 3, 60 * 60 * 1000)

  const { data: client, error: clientError } = await adminSupabase
    .from('clients')
    .select('id, full_name, email, account_deletion_requested_at')
    .eq('id', user.entityId)
    .single()

  if (clientError || !client) {
    console.error('[requestAccountDeletion] Client lookup failed:', clientError)
    throw new Error('Failed to load your account')
  }

  if (client.account_deletion_requested_at) {
    throw new Error('An account deletion request is already pending')
  }

  const scheduledFor = new Date()
  scheduledFor.setDate(scheduledFor.getDate() + 30)

  const { error: updateError } = await adminSupabase
    .from('clients')
    .update({
      account_deletion_requested_at: new Date().toISOString(),
      account_deletion_scheduled_for: scheduledFor.toISOString(),
      account_deletion_cancelled_at: null,
      deletion_reason: reason?.trim() || null,
    })
    .eq('id', user.entityId)

  if (updateError) {
    console.error('[requestAccountDeletion] Update failed:', updateError)
    throw new Error('Failed to request account deletion')
  }

  sendDeletionRequestedEmail({
    email: client.email,
    fullName: client.full_name,
    scheduledFor: scheduledFor.toISOString(),
  }).catch((error) =>
    console.error('[requestAccountDeletion] Confirmation email failed (non-blocking):', error)
  )

  revalidatePath('/my-profile')
  return { success: true }
}

export async function cancelAccountDeletion(): Promise<{ success: true }> {
  const user = await requireClient()
  const adminSupabase: any = createServerClient({ admin: true })

  const { data: client, error: clientError } = await adminSupabase
    .from('clients')
    .select('id, full_name, email, account_deletion_requested_at')
    .eq('id', user.entityId)
    .single()

  if (clientError || !client) {
    console.error('[cancelAccountDeletion] Client lookup failed:', clientError)
    throw new Error('Failed to load your account')
  }

  if (!client.account_deletion_requested_at) {
    throw new Error('No deletion request is pending')
  }

  const { error: updateError } = await adminSupabase
    .from('clients')
    .update({
      account_deletion_requested_at: null,
      account_deletion_scheduled_for: null,
      account_deletion_cancelled_at: new Date().toISOString(),
      deletion_reason: null,
    })
    .eq('id', user.entityId)

  if (updateError) {
    console.error('[cancelAccountDeletion] Update failed:', updateError)
    throw new Error('Failed to cancel account deletion')
  }

  sendDeletionCancelledEmail({
    email: client.email,
    fullName: client.full_name,
  }).catch((error) =>
    console.error('[cancelAccountDeletion] Confirmation email failed (non-blocking):', error)
  )

  revalidatePath('/my-profile')
  return { success: true }
}

export async function exportMyClientData(): Promise<Record<string, unknown>> {
  const user = await requireClient()
  const supabase: any = createServerClient({ admin: true })
  const MAX_EXPORT_ROWS = 10_000

  async function safeQuery(
    table: string,
    column: string,
    value: string,
    columns: string = '*'
  ): Promise<Record<string, unknown>[]> {
    try {
      const { data } = await supabase
        .from(table)
        .select(columns)
        .eq(column, value)
        .limit(MAX_EXPORT_ROWS)
      return (data || []) as Record<string, unknown>[]
    } catch (error) {
      console.error(`[exportMyClientData] Safe query failed for ${table}:`, error)
      return []
    }
  }

  const [{ data: clientProfile }, notificationPreferences] = await Promise.all([
    supabase.from('clients').select('*').eq('id', user.entityId).single(),
    getMyNotificationPreferences(),
  ])

  const conversationParticipants = await safeQuery(
    'conversation_participants',
    'auth_user_id',
    user.id,
    'conversation_id, role, last_read_at, notifications_muted, joined_at'
  )

  const conversationIds = conversationParticipants
    .map((row) => row.conversation_id)
    .filter((value): value is string => typeof value === 'string')

  const [events, quotes, ledgerEntries, crmMessages, reviews, loyaltyTransactions, inquiries] =
    await Promise.all([
      safeQuery('events', 'client_id', user.entityId),
      safeQuery('quotes', 'client_id', user.entityId),
      safeQuery('ledger_entries', 'client_id', user.entityId),
      safeQuery('messages', 'client_id', user.entityId),
      safeQuery('client_reviews', 'client_id', user.entityId),
      safeQuery('loyalty_transactions', 'client_id', user.entityId),
      safeQuery('inquiries', 'client_id', user.entityId),
    ])

  let conversations: Record<string, unknown>[] = []
  let chatMessages: Record<string, unknown>[] = []

  if (conversationIds.length > 0) {
    try {
      const [{ data: conversationRows }, { data: messageRows }] = await Promise.all([
        supabase.from('conversations').select('*').in('id', conversationIds).limit(MAX_EXPORT_ROWS),
        supabase
          .from('chat_messages')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: true })
          .limit(MAX_EXPORT_ROWS),
      ])

      conversations = (conversationRows || []) as Record<string, unknown>[]
      chatMessages = (messageRows || []) as Record<string, unknown>[]
    } catch (error) {
      console.error('[exportMyClientData] Chat export failed:', error)
    }
  }

  return {
    exported_at: new Date().toISOString(),
    export_format_version: '1.0',
    client_id: user.entityId,
    auth_user_id: user.id,
    tenant_id: user.tenantId,
    data: {
      profile: clientProfile,
      preferences: notificationPreferences,
      events,
      inquiries,
      quotes,
      payments: ledgerEntries,
      reviews,
      loyalty_transactions: loyaltyTransactions,
      communication: {
        crm_messages: crmMessages,
        conversations,
        conversation_participants: conversationParticipants,
        chat_messages: chatMessages,
      },
      dietary_profile: {
        dietary_restrictions: clientProfile?.dietary_restrictions || [],
        dietary_protocols: clientProfile?.dietary_protocols || [],
        allergies: clientProfile?.allergies || [],
        dislikes: clientProfile?.dislikes || [],
        favorite_cuisines: clientProfile?.favorite_cuisines || [],
        favorite_dishes: clientProfile?.favorite_dishes || [],
      },
    },
  }
}

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

export type GoogleMailboxStatus = 'idle' | 'in_progress' | 'completed' | 'paused'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export interface GoogleMailboxRecord {
  id: string
  chefId: string
  tenantId: string
  email: string
  normalizedEmail: string
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: string | null
  scopes: string[]
  gmailConnected: boolean
  gmailHistoryId: string | null
  gmailLastSyncAt: string | null
  gmailSyncErrors: number
  historicalScanEnabled: boolean
  historicalScanIncludeSpamTrash: boolean
  historicalScanStatus: GoogleMailboxStatus
  historicalScanPageToken: string | null
  historicalScanTotalProcessed: number
  historicalScanTotalSeen: number
  historicalScanResultSizeEstimate: number | null
  historicalScanLookbackDays: number
  historicalScanStartedAt: string | null
  historicalScanCompletedAt: string | null
  historicalScanLastRunAt: string | null
  isPrimary: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GoogleMailboxSummary {
  id: string
  email: string
  connected: boolean
  isPrimary: boolean
  isActive: boolean
  lastSync: string | null
  errorCount: number
  scanEnabled: boolean
  scanStatus: GoogleMailboxStatus
  totalProcessed: number
  totalSeen: number
  estimatedTotal: number | null
  includeSpamTrash: boolean
}

type DbClient = any

const GOOGLE_MAILBOX_SELECT = `
  id,
  chef_id,
  tenant_id,
  email,
  normalized_email,
  access_token,
  refresh_token,
  token_expires_at,
  scopes,
  gmail_connected,
  gmail_history_id,
  gmail_last_sync_at,
  gmail_sync_errors,
  historical_scan_enabled,
  historical_scan_include_spam_trash,
  historical_scan_status,
  historical_scan_page_token,
  historical_scan_total_processed,
  historical_scan_total_seen,
  historical_scan_result_size_estimate,
  historical_scan_lookback_days,
  historical_scan_started_at,
  historical_scan_completed_at,
  historical_scan_last_run_at,
  is_primary,
  is_active,
  created_at,
  updated_at
`

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getLegacyChefIdFromMailboxId(mailboxId: string) {
  return mailboxId.startsWith('legacy-') ? mailboxId.slice('legacy-'.length) : null
}

export function isPersistedGoogleMailboxId(mailboxId: string | null | undefined) {
  return Boolean(mailboxId && !mailboxId.startsWith('legacy-'))
}

async function getLegacyMailboxForChef(supabase: DbClient, chefId: string) {
  const { data: legacyRow, error } = await supabase
    .from('google_connections')
    .select(
      'chef_id, tenant_id, connected_email, access_token, refresh_token, token_expires_at, scopes, gmail_connected, gmail_history_id, gmail_last_sync_at, gmail_sync_errors, historical_scan_enabled, historical_scan_include_spam_trash, historical_scan_status, historical_scan_page_token, historical_scan_total_processed, historical_scan_total_seen, historical_scan_result_size_estimate, historical_scan_lookback_days, historical_scan_started_at, historical_scan_completed_at, historical_scan_last_run_at, created_at, updated_at'
    )
    .eq('chef_id', chefId)
    .maybeSingle()

  if (error || !legacyRow || !legacyRow.connected_email) {
    return null
  }

  return mapLegacyMailboxRow(legacyRow as Record<string, unknown>, chefId)
}

function mapMailboxRow(row: Record<string, unknown>): GoogleMailboxRecord {
  return {
    id: String(row.id),
    chefId: String(row.chef_id),
    tenantId: String(row.tenant_id),
    email: String(row.email),
    normalizedEmail: String(row.normalized_email ?? normalizeEmail(String(row.email))),
    accessToken: (row.access_token as string | null) ?? null,
    refreshToken: (row.refresh_token as string | null) ?? null,
    tokenExpiresAt: (row.token_expires_at as string | null) ?? null,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    gmailConnected: Boolean(row.gmail_connected),
    gmailHistoryId: (row.gmail_history_id as string | null) ?? null,
    gmailLastSyncAt: (row.gmail_last_sync_at as string | null) ?? null,
    gmailSyncErrors: Number(row.gmail_sync_errors ?? 0),
    historicalScanEnabled: Boolean(row.historical_scan_enabled),
    historicalScanIncludeSpamTrash:
      row.historical_scan_include_spam_trash == null
        ? true
        : Boolean(row.historical_scan_include_spam_trash),
    historicalScanStatus: (row.historical_scan_status as GoogleMailboxStatus) ?? 'idle',
    historicalScanPageToken: (row.historical_scan_page_token as string | null) ?? null,
    historicalScanTotalProcessed: Number(row.historical_scan_total_processed ?? 0),
    historicalScanTotalSeen: Number(row.historical_scan_total_seen ?? 0),
    historicalScanResultSizeEstimate:
      row.historical_scan_result_size_estimate == null
        ? null
        : Number(row.historical_scan_result_size_estimate),
    historicalScanLookbackDays: Number(row.historical_scan_lookback_days ?? 0),
    historicalScanStartedAt: (row.historical_scan_started_at as string | null) ?? null,
    historicalScanCompletedAt: (row.historical_scan_completed_at as string | null) ?? null,
    historicalScanLastRunAt: (row.historical_scan_last_run_at as string | null) ?? null,
    isPrimary: Boolean(row.is_primary),
    isActive: row.is_active == null ? true : Boolean(row.is_active),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  }
}

function mapLegacyMailboxRow(row: Record<string, unknown>, chefId: string): GoogleMailboxRecord {
  const email = String(row.connected_email ?? '')
  return {
    id: `legacy-${chefId}`,
    chefId,
    tenantId: String(row.tenant_id ?? chefId),
    email,
    normalizedEmail: normalizeEmail(email),
    accessToken: (row.access_token as string | null) ?? null,
    refreshToken: (row.refresh_token as string | null) ?? null,
    tokenExpiresAt: (row.token_expires_at as string | null) ?? null,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    gmailConnected: Boolean(row.gmail_connected),
    gmailHistoryId: (row.gmail_history_id as string | null) ?? null,
    gmailLastSyncAt: (row.gmail_last_sync_at as string | null) ?? null,
    gmailSyncErrors: Number(row.gmail_sync_errors ?? 0),
    historicalScanEnabled: Boolean(row.historical_scan_enabled),
    historicalScanIncludeSpamTrash:
      row.historical_scan_include_spam_trash == null
        ? true
        : Boolean(row.historical_scan_include_spam_trash),
    historicalScanStatus: (row.historical_scan_status as GoogleMailboxStatus) ?? 'idle',
    historicalScanPageToken: (row.historical_scan_page_token as string | null) ?? null,
    historicalScanTotalProcessed: Number(row.historical_scan_total_processed ?? 0),
    historicalScanTotalSeen: Number(
      row.historical_scan_total_seen ?? row.historical_scan_total_processed ?? 0
    ),
    historicalScanResultSizeEstimate:
      row.historical_scan_result_size_estimate == null
        ? null
        : Number(row.historical_scan_result_size_estimate),
    historicalScanLookbackDays: Number(row.historical_scan_lookback_days ?? 0),
    historicalScanStartedAt: (row.historical_scan_started_at as string | null) ?? null,
    historicalScanCompletedAt: (row.historical_scan_completed_at as string | null) ?? null,
    historicalScanLastRunAt: (row.historical_scan_last_run_at as string | null) ?? null,
    isPrimary: true,
    isActive: Boolean(row.gmail_connected),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  }
}

async function loadGoogleMailboxes(
  supabase: DbClient,
  chefId: string,
  includeInactive = true
): Promise<GoogleMailboxRecord[]> {
  try {
    let query = supabase
      .from('google_mailboxes')
      .select(GOOGLE_MAILBOX_SELECT)
      .eq('chef_id', chefId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map((row: Record<string, unknown>) => mapMailboxRow(row))
  } catch {
    const legacyMailbox = await getLegacyMailboxForChef(supabase, chefId)
    return legacyMailbox ? [legacyMailbox] : []
  }
}

async function getAdminMailboxes(chefId: string, includeInactive = true) {
  const supabase = createAdminClient() as any
  return loadGoogleMailboxes(supabase, chefId, includeInactive)
}

export async function listGoogleMailboxesForChef(chefId: string) {
  return getAdminMailboxes(chefId, true)
}

export async function listActiveGoogleMailboxesForChef(chefId: string) {
  return getAdminMailboxes(chefId, false)
}

export async function listGoogleMailboxesForCurrentChef() {
  const supabase = createServerClient() as any
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: role } = await supabase
    .from('user_roles')
    .select('entity_id, role')
    .eq('auth_user_id', user.id)
    .eq('role', 'chef')
    .maybeSingle()

  if (!role?.entity_id) return []

  return loadGoogleMailboxes(supabase, role.entity_id, true)
}

export async function getGoogleMailboxById(mailboxId: string) {
  const supabase = createAdminClient() as any
  const legacyChefId = getLegacyChefIdFromMailboxId(mailboxId)
  if (legacyChefId) {
    return getLegacyMailboxForChef(supabase, legacyChefId)
  }

  const { data, error } = await supabase
    .from('google_mailboxes')
    .select(GOOGLE_MAILBOX_SELECT)
    .eq('id', mailboxId)
    .maybeSingle()

  if (error || !data) return null
  return mapMailboxRow(data as Record<string, unknown>)
}

export async function getGoogleMailboxAccessToken(mailboxId: string): Promise<string> {
  const supabase = createAdminClient() as any
  const mailbox = await getGoogleMailboxById(mailboxId)

  if (!mailbox) {
    throw new Error('Google mailbox not connected')
  }

  if (!mailbox.refreshToken) {
    throw new Error('No refresh token - please reconnect your Google account')
  }

  const expiresAt = mailbox.tokenExpiresAt ? new Date(mailbox.tokenExpiresAt) : new Date(0)
  const bufferMs = 5 * 60 * 1000
  if (mailbox.accessToken && expiresAt.getTime() > Date.now() + bufferMs) {
    return mailbox.accessToken
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Google integration not configured')
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: mailbox.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    if (isPersistedGoogleMailboxId(mailboxId)) {
      await supabase
        .from('google_mailboxes')
        .update({
          gmail_connected: false,
          gmail_sync_errors: mailbox.gmailSyncErrors + 1,
          is_active: false,
          is_primary: false,
        })
        .eq('id', mailboxId)
    } else {
      await supabase
        .from('google_connections')
        .update({
          gmail_connected: false,
          gmail_sync_errors: mailbox.gmailSyncErrors + 1,
        })
        .eq('chef_id', mailbox.chefId)
    }

    await syncLegacyGoogleConnectionFromPrimary(mailbox.chefId, mailbox.tenantId)
    throw new Error('Gmail connection expired. Please reconnect your Google account in Settings.')
  }

  const tokens = await response.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  if (isPersistedGoogleMailboxId(mailboxId)) {
    await supabase
      .from('google_mailboxes')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt,
        gmail_connected: true,
        is_active: true,
      })
      .eq('id', mailboxId)
  } else {
    await supabase
      .from('google_connections')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt,
        gmail_connected: true,
      })
      .eq('chef_id', mailbox.chefId)
  }

  await syncLegacyGoogleConnectionFromPrimary(mailbox.chefId, mailbox.tenantId)
  return tokens.access_token
}

export async function getPrimaryGoogleMailboxForChef(chefId: string) {
  const mailboxes = await listActiveGoogleMailboxesForChef(chefId)
  if (mailboxes.length === 0) return null
  return mailboxes.find((mailbox) => mailbox.isPrimary && mailbox.gmailConnected) ?? mailboxes[0]
}

export async function getPrimaryGoogleAccessTokenForChef(chefId: string): Promise<string> {
  const mailbox = await getPrimaryGoogleMailboxForChef(chefId)
  if (!mailbox) {
    throw new Error('Google account not connected')
  }

  return getGoogleMailboxAccessToken(mailbox.id)
}

export async function getPrimaryGoogleMailboxForCurrentChef() {
  const mailboxes = await listGoogleMailboxesForCurrentChef()
  if (mailboxes.length === 0) return null
  return mailboxes.find((mailbox) => mailbox.isPrimary && mailbox.gmailConnected) ?? mailboxes[0]
}

export function toGoogleMailboxSummary(mailbox: GoogleMailboxRecord): GoogleMailboxSummary {
  const totalSeen = mailbox.historicalScanTotalSeen
  const estimatedTotal =
    mailbox.historicalScanResultSizeEstimate != null
      ? Math.max(mailbox.historicalScanResultSizeEstimate, totalSeen)
      : null

  return {
    id: mailbox.id,
    email: mailbox.email,
    connected: mailbox.gmailConnected,
    isPrimary: mailbox.isPrimary,
    isActive: mailbox.isActive,
    lastSync: mailbox.gmailLastSyncAt,
    errorCount: mailbox.gmailSyncErrors,
    scanEnabled: mailbox.historicalScanEnabled,
    scanStatus: mailbox.historicalScanStatus,
    totalProcessed: mailbox.historicalScanTotalProcessed,
    totalSeen,
    estimatedTotal,
    includeSpamTrash: mailbox.historicalScanIncludeSpamTrash,
  }
}

export async function setPrimaryGoogleMailboxForChef(chefId: string, mailboxId: string) {
  const supabase = createAdminClient() as any
  const mailboxes = await listGoogleMailboxesForChef(chefId)
  const target = mailboxes.find((mailbox) => mailbox.id === mailboxId)
  if (!target) throw new Error('Mailbox not found')

  if (!isPersistedGoogleMailboxId(mailboxId)) {
    await syncLegacyGoogleConnectionFromPrimary(chefId, target.tenantId)
    return
  }

  await supabase.from('google_mailboxes').update({ is_primary: false }).eq('chef_id', chefId)
  await supabase
    .from('google_mailboxes')
    .update({ is_primary: true, is_active: true })
    .eq('id', mailboxId)
    .eq('chef_id', chefId)

  await syncLegacyGoogleConnectionFromPrimary(chefId, target.tenantId)
}

export async function disconnectGoogleMailboxForChef(chefId: string, mailboxId: string) {
  const supabase = createAdminClient() as any
  const mailbox = await getGoogleMailboxById(mailboxId)
  if (!mailbox || mailbox.chefId !== chefId) {
    throw new Error('Mailbox not found')
  }

  if (!isPersistedGoogleMailboxId(mailboxId)) {
    const { data: existing } = await supabase
      .from('google_connections')
      .select('calendar_connected')
      .eq('chef_id', chefId)
      .maybeSingle()

    const update: Record<string, unknown> = {
      gmail_connected: false,
      gmail_history_id: null,
      gmail_last_sync_at: null,
      gmail_sync_errors: 0,
      historical_scan_enabled: false,
      historical_scan_status: 'paused',
      historical_scan_page_token: null,
      historical_scan_total_processed: 0,
      historical_scan_total_seen: 0,
      historical_scan_result_size_estimate: null,
    }

    if (!existing?.calendar_connected) {
      update.connected_email = null
      update.access_token = null
      update.refresh_token = null
      update.token_expires_at = null
      update.scopes = []
    }

    await supabase.from('google_connections').update(update).eq('chef_id', chefId)
    return
  }

  await supabase
    .from('google_mailboxes')
    .update({
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      scopes: [],
      gmail_connected: false,
      gmail_history_id: null,
      gmail_last_sync_at: null,
      gmail_sync_errors: 0,
      historical_scan_enabled: false,
      historical_scan_status: 'paused',
      is_active: false,
      is_primary: false,
    })
    .eq('id', mailboxId)
    .eq('chef_id', chefId)

  const remaining = await listActiveGoogleMailboxesForChef(chefId)
  const nextPrimary = remaining.find((candidate) => candidate.id !== mailboxId) ?? null

  if (nextPrimary) {
    await supabase
      .from('google_mailboxes')
      .update({ is_primary: true })
      .eq('id', nextPrimary.id)
      .eq('chef_id', chefId)
  }

  await syncLegacyGoogleConnectionFromPrimary(chefId, mailbox.tenantId)
}

export async function disconnectAllGoogleMailboxesForChef(chefId: string) {
  const mailboxes = await listGoogleMailboxesForChef(chefId)
  if (mailboxes.length === 0) return

  for (const mailbox of mailboxes) {
    if (mailbox.gmailConnected || mailbox.isActive) {
      await disconnectGoogleMailboxForChef(chefId, mailbox.id)
    }
  }
}

export async function syncLegacyGoogleConnectionFromPrimary(chefId: string, tenantId: string) {
  const supabase = createAdminClient() as any
  const primary = await getPrimaryGoogleMailboxForChef(chefId)

  const { data: existing } = await supabase
    .from('google_connections')
    .select(
      'connected_email, access_token, refresh_token, token_expires_at, scopes, calendar_connected'
    )
    .eq('chef_id', chefId)
    .maybeSingle()

  if (!primary) {
    await supabase.from('google_connections').upsert(
      {
        chef_id: chefId,
        tenant_id: tenantId,
        connected_email: existing?.calendar_connected ? existing.connected_email : null,
        access_token: existing?.calendar_connected ? existing.access_token : null,
        refresh_token: existing?.calendar_connected ? existing.refresh_token : null,
        token_expires_at: existing?.calendar_connected ? existing.token_expires_at : null,
        scopes: existing?.calendar_connected ? (existing.scopes ?? []) : [],
        gmail_connected: false,
        gmail_history_id: null,
        gmail_last_sync_at: null,
        gmail_sync_errors: 0,
        historical_scan_enabled: false,
        historical_scan_include_spam_trash: true,
        historical_scan_status: 'paused',
        historical_scan_page_token: null,
        historical_scan_total_processed: 0,
        historical_scan_total_seen: 0,
        historical_scan_result_size_estimate: null,
        historical_scan_lookback_days: 0,
        historical_scan_started_at: null,
        historical_scan_completed_at: null,
        historical_scan_last_run_at: null,
        calendar_connected: existing?.calendar_connected ?? false,
      },
      { onConflict: 'chef_id' }
    )
    return
  }

  const preserveCalendarIdentity =
    Boolean(existing?.calendar_connected) &&
    Boolean(existing?.connected_email) &&
    normalizeEmail(existing.connected_email) !== primary.normalizedEmail

  await supabase.from('google_connections').upsert(
    {
      chef_id: chefId,
      tenant_id: tenantId,
      connected_email: preserveCalendarIdentity
        ? (existing?.connected_email ?? null)
        : primary.email,
      access_token: preserveCalendarIdentity
        ? (existing?.access_token ?? null)
        : primary.accessToken,
      refresh_token: preserveCalendarIdentity
        ? (existing?.refresh_token ?? null)
        : primary.refreshToken,
      token_expires_at: preserveCalendarIdentity
        ? (existing?.token_expires_at ?? null)
        : primary.tokenExpiresAt,
      scopes: preserveCalendarIdentity ? (existing?.scopes ?? []) : primary.scopes,
      gmail_connected: primary.gmailConnected,
      gmail_history_id: primary.gmailHistoryId,
      gmail_last_sync_at: primary.gmailLastSyncAt,
      gmail_sync_errors: primary.gmailSyncErrors,
      historical_scan_enabled: primary.historicalScanEnabled,
      historical_scan_include_spam_trash: primary.historicalScanIncludeSpamTrash,
      historical_scan_status: primary.historicalScanStatus,
      historical_scan_page_token: primary.historicalScanPageToken,
      historical_scan_total_processed: primary.historicalScanTotalProcessed,
      historical_scan_total_seen: primary.historicalScanTotalSeen,
      historical_scan_result_size_estimate: primary.historicalScanResultSizeEstimate,
      historical_scan_lookback_days: primary.historicalScanLookbackDays,
      historical_scan_started_at: primary.historicalScanStartedAt,
      historical_scan_completed_at: primary.historicalScanCompletedAt,
      historical_scan_last_run_at: primary.historicalScanLastRunAt,
      calendar_connected: existing?.calendar_connected ?? false,
    },
    { onConflict: 'chef_id' }
  )
}

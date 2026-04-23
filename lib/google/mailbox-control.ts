import { createServerClient } from '@/lib/db/server'

type DbClient = any

export type GoogleMailboxControlRecord = {
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
  historicalScanStatus: string
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
}

export type LegacyGoogleConnectionRecord = {
  chefId: string
  tenantId: string
  connectedEmail: string | null
  normalizedEmail: string | null
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: string | null
  scopes: string[]
  gmailConnected: boolean
  calendarConnected: boolean
  gmailHistoryId: string | null
  gmailLastSyncAt: string | null
  gmailSyncErrors: number
  historicalScanEnabled: boolean
  historicalScanIncludeSpamTrash: boolean
  historicalScanStatus: string
  historicalScanPageToken: string | null
  historicalScanTotalProcessed: number
  historicalScanTotalSeen: number
  historicalScanResultSizeEstimate: number | null
  historicalScanLookbackDays: number
  historicalScanStartedAt: string | null
  historicalScanCompletedAt: string | null
  historicalScanLastRunAt: string | null
}

export type GoogleGmailControlPlane = {
  mailbox: GoogleMailboxControlRecord | null
  legacyConnection: LegacyGoogleConnectionRecord | null
  source: 'google_mailbox' | 'google_connection' | 'none'
}

type UpsertLegacyMailboxInput = {
  chefId: string
  tenantId: string
  connectedEmail: string
  accessToken?: string | null
  refreshToken?: string | null
  tokenExpiresAt?: string | null
  scopes?: string[] | null
  gmailConnected?: boolean
  gmailHistoryId?: string | null
  gmailLastSyncAt?: string | null
  gmailSyncErrors?: number | null
  historicalScanEnabled?: boolean
  historicalScanIncludeSpamTrash?: boolean
  historicalScanStatus?: string | null
  historicalScanPageToken?: string | null
  historicalScanTotalProcessed?: number | null
  historicalScanTotalSeen?: number | null
  historicalScanResultSizeEstimate?: number | null
  historicalScanLookbackDays?: number | null
  historicalScanStartedAt?: string | null
  historicalScanCompletedAt?: string | null
  historicalScanLastRunAt?: string | null
  makePrimary?: boolean
  db?: DbClient
}

function getDb(db?: DbClient) {
  return (db || createServerClient({ admin: true })) as DbClient
}

export function normalizeGoogleMailboxEmail(value: string | null | undefined): string | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  return normalized.includes('@') ? normalized : null
}

function normalizeScopes(scopes: unknown): string[] {
  if (!Array.isArray(scopes)) return []
  return scopes
    .map((scope) => String(scope || '').trim())
    .filter((scope) => scope.length > 0 && scope !== '')
}

function mapMailboxRow(row: any): GoogleMailboxControlRecord | null {
  const normalizedEmail =
    normalizeGoogleMailboxEmail(row?.normalized_email || row?.email || null) || null
  if (!row?.id || !row?.chef_id || !row?.tenant_id || !normalizedEmail) {
    return null
  }

  return {
    id: String(row.id),
    chefId: String(row.chef_id),
    tenantId: String(row.tenant_id),
    email: String(row.email || normalizedEmail),
    normalizedEmail,
    accessToken: row.access_token || null,
    refreshToken: row.refresh_token || null,
    tokenExpiresAt: row.token_expires_at || null,
    scopes: normalizeScopes(row.scopes),
    gmailConnected: row.gmail_connected === true,
    gmailHistoryId: row.gmail_history_id || null,
    gmailLastSyncAt: row.gmail_last_sync_at || null,
    gmailSyncErrors: Number(row.gmail_sync_errors || 0),
    historicalScanEnabled: row.historical_scan_enabled === true,
    historicalScanIncludeSpamTrash: row.historical_scan_include_spam_trash !== false,
    historicalScanStatus: String(row.historical_scan_status || 'idle'),
    historicalScanPageToken: row.historical_scan_page_token || null,
    historicalScanTotalProcessed: Number(row.historical_scan_total_processed || 0),
    historicalScanTotalSeen: Number(row.historical_scan_total_seen || 0),
    historicalScanResultSizeEstimate:
      row.historical_scan_result_size_estimate === null ||
      row.historical_scan_result_size_estimate === undefined
        ? null
        : Number(row.historical_scan_result_size_estimate),
    historicalScanLookbackDays: Number(row.historical_scan_lookback_days || 0),
    historicalScanStartedAt: row.historical_scan_started_at || null,
    historicalScanCompletedAt: row.historical_scan_completed_at || null,
    historicalScanLastRunAt: row.historical_scan_last_run_at || null,
    isPrimary: row.is_primary === true,
    isActive: row.is_active !== false,
  }
}

function mapLegacyConnectionRow(row: any): LegacyGoogleConnectionRecord | null {
  if (!row?.chef_id || !row?.tenant_id) return null

  return {
    chefId: String(row.chef_id),
    tenantId: String(row.tenant_id),
    connectedEmail: row.connected_email || null,
    normalizedEmail: normalizeGoogleMailboxEmail(row.connected_email),
    accessToken: row.access_token || null,
    refreshToken: row.refresh_token || null,
    tokenExpiresAt: row.token_expires_at || null,
    scopes: normalizeScopes(row.scopes),
    gmailConnected: row.gmail_connected === true,
    calendarConnected: row.calendar_connected === true,
    gmailHistoryId: row.gmail_history_id || null,
    gmailLastSyncAt: row.gmail_last_sync_at || null,
    gmailSyncErrors: Number(row.gmail_sync_errors || 0),
    historicalScanEnabled: row.historical_scan_enabled === true,
    historicalScanIncludeSpamTrash: row.historical_scan_include_spam_trash !== false,
    historicalScanStatus: String(row.historical_scan_status || 'idle'),
    historicalScanPageToken: row.historical_scan_page_token || null,
    historicalScanTotalProcessed: Number(row.historical_scan_total_processed || 0),
    historicalScanTotalSeen: Number(row.historical_scan_total_seen || 0),
    historicalScanResultSizeEstimate:
      row.historical_scan_result_size_estimate === null ||
      row.historical_scan_result_size_estimate === undefined
        ? null
        : Number(row.historical_scan_result_size_estimate),
    historicalScanLookbackDays: Number(row.historical_scan_lookback_days || 0),
    historicalScanStartedAt: row.historical_scan_started_at || null,
    historicalScanCompletedAt: row.historical_scan_completed_at || null,
    historicalScanLastRunAt: row.historical_scan_last_run_at || null,
  }
}

function pickPreferredMailbox(
  mailboxes: GoogleMailboxControlRecord[],
  preferEmail?: string | null
): GoogleMailboxControlRecord | null {
  const normalizedPreferred = normalizeGoogleMailboxEmail(preferEmail)
  const filtered = normalizedPreferred
    ? mailboxes.filter((mailbox) => mailbox.normalizedEmail === normalizedPreferred)
    : mailboxes

  return (
    filtered.find((mailbox) => mailbox.gmailConnected && mailbox.isActive && mailbox.isPrimary) ||
    filtered.find((mailbox) => mailbox.gmailConnected && mailbox.isActive) ||
    filtered.find((mailbox) => mailbox.isActive && mailbox.isPrimary) ||
    filtered.find((mailbox) => mailbox.isActive) ||
    filtered.find((mailbox) => mailbox.gmailConnected) ||
    filtered[0] ||
    null
  )
}

export async function upsertGoogleMailboxFromLegacyConnection(
  input: UpsertLegacyMailboxInput
): Promise<GoogleMailboxControlRecord | null> {
  const normalizedEmail = normalizeGoogleMailboxEmail(input.connectedEmail)
  if (!normalizedEmail) return null

  const db = getDb(input.db)
  const { data: existingRows } = await db
    .from('google_mailboxes')
    .select('id, normalized_email, is_primary, is_active')
    .eq('chef_id', input.chefId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  const existing = (existingRows || []).find(
    (row: any) =>
      normalizeGoogleMailboxEmail(row.normalized_email || null) === normalizedEmail
  )
  const hasActivePrimary = (existingRows || []).some(
    (row: any) => row.is_primary === true && row.is_active !== false
  )

  const { data, error } = await db
    .from('google_mailboxes')
    .upsert(
      {
        chef_id: input.chefId,
        tenant_id: input.tenantId,
        email: String(input.connectedEmail).trim(),
        normalized_email: normalizedEmail,
        access_token: input.accessToken ?? null,
        refresh_token: input.refreshToken ?? null,
        token_expires_at: input.tokenExpiresAt ?? null,
        scopes: normalizeScopes(input.scopes),
        gmail_connected: input.gmailConnected === true,
        gmail_history_id: input.gmailHistoryId ?? null,
        gmail_last_sync_at: input.gmailLastSyncAt ?? null,
        gmail_sync_errors: Number(input.gmailSyncErrors || 0),
        historical_scan_enabled: input.historicalScanEnabled === true,
        historical_scan_include_spam_trash: input.historicalScanIncludeSpamTrash !== false,
        historical_scan_status: input.historicalScanStatus || 'idle',
        historical_scan_page_token: input.historicalScanPageToken ?? null,
        historical_scan_total_processed: Number(input.historicalScanTotalProcessed || 0),
        historical_scan_total_seen: Number(input.historicalScanTotalSeen || 0),
        historical_scan_result_size_estimate: input.historicalScanResultSizeEstimate ?? null,
        historical_scan_lookback_days: Number(input.historicalScanLookbackDays || 0),
        historical_scan_started_at: input.historicalScanStartedAt ?? null,
        historical_scan_completed_at: input.historicalScanCompletedAt ?? null,
        historical_scan_last_run_at: input.historicalScanLastRunAt ?? null,
        is_primary: existing?.is_primary ?? input.makePrimary ?? !hasActivePrimary,
        is_active: existing?.is_active !== false,
      },
      { onConflict: 'chef_id,normalized_email' }
    )
    .select(
      'id, chef_id, tenant_id, email, normalized_email, access_token, refresh_token, token_expires_at, scopes, gmail_connected, gmail_history_id, gmail_last_sync_at, gmail_sync_errors, historical_scan_enabled, historical_scan_include_spam_trash, historical_scan_status, historical_scan_page_token, historical_scan_total_processed, historical_scan_total_seen, historical_scan_result_size_estimate, historical_scan_lookback_days, historical_scan_started_at, historical_scan_completed_at, historical_scan_last_run_at, is_primary, is_active'
    )
    .single()

  if (error) {
    throw new Error(`Failed to upsert google mailbox: ${error.message}`)
  }

  return mapMailboxRow(data)
}

export async function getGoogleGmailControl(input: {
  chefId: string
  tenantId?: string | null
  preferEmail?: string | null
  allowRepair?: boolean
  db?: DbClient
}): Promise<GoogleGmailControlPlane> {
  const db = getDb(input.db)

  const [mailboxesResult, legacyResult] = await Promise.all([
    db
      .from('google_mailboxes')
      .select(
        'id, chef_id, tenant_id, email, normalized_email, access_token, refresh_token, token_expires_at, scopes, gmail_connected, gmail_history_id, gmail_last_sync_at, gmail_sync_errors, historical_scan_enabled, historical_scan_include_spam_trash, historical_scan_status, historical_scan_page_token, historical_scan_total_processed, historical_scan_total_seen, historical_scan_result_size_estimate, historical_scan_lookback_days, historical_scan_started_at, historical_scan_completed_at, historical_scan_last_run_at, is_primary, is_active'
      )
      .eq('chef_id', input.chefId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    db
      .from('google_connections')
      .select(
        'chef_id, tenant_id, connected_email, access_token, refresh_token, token_expires_at, scopes, gmail_connected, calendar_connected, gmail_history_id, gmail_last_sync_at, gmail_sync_errors, historical_scan_enabled, historical_scan_include_spam_trash, historical_scan_status, historical_scan_page_token, historical_scan_total_processed, historical_scan_total_seen, historical_scan_result_size_estimate, historical_scan_lookback_days, historical_scan_started_at, historical_scan_completed_at, historical_scan_last_run_at'
      )
      .eq('chef_id', input.chefId)
      .maybeSingle(),
  ])

  const mailboxes = (mailboxesResult.data || [])
    .map((row: any) => mapMailboxRow(row))
    .filter(Boolean) as GoogleMailboxControlRecord[]
  const legacyConnection = mapLegacyConnectionRow(legacyResult.data)

  let mailbox = pickPreferredMailbox(mailboxes, input.preferEmail)
  if (!mailbox && input.allowRepair && legacyConnection?.normalizedEmail && input.tenantId) {
    mailbox = await upsertGoogleMailboxFromLegacyConnection({
      chefId: input.chefId,
      tenantId: input.tenantId,
      connectedEmail: legacyConnection.connectedEmail || legacyConnection.normalizedEmail,
      accessToken: legacyConnection.accessToken,
      refreshToken: legacyConnection.refreshToken,
      tokenExpiresAt: legacyConnection.tokenExpiresAt,
      scopes: legacyConnection.scopes,
      gmailConnected: legacyConnection.gmailConnected,
      gmailHistoryId: legacyConnection.gmailHistoryId,
      gmailLastSyncAt: legacyConnection.gmailLastSyncAt,
      gmailSyncErrors: legacyConnection.gmailSyncErrors,
      historicalScanEnabled: legacyConnection.historicalScanEnabled,
      historicalScanIncludeSpamTrash: legacyConnection.historicalScanIncludeSpamTrash,
      historicalScanStatus: legacyConnection.historicalScanStatus,
      historicalScanPageToken: legacyConnection.historicalScanPageToken,
      historicalScanTotalProcessed: legacyConnection.historicalScanTotalProcessed,
      historicalScanTotalSeen: legacyConnection.historicalScanTotalSeen,
      historicalScanResultSizeEstimate: legacyConnection.historicalScanResultSizeEstimate,
      historicalScanLookbackDays: legacyConnection.historicalScanLookbackDays,
      historicalScanStartedAt: legacyConnection.historicalScanStartedAt,
      historicalScanCompletedAt: legacyConnection.historicalScanCompletedAt,
      historicalScanLastRunAt: legacyConnection.historicalScanLastRunAt,
      db,
    })
  }

  return {
    mailbox,
    legacyConnection,
    source: mailbox ? 'google_mailbox' : legacyConnection?.gmailConnected ? 'google_connection' : 'none',
  }
}

export async function listGoogleGmailMailboxes(input: {
  chefId: string
  tenantId?: string | null
  requireConnected?: boolean
  requireHistoricalScanEnabled?: boolean
  includeInactive?: boolean
  allowRepair?: boolean
  db?: DbClient
}): Promise<GoogleMailboxControlRecord[]> {
  const db = getDb(input.db)

  let query = db
    .from('google_mailboxes')
    .select(
      'id, chef_id, tenant_id, email, normalized_email, access_token, refresh_token, token_expires_at, scopes, gmail_connected, gmail_history_id, gmail_last_sync_at, gmail_sync_errors, historical_scan_enabled, historical_scan_include_spam_trash, historical_scan_status, historical_scan_page_token, historical_scan_total_processed, historical_scan_total_seen, historical_scan_result_size_estimate, historical_scan_lookback_days, historical_scan_started_at, historical_scan_completed_at, historical_scan_last_run_at, is_primary, is_active'
    )
    .eq('chef_id', input.chefId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (!input.includeInactive) {
    query = query.eq('is_active', true)
  }

  if (input.requireConnected) {
    query = query.eq('gmail_connected', true)
  }

  if (input.requireHistoricalScanEnabled) {
    query = query.eq('historical_scan_enabled', true)
  }

  let mailboxes = ((await query).data || [])
    .map((row: any) => mapMailboxRow(row))
    .filter(Boolean) as GoogleMailboxControlRecord[]

  if (mailboxes.length === 0 && input.allowRepair) {
    const control = await getGoogleGmailControl({
      chefId: input.chefId,
      tenantId: input.tenantId,
      allowRepair: true,
      db,
    })

    if (control.mailbox) {
      mailboxes = [control.mailbox]
    }
  }

  return mailboxes.filter((mailbox) => {
    if (!input.includeInactive && !mailbox.isActive) return false
    if (input.requireConnected && !mailbox.gmailConnected) return false
    if (input.requireHistoricalScanEnabled && !mailbox.historicalScanEnabled) return false
    return true
  })
}

import { createServerClient } from '@/lib/supabase/server'
import {
  dedupeIdentityKeys,
  extractIdentityKeysFromUnknownFields,
} from '@/lib/gmail/platform-identity'
import { extractTacLinkIdentity } from '@/lib/gmail/take-a-chef-parser'
import { extractTakeAChefFinanceMeta } from '@/lib/integrations/take-a-chef-finance'
import { getMarketplacePlatform, isMarketplaceSource } from './platforms'

export type MarketplaceLinkHealth = 'unknown' | 'working' | 'login_required' | 'expired'

export type MarketplaceSnapshotSummary = {
  captureType: string
  capturedAt: string | null
  pageUrl: string | null
  pageTitle: string | null
  summary: string | null
  notes: string | null
  textExcerpt: string | null
  extractedClientName: string | null
  extractedEmail: string | null
  extractedPhone: string | null
  extractedBookingDate: string | null
  extractedGuestCount: number | null
  extractedLocation: string | null
  extractedOccasion: string | null
  extractedAmountCents: number | null
  proposalCapturedAt: string | null
  proposalAmountCents: number | null
  menuCapturedAt: string | null
  menuSeen: boolean
  source: 'canonical' | 'legacy'
}

export type MarketplacePayoutSummary = {
  grossBookingCents: number | null
  commissionPercent: number | null
  commissionAmountCents: number | null
  netPayoutCents: number | null
  payoutStatus: string
  payoutArrivalDate: string | null
  payoutReference: string | null
  notes: string | null
  updatedAt: string | null
  source: 'canonical' | 'legacy'
}

export type MarketplaceUrlSet = {
  external: string | null
  request: string | null
  proposal: string | null
  guestContact: string | null
  booking: string | null
  menu: string | null
}

export type MarketplaceInquiryContext = {
  source: 'canonical' | 'legacy'
  recordId: string | null
  platform: string
  platformLabel: string
  inquiryId: string
  clientId: string | null
  eventId: string | null
  externalInquiryId: string | null
  externalUriToken: string | null
  externalLink: string | null
  statusOnPlatform: string | null
  statusDetail: string | null
  lastCaptureType: string | null
  nextActionRequired: string | null
  nextActionBy: string | null
  linkHealth: MarketplaceLinkHealth
  lastLinkError: string | null
  lastSnapshotAt: string | null
  lastActionAt: string | null
  summary: string | null
  identityKeys: string[]
  urls: MarketplaceUrlSet
  latestSnapshot: MarketplaceSnapshotSummary | null
  payout: MarketplacePayoutSummary | null
}

type LegacyInquiryLike = {
  id: string
  channel: string | null
  client_id?: string | null
  converted_to_event_id?: string | null
  external_platform?: string | null
  external_inquiry_id?: string | null
  external_link?: string | null
  next_action_required?: string | null
  next_action_by?: string | null
  unknown_fields?: unknown
}

const PLATFORM_RELATION_NAMES = [
  'platform_records',
  'platform_snapshots',
  'platform_action_log',
  'platform_payouts',
]

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}

function normalizeLinkHealth(value: unknown): MarketplaceLinkHealth {
  if (value === 'working' || value === 'login_required' || value === 'expired') {
    return value
  }
  return 'unknown'
}

function normalizePayoutStatus(value: unknown): string {
  if (value === 'pending' || value === 'scheduled' || value === 'paid' || value === 'issue') {
    return value
  }
  return 'untracked'
}

function platformLabelFor(channel: string): string {
  return getMarketplacePlatform(channel)?.label ?? channel
}

function hasMeaningfulPayout(payout: MarketplacePayoutSummary | null): boolean {
  if (!payout) return false
  return Boolean(
    payout.grossBookingCents != null ||
      payout.commissionPercent != null ||
      payout.commissionAmountCents != null ||
      payout.netPayoutCents != null ||
      payout.payoutReference ||
      payout.notes ||
      payout.payoutArrivalDate ||
      payout.payoutStatus !== 'untracked'
  )
}

function buildUrlSet(input?: Partial<MarketplaceUrlSet> | null): MarketplaceUrlSet {
  return {
    external: input?.external ?? null,
    request: input?.request ?? null,
    proposal: input?.proposal ?? null,
    guestContact: input?.guestContact ?? null,
    booking: input?.booking ?? null,
    menu: input?.menu ?? null,
  }
}

function applyCaptureUrl(urls: MarketplaceUrlSet, captureType: string | null, pageUrl: string | null) {
  if (!captureType || !pageUrl) return

  if (captureType === 'proposal') {
    urls.proposal = urls.proposal ?? pageUrl
    return
  }
  if (captureType === 'booking') {
    urls.booking = urls.booking ?? pageUrl
    return
  }
  if (captureType === 'guest_contact') {
    urls.guestContact = urls.guestContact ?? pageUrl
    return
  }
  if (captureType === 'menu') {
    urls.menu = urls.menu ?? pageUrl
    return
  }

  urls.request = urls.request ?? pageUrl
}

function buildLegacySnapshot(inquiry: LegacyInquiryLike): MarketplaceSnapshotSummary | null {
  const unknown = asRecord(inquiry.unknown_fields)
  const capture = asRecord(unknown?.take_a_chef_page_capture)
  const workflow = asRecord(unknown?.take_a_chef_workflow)

  if (!capture) return null

  return {
    captureType: asString(capture.capture_type) ?? 'other',
    capturedAt: asString(capture.last_captured_at),
    pageUrl: asString(capture.page_url),
    pageTitle: asString(capture.page_title),
    summary: asString(capture.summary),
    notes: asString(capture.notes),
    textExcerpt: asString(capture.text_excerpt),
    extractedClientName: asString(capture.extracted_client_name),
    extractedEmail: asString(capture.extracted_email),
    extractedPhone: asString(capture.extracted_phone),
    extractedBookingDate: asString(capture.extracted_booking_date),
    extractedGuestCount: asNumber(capture.extracted_guest_count),
    extractedLocation: asString(capture.extracted_location),
    extractedOccasion: asString(capture.extracted_occasion),
    extractedAmountCents: asNumber(capture.extracted_gross_booking_cents),
    proposalCapturedAt: asString(workflow?.proposal_captured_at),
    proposalAmountCents: asNumber(workflow?.proposal_amount_cents),
    menuCapturedAt: asString(workflow?.menu_captured_at),
    menuSeen: workflow?.menu_seen === true,
    source: 'legacy',
  }
}

function buildLegacyPayout(inquiry: LegacyInquiryLike, platform: string): MarketplacePayoutSummary | null {
  if (platform !== 'take_a_chef') return null

  const finance = extractTakeAChefFinanceMeta(inquiry.unknown_fields)
  const commissionAmountCents =
    finance.grossBookingCents != null && finance.commissionPercent != null
      ? Math.round((finance.grossBookingCents * finance.commissionPercent) / 100)
      : null
  const netPayoutCents =
    finance.payoutAmountCents ??
    (finance.grossBookingCents != null && commissionAmountCents != null
      ? finance.grossBookingCents - commissionAmountCents
      : null)

  const summary: MarketplacePayoutSummary = {
    grossBookingCents: finance.grossBookingCents,
    commissionPercent: finance.commissionPercent,
    commissionAmountCents,
    netPayoutCents,
    payoutStatus: finance.payoutStatus,
    payoutArrivalDate: finance.payoutArrivalDate,
    payoutReference: finance.payoutReference,
    notes: finance.notes,
    updatedAt: finance.updatedAt,
    source: 'legacy',
  }

  return hasMeaningfulPayout(summary) ? summary : null
}

function buildLegacyMarketplaceContext(inquiry: LegacyInquiryLike): MarketplaceInquiryContext | null {
  const platform = resolveMarketplacePlatform(inquiry)
  if (!platform) return null

  const snapshot = buildLegacySnapshot(inquiry)
  const payout = buildLegacyPayout(inquiry, platform)
  const externalLink = asString(inquiry.external_link) ?? snapshot?.pageUrl ?? null
  const externalIdentity = extractTacLinkIdentity(externalLink)
  const urls = buildUrlSet({
    external: externalLink,
    request: externalLink,
  })

  applyCaptureUrl(urls, snapshot?.captureType ?? null, snapshot?.pageUrl ?? null)

  return {
    source: 'legacy',
    recordId: null,
    platform,
    platformLabel: platformLabelFor(platform),
    inquiryId: inquiry.id,
    clientId: inquiry.client_id ?? null,
    eventId: inquiry.converted_to_event_id ?? null,
    externalInquiryId: asString(inquiry.external_inquiry_id),
    externalUriToken: externalIdentity.ctaUriToken,
    externalLink,
    statusOnPlatform: null,
    statusDetail: null,
    lastCaptureType: snapshot?.captureType ?? null,
    nextActionRequired: asString(inquiry.next_action_required),
    nextActionBy: asString(inquiry.next_action_by),
    linkHealth: 'unknown',
    lastLinkError: null,
    lastSnapshotAt: snapshot?.capturedAt ?? null,
    lastActionAt: null,
    summary: snapshot?.summary ?? null,
    identityKeys: dedupeIdentityKeys([
      inquiry.external_inquiry_id ?? null,
      externalLink,
      externalIdentity.ctaUriToken,
      ...extractIdentityKeysFromUnknownFields(inquiry.unknown_fields),
    ]),
    urls,
    latestSnapshot: snapshot,
    payout,
  }
}

function mapSnapshotRow(row: Record<string, unknown>): MarketplaceSnapshotSummary {
  return {
    captureType: asString(row.capture_type) ?? 'other',
    capturedAt: asString(row.snapshot_at) ?? asString(row.created_at),
    pageUrl: asString(row.page_url),
    pageTitle: asString(row.page_title),
    summary: asString(row.summary),
    notes: asString(asRecord(row.metadata)?.notes),
    textExcerpt: asString(row.text_excerpt),
    extractedClientName: asString(row.extracted_client_name),
    extractedEmail: asString(row.extracted_email),
    extractedPhone: asString(row.extracted_phone),
    extractedBookingDate: asString(row.extracted_booking_date),
    extractedGuestCount: asNumber(row.extracted_guest_count),
    extractedLocation: asString(row.extracted_location),
    extractedOccasion: asString(row.extracted_occasion),
    extractedAmountCents: asNumber(row.extracted_amount_cents),
    proposalCapturedAt: null,
    proposalAmountCents: null,
    menuCapturedAt: null,
    menuSeen: asString(row.capture_type) === 'menu',
    source: 'canonical',
  }
}

function mapPayoutRow(row: Record<string, unknown>): MarketplacePayoutSummary {
  return {
    grossBookingCents: asNumber(row.gross_booking_cents),
    commissionPercent: asNumber(row.commission_percent),
    commissionAmountCents: asNumber(row.commission_amount_cents),
    netPayoutCents: asNumber(row.net_payout_cents),
    payoutStatus: normalizePayoutStatus(row.payout_status),
    payoutArrivalDate: asString(row.payout_arrival_date),
    payoutReference: asString(row.payout_reference),
    notes: asString(row.notes),
    updatedAt: asString(row.updated_at) ?? asString(row.captured_at),
    source: 'canonical',
  }
}

export function isMissingMarketplaceRelation(error: any): boolean {
  if (!error) return false
  if (error.code === '42P01') return true

  const haystack = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return PLATFORM_RELATION_NAMES.some((relation) => haystack.includes(relation))
}

export function resolveMarketplacePlatform(inquiry: LegacyInquiryLike): string | null {
  if (typeof inquiry.external_platform === 'string' && inquiry.external_platform.trim()) {
    return inquiry.external_platform.trim()
  }

  if (typeof inquiry.channel === 'string' && isMarketplaceSource(inquiry.channel)) {
    return inquiry.channel
  }

  return null
}

function resolveValue<T>(nextValue: T | undefined, existingValue: T | null | undefined): T | null {
  if (nextValue !== undefined) return nextValue
  return existingValue ?? null
}

function cleanObject<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as T
}

function mergePayload(
  existingValue: unknown,
  nextValue: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return cleanObject({
    ...(asRecord(existingValue) ?? {}),
    ...(nextValue ?? {}),
  })
}

function inferStatusFromCapture(captureType: string, fallbackStatus?: string | null): string | null {
  if (captureType === 'proposal') return 'proposal_sent'
  if (captureType === 'booking') return 'booking_confirmed'
  if (captureType === 'guest_contact') return 'guest_contact_unlocked'
  if (captureType === 'menu') return 'menu_captured'
  if (captureType === 'message') return 'conversation_active'
  if (captureType === 'request') return 'request_open'
  return fallbackStatus ?? null
}

type PlatformRecordUpsertInput = {
  supabase: any
  tenantId: string
  inquiryId: string
  platform: string
  clientId?: string | null
  eventId?: string | null
  externalInquiryId?: string | null
  externalUriToken?: string | null
  externalUrl?: string | null
  requestUrl?: string | null
  proposalUrl?: string | null
  guestContactUrl?: string | null
  bookingUrl?: string | null
  menuUrl?: string | null
  statusOnPlatform?: string | null
  statusDetail?: string | null
  lastCaptureType?: string | null
  nextActionRequired?: string | null
  nextActionBy?: string | null
  linkHealth?: MarketplaceLinkHealth
  lastLinkError?: string | null
  lastSnapshotAt?: string | null
  lastActionAt?: string | null
  summary?: string | null
  payload?: Record<string, unknown> | null
  updatedAt?: string | null
}

type PlatformSnapshotInsertInput = {
  supabase: any
  tenantId: string
  platformRecordId: string
  inquiryId: string
  eventId?: string | null
  captureType: string
  source?: string | null
  pageUrl?: string | null
  pageTitle?: string | null
  summary?: string | null
  notes?: string | null
  textExcerpt?: string | null
  extractedClientName?: string | null
  extractedEmail?: string | null
  extractedPhone?: string | null
  extractedBookingDate?: string | null
  extractedGuestCount?: number | null
  extractedLocation?: string | null
  extractedOccasion?: string | null
  extractedAmountCents?: number | null
  metadata?: Record<string, unknown> | null
  snapshotAt?: string | null
  createdBy?: string | null
}

type PlatformPayoutUpsertInput = {
  supabase: any
  tenantId: string
  platformRecordId: string
  inquiryId: string
  platform: string
  eventId?: string | null
  grossBookingCents?: number | null
  commissionPercent?: number | null
  commissionAmountCents?: number | null
  netPayoutCents?: number | null
  payoutStatus?: string | null
  payoutArrivalDate?: string | null
  payoutReference?: string | null
  notes?: string | null
  source?: string | null
  payload?: Record<string, unknown> | null
  capturedAt?: string | null
}

type PlatformActionInsertInput = {
  supabase: any
  tenantId: string
  platformRecordId: string
  inquiryId: string
  actionType: string
  actionLabel: string
  eventId?: string | null
  actionSource?: string | null
  actionUrl?: string | null
  metadata?: Record<string, unknown> | null
  actedAt?: string | null
  actedBy?: string | null
}

type PlatformPayoutDraft = Omit<
  PlatformPayoutUpsertInput,
  'supabase' | 'tenantId' | 'platformRecordId' | 'inquiryId' | 'platform'
>

type MarketplaceCaptureSyncInput = {
  supabase: any
  tenantId: string
  inquiryId: string
  platform: string
  clientId?: string | null
  eventId?: string | null
  externalInquiryId?: string | null
  externalUrl?: string | null
  captureType: string
  pageUrl: string
  pageTitle?: string | null
  pageLinks?: string[] | null
  summary?: string | null
  notes?: string | null
  textExcerpt?: string | null
  extractedClientName?: string | null
  extractedEmail?: string | null
  extractedPhone?: string | null
  extractedBookingDate?: string | null
  extractedGuestCount?: number | null
  extractedLocation?: string | null
  extractedOccasion?: string | null
  extractedAmountCents?: number | null
  nextActionRequired?: string | null
  nextActionBy?: string | null
  statusOnPlatform?: string | null
  statusDetail?: string | null
  payout?: PlatformPayoutDraft | null
  actedBy?: string | null
  capturedAt: string
}

type MarketplaceInquiryProjectionInput = {
  supabase: any
  tenantId: string
  inquiryId: string
  platform: string
  clientId?: string | null
  eventId?: string | null
  externalInquiryId?: string | null
  externalUrl?: string | null
  summary?: string | null
  statusOnPlatform?: string | null
  statusDetail?: string | null
  nextActionRequired?: string | null
  nextActionBy?: string | null
  payout?: PlatformPayoutDraft | null
  payload?: Record<string, unknown> | null
  actedBy?: string | null
  actionType?: string
  actionLabel?: string
  actedAt?: string | null
}

export async function getMarketplaceInquiryContext(params: {
  tenantId: string
  inquiry: LegacyInquiryLike
}): Promise<MarketplaceInquiryContext | null> {
  const fallback = buildLegacyMarketplaceContext(params.inquiry)
  if (!fallback) return null

  const supabase: any = createServerClient()
  const { data: record, error: recordError } = await supabase
    .from('platform_records')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .eq('inquiry_id', params.inquiry.id)
    .maybeSingle()

  if (recordError) {
    if (!isMissingMarketplaceRelation(recordError)) {
      console.error('[getMarketplaceInquiryContext] platform_records error:', recordError)
    }
    return fallback
  }

  if (!record) {
    return fallback
  }

  const [snapshotResult, payoutResult] = await Promise.all([
    supabase
      .from('platform_snapshots')
      .select('*')
      .eq('tenant_id', params.tenantId)
      .eq('platform_record_id', record.id)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('platform_payouts')
      .select('*')
      .eq('tenant_id', params.tenantId)
      .eq('platform_record_id', record.id)
      .maybeSingle(),
  ])

  if (snapshotResult.error && !isMissingMarketplaceRelation(snapshotResult.error)) {
    console.error('[getMarketplaceInquiryContext] platform_snapshots error:', snapshotResult.error)
  }
  if (payoutResult.error && !isMissingMarketplaceRelation(payoutResult.error)) {
    console.error('[getMarketplaceInquiryContext] platform_payouts error:', payoutResult.error)
  }

  const latestSnapshot = snapshotResult.data
    ? mapSnapshotRow(snapshotResult.data as Record<string, unknown>)
    : fallback.latestSnapshot
  const payout = payoutResult.data
    ? mapPayoutRow(payoutResult.data as Record<string, unknown>)
    : fallback.payout
  const urls = buildUrlSet({
    external: asString(record.external_url) ?? fallback.urls.external,
    request: asString(record.request_url) ?? fallback.urls.request,
    proposal: asString(record.proposal_url) ?? fallback.urls.proposal,
    guestContact: asString(record.guest_contact_url) ?? fallback.urls.guestContact,
    booking: asString(record.booking_url) ?? fallback.urls.booking,
    menu: asString(record.menu_url) ?? fallback.urls.menu,
  })

  applyCaptureUrl(urls, latestSnapshot?.captureType ?? null, latestSnapshot?.pageUrl ?? null)

  return {
    source: 'canonical',
    recordId: record.id,
    platform: asString(record.platform) ?? fallback.platform,
    platformLabel: platformLabelFor(asString(record.platform) ?? fallback.platform),
    inquiryId: params.inquiry.id,
    clientId: asString(record.client_id) ?? fallback.clientId,
    eventId: asString(record.event_id) ?? fallback.eventId,
    externalInquiryId: asString(record.external_inquiry_id) ?? fallback.externalInquiryId,
    externalUriToken: asString(record.external_uri_token) ?? fallback.externalUriToken,
    externalLink: asString(record.external_url) ?? fallback.externalLink,
    statusOnPlatform: asString(record.status_on_platform) ?? fallback.statusOnPlatform,
    statusDetail: asString(record.status_detail) ?? fallback.statusDetail,
    lastCaptureType: asString(record.last_capture_type) ?? fallback.lastCaptureType,
    nextActionRequired: asString(record.next_action_required) ?? fallback.nextActionRequired,
    nextActionBy: asString(record.next_action_by) ?? fallback.nextActionBy,
    linkHealth: normalizeLinkHealth(record.link_health),
    lastLinkError: asString(record.last_link_error),
    lastSnapshotAt:
      asString(record.last_snapshot_at) ?? latestSnapshot?.capturedAt ?? fallback.lastSnapshotAt,
    lastActionAt: asString(record.last_action_at) ?? fallback.lastActionAt,
    summary: asString(record.summary) ?? latestSnapshot?.summary ?? fallback.summary,
    identityKeys: dedupeIdentityKeys([
      ...fallback.identityKeys,
      asString(record.external_inquiry_id),
      asString(record.external_uri_token),
      asString(record.external_url),
      ...asStringArray(asRecord(record.payload)?.identity_keys),
    ]),
    urls,
    latestSnapshot,
    payout: hasMeaningfulPayout(payout) ? payout : null,
  }
}

export async function upsertMarketplaceRecord(
  params: PlatformRecordUpsertInput
): Promise<string | null> {
  const inferredIdentity = extractTacLinkIdentity(
    params.externalUrl ??
      params.requestUrl ??
      params.proposalUrl ??
      params.guestContactUrl ??
      params.bookingUrl ??
      params.menuUrl ??
      null
  )

  const { data: existing, error: existingError } = await params.supabase
    .from('platform_records')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .eq('inquiry_id', params.inquiryId)
    .maybeSingle()

  if (existingError) {
    if (isMissingMarketplaceRelation(existingError)) return null
    throw new Error(existingError.message || 'Failed to load marketplace record')
  }

  const payload = mergePayload(existing?.payload, params.payload)
  const recordPayload = cleanObject({
    id: existing?.id,
    tenant_id: params.tenantId,
    inquiry_id: params.inquiryId,
    client_id: resolveValue(params.clientId, existing?.client_id),
    event_id: resolveValue(params.eventId, existing?.event_id),
    platform: params.platform,
    external_inquiry_id: resolveValue(params.externalInquiryId, existing?.external_inquiry_id),
    external_uri_token: resolveValue(
      params.externalUriToken ?? inferredIdentity.ctaUriToken ?? undefined,
      existing?.external_uri_token
    ),
    external_url: resolveValue(params.externalUrl, existing?.external_url),
    request_url: resolveValue(params.requestUrl, existing?.request_url),
    proposal_url: resolveValue(params.proposalUrl, existing?.proposal_url),
    guest_contact_url: resolveValue(params.guestContactUrl, existing?.guest_contact_url),
    booking_url: resolveValue(params.bookingUrl, existing?.booking_url),
    menu_url: resolveValue(params.menuUrl, existing?.menu_url),
    status_on_platform: resolveValue(params.statusOnPlatform, existing?.status_on_platform),
    status_detail: resolveValue(params.statusDetail, existing?.status_detail),
    last_capture_type: resolveValue(params.lastCaptureType, existing?.last_capture_type),
    next_action_required: resolveValue(params.nextActionRequired, existing?.next_action_required),
    next_action_by: resolveValue(params.nextActionBy, existing?.next_action_by),
    link_health: resolveValue(params.linkHealth, existing?.link_health) ?? 'unknown',
    last_link_error: resolveValue(params.lastLinkError, existing?.last_link_error),
    last_snapshot_at: resolveValue(params.lastSnapshotAt, existing?.last_snapshot_at),
    last_action_at: resolveValue(params.lastActionAt, existing?.last_action_at),
    summary: resolveValue(params.summary, existing?.summary),
    payload,
    updated_at: params.updatedAt ?? new Date().toISOString(),
  })

  const { data, error } = await params.supabase
    .from('platform_records')
    .upsert(recordPayload, { onConflict: 'inquiry_id' })
    .select('id')
    .single()

  if (error) {
    if (isMissingMarketplaceRelation(error)) return null
    throw new Error(error.message || 'Failed to upsert marketplace record')
  }

  return data?.id ?? existing?.id ?? null
}

export async function appendPlatformSnapshot(
  params: PlatformSnapshotInsertInput
): Promise<string | null> {
  const payload = cleanObject({
    tenant_id: params.tenantId,
    platform_record_id: params.platformRecordId,
    inquiry_id: params.inquiryId,
    event_id: params.eventId ?? null,
    capture_type: params.captureType,
    source: params.source ?? 'capture',
    page_url: params.pageUrl ?? null,
    page_title: params.pageTitle ?? null,
    summary: params.summary ?? null,
    text_excerpt: params.textExcerpt ?? null,
    extracted_client_name: params.extractedClientName ?? null,
    extracted_email: params.extractedEmail ?? null,
    extracted_phone: params.extractedPhone ?? null,
    extracted_booking_date: params.extractedBookingDate ?? null,
    extracted_guest_count: params.extractedGuestCount ?? null,
    extracted_location: params.extractedLocation ?? null,
    extracted_occasion: params.extractedOccasion ?? null,
    extracted_amount_cents: params.extractedAmountCents ?? null,
    metadata: cleanObject({
      ...(params.metadata ?? {}),
      notes: params.notes ?? null,
    }),
    snapshot_at: params.snapshotAt ?? new Date().toISOString(),
    created_by: params.createdBy ?? null,
  })

  const { data, error } = await params.supabase
    .from('platform_snapshots')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    if (isMissingMarketplaceRelation(error)) return null
    throw new Error(error.message || 'Failed to insert marketplace snapshot')
  }

  return data?.id ?? null
}

export async function upsertPlatformPayout(params: PlatformPayoutUpsertInput): Promise<string | null> {
  const grossBookingCents = params.grossBookingCents ?? null
  const commissionPercent = params.commissionPercent ?? null
  const commissionAmountCents =
    params.commissionAmountCents ??
    (grossBookingCents != null && commissionPercent != null
      ? Math.round((grossBookingCents * commissionPercent) / 100)
      : null)
  const netPayoutCents =
    params.netPayoutCents ??
    (grossBookingCents != null && commissionAmountCents != null
      ? grossBookingCents - commissionAmountCents
      : null)

  const candidate: MarketplacePayoutSummary = {
    grossBookingCents,
    commissionPercent,
    commissionAmountCents,
    netPayoutCents,
    payoutStatus: normalizePayoutStatus(params.payoutStatus),
    payoutArrivalDate: params.payoutArrivalDate ?? null,
    payoutReference: params.payoutReference ?? null,
    notes: params.notes ?? null,
    updatedAt: params.capturedAt ?? new Date().toISOString(),
    source: 'canonical',
  }

  if (!hasMeaningfulPayout(candidate)) return null

  const { data: existing, error: existingError } = await params.supabase
    .from('platform_payouts')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .eq('platform_record_id', params.platformRecordId)
    .maybeSingle()

  if (existingError) {
    if (isMissingMarketplaceRelation(existingError)) return null
    throw new Error(existingError.message || 'Failed to load marketplace payout')
  }

  const payload = cleanObject({
    id: existing?.id,
    tenant_id: params.tenantId,
    platform_record_id: params.platformRecordId,
    inquiry_id: params.inquiryId,
    event_id: params.eventId ?? existing?.event_id ?? null,
    platform: params.platform,
    gross_booking_cents: grossBookingCents,
    commission_percent: commissionPercent,
    commission_amount_cents: commissionAmountCents,
    net_payout_cents: netPayoutCents,
    payout_status: normalizePayoutStatus(params.payoutStatus ?? existing?.payout_status),
    payout_arrival_date: params.payoutArrivalDate ?? existing?.payout_arrival_date ?? null,
    payout_reference: params.payoutReference ?? existing?.payout_reference ?? null,
    notes: params.notes ?? existing?.notes ?? null,
    source: params.source ?? existing?.source ?? 'inquiry',
    payload: mergePayload(existing?.payload, params.payload),
    captured_at: params.capturedAt ?? existing?.captured_at ?? null,
    updated_at: params.capturedAt ?? new Date().toISOString(),
  })

  const { data, error } = await params.supabase
    .from('platform_payouts')
    .upsert(payload, { onConflict: 'platform_record_id' })
    .select('id')
    .single()

  if (error) {
    if (isMissingMarketplaceRelation(error)) return null
    throw new Error(error.message || 'Failed to upsert marketplace payout')
  }

  return data?.id ?? existing?.id ?? null
}

export async function appendPlatformAction(
  params: PlatformActionInsertInput
): Promise<string | null> {
  const payload = cleanObject({
    tenant_id: params.tenantId,
    platform_record_id: params.platformRecordId,
    inquiry_id: params.inquiryId,
    event_id: params.eventId ?? null,
    action_type: params.actionType,
    action_label: params.actionLabel,
    action_source: params.actionSource ?? 'chef_flow',
    action_url: params.actionUrl ?? null,
    metadata: params.metadata ?? {},
    acted_at: params.actedAt ?? new Date().toISOString(),
    acted_by: params.actedBy ?? null,
  })

  const { data, error } = await params.supabase
    .from('platform_action_log')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    if (isMissingMarketplaceRelation(error)) return null
    throw new Error(error.message || 'Failed to insert marketplace action')
  }

  return data?.id ?? null
}

export async function syncMarketplaceCaptureToCanonical(
  params: MarketplaceCaptureSyncInput
): Promise<string | null> {
  const identity = extractTacLinkIdentity(params.externalUrl ?? params.pageUrl)
  const urls = buildUrlSet({
    external: params.externalUrl ?? params.pageUrl,
    request: params.externalUrl ?? params.pageUrl,
  })

  applyCaptureUrl(urls, params.captureType, params.pageUrl)

  const recordId = await upsertMarketplaceRecord({
    supabase: params.supabase,
    tenantId: params.tenantId,
    inquiryId: params.inquiryId,
    platform: params.platform,
    clientId: params.clientId,
    eventId: params.eventId,
    externalInquiryId: params.externalInquiryId,
    externalUriToken: identity.ctaUriToken,
    externalUrl: params.externalUrl ?? params.pageUrl,
    requestUrl: urls.request,
    proposalUrl: urls.proposal,
    guestContactUrl: urls.guestContact,
    bookingUrl: urls.booking,
    menuUrl: urls.menu,
    statusOnPlatform: params.statusOnPlatform ?? inferStatusFromCapture(params.captureType),
    statusDetail: params.statusDetail,
    lastCaptureType: params.captureType,
    nextActionRequired: params.nextActionRequired,
    nextActionBy: params.nextActionBy,
    lastSnapshotAt: params.capturedAt,
    lastActionAt: params.capturedAt,
    summary: params.summary ?? null,
    payload: {
      identity_keys: dedupeIdentityKeys([
        params.externalInquiryId ?? null,
        params.externalUrl ?? null,
        identity.ctaUriToken,
        params.pageUrl,
        ...(params.pageLinks ?? []),
      ]),
      latest_capture_source: 'page_capture',
      latest_page_title: params.pageTitle ?? null,
      latest_page_url: params.pageUrl,
    },
  })

  if (!recordId) return null

  await appendPlatformSnapshot({
    supabase: params.supabase,
    tenantId: params.tenantId,
    platformRecordId: recordId,
    inquiryId: params.inquiryId,
    eventId: params.eventId,
    captureType: params.captureType,
    source: 'page_capture',
    pageUrl: params.pageUrl,
    pageTitle: params.pageTitle,
    summary: params.summary,
    notes: params.notes,
    textExcerpt: params.textExcerpt,
    extractedClientName: params.extractedClientName,
    extractedEmail: params.extractedEmail,
    extractedPhone: params.extractedPhone,
    extractedBookingDate: params.extractedBookingDate,
    extractedGuestCount: params.extractedGuestCount,
    extractedLocation: params.extractedLocation,
    extractedOccasion: params.extractedOccasion,
    extractedAmountCents: params.extractedAmountCents,
    metadata: {
      page_links: params.pageLinks ?? [],
    },
    snapshotAt: params.capturedAt,
    createdBy: params.actedBy,
  })

  if (params.payout) {
    await upsertPlatformPayout({
      supabase: params.supabase,
      tenantId: params.tenantId,
      platformRecordId: recordId,
      inquiryId: params.inquiryId,
      platform: params.platform,
      eventId: params.eventId,
      ...params.payout,
      capturedAt: params.payout.capturedAt ?? params.capturedAt,
    })
  }

  await appendPlatformAction({
    supabase: params.supabase,
    tenantId: params.tenantId,
    platformRecordId: recordId,
    inquiryId: params.inquiryId,
    eventId: params.eventId,
    actionType: 'capture_saved',
    actionLabel: `Saved ${params.captureType.replace(/_/g, ' ')} capture`,
    actionSource: 'chef_flow_capture',
    actionUrl: params.pageUrl,
    metadata: {
      capture_type: params.captureType,
      external_url: params.externalUrl ?? null,
    },
    actedAt: params.capturedAt,
    actedBy: params.actedBy,
  })

  return recordId
}

export async function syncMarketplaceInquiryProjection(
  params: MarketplaceInquiryProjectionInput
): Promise<string | null> {
  const recordId = await upsertMarketplaceRecord({
    supabase: params.supabase,
    tenantId: params.tenantId,
    inquiryId: params.inquiryId,
    platform: params.platform,
    clientId: params.clientId,
    eventId: params.eventId,
    externalInquiryId: params.externalInquiryId,
    externalUrl: params.externalUrl,
    statusOnPlatform: params.statusOnPlatform,
    statusDetail: params.statusDetail,
    nextActionRequired: params.nextActionRequired,
    nextActionBy: params.nextActionBy,
    summary: params.summary,
    lastActionAt: params.actedAt ?? new Date().toISOString(),
    payload: params.payload ?? {},
  })

  if (!recordId) return null

  if (params.payout) {
    await upsertPlatformPayout({
      supabase: params.supabase,
      tenantId: params.tenantId,
      platformRecordId: recordId,
      inquiryId: params.inquiryId,
      platform: params.platform,
      eventId: params.eventId,
      ...params.payout,
      capturedAt: params.payout.capturedAt ?? params.actedAt ?? new Date().toISOString(),
    })
  }

  if (params.actionType && params.actionLabel) {
    await appendPlatformAction({
      supabase: params.supabase,
      tenantId: params.tenantId,
      platformRecordId: recordId,
      inquiryId: params.inquiryId,
      eventId: params.eventId,
      actionType: params.actionType,
      actionLabel: params.actionLabel,
      actionUrl: params.externalUrl,
      actedAt: params.actedAt ?? new Date().toISOString(),
      actedBy: params.actedBy,
    })
  }

  return recordId
}

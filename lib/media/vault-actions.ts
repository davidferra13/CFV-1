'use server'

// Event Media Vault - Server Actions
// 4-tier media management, cross-event search, consent tracking.
// Auth-gated via requireChef(), tenant-scoped on every query.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  MediaAsset,
  MediaTier,
  MediaConsent,
  AddMediaInput,
  RecordConsentInput,
  VaultSearchParams,
  VaultSearchResult,
  DishPhotoMatch,
  MediaStats,
  ConsentStatus,
  MediaType,
} from './vault-types'

// ─── Tier ordering (for promotion validation) ─────────────────────────────────

const TIER_ORDER: Record<MediaTier, number> = {
  raw: 0,
  curated: 1,
  polished: 2,
  published: 3,
}

// ─── addMediaToVault ──────────────────────────────────────────────────────────

/**
 * Add a media asset to an event's vault with tier assignment.
 * Tags, dish name, venue address, and social metadata are optional.
 */
export async function addMediaToVault(
  eventId: string,
  asset: AddMediaInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Verify event belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    return { success: false, error: 'Event not found or access denied' }
  }

  const { data, error } = await db
    .from('media_vault_assets')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      tier: asset.tier,
      media_type: asset.mediaType,
      file_path: asset.filePath ?? null,
      external_url: asset.externalUrl ?? null,
      thumbnail_path: asset.thumbnailPath ?? null,
      caption: asset.caption ?? null,
      tags: asset.tags ?? [],
      dish_name: asset.dishName ?? null,
      course_name: asset.courseName ?? null,
      venue_address: asset.venueAddress ?? null,
      social_platform: asset.socialPlatform ?? null,
      social_caption: asset.socialCaption ?? null,
      social_post_date: asset.socialPostDate ?? null,
      annotation: asset.annotation ?? null,
      source_attribution: asset.sourceAttribution ?? null,
      display_order: asset.displayOrder ?? 0,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

// ─── promoteMedia ─────────────────────────────────────────────────────────────

/**
 * Promote a media asset to a higher tier (e.g. raw -> curated -> polished).
 * Cannot demote. Enforces consent: private_only blocks polished/published.
 */
export async function promoteMedia(
  assetId: string,
  toTier: MediaTier
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch asset
  const { data: asset } = await db
    .from('media_vault_assets')
    .select('id, tier, event_id')
    .eq('id', assetId)
    .eq('tenant_id', tenantId)
    .single()

  if (!asset) {
    return { success: false, error: 'Asset not found or access denied' }
  }

  // Validate promotion direction
  if (TIER_ORDER[toTier as MediaTier] <= TIER_ORDER[asset.tier as MediaTier]) {
    return { success: false, error: 'Can only promote to a higher tier' }
  }

  // Check consent for public tiers
  if (toTier === 'polished' || toTier === 'published') {
    const { data: consents } = await db
      .from('media_consents')
      .select('status')
      .eq('event_id', asset.event_id)
      .eq('tenant_id', tenantId)
      .is('guest_id', null)

    const eventConsent = consents?.[0]
    if (
      eventConsent &&
      (eventConsent.status === 'no_photos' || eventConsent.status === 'private_only')
    ) {
      return {
        success: false,
        error: `Cannot promote to ${toTier}: event consent is ${eventConsent.status}`,
      }
    }
  }

  const { error } = await db
    .from('media_vault_assets')
    .update({ tier: toTier, updated_at: new Date().toISOString() })
    .eq('id', assetId)
    .eq('tenant_id', tenantId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ─── getEventMedia ────────────────────────────────────────────────────────────

/**
 * All media for an event, optionally filtered by tier.
 * Ordered by display_order, then created_at.
 */
export async function getEventMedia(eventId: string, tier?: MediaTier): Promise<MediaAsset[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  let query = db
    .from('media_vault_assets')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (tier) {
    query = query.eq('tier', tier)
  }

  const { data } = await query

  return (data ?? []).map(mapAssetRow)
}

// ─── searchMediaByDish ────────────────────────────────────────────────────────

/**
 * Cross-event dish photo search. Finds all media matching a dish name
 * (case-insensitive partial match). Returns matches with event context.
 */
export async function searchMediaByDish(dishName: string): Promise<DishPhotoMatch[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: assets } = await db
    .from('media_vault_assets')
    .select('*')
    .eq('tenant_id', tenantId)
    .ilike('dish_name', `%${dishName}%`)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!assets || assets.length === 0) return []

  // Fetch event context for each unique event
  const eventIds = [...new Set(assets.map((a: any) => a.event_id))]
  const { data: events } = await db
    .from('events')
    .select('id, event_date, client:clients(full_name)')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  const eventMap = new Map<string, { eventDate: string | null; clientName: string | null }>()
  for (const e of events ?? []) {
    const client = e.client as Record<string, any> | null
    eventMap.set(e.id, {
      eventDate: e.event_date ?? null,
      clientName: client?.full_name ?? null,
    })
  }

  return assets.map((row: any) => {
    const ctx = eventMap.get(row.event_id)
    return {
      asset: mapAssetRow(row),
      eventId: row.event_id,
      eventDate: ctx?.eventDate ?? null,
      clientName: ctx?.clientName ?? null,
    }
  })
}

// ─── getVenuePhotos ───────────────────────────────────────────────────────────

/**
 * All photos at a venue across events (matched by address).
 * Only returns venue-tagged or venue-address-matched media.
 */
export async function getVenuePhotos(venueAddress: string): Promise<MediaAsset[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data } = await db
    .from('media_vault_assets')
    .select('*')
    .eq('tenant_id', tenantId)
    .ilike('venue_address', `%${venueAddress}%`)
    .order('created_at', { ascending: false })

  return (data ?? []).map(mapAssetRow)
}

// ─── recordConsent ────────────────────────────────────────────────────────────

/**
 * Record or update consent for an event (event-level or guest-specific).
 * Upserts: if consent already exists for this event+guest, updates it.
 */
export async function recordConsent(
  eventId: string,
  input: RecordConsentInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Verify event belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    return { success: false, error: 'Event not found or access denied' }
  }

  const guestId = input.guestId ?? null

  // Check if consent record exists
  let query = db
    .from('media_consents')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  if (guestId) {
    query = query.eq('guest_id', guestId)
  } else {
    query = query.is('guest_id', null)
  }

  const { data: existing } = await query.single()

  if (existing) {
    // Update
    const { error } = await db
      .from('media_consents')
      .update({
        status: input.status,
        notes: input.notes ?? null,
        recorded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }
    return { success: true, id: existing.id }
  }

  // Insert
  const { data, error } = await db
    .from('media_consents')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      guest_id: guestId,
      status: input.status,
      notes: input.notes ?? null,
      recorded_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data.id }
}

// ─── getMediaStats ────────────────────────────────────────────────────────────

/**
 * Aggregate counts by tier, type, and consent status for the tenant.
 */
export async function getMediaStats(): Promise<MediaStats> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch all assets (count only, no file data)
  const { data: assets } = await db
    .from('media_vault_assets')
    .select('tier, media_type')
    .eq('tenant_id', tenantId)

  const { data: consents } = await db
    .from('media_consents')
    .select('status')
    .eq('tenant_id', tenantId)
    .is('guest_id', null)

  const byTier: Record<MediaTier, number> = { raw: 0, curated: 0, polished: 0, published: 0 }
  const byType: Record<MediaType, number> = { photo: 0, video: 0, social_post: 0 }

  for (const a of assets ?? []) {
    if (a.tier in byTier) byTier[a.tier as MediaTier]++
    if (a.media_type in byType) byType[a.media_type as MediaType]++
  }

  const byConsent: Record<ConsentStatus, number> = {
    no_photos: 0,
    private_only: 0,
    portfolio_ok: 0,
    social_ok: 0,
  }

  for (const c of consents ?? []) {
    if (c.status in byConsent) byConsent[c.status as ConsentStatus]++
  }

  return {
    totalAssets: (assets ?? []).length,
    byTier,
    byType,
    byConsent,
  }
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapAssetRow(row: Record<string, any>): MediaAsset {
  return {
    id: row.id,
    eventId: row.event_id,
    tenantId: row.tenant_id,
    tier: row.tier,
    mediaType: row.media_type,
    filePath: row.file_path,
    externalUrl: row.external_url,
    thumbnailPath: row.thumbnail_path,
    caption: row.caption,
    tags: row.tags ?? [],
    dishName: row.dish_name,
    courseName: row.course_name,
    venueAddress: row.venue_address,
    socialPlatform: row.social_platform,
    socialCaption: row.social_caption,
    socialPostDate: row.social_post_date,
    annotation: row.annotation,
    sourceAttribution: row.source_attribution,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

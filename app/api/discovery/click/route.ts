import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pgClient } from '@/lib/db'
import {
  getDiscoveryProfileMutation,
  isDiscoveryAction,
  isDiscoveryItemType,
  isDiscoveryRowRole,
  isMissingDiscoveryStorageError,
  sanitizeDiscoveryAction,
  sanitizeDiscoveryItemPayload,
  type DiscoveryAction,
} from '@/lib/discovery/persistent-profile'
import { recordCulinaryProfileOutcome } from '@/lib/discovery/culinary-profile-persistence'
import type { FoodTaxonomyKind } from '@/lib/discovery/preference-taxonomy'

export const dynamic = 'force-dynamic'

const MAX_VALUE_LEN = 100
const MAX_LABEL_LEN = 100
const MAX_HREF_LEN = 500
const MAX_DESTINATION_PATH_LEN = 120
const MAX_SESSION_ID_LEN = 128
const MAX_ANONYMOUS_ID_LEN = 128
const MAX_ALGORITHM_VERSION_LEN = 80
const MAX_CONTEXT_KEY_LEN = 64
const MAX_CONTEXT_STRING_LEN = 300
const MAX_CONTEXT_BYTES = 4000
const MAX_CONTEXT_DEPTH = 3
const MAX_CONTEXT_KEYS = 32
const MAX_CONTEXT_ARRAY_ITEMS = 20
const BLOCKED_CONTEXT_KEYS = new Set(['anonymous_id', 'anonymousId'])

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: true })
    }

    if (!body || typeof body !== 'object') return NextResponse.json({ ok: true })

    const {
      action,
      session_id,
      anonymous_id,
      algorithm_version,
      base_href,
      destination_path,
      row_role,
      row_position,
      row_item_count,
      is_duplicate,
      location_attached,
      presentation,
      event_context,
      context,
      metadata,
    } = body as Record<string, unknown>

    const item = sanitizeDiscoveryItemPayload(body as Record<string, unknown>)
    if (!item) {
      return NextResponse.json({ ok: true })
    }

    const rawAction = coalesce(action, (body as Record<string, unknown>).profile_action)
    if (rawAction !== undefined && !isDiscoveryAction(rawAction))
      return NextResponse.json({ ok: true })

    const safeAnonymousId =
      typeof anonymous_id === 'string' && anonymous_id.trim()
        ? anonymous_id.slice(0, MAX_ANONYMOUS_ID_LEN)
        : null
    const safeAuthUserId = session?.user?.id ?? null
    if (!safeAuthUserId && !safeAnonymousId) {
      return NextResponse.json({ ok: true })
    }

    const safeValue = item.itemValue.slice(0, MAX_VALUE_LEN)
    const safeLabel = item.itemLabel?.slice(0, MAX_LABEL_LEN) ?? null
    const safeHref = item.href?.slice(0, MAX_HREF_LEN) ?? null
    const safeAction = sanitizeDiscoveryAction(rawAction, 'click')
    const safeSessionId =
      typeof session_id === 'string' && session_id.trim()
        ? session_id.slice(0, MAX_SESSION_ID_LEN)
        : null
    const safeAlgorithmVersion =
      typeof algorithm_version === 'string' && algorithm_version.trim()
        ? algorithm_version.slice(0, MAX_ALGORITHM_VERSION_LEN)
        : null
    const safeBaseHref = typeof base_href === 'string' ? base_href.slice(0, MAX_HREF_LEN) : null
    const safeDestinationPath =
      typeof destination_path === 'string'
        ? destination_path.slice(0, MAX_DESTINATION_PATH_LEN)
        : null
    const safeRowRole = isDiscoveryRowRole(row_role) ? row_role : null
    const safeRowPosition =
      typeof row_position === 'number' && Number.isInteger(row_position) && row_position >= 0
        ? row_position
        : null
    const safeRowItemCount =
      typeof row_item_count === 'number' && Number.isInteger(row_item_count) && row_item_count > 0
        ? row_item_count
        : null
    const safePresentation =
      presentation === 'pill' || presentation === 'story' ? presentation : null
    const safeEventContext = toBoundedJsonObject(
      firstPlainObject(metadata, event_context, context, pickKnownContextFields(body))
    )

    await persistDiscoveryInteraction({
      authUserId: safeAuthUserId,
      anonymousId: safeAnonymousId,
      itemType: item.itemType,
      itemValue: safeValue,
      itemLabel: safeLabel,
      href: safeHref,
      action: safeAction,
      sessionId: safeSessionId,
      algorithmVersion: safeAlgorithmVersion,
      baseHref: safeBaseHref,
      destinationPath: safeDestinationPath,
      rowRole: safeRowRole,
      rowPosition: safeRowPosition,
      rowItemCount: safeRowItemCount,
      isDuplicate: is_duplicate === true,
      locationAttached: location_attached === true,
      presentation: safePresentation,
      eventContext: safeEventContext,
    })

    if (safeAuthUserId) {
      await persistDiscoveryProfileItem({
        authUserId: safeAuthUserId,
        action: safeAction,
        itemType: item.itemType,
        itemValue: safeValue,
        itemLabel: safeLabel,
        href: safeHref,
        metadata: safeEventContext,
      })
      await persistExplicitCulinaryOutcome({
        authUserId: safeAuthUserId,
        action: safeAction,
        itemType: item.itemType,
        itemValue: safeValue,
        itemLabel: safeLabel,
        sessionId: safeSessionId,
        metadata: safeEventContext,
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    // Always 200 - never expose errors to the caller
    return NextResponse.json({ ok: true })
  }
}

async function persistExplicitCulinaryOutcome(input: {
  authUserId: string
  action: DiscoveryAction
  itemType: string
  itemValue: string
  itemLabel: string | null
  sessionId: string | null
  metadata: JsonValue | null
}): Promise<void> {
  const outcome =
    input.action === 'love'
      ? 'liked'
      : input.action === 'hate'
        ? 'not_again'
        : input.action === 'save' || input.action === 'pin'
          ? 'add_to_profile'
          : null
  if (!outcome) return

  try {
    await recordCulinaryProfileOutcome({
      ownerId: input.authUserId,
      actorId: input.authUserId,
      outcome: {
        itemId: input.itemValue,
        itemLabel: input.itemLabel ?? input.itemValue,
        itemKind: foodKindForDiscoveryItemType(input.itemType),
        outcome,
        sessionId: input.sessionId,
        surface: surfaceFromMetadata(input.metadata),
      },
    })
  } catch (error) {
    if (!isMissingDiscoveryStorageError(error)) {
      // Culinary profile learning is best-effort and must not block discovery tracking.
    }
  }
}

function foodKindForDiscoveryItemType(itemType: string): FoodTaxonomyKind | undefined {
  if (itemType === 'cuisine') return 'cuisine'
  if (itemType === 'dietary') return 'dietary'
  if (itemType === 'craving') return 'craving'
  if (itemType === 'price') return 'budget'
  if (itemType === 'featured_chef' || itemType === 'chef_pick') return 'restaurant'
  if (itemType === 'service') return 'service_style'
  if (itemType === 'food_type' || itemType === 'culinary_signal') return 'dish'
  return 'tag'
}

function surfaceFromMetadata(
  metadata: JsonValue | null
): 'homepage' | 'eat' | 'chef_profile' | 'meal_board' | 'unknown' {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'unknown'
  const source = metadata.source
  if (source === 'homepage_discovery_marquee' || source === 'homepage_search') return 'homepage'
  if (source === 'save_chef_button') return 'chef_profile'
  return 'unknown'
}

async function persistDiscoveryInteraction(input: {
  authUserId: string | null
  anonymousId: string | null
  itemType: string
  itemValue: string
  itemLabel: string | null
  href: string | null
  action: DiscoveryAction
  sessionId: string | null
  algorithmVersion: string | null
  baseHref: string | null
  destinationPath: string | null
  rowRole: string | null
  rowPosition: number | null
  rowItemCount: number | null
  isDuplicate: boolean
  locationAttached: boolean
  presentation: string | null
  eventContext: JsonValue | null
}): Promise<void> {
  try {
    await pgClient`
        INSERT INTO discovery_interactions
          (
            auth_user_id,
            anonymous_id,
            item_type,
            item_value,
            item_label,
            href,
            action,
            session_id,
            algorithm_version,
            base_href,
            destination_path,
            row_role,
            row_position,
            row_item_count,
            is_duplicate,
            location_attached,
            presentation,
            event_context
          )
        VALUES
          (
            ${input.authUserId}::uuid,
            ${input.anonymousId},
            ${input.itemType},
            ${input.itemValue},
            ${input.itemLabel},
            ${input.href},
            ${input.action},
            ${input.sessionId},
            ${input.algorithmVersion},
            ${input.baseHref},
            ${input.destinationPath},
            ${input.rowRole},
            ${input.rowPosition},
            ${input.rowItemCount},
            ${input.isDuplicate},
            ${input.locationAttached},
            ${input.presentation},
            ${input.eventContext ? JSON.stringify(input.eventContext) : null}::jsonb
          )
      `
  } catch (error) {
    if (!isMissingDiscoveryStorageError(error)) {
      // Discovery tracking is best-effort.
    }
  }
}

async function persistDiscoveryProfileItem(input: {
  authUserId: string
  action: DiscoveryAction
  itemType: string
  itemValue: string
  itemLabel: string | null
  href: string | null
  metadata: JsonValue | null
}): Promise<void> {
  if (!isDiscoveryItemType(input.itemType)) return

  const mutation = getDiscoveryProfileMutation(input.action)
  if (!mutation) return

  try {
    const rows = await pgClient<
      {
        pinned: boolean | null
        dismissed: boolean | null
        liked: boolean | null
        disliked: boolean | null
      }[]
    >`
      SELECT pinned, dismissed, liked, disliked
      FROM discovery_profile_items
      WHERE auth_user_id = ${input.authUserId}::uuid
        AND item_type = ${input.itemType}
        AND item_value = ${input.itemValue}
      LIMIT 1
    `
    const current = rows[0]
    const next = {
      pinned: mutation.pinned ?? current?.pinned ?? false,
      dismissed: mutation.dismissed ?? current?.dismissed ?? false,
      liked: mutation.liked ?? current?.liked ?? false,
      disliked: mutation.disliked ?? current?.disliked ?? false,
    }

    await pgClient`
      INSERT INTO discovery_profile_items
        (
          auth_user_id,
          item_type,
          item_value,
          item_label,
          href,
          pinned,
          dismissed,
          liked,
          disliked,
          metadata,
          last_interacted_at,
          updated_at
        )
      VALUES
        (
          ${input.authUserId}::uuid,
          ${input.itemType},
          ${input.itemValue},
          ${input.itemLabel},
          ${input.href},
          ${next.pinned},
          ${next.dismissed},
          ${next.liked},
          ${next.disliked},
          ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb,
          now(),
          now()
        )
      ON CONFLICT (auth_user_id, item_type, item_value)
      DO UPDATE SET
        item_label = COALESCE(EXCLUDED.item_label, discovery_profile_items.item_label),
        href = COALESCE(EXCLUDED.href, discovery_profile_items.href),
        pinned = EXCLUDED.pinned,
        dismissed = EXCLUDED.dismissed,
        liked = EXCLUDED.liked,
        disliked = EXCLUDED.disliked,
        metadata = COALESCE(EXCLUDED.metadata, discovery_profile_items.metadata),
        last_interacted_at = now(),
        updated_at = now()
    `
  } catch (error) {
    if (!isMissingDiscoveryStorageError(error)) {
      // Discovery profile persistence is best-effort.
    }
  }
}

function firstPlainObject(...values: unknown[]): Record<string, unknown> | null {
  for (const value of values) {
    if (isPlainObject(value) && Object.keys(value).length > 0) return value
  }

  return null
}

function pickKnownContextFields(body: unknown): Record<string, unknown> | null {
  if (!isPlainObject(body)) return null

  const contextKeys = [
    'component',
    'section',
    'source',
    'page_url',
    'page_path',
    'pathname',
    'referrer',
    'search_query',
    'query',
    'search_results_count',
    'inquiry_id',
    'dwell_ms',
    'duration_ms',
    'visible_ms',
    'viewport_width',
    'viewport_height',
  ]
  const picked: Record<string, unknown> = {}

  for (const key of contextKeys) {
    if (body[key] !== undefined) picked[key] = body[key]
  }

  return Object.keys(picked).length > 0 ? picked : null
}

function toBoundedJsonObject(value: Record<string, unknown> | null): JsonValue | null {
  if (!value) return null

  const sanitized = sanitizeJsonValue(value, 0)
  if (!isPlainObject(sanitized)) return null

  const json = JSON.stringify(sanitized)
  if (new TextEncoder().encode(json).length <= MAX_CONTEXT_BYTES) return sanitized as JsonValue

  return { truncated: true }
}

function sanitizeJsonValue(value: unknown, depth: number): JsonValue | undefined {
  if (value === null) return null

  if (typeof value === 'string') return value.slice(0, MAX_CONTEXT_STRING_LEN)
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined

  if (depth >= MAX_CONTEXT_DEPTH) return undefined

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_CONTEXT_ARRAY_ITEMS)
      .map((item) => sanitizeJsonValue(item, depth + 1))
      .filter((item): item is JsonValue => item !== undefined)

    return items
  }

  if (isPlainObject(value)) {
    const sanitized: Record<string, JsonValue> = {}
    const entries = Object.entries(value).slice(0, MAX_CONTEXT_KEYS)

    for (const [key, entryValue] of entries) {
      const safeKey = key.slice(0, MAX_CONTEXT_KEY_LEN)
      if (!safeKey || BLOCKED_CONTEXT_KEYS.has(key) || BLOCKED_CONTEXT_KEYS.has(safeKey)) continue

      const safeValue = sanitizeJsonValue(entryValue, depth + 1)
      if (safeValue !== undefined) sanitized[safeKey] = safeValue
    }

    return sanitized
  }

  return undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function coalesce(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null)
}

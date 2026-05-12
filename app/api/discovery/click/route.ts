import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pgClient } from '@/lib/db'

export const dynamic = 'force-dynamic'

const VALID_ITEM_TYPES = new Set([
  'cuisine',
  'food_type',
  'craving',
  'service',
  'occasion',
  'dietary',
  'featured_chef',
  'chef_pick',
  'combo',
  'story',
  'surprise',
  'seasonal',
  'location',
  'mood',
  'price',
  'time',
  'group_size',
  'saved',
  'special_dining',
  'culinary_signal',
])

const VALID_ROW_ROLES = new Set(['cuisine', 'mobile', 'craving', 'intent'])

const VALID_ACTIONS = new Set([
  'impression',
  'ignore',
  'click',
  'love',
  'hate',
  'hide',
  'save',
  'long_dwell',
  'quick_back',
  'search_submit',
  'inquiry_started',
  'inquiry_submitted',
])

const MAX_VALUE_LEN = 100
const MAX_LABEL_LEN = 100
const MAX_HREF_LEN = 500
const MAX_DESTINATION_PATH_LEN = 120
const MAX_SESSION_ID_LEN = 128
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
    if (!session?.user?.id) {
      // Anonymous - silently discard
      return NextResponse.json({ ok: true })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: true })
    }

    if (!body || typeof body !== 'object') return NextResponse.json({ ok: true })

    const {
      item_type,
      item_value,
      item_label,
      href,
      action,
      session_id,
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

    if (typeof item_type !== 'string' || !VALID_ITEM_TYPES.has(item_type)) {
      return NextResponse.json({ ok: true })
    }

    if (typeof item_value !== 'string' || !item_value.trim()) {
      return NextResponse.json({ ok: true })
    }

    const safeValue = item_value.slice(0, MAX_VALUE_LEN)
    const safeLabel = typeof item_label === 'string' ? item_label.slice(0, MAX_LABEL_LEN) : null
    const safeHref = typeof href === 'string' ? href.slice(0, MAX_HREF_LEN) : null
    if (action !== undefined && (typeof action !== 'string' || !VALID_ACTIONS.has(action))) {
      return NextResponse.json({ ok: true })
    }

    const safeAction = typeof action === 'string' ? action : 'click'
    const safeSessionId =
      typeof session_id === 'string' && session_id.trim()
        ? session_id.slice(0, MAX_SESSION_ID_LEN)
        : null
    const safeBaseHref = typeof base_href === 'string' ? base_href.slice(0, MAX_HREF_LEN) : null
    const safeDestinationPath =
      typeof destination_path === 'string'
        ? destination_path.slice(0, MAX_DESTINATION_PATH_LEN)
        : null
    const safeRowRole =
      typeof row_role === 'string' && VALID_ROW_ROLES.has(row_role) ? row_role : null
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
      firstPlainObject(event_context, context, metadata, pickKnownContextFields(body))
    )

    await pgClient`
      INSERT INTO discovery_interactions
        (
          auth_user_id,
          item_type,
          item_value,
          item_label,
          href,
          action,
          session_id,
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
          ${session.user.id}::uuid,
          ${item_type},
          ${safeValue},
          ${safeLabel},
          ${safeHref},
          ${safeAction},
          ${safeSessionId},
          ${safeBaseHref},
          ${safeDestinationPath},
          ${safeRowRole},
          ${safeRowPosition},
          ${safeRowItemCount},
          ${is_duplicate === true},
          ${location_attached === true},
          ${safePresentation},
          ${safeEventContext ? JSON.stringify(safeEventContext) : null}::jsonb
        )
    `

    return NextResponse.json({ ok: true })
  } catch {
    // Always 200 - never expose errors to the caller
    return NextResponse.json({ ok: true })
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

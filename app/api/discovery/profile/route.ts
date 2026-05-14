import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pgClient } from '@/lib/db'
import {
  getDiscoveryProfileMutation,
  isDiscoveryAction,
  isDiscoveryItemType,
  isMissingDiscoveryStorageError,
  normalizeDiscoveryProfileRows,
  sanitizeDiscoveryAction,
  sanitizeDiscoveryItemPayload,
  type DiscoveryProfileState,
  type DiscoveryRecentItem,
} from '@/lib/discovery/persistent-profile'
import {
  rankDiscoveryInteractionPreferences,
  type DiscoveryInteractionSignalRow,
} from '@/lib/discovery/discovery-preference-ranking'

export const dynamic = 'force-dynamic'

const EMPTY_PROFILE_STATE: DiscoveryProfileState = {
  pinned: [],
  dismissed: [],
  liked: [],
  disliked: [],
  recent: [],
  preferences: [],
}

export async function GET() {
  try {
    const session = await auth()
    const authUserId = session?.user?.id ?? null
    if (!authUserId) {
      return NextResponse.json({ ok: true, authenticated: false, profile: EMPTY_PROFILE_STATE })
    }

    const [explicitState, recent, preferences] = await Promise.all([
      loadExplicitProfileState(authUserId),
      loadRecentInteractions(authUserId),
      loadRankedPreferences(authUserId),
    ])

    return NextResponse.json({
      ok: true,
      authenticated: true,
      profile: {
        ...explicitState,
        recent,
        preferences,
      },
    })
  } catch {
    return NextResponse.json({ ok: true, authenticated: false, profile: EMPTY_PROFILE_STATE })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const authUserId = session?.user?.id ?? null
    if (!authUserId) {
      return NextResponse.json({ ok: true, authenticated: false })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: true, authenticated: true })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: true, authenticated: true })
    }

    const input = body as Record<string, unknown>
    const item = sanitizeDiscoveryItemPayload(input)
    if (!item) return NextResponse.json({ ok: true, authenticated: true })

    if (input.action !== undefined && !isDiscoveryAction(input.action)) {
      return NextResponse.json({ ok: true, authenticated: true })
    }

    const action = sanitizeDiscoveryAction(input.action, 'save')
    const mutation = getDiscoveryProfileMutation(action)
    if (!mutation) return NextResponse.json({ ok: true, authenticated: true })

    await upsertProfileItem({
      authUserId,
      itemType: item.itemType,
      itemValue: item.itemValue,
      itemLabel: item.itemLabel,
      href: item.href,
      metadata: item.metadata,
      mutation,
    })

    return NextResponse.json({ ok: true, authenticated: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

async function loadExplicitProfileState(authUserId: string): Promise<DiscoveryProfileState> {
  try {
    const rows = await pgClient<Record<string, unknown>[]>`
      SELECT
        item_type,
        item_value,
        item_label,
        href,
        pinned,
        dismissed,
        liked,
        disliked,
        metadata,
        created_at,
        updated_at,
        last_interacted_at
      FROM discovery_profile_items
      WHERE auth_user_id = ${authUserId}::uuid
      ORDER BY last_interacted_at DESC NULLS LAST, updated_at DESC
      LIMIT 200
    `

    return normalizeDiscoveryProfileRows(rows)
  } catch (error) {
    if (isMissingDiscoveryStorageError(error)) return EMPTY_PROFILE_STATE
    return EMPTY_PROFILE_STATE
  }
}

async function loadRecentInteractions(authUserId: string): Promise<DiscoveryRecentItem[]> {
  try {
    const rows = await pgClient<
      {
        item_type: string | null
        item_value: string | null
        item_label: string | null
        href: string | null
        action: string | null
        event_context: Record<string, unknown> | null
        created_at: string | null
      }[]
    >`
      SELECT
        item_type,
        item_value,
        item_label,
        href,
        action,
        event_context,
        created_at
      FROM discovery_interactions
      WHERE auth_user_id = ${authUserId}::uuid
        AND is_duplicate = false
      ORDER BY created_at DESC
      LIMIT 50
    `

    return rows
      .filter((row) => isDiscoveryItemType(row.item_type) && typeof row.item_value === 'string')
      .map((row) => ({
        itemType: row.item_type as DiscoveryRecentItem['itemType'],
        itemValue: row.item_value as string,
        itemLabel: row.item_label,
        href: row.href,
        action: row.action,
        metadata: row.event_context,
        interactedAt: row.created_at,
      }))
  } catch (error) {
    if (isMissingDiscoveryStorageError(error)) return []
    return []
  }
}

async function loadRankedPreferences(authUserId: string) {
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 365)

    const rows = await pgClient<DiscoveryInteractionSignalRow[]>`
      SELECT item_type, item_value, action, created_at
      FROM discovery_interactions
      WHERE auth_user_id = ${authUserId}::uuid
        AND is_duplicate = false
        AND created_at >= ${cutoff.toISOString()}
      ORDER BY created_at DESC
      LIMIT 300
    `

    return rankDiscoveryInteractionPreferences(rows)
  } catch (error) {
    if (isMissingDiscoveryStorageError(error)) return []
    return []
  }
}

async function upsertProfileItem(input: {
  authUserId: string
  itemType: string
  itemValue: string
  itemLabel: string | null
  href: string | null
  metadata: Record<string, unknown> | null
  mutation: {
    pinned?: boolean
    dismissed?: boolean
    liked?: boolean
    disliked?: boolean
  }
}): Promise<void> {
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
      pinned: input.mutation.pinned ?? current?.pinned ?? false,
      dismissed: input.mutation.dismissed ?? current?.dismissed ?? false,
      liked: input.mutation.liked ?? current?.liked ?? false,
      disliked: input.mutation.disliked ?? current?.disliked ?? false,
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
      // Profile state is an enhancement; never fail homepage discovery.
    }
  }
}

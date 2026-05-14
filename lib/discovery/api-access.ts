import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { pgClient } from '@/lib/db'
import {
  derivePreferenceProfile,
  type DerivedPreferenceProfile,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'

export type DiscoveryApiAccess =
  | {
      ok: true
      userId: string
    }
  | {
      ok: false
      response: NextResponse
    }

export async function requireDiscoveryApiUser(): Promise<DiscoveryApiAccess> {
  const session = await auth()
  const userId = session?.user?.id ?? null

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 }),
    }
  }

  return { ok: true, userId }
}

export function discoveryApiError(
  error: string,
  status = 400,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ ok: false, error, ...(details ?? {}) }, { status })
}

export async function loadCulinaryPreferenceProfile(
  ownerId: string
): Promise<DerivedPreferenceProfile> {
  const signals = await loadCulinaryPreferenceSignals(ownerId)
  return derivePreferenceProfile(signals, { ownerId, includePendingReview: true })
}

export async function loadCulinaryPreferenceSignals(
  ownerId: string
): Promise<PreferenceSignalLedgerEntry[]> {
  try {
    const rows = await pgClient<{ signal_payload: unknown }[]>`
      SELECT signal_payload
      FROM culinary_profile_signals
      WHERE owner_id = ${ownerId}::uuid
      ORDER BY observed_at DESC
      LIMIT 500
    `

    return rows
      .map((row) => row.signal_payload)
      .filter(isPreferenceSignalLedgerEntry)
      .filter((signal) => signal.ownerId === ownerId)
  } catch {
    return []
  }
}

function isPreferenceSignalLedgerEntry(value: unknown): value is PreferenceSignalLedgerEntry {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PreferenceSignalLedgerEntry>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.ownerId === 'string' &&
    typeof candidate.rawValue === 'string' &&
    typeof candidate.observedAt === 'string' &&
    typeof candidate.normalizedTerm === 'object' &&
    candidate.normalizedTerm !== null &&
    typeof candidate.consent === 'object' &&
    candidate.consent !== null &&
    typeof candidate.metadata === 'object' &&
    candidate.metadata !== null
  )
}

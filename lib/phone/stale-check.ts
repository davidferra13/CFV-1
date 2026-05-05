/**
 * Stale Phone Re-verification
 *
 * Detects phone numbers that were verified more than 6 months ago
 * and have had no successful SMS delivery since. These phones
 * may no longer be valid and should prompt re-verification.
 *
 * This is a utility module; the UI prompt will be built separately.
 * Depends on the phone_numbers table from Phase 1.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type StalePhoneResult = {
  phoneNumberId: string
  phoneNumber: string
  entityType: string
  entityId: string
  verifiedAt: Date | null
  daysSinceVerified: number
}

const STALE_THRESHOLD_DAYS = 180 // 6 months

/**
 * Check for stale phone numbers associated with an entity.
 *
 * A phone is stale when:
 * - It was verified more than 6 months ago
 * - There have been no successful SMS deliveries to it since verification
 *
 * Returns an empty array if the phone_numbers table does not exist yet
 * (Phase 1 may not be deployed).
 */
export async function checkStalePhones(
  entityType: string,
  entityId: string
): Promise<StalePhoneResult[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        pn.id as phone_number_id,
        pn.phone_number,
        pn.entity_type,
        pn.entity_id,
        pn.verified_at,
        EXTRACT(DAY FROM now() - pn.verified_at)::int as days_since_verified
      FROM phone_numbers pn
      WHERE pn.entity_type = ${entityType}
        AND pn.entity_id = ${entityId}
        AND pn.verified_at IS NOT NULL
        AND pn.verified_at < now() - interval '${sql.raw(String(STALE_THRESHOLD_DAYS))} days'
        AND pn.deleted_at IS NULL
      ORDER BY pn.verified_at ASC
    `)

    type RawRow = Record<string, unknown>
    return (rows as unknown as RawRow[]).map((row) => ({
      phoneNumberId: String(row.phone_number_id ?? ''),
      phoneNumber: String(row.phone_number ?? ''),
      entityType: String(row.entity_type ?? ''),
      entityId: String(row.entity_id ?? ''),
      verifiedAt: row.verified_at ? new Date(String(row.verified_at)) : null,
      daysSinceVerified: Number(row.days_since_verified ?? 0),
    }))
  } catch (err) {
    // phone_numbers table may not exist yet (Phase 1 not deployed)
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('relation "phone_numbers" does not exist')) {
      return []
    }
    console.error('[stale-check] Failed to check stale phones:', message)
    return []
  }
}

/**
 * Mark a phone number as stale by clearing its verified status.
 * This triggers a re-verification prompt on next use.
 */
export async function markPhoneStale(phoneNumberId: string): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE phone_numbers
      SET verified_at = NULL,
          updated_at = now()
      WHERE id = ${phoneNumberId}
    `)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('relation "phone_numbers" does not exist')) {
      return
    }
    console.error('[stale-check] Failed to mark phone stale:', message)
  }
}

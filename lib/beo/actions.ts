'use server'

// BEO Server Actions
// Provides server-callable functions for generating BEO data.

import { requireChef } from '@/lib/auth/get-user'
import { generateBEO } from './generate-beo'
import { formatBEOAsHTML } from './format-html'
import type { BEOData } from './types'

// ─── getEventBEO ──────────────────────────────────────────────────────────────

/**
 * Fetch event data and generate a BEO.
 * Returns both the structured data and pre-rendered HTML.
 */
export async function getEventBEO(
  eventId: string,
  includeFinancials: boolean = true
): Promise<{ data: BEOData; html: string } | null> {
  // requireChef is called inside generateBEO, but call here too for early auth check
  await requireChef()

  const beoData = await generateBEO(eventId, { includeFinancials })
  if (!beoData) return null

  const html = formatBEOAsHTML(beoData)
  return { data: beoData, html }
}

// ─── bulkGenerateBEOs ─────────────────────────────────────────────────────────

/**
 * Generate BEOs for multiple events at once.
 * Useful for multi-event days. Returns results keyed by event ID.
 * Skips events that fail to generate (no errors thrown for individual failures).
 */
export async function bulkGenerateBEOs(
  eventIds: string[],
  includeFinancials: boolean = true
): Promise<Record<string, { data: BEOData; html: string }>> {
  await requireChef()

  const results: Record<string, { data: BEOData; html: string }> = {}

  // Process in parallel but cap concurrency to avoid overwhelming DB
  const BATCH_SIZE = 5
  for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
    const batch = eventIds.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map(async (eventId) => {
        const beoData = await generateBEO(eventId, { includeFinancials })
        if (!beoData) return null
        const html = formatBEOAsHTML(beoData)
        return { eventId, data: beoData, html }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results[result.value.eventId] = {
          data: result.value.data,
          html: result.value.html,
        }
      }
    }
  }

  return results
}

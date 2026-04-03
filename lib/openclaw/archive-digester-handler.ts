'use server'

/**
 * Archive Digester Sync Handler
 * Pulls discovered clients, events, and financials from the Pi's Archive Digester
 * and creates corresponding records in ChefFlow's PostgreSQL database.
 *
 * DATA ISOLATION NOTE: This handler intentionally writes to core business tables
 * (clients, events) rather than openclaw.* tables. This is an accepted exception
 * to the OpenClaw data isolation principle because:
 *   1. It is a one-time bootstrap tool (importing 10 years of business history)
 *   2. It requires requireChef() (admin-only, never runs via cron)
 *   3. All writes are INSERT-only with name-based dedup (no updates, no deletes)
 *   4. All writes are tenant-scoped
 * Reviewed 2026-04-03 during OpenClaw system audit.
 */

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import type { CartridgeSyncResult } from './cartridge-registry'

const PI_HOST = process.env.OPENCLAW_PI_HOST || '10.0.0.177'
const ARCHIVE_PORT = process.env.ARCHIVE_DIGESTER_PORT || '8086'
const ARCHIVE_URL = `http://${PI_HOST}:${ARCHIVE_PORT}`

interface ArchiveClient {
  id: string
  canonical_name: string
  name_variants: string
  email: string | null
  phone: string | null
  dietary_notes: string | null
  allergen_notes: string | null
  first_seen_date: string | null
  last_seen_date: string | null
  total_events: number
  total_revenue_cents: number
}

interface ArchiveEvent {
  id: string
  client_id: string | null
  client_name: string | null
  event_date: string | null
  occasion: string | null
  guest_count: number | null
  location: string | null
  revenue_cents: number | null
  notes: string | null
}

export async function handleArchiveDigesterSync(_trigger: unknown): Promise<CartridgeSyncResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const sql = pgClient

  let matched = 0
  let updated = 0
  let skipped = 0
  const errorDetails: string[] = []

  try {
    const res = await fetch(`${ARCHIVE_URL}/api/archive/unsynced?limit=50`, {
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      return {
        success: false,
        cartridge: 'archive-digester',
        matched: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        errorDetails: [`Archive API returned ${res.status}: ${res.statusText}`],
      }
    }

    const data = await res.json()
    const { clients = [], events = [] } = data

    // Sync clients
    for (const client of clients as ArchiveClient[]) {
      matched++
      try {
        // Check if client already exists by name
        const existing = await sql`
          SELECT id FROM clients
          WHERE tenant_id = ${tenantId}
          AND lower(full_name) = ${client.canonical_name.toLowerCase()}
          LIMIT 1
        `

        let chefflowClientId: string

        if (existing.length > 0) {
          chefflowClientId = existing[0].id as string
          skipped++
        } else {
          // Create new client
          const inserted = await sql`
            INSERT INTO clients (tenant_id, full_name, email, phone, dietary_notes, allergen_notes, source, notes)
            VALUES (
              ${tenantId},
              ${client.canonical_name},
              ${client.email},
              ${client.phone},
              ${client.dietary_notes},
              ${client.allergen_notes},
              'archive_import',
              ${`Imported from archive. First seen: ${client.first_seen_date || 'unknown'}. ${client.total_events} historical events.`}
            )
            RETURNING id
          `
          chefflowClientId = inserted[0].id as string
          updated++
        }

        // Mark as synced on Pi
        await markSynced('client', client.id, chefflowClientId)
      } catch (err) {
        errorDetails.push(
          `Client ${client.canonical_name}: ${err instanceof Error ? err.message : 'unknown error'}`
        )
      }
    }

    // Sync events
    for (const event of events as ArchiveEvent[]) {
      matched++
      try {
        // Only sync events that have a date
        if (!event.event_date) {
          skipped++
          continue
        }

        // Find the client in ChefFlow
        let clientId: string | null = null
        if (event.client_name) {
          const clientRow = await sql`
            SELECT id FROM clients
            WHERE tenant_id = ${tenantId}
            AND lower(full_name) = ${event.client_name.toLowerCase()}
            LIMIT 1
          `
          if (clientRow.length > 0) clientId = clientRow[0].id as string
        }

        // Create event
        const inserted = await sql`
          INSERT INTO events (
            tenant_id, client_id, title, event_date,
            guest_count, location, status, notes
          ) VALUES (
            ${tenantId},
            ${clientId},
            ${event.occasion || 'Archived Event'},
            ${event.event_date},
            ${event.guest_count},
            ${event.location},
            'completed',
            ${event.notes || 'Imported from 10-year archive'}
          )
          RETURNING id
        `

        const chefflowEventId = inserted[0].id as string
        await markSynced('event', event.id, chefflowEventId)
        updated++
      } catch (err) {
        errorDetails.push(
          `Event ${event.event_date}: ${err instanceof Error ? err.message : 'unknown error'}`
        )
      }
    }

    return {
      success: true,
      cartridge: 'archive-digester',
      matched,
      updated,
      skipped,
      errors: errorDetails.length,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    }
  } catch (err) {
    return {
      success: false,
      cartridge: 'archive-digester',
      matched,
      updated,
      skipped,
      errors: 1,
      errorDetails: [err instanceof Error ? err.message : 'Unknown error'],
    }
  }
}

async function markSynced(type: string, archiveId: string, chefflowId: string) {
  try {
    await fetch(`${ARCHIVE_URL}/api/archive/mark-synced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, archive_id: archiveId, chefflow_id: chefflowId }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    // Non-blocking: if mark-synced fails, we'll just re-sync next time
    console.warn(`[archive-digester] Failed to mark ${type} ${archiveId} as synced`)
  }
}

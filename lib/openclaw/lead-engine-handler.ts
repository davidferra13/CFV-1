/**
 * Lead Engine Cartridge - Sync Handler
 * Pulls unsynced business leads from Pi's lead-engine API,
 * upserts into openclaw_leads, then marks them synced on Pi.
 *
 * NOT a server action file. Called by sync-receiver.ts via the cartridge registry.
 */

import { pgClient } from '@/lib/db'
import { revalidateTag } from 'next/cache'
import type { CartridgeSyncResult } from './cartridge-registry'

const OPENCLAW_LEAD_ENGINE_API =
  process.env.OPENCLAW_LEAD_ENGINE_API_URL || 'http://10.0.0.177:8083'

interface PiBusinessLead {
  id: number
  source: string
  source_id: string
  source_url: string | null
  name: string
  business_type: string | null
  description: string | null
  categories: string | null // JSON array string from SQLite
  city: string | null
  state: string | null
  zip: string | null
  street: string | null
  lat: number | null
  lon: number | null
  phone: string | null
  email: string | null
  website: string | null
  owner_name: string | null
  rating: number | null
  review_count: number | null
  serves_vegan: number
  serves_vegetarian: number
  serves_gluten_free: number
  lead_score: number
  chef_relevance: string | null
}

function parseCategories(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Sync handler for lead-engine cartridge.
 * Called by syncCartridgeInternal('lead-engine') with data=null.
 * Pulls unsynced leads from Pi API, upserts to openclaw_leads.
 */
export async function handleLeadEngineSync(_data: unknown): Promise<CartridgeSyncResult> {
  let matched = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  const errorDetails: string[] = []

  // Step 1: Pull unsynced leads from Pi
  let leads: PiBusinessLead[]
  try {
    const response = await fetch(`${OPENCLAW_LEAD_ENGINE_API}/api/leads/unsynced`, {
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    })
    if (!response.ok) {
      return {
        success: false,
        cartridge: 'lead-engine',
        matched: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        errorDetails: [`Pi API returned ${response.status}: ${response.statusText}`],
      }
    }
    leads = await response.json()
  } catch (err) {
    return {
      success: false,
      cartridge: 'lead-engine',
      matched: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      errorDetails: [`Pi API unreachable: ${err instanceof Error ? err.message : 'Unknown error'}`],
    }
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return {
      success: true,
      cartridge: 'lead-engine',
      matched: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    }
  }

  // Step 2: Upsert each lead into openclaw_leads
  const syncedPiIds: number[] = []

  for (const lead of leads) {
    const compoundSource = `lead-engine:${lead.source}`
    const categories = parseCategories(lead.categories)

    try {
      const result = await pgClient`
        INSERT INTO openclaw_leads (
          source, source_id, source_url, name, business_type,
          ai_notes, categories, city, state, postcode,
          street, lat, lon, phone, email,
          website, owner_name, rating, review_count,
          diet_vegan, diet_vegetarian, diet_gluten_free,
          lead_score, chef_relevance, synced_at
        ) VALUES (
          ${compoundSource}, ${lead.source_id}, ${lead.source_url},
          ${lead.name}, ${lead.business_type},
          ${lead.description}, ${categories}, ${lead.city}, ${lead.state}, ${lead.zip},
          ${lead.street}, ${lead.lat}, ${lead.lon}, ${lead.phone}, ${lead.email},
          ${lead.website}, ${lead.owner_name}, ${lead.rating}, ${lead.review_count},
          ${lead.serves_vegan === 1}, ${lead.serves_vegetarian === 1}, ${lead.serves_gluten_free === 1},
          ${lead.lead_score}, ${lead.chef_relevance}, now()
        )
        ON CONFLICT (source, source_id) WHERE source_id IS NOT NULL
        DO UPDATE SET
          name = EXCLUDED.name,
          business_type = EXCLUDED.business_type,
          ai_notes = EXCLUDED.ai_notes,
          categories = EXCLUDED.categories,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          postcode = EXCLUDED.postcode,
          street = EXCLUDED.street,
          lat = EXCLUDED.lat,
          lon = EXCLUDED.lon,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          website = EXCLUDED.website,
          owner_name = EXCLUDED.owner_name,
          rating = EXCLUDED.rating,
          review_count = EXCLUDED.review_count,
          diet_vegan = EXCLUDED.diet_vegan,
          diet_vegetarian = EXCLUDED.diet_vegetarian,
          diet_gluten_free = EXCLUDED.diet_gluten_free,
          lead_score = EXCLUDED.lead_score,
          chef_relevance = EXCLUDED.chef_relevance,
          synced_at = now()
        RETURNING (xmax = 0) AS is_insert
      `

      if (result[0]?.is_insert) {
        updated++
      } else {
        matched++
      }
      syncedPiIds.push(lead.id)
    } catch (err) {
      errors++
      errorDetails.push(
        `Failed to upsert lead "${lead.name}": ${err instanceof Error ? err.message : 'Unknown'}`
      )
    }
  }

  // Step 3: Bust cache
  try {
    revalidateTag('openclaw-lead-count')
  } catch {
    // Non-blocking
  }

  // Step 4: Mark synced on Pi (non-blocking, idempotent upserts mean re-send is safe)
  if (syncedPiIds.length > 0) {
    try {
      await fetch(`${OPENCLAW_LEAD_ENGINE_API}/api/leads/mark-synced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: syncedPiIds }),
        signal: AbortSignal.timeout(15000),
      })
    } catch (err) {
      console.warn(
        '[lead-engine] Failed to mark synced on Pi (will retry next run):',
        err instanceof Error ? err.message : err
      )
    }
  }

  return {
    success: true,
    cartridge: 'lead-engine',
    matched,
    updated,
    skipped,
    errors,
    errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
  }
}

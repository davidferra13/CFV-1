// Allergy Bidirectional Sync
//
// Ensures both allergy stores stay in lockstep:
//   clients.allergies (text[]) - read by document generators, Remy, staff briefings
//   client_allergy_records (table) - read by readiness gates, menu allergen checks
//
// Every write path that touches allergies MUST call syncAllergyStores() afterward.
// This module is NOT a server action file; import it from server actions.

import { normalizeAllergenLabel, normalizeSeverity, type CanonicalSeverity } from './catalog'

export type AllergyStoreInput = {
  tenantId: string
  clientId: string
  /** The database client (any-typed compat shim) */
  db: any
}

/**
 * Sync flat array -> structured records.
 * Call after any write to clients.allergies (updateClient, createClient, intake form).
 * Upserts records into client_allergy_records for each allergen in the flat array.
 * Does NOT delete records that were removed from the flat array (preserves chef confirmations).
 */
export async function syncFlatToStructured(opts: AllergyStoreInput): Promise<void> {
  const { tenantId, clientId, db } = opts

  // Read current flat array
  const { data: client } = await db
    .from('clients')
    .select('allergies')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  const flatAllergies: string[] = client?.allergies ?? []
  if (flatAllergies.length === 0) return

  // Read existing structured records
  const { data: existing } = await db
    .from('client_allergy_records')
    .select('allergen')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)

  const existingSet = new Set(
    (existing ?? []).map((r: { allergen: string }) => r.allergen.toLowerCase())
  )

  // Build rows for allergens not yet in structured table
  const newRows = flatAllergies
    .filter((a) => !existingSet.has(normalizeAllergenLabel(a).toLowerCase()))
    .map((a) => ({
      tenant_id: tenantId,
      client_id: clientId,
      allergen: normalizeAllergenLabel(a),
      severity: 'allergy' as CanonicalSeverity,
      source: 'chef_stated',
      confirmed_by_chef: false,
      notes: null,
    }))

  if (newRows.length === 0) return

  await db.from('client_allergy_records').upsert(newRows, {
    onConflict: 'tenant_id,client_id,allergen',
    ignoreDuplicates: true,
  })
}

/**
 * Sync structured records -> flat array.
 * Call after any write to client_allergy_records (onboarding, instant-book, AI detection).
 * Merges structured allergens into the flat array without removing existing entries.
 */
export async function syncStructuredToFlat(opts: AllergyStoreInput): Promise<void> {
  const { tenantId, clientId, db } = opts

  // Read current structured records
  const { data: records } = await db
    .from('client_allergy_records')
    .select('allergen')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)

  const structuredAllergens: string[] = (records ?? []).map((r: { allergen: string }) => r.allergen)
  if (structuredAllergens.length === 0) return

  // Read current flat array
  const { data: client } = await db
    .from('clients')
    .select('allergies')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  const currentFlat: string[] = client?.allergies ?? []
  const currentSet = new Set(currentFlat.map((a) => a.toLowerCase()))

  // Merge: add structured allergens not already in flat array
  const merged = [
    ...currentFlat,
    ...structuredAllergens.filter((a) => !currentSet.has(a.toLowerCase())),
  ]

  if (merged.length === currentFlat.length) return // nothing new

  await db
    .from('clients')
    .update({ allergies: merged })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
}

/**
 * Full bidirectional sync. Call when unsure which store was written to,
 * or after bulk operations.
 */
export async function syncAllergyStores(opts: AllergyStoreInput): Promise<void> {
  await syncFlatToStructured(opts)
  await syncStructuredToFlat(opts)
}

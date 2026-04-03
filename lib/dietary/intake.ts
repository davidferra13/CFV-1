// Shared Dietary Intake Helpers
// Pure functions for parsing, normalizing, and persisting dietary data
// from inquiry, instant-book, and onboarding flows.
// Not a server action file. Imported by server actions that need dietary persistence.

import {
  lookupCatalogEntry,
  normalizeAllergenLabel,
  normalizeSeverity,
  normalizeSource,
  type CanonicalSeverity,
  type CanonicalSource,
} from './catalog'

// ── Types ───────────────────────────────────────────────────────────────────

export type DietaryIntakeRecord = {
  allergen: string
  severity: CanonicalSeverity
  source: CanonicalSource
  notes?: string
}

export type RawDietaryInput = {
  /** Structured allergy selections from the intake form */
  allergySelections?: Array<{
    allergen: string
    severity: string
  }>
  /** Free-text dietary notes (legacy support) */
  freeText?: string
  /** Dietary pattern selections (vegan, gluten-free, etc.) */
  dietaryPatterns?: string[]
}

// ── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Parse free-text dietary input into structured records.
 * Splits on commas and newlines, normalizes each item against the catalog.
 */
export function parseFreeTextDietary(
  text: string,
  source: CanonicalSource = 'client_stated'
): DietaryIntakeRecord[] {
  if (!text.trim()) return []

  const items = text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  return items.map((raw) => {
    const entry = lookupCatalogEntry(raw)
    return {
      allergen: entry?.label ?? raw.trim(),
      severity: entry?.defaultSeverity ?? 'allergy',
      source,
    }
  })
}

/**
 * Normalize structured intake selections to canonical records.
 * This is the primary entry point for the DietaryIntakeFields component output.
 */
export function normalizeDietarySelections(
  input: RawDietaryInput,
  source: CanonicalSource = 'intake_form'
): DietaryIntakeRecord[] {
  const records: DietaryIntakeRecord[] = []
  const seen = new Set<string>()

  // Structured allergy selections (primary path)
  if (input.allergySelections) {
    for (const sel of input.allergySelections) {
      const label = normalizeAllergenLabel(sel.allergen)
      const key = label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      records.push({
        allergen: label,
        severity: normalizeSeverity(sel.severity),
        source,
      })
    }
  }

  // Free-text fallback (for legacy forms or additional context)
  if (input.freeText) {
    const parsed = parseFreeTextDietary(input.freeText, source)
    for (const rec of parsed) {
      const key = rec.allergen.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      records.push(rec)
    }
  }

  return records
}

/**
 * Normalize allergy records from legacy onboarding format.
 * Maps old severity values (life_threatening) to canonical ones.
 */
export function normalizeAllergyRecords(
  records: Array<{ allergen: string; severity: string }>,
  rawSource: string = 'client_stated'
): DietaryIntakeRecord[] {
  return records.map((r) => ({
    allergen: normalizeAllergenLabel(r.allergen),
    severity: normalizeSeverity(r.severity),
    source: normalizeSource(rawSource),
  }))
}

// ── Persistence helper ──────────────────────────────────────────────────────

/**
 * Build the SQL-ready rows for upserting into client_allergy_records.
 * The caller is responsible for executing the actual DB operation.
 */
export function buildAllergyRecordRows(
  tenantId: string,
  clientId: string,
  records: DietaryIntakeRecord[]
): Array<{
  tenant_id: string
  client_id: string
  allergen: string
  severity: string
  source: string
  confirmed_by_chef: boolean
  notes: string | null
}> {
  return records.map((r) => ({
    tenant_id: tenantId,
    client_id: clientId,
    allergen: r.allergen,
    severity: r.severity,
    source: r.source,
    confirmed_by_chef: false,
    notes: r.notes ?? null,
  }))
}

/**
 * Check if any record in a set is severe enough to require
 * chef confirmation before proceeding with instant booking.
 */
export function hasAnaphylaxisCase(records: DietaryIntakeRecord[]): boolean {
  return records.some((r) => r.severity === 'anaphylaxis')
}

/**
 * Convert structured records back to a simple string array
 * for legacy snapshot fields (e.g., confirmed_dietary_restrictions).
 */
export function recordsToStringArray(records: DietaryIntakeRecord[]): string[] {
  return records.map((r) => r.allergen)
}

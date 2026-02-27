// DEFERRED: Waste tracking system. Requires waste_entries table (Phase 2 schema).
// Do not remove — will be enabled when schema is extended.
// NO 'use server' — table doesn't exist yet. Exporting these as server actions would crash at runtime.

// ─── Types (safe to export — no DB calls) ───────────────────────────────────

export type WasteReason =
  | 'OVERPRODUCTION'
  | 'SPOILAGE'
  | 'TRIM'
  | 'MISTAKE'
  | 'CLIENT_RETURN'
  | 'QUALITY_REJECT'
  | 'EXPIRED'
  | 'OTHER'

export const WASTE_REASONS: { value: WasteReason; label: string }[] = [
  { value: 'OVERPRODUCTION', label: 'Overproduction' },
  { value: 'SPOILAGE', label: 'Spoilage' },
  { value: 'TRIM', label: 'Trim / Yield Loss' },
  { value: 'MISTAKE', label: 'Preparation Mistake' },
  { value: 'CLIENT_RETURN', label: 'Client Return' },
  { value: 'QUALITY_REJECT', label: 'Quality Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'OTHER', label: 'Other' },
]

export type IngredientUnit = 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'L' | 'each' | 'bunch' | 'cup'

export const UNITS: IngredientUnit[] = ['g', 'kg', 'oz', 'lb', 'ml', 'L', 'each', 'bunch', 'cup']

export interface WasteEntry {
  id: string
  chef_id: string
  item_name: string
  qty: number
  unit: IngredientUnit
  reason: WasteReason
  cost_estimate: number | null // cents
  event_id: string | null
  notes: string | null
  occurred_at: string
  created_at: string
}

export interface WasteStats {
  totalCost: number
  entryCount: number
  byReason: Map<WasteReason, number>
  topReason: [WasteReason, number] | null
}

// ─── Server Actions (DISABLED — waste_entries table not in schema) ──────────
// When waste_entries table is added:
// 1. Add 'use server' directive back at the top of this file
// 2. Uncomment the functions below
// 3. Remove @ts-nocheck if types are generated

/*
export async function logWasteEntry(input: { ... }) { ... }
export async function getWasteEntries(filters?: { ... }) { ... }
export async function getWasteStats(period?: 'week' | 'month' | 'all') { ... }
*/

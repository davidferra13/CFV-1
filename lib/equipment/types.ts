// Equipment Intelligence System - Core Types
// Used across inference, loadout, gap detection, and UI layers.

// ============================================
// DATABASE ROW TYPES
// ============================================

export type EquipmentStatus =
  | 'active'
  | 'stored'
  | 'broken'
  | 'needs_replacement'
  | 'borrowed'
  | 'lent_out'
  | 'retired'
  | 'missing'

export type EquipmentSource = 'manual' | 'inferred' | 'receipt_scan' | 'import'

export type InferenceStatus = 'inferred' | 'confirmed' | 'dismissed'

export type GapType =
  | 'missing'
  | 'insufficient_qty'
  | 'wrong_size'
  | 'broken'
  | 'borrowed_unavailable'
  | 'double_booked'

export type GapSeverity = 'critical' | 'important' | 'nice_to_have'

export type GapResolutionStatus =
  | 'open'
  | 'pending_procurement'
  | 'pending_repair'
  | 'resolved_purchased'
  | 'resolved_borrowed'
  | 'resolved_venue'
  | 'resolved_substitute'
  | 'resolved_workaround'
  | 'dismissed'

export type VenueType = 'client_home' | 'commercial_kitchen' | 'outdoor' | 'event_venue' | 'office'

export type StatusLogTrigger = 'manual' | 'event_usage' | 'staleness_check' | 'age_threshold'

// ============================================
// EQUIPMENT ITEM (DB row shape)
// ============================================

export interface EquipmentItem {
  id: string
  chef_id: string
  category_id: number | null
  name: string
  canonical_name: string | null
  brand: string | null
  model: string | null
  material: string | null
  size_label: string | null
  size_value: number | null
  size_unit: string | null
  quantity_owned: number
  status: EquipmentStatus
  item_source: EquipmentSource
  confidence: number | null
  inferred_from: string | null
  confirmed_at: string | null
  purchase_price_cents: number | null
  purchase_date: string | null
  replacement_cost_cents: number | null
  expected_lifespan_months: number | null
  last_used_at: string | null
  last_status_change_at: string | null
  borrowed_from: string | null
  lent_to: string | null
  notes: string | null
  photo_url: string | null
  tags: string[] | null
  category: string // legacy enum column
  asset_state: string
  storage_location: string | null
  created_at: string
  updated_at: string
}

// ============================================
// CATEGORY TAXONOMY
// ============================================

export interface EquipmentCategory {
  id: number
  slug: string
  name: string
  parent_id: number | null
  sort_order: number
  icon: string | null
}

export interface EquipmentAlias {
  id: number
  alias: string
  category_id: number
  canonical_name: string | null
}

// ============================================
// RECIPE EQUIPMENT
// ============================================

export interface RecipeEquipment {
  id: string
  recipe_id: string
  category_id: number | null
  name: string
  size_constraint: string | null
  quantity_needed: number
  is_essential: boolean
  notes: string | null
  sort_order: number
}

// ============================================
// INFERENCE ENGINE
// ============================================

export interface InferenceRule {
  id: string
  signal_type: 'technique' | 'component' | 'service' | 'guest_count' | 'ingredient'
  pattern: RegExp
  equipment: string[]
  category_slug: string
  base_confidence: number
  notes?: string
}

export interface InferenceSignal {
  rule_id: string
  signal: string
  match: string
  date?: string
}

export interface EquipmentInference {
  id: string
  chef_id: string
  equipment_name: string
  category: string
  status: InferenceStatus
  confidence_score: number
  primary_rule_id: string
  supporting_signals: InferenceSignal[]
  first_inferred_at: string
  last_boosted_at: string | null
  confirmed_at: string | null
  dismissed_at: string | null
  dismiss_suppress_until: string | null
}

// ============================================
// LOADOUT GENERATOR
// ============================================

export type LoadoutItemSource = 'owned' | 'venue' | 'substitute' | 'need'

export type SubstitutionQuality = 'equivalent' | 'partial' | 'degraded'

export interface LoadoutItem {
  name: string
  canonical_name: string | null
  category_slug: string
  quantity: number
  source: LoadoutItemSource
  reason: string[] // which recipes/components need it
  inventory_id?: string // matched equipment_items.id
  substitute_for?: string
  substitute_quality?: SubstitutionQuality
  batch_plan?: string
  is_essential: boolean
}

export interface EquipmentLoadout {
  event_id: string
  generated_at: string
  items: LoadoutItem[]
  summary: {
    total_items: number
    owned: number
    venue_provided: number
    substituted: number
    gaps: number
  }
}

// ============================================
// GAP DETECTION
// ============================================

export interface EquipmentGap {
  id?: string
  event_id: string
  chef_id: string
  equipment_name: string
  equipment_category: string | null
  gap_type: GapType
  severity: GapSeverity
  quantity_needed: number
  quantity_available: number
  used_for: string | null
  status: GapResolutionStatus
  resolution_note: string | null
  detected_at?: string
  resolved_at?: string | null
}

// ============================================
// PROCUREMENT
// ============================================

export type ProcurementTier = 'budget' | 'mid' | 'premium'

export interface ProcurementOption {
  name: string
  tier: ProcurementTier
  label: string // "Get It Done", "Workhorse", "Investment"
  price_range_cents: [number, number]
  brand_hint: string
  search_terms: string[]
  restaurant_depot: boolean
}

export interface ProcurementCatalogEntry {
  canonical_name: string
  category_slug: string
  options: ProcurementOption[]
}

// ============================================
// SUBSTITUTION GRAPH
// ============================================

export interface Substitution {
  for_item: string // what's missing
  use_instead: string // what to use
  quality: SubstitutionQuality
  notes?: string
}

// ============================================
// STATUS LOG
// ============================================

export interface EquipmentStatusLogEntry {
  id: string
  equipment_id: string
  chef_id: string
  old_status: string
  new_status: string
  trigger: StatusLogTrigger
  note: string | null
  created_at: string
}

// ============================================
// CAPACITY MODEL
// ============================================

export interface CapacityEntry {
  canonical_name: string
  size_label: string
  portions_per_unit: number
}

// ============================================
// VENUE MODIFIER
// ============================================

export interface VenueModifier {
  venue_type: VenueType
  assume_available: string[] // items the venue likely has
  always_bring: string[] // items to always bring regardless
  notes: string
}

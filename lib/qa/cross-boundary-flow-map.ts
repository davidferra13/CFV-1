/**
 * Cross-Boundary Flow Map
 *
 * Pure data structure mapping the critical cross-boundary flows in ChefFlow.
 * Used by QA validation surfaces and wiring audits to verify data integrity
 * across domain boundaries.
 *
 * NOT a server action file. Imported by components and test utilities.
 */

// ── Flow Definitions ───────────────────────────────────────────────────────

export type FlowStage = {
  domain: string
  entity: string
  /** Key fields that must be present and valid at this stage */
  requiredFields: string[]
  /** Domain this stage feeds into (next in chain) */
  feedsInto: string | null
}

export type CrossBoundaryFlow = {
  id: string
  name: string
  description: string
  stages: FlowStage[]
  /** Critical invariants that must hold across the entire flow */
  invariants: string[]
}

// ── Canonical Flows ────────────────────────────────────────────────────────

export const INQUIRY_TO_SHOPPING_LIST: CrossBoundaryFlow = {
  id: 'inquiry-to-shopping-list',
  name: 'Inquiry to Shopping List',
  description: 'Full pipeline from client inquiry through event creation to actionable shopping list',
  stages: [
    {
      domain: 'inquiries',
      entity: 'inquiry',
      requiredFields: ['client_email', 'event_date', 'guest_count', 'occasion'],
      feedsInto: 'clients',
    },
    {
      domain: 'clients',
      entity: 'client',
      requiredFields: ['full_name', 'email', 'tenant_id'],
      feedsInto: 'events',
    },
    {
      domain: 'events',
      entity: 'event',
      requiredFields: ['client_id', 'tenant_id', 'event_date', 'guest_count', 'status'],
      feedsInto: 'menus',
    },
    {
      domain: 'menus',
      entity: 'menu',
      requiredFields: ['event_id', 'tenant_id', 'name'],
      feedsInto: 'recipes',
    },
    {
      domain: 'recipes',
      entity: 'recipe',
      requiredFields: ['tenant_id', 'title'],
      feedsInto: 'grocery',
    },
    {
      domain: 'grocery',
      entity: 'shopping_list',
      requiredFields: ['event_id', 'tenant_id'],
      feedsInto: null,
    },
  ],
  invariants: [
    'tenant_id must be consistent across all stages',
    'client_id must link event to the originating inquiry client',
    'guest_count must propagate from inquiry to event for portion scaling',
    'event_date must be consistent between inquiry and event',
  ],
}

export const EVENT_TO_LEDGER: CrossBoundaryFlow = {
  id: 'event-to-ledger',
  name: 'Event to Ledger',
  description: 'Financial pipeline from event pricing through invoicing to ledger entries',
  stages: [
    {
      domain: 'events',
      entity: 'event',
      requiredFields: ['client_id', 'tenant_id', 'status', 'total_price_cents'],
      feedsInto: 'quotes',
    },
    {
      domain: 'quotes',
      entity: 'quote',
      requiredFields: ['event_id', 'tenant_id', 'status', 'total_cents', 'pricing_model'],
      feedsInto: 'invoices',
    },
    {
      domain: 'invoices',
      entity: 'invoice',
      requiredFields: ['event_id', 'tenant_id', 'amount_cents', 'status'],
      feedsInto: 'finance',
    },
    {
      domain: 'finance',
      entity: 'payment',
      requiredFields: ['invoice_id', 'tenant_id', 'amount_cents', 'method'],
      feedsInto: 'ledger',
    },
    {
      domain: 'ledger',
      entity: 'ledger_entry',
      requiredFields: ['tenant_id', 'event_id', 'amount_cents', 'entry_type'],
      feedsInto: null,
    },
  ],
  invariants: [
    'total_cents in quote must match event total_price_cents after acceptance',
    'invoice amount_cents must match accepted quote total',
    'ledger entries must sum to zero for balanced books (debits = credits)',
    'payment amount_cents must not exceed invoice amount',
    'tenant_id must be consistent across all financial records',
  ],
}

export const CLIENT_DIETARY_TO_MENU_SAFETY: CrossBoundaryFlow = {
  id: 'client-dietary-to-menu-safety',
  name: 'Client Dietary to Menu Safety',
  description: 'Dietary profile propagation from client intake to menu safety alerts',
  stages: [
    {
      domain: 'clients',
      entity: 'client_dietary_profile',
      requiredFields: ['client_id', 'allergies', 'dietary_restrictions'],
      feedsInto: 'dietary',
    },
    {
      domain: 'dietary',
      entity: 'allergy_record',
      requiredFields: ['allergen', 'severity', 'source'],
      feedsInto: 'menus',
    },
    {
      domain: 'menus',
      entity: 'menu_dish',
      requiredFields: ['dish_id', 'ingredients', 'allergen_flags'],
      feedsInto: 'dietary',
    },
    {
      domain: 'dietary',
      entity: 'safety_check_result',
      requiredFields: ['safe', 'conflicts', 'critical_conflicts'],
      feedsInto: null,
    },
  ],
  invariants: [
    'FDA Big 9 allergens must always be classified as critical',
    'allergen matching must be bidirectional (flag or ingredient)',
    'safe dishes list must exclude all conflicted dishes',
    'conflict count must equal sum of per-guest conflicts',
  ],
}

// ── Flow Registry ──────────────────────────────────────────────────────────

export const ALL_FLOWS: CrossBoundaryFlow[] = [
  INQUIRY_TO_SHOPPING_LIST,
  EVENT_TO_LEDGER,
  CLIENT_DIETARY_TO_MENU_SAFETY,
]

export function getFlowById(id: string): CrossBoundaryFlow | undefined {
  return ALL_FLOWS.find((f) => f.id === id)
}

export function getFlowsForDomain(domain: string): CrossBoundaryFlow[] {
  return ALL_FLOWS.filter((f) => f.stages.some((s) => s.domain === domain))
}

export function getDomainsInFlow(flowId: string): string[] {
  const flow = getFlowById(flowId)
  if (!flow) return []
  return [...new Set(flow.stages.map((s) => s.domain))]
}
export const PHYSICAL_OPERATION_PRIMITIVE_KINDS = [
  'equipment',
  'venue_capability',
  'station',
  'loadout',
  'transport',
  'storage',
  'cleanup',
  'waste',
  'staff_task',
] as const

export type PhysicalOperationPrimitiveKind = (typeof PHYSICAL_OPERATION_PRIMITIVE_KINDS)[number]

export const REQUIRED_PHYSICAL_OPERATION_PRIMITIVE_KINDS: readonly PhysicalOperationPrimitiveKind[] =
  PHYSICAL_OPERATION_PRIMITIVE_KINDS

export const PHYSICAL_OPERATION_PROGRAM_FAMILIES = [
  'physical_event_loadout_brain',
  'sustainability_waste_ethics_ledger',
  'client_household_operating_memory',
  'staff_trust_delegation',
  'vendor_trust_ledger',
  'event_readiness_bus',
  'mobile_field_capture',
  'craft_evolution_lab',
  'crisis_recovery',
] as const

export type PhysicalOperationProgramFamily = (typeof PHYSICAL_OPERATION_PROGRAM_FAMILIES)[number]

export const PHYSICAL_OWNERSHIP_KINDS = [
  'chef_owned',
  'tenant_owned',
  'client_owned',
  'venue_provided',
  'vendor_provided',
  'rental',
  'borrowed',
  'staff_assigned',
  'disposable',
  'consumable',
  'unknown',
] as const

export type PhysicalOwnershipKind = (typeof PHYSICAL_OWNERSHIP_KINDS)[number]

export const PHYSICAL_CAPABILITY_STATES = [
  'confirmed_available',
  'limited',
  'unavailable',
  'unknown',
  'not_applicable',
] as const

export type PhysicalCapabilityState = (typeof PHYSICAL_CAPABILITY_STATES)[number]

export const PHYSICAL_CUSTODY_STATES = [
  'needed',
  'staged',
  'packed',
  'loaded',
  'onsite',
  'deployed',
  'used',
  'cleaned',
  'returned',
  'damaged',
  'missing',
] as const

export type PhysicalCustodyState = (typeof PHYSICAL_CUSTODY_STATES)[number]

export const PHYSICAL_TASK_STATES = [
  'planned',
  'assigned',
  'in_progress',
  'blocked',
  'complete',
  'skipped',
  'archived',
] as const

export type PhysicalTaskState = (typeof PHYSICAL_TASK_STATES)[number]

export const PHYSICAL_READINESS_STATES = [
  'ready',
  'in_progress',
  'at_risk',
  'blocked',
  'unknown',
] as const

export type PhysicalReadinessState = (typeof PHYSICAL_READINESS_STATES)[number]

export const PHYSICAL_READINESS_STATE_RANK: Record<PhysicalReadinessState, number> = {
  ready: 0,
  in_progress: 1,
  at_risk: 2,
  blocked: 3,
  unknown: 4,
}

export const PHYSICAL_VISIBILITY_LEVELS = [
  'private_only',
  'chef_internal',
  'staff_safe_task',
  'vendor_safe_task',
  'client_safe_summary',
  'public_none',
] as const

export type PhysicalVisibilityLevel = (typeof PHYSICAL_VISIBILITY_LEVELS)[number]

export const PHYSICAL_STATE_FIELD_KINDS = [
  'ownership',
  'capability',
  'custody',
  'task',
  'readiness',
  'visibility',
] as const

export type PhysicalStateFieldKind = (typeof PHYSICAL_STATE_FIELD_KINDS)[number]

export type PhysicalOperationPrimitiveKey =
  | 'equipment_item'
  | 'equipment_requirement'
  | 'venue_capability'
  | 'work_station'
  | 'station_assignment'
  | 'loadout_container'
  | 'transport_leg'
  | 'transport_condition'
  | 'storage_zone'
  | 'cleanup_step'
  | 'waste_stream'
  | 'staff_task'

export type PhysicalOperationPrimitiveDefinition = {
  key: PhysicalOperationPrimitiveKey
  kind: PhysicalOperationPrimitiveKind
  label: string
  definition: string
  ownerModule: string
  canonicalStateFields: PhysicalStateFieldKind[]
  allowedOwnershipKinds: PhysicalOwnershipKind[]
  defaultVisibility: PhysicalVisibilityLevel
  sourceModules: string[]
  reusableBy: PhysicalOperationProgramFamily[]
  integrationPoints: string[]
  reuseGuidance: string
  doNotDuplicateAs: string[]
}

export const PHYSICAL_OPERATION_PRIMITIVE_REGISTRY: readonly PhysicalOperationPrimitiveDefinition[] =
  [
    {
      key: 'equipment_item',
      kind: 'equipment',
      label: 'Equipment item',
      definition:
        'A reusable, rentable, consumable, disposable, venue-provided, vendor-provided, or borrowed physical item needed to execute service.',
      ownerModule: 'lib/equipment',
      canonicalStateFields: ['ownership', 'custody', 'readiness', 'visibility'],
      allowedOwnershipKinds: [
        'chef_owned',
        'tenant_owned',
        'venue_provided',
        'vendor_provided',
        'rental',
        'borrowed',
        'disposable',
        'consumable',
        'unknown',
      ],
      defaultVisibility: 'chef_internal',
      sourceModules: [
        'lib/equipment',
        'lib/equipment/packing-list-types.ts',
        'lib/equipment/technique-equipment-map.ts',
        'lib/inventory',
      ],
      reusableBy: [
        'physical_event_loadout_brain',
        'vendor_trust_ledger',
        'staff_trust_delegation',
        'event_readiness_bus',
        'mobile_field_capture',
      ],
      integrationPoints: [
        'event packing lists',
        'equipment registry',
        'equipment rentals',
        'maintenance follow-up',
        'mobile pack verification',
      ],
      reuseGuidance:
        'Use this primitive for physical equipment identity and ownership. Event-specific need, pack state, damage, or return status belongs on a requirement or custody-bearing loadout primitive.',
      doNotDuplicateAs: ['gear', 'tool', 'kit item', 'rental item', 'portable asset'],
    },
    {
      key: 'equipment_requirement',
      kind: 'equipment',
      label: 'Equipment requirement',
      definition:
        'An event, menu, recipe, station, weather, staff, venue, or workflow-derived need for one or more equipment items.',
      ownerModule: 'lib/operations',
      canonicalStateFields: ['ownership', 'custody', 'readiness', 'visibility'],
      allowedOwnershipKinds: [
        'chef_owned',
        'venue_provided',
        'vendor_provided',
        'rental',
        'borrowed',
        'disposable',
        'consumable',
        'unknown',
      ],
      defaultVisibility: 'chef_internal',
      sourceModules: [
        'lib/equipment/packing-list-types.ts',
        'lib/menus',
        'lib/recipes',
        'lib/events',
        'lib/weather',
      ],
      reusableBy: [
        'physical_event_loadout_brain',
        'event_readiness_bus',
        'staff_trust_delegation',
        'vendor_trust_ledger',
      ],
      integrationPoints: [
        'loadout readiness',
        'quote rental review',
        'event safety checklist',
        'staff-safe packing task export',
      ],
      reuseGuidance:
        'Represent the demand side here. Do not create parallel checklist rows when a requirement can produce the checklist item or readiness signal.',
      doNotDuplicateAs: ['packing need', 'rental need', 'menu equipment need', 'gear gap'],
    },
    {
      key: 'venue_capability',
      kind: 'venue_capability',
      label: 'Venue capability',
      definition:
        'A confirmed, limited, unavailable, unknown, or not-applicable physical capability of the service location.',
      ownerModule: 'lib/venues',
      canonicalStateFields: ['capability', 'readiness', 'visibility'],
      allowedOwnershipKinds: ['client_owned', 'venue_provided', 'vendor_provided', 'unknown'],
      defaultVisibility: 'chef_internal',
      sourceModules: [
        'lib/venues',
        'lib/events/venue-details-actions.ts',
        'lib/events/location-truth.ts',
      ],
      reusableBy: [
        'physical_event_loadout_brain',
        'client_household_operating_memory',
        'event_readiness_bus',
        'staff_trust_delegation',
        'crisis_recovery',
      ],
      integrationPoints: [
        'venue recon',
        'event location truth',
        'quote feasibility',
        'onsite setup tasks',
        'client-safe confirmation summaries',
      ],
      reuseGuidance:
        'Unknown capabilities stay unknown until verified. Never infer availability from a missing field or from a route param alone.',
      doNotDuplicateAs: ['kitchen fact', 'site feature', 'location constraint', 'house capability'],
    },
    {
      key: 'work_station',
      kind: 'station',
      label: 'Work station',
      definition:
        'A physical or operational prep, cooking, plating, beverage, dishwashing, storage, service, or waste area.',
      ownerModule: 'lib/stations',
      canonicalStateFields: ['readiness', 'visibility'],
      allowedOwnershipKinds: ['chef_owned', 'tenant_owned', 'venue_provided', 'unknown'],
      defaultVisibility: 'chef_internal',
      sourceModules: ['lib/stations', 'lib/stations/event-station-actions.ts', 'components/events'],
      reusableBy: [
        'physical_event_loadout_brain',
        'staff_trust_delegation',
        'event_readiness_bus',
        'mobile_field_capture',
      ],
      integrationPoints: [
        'event station dishes',
        'staff station assignments',
        'prep timeline',
        'onsite setup checklist',
      ],
      reuseGuidance:
        'Use stations as work areas, not as inventory stores or staff identities. Link equipment, tasks, and storage zones to stations instead of embedding duplicate copies.',
      doNotDuplicateAs: ['prep area', 'service zone', 'line station', 'work area'],
    },
    {
      key: 'station_assignment',
      kind: 'station',
      label: 'Station assignment',
      definition:
        'A dish, task, person, or equipment requirement assigned to a station for a specific event or service window.',
      ownerModule: 'lib/stations',
      canonicalStateFields: ['task', 'readiness', 'visibility'],
      allowedOwnershipKinds: ['staff_assigned', 'chef_owned', 'tenant_owned', 'unknown'],
      defaultVisibility: 'chef_internal',
      sourceModules: ['lib/stations/event-station-actions.ts', 'lib/staff', 'lib/events'],
      reusableBy: [
        'physical_event_loadout_brain',
        'staff_trust_delegation',
        'event_readiness_bus',
        'mobile_field_capture',
      ],
      integrationPoints: [
        'staff schedule',
        'station clipboard',
        'event readiness bus',
        'staff-safe briefing export',
      ],
      reuseGuidance:
        'Use this to connect people, work, and physical areas. Do not let staff delegation invent a separate station taxonomy.',
      doNotDuplicateAs: ['station task', 'station crew row', 'prep station job'],
    },
    {
      key: 'loadout_container',
      kind: 'loadout',
      label: 'Loadout container',
      definition:
        'A box, bin, bag, cooler, hot box, crate, cart, vehicle zone, or document folder that groups physical items for staging, transport, service, or return.',
      ownerModule: 'lib/packing',
      canonicalStateFields: ['custody', 'readiness', 'visibility'],
      allowedOwnershipKinds: [
        'chef_owned',
        'tenant_owned',
        'rental',
        'borrowed',
        'venue_provided',
        'vendor_provided',
        'unknown',
      ],
      defaultVisibility: 'chef_internal',
      sourceModules: ['lib/equipment/packing-list-types.ts', 'lib/packing', 'lib/events'],
      reusableBy: [
        'physical_event_loadout_brain',
        'mobile_field_capture',
        'staff_trust_delegation',
        'event_readiness_bus',
      ],
      integrationPoints: [
        'packing list',
        'vehicle load',
        'cold-chain checks',
        'return-home checklist',
      ],
      reuseGuidance:
        'Use containers for grouping and custody. Do not model each cooler, crate, or vehicle section as a new checklist system.',
      doNotDuplicateAs: ['pack bin', 'cooler list', 'vehicle zone', 'crate'],
    },
    {
      key: 'transport_leg',
      kind: 'transport',
      label: 'Transport leg',
      definition:
        'A planned movement of items, food, staff, or documents between home base, vendor, venue, client site, storage, or return destination.',
      ownerModule: 'lib/travel',
      canonicalStateFields: ['task', 'custody', 'readiness', 'visibility'],
      allowedOwnershipKinds: [
        'chef_owned',
        'tenant_owned',
        'staff_assigned',
        'vendor_provided',
        'rental',
        'unknown',
      ],
      defaultVisibility: 'chef_internal',
      sourceModules: ['lib/travel', 'lib/events', 'lib/weather', 'lib/vendors'],
      reusableBy: [
        'physical_event_loadout_brain',
        'vendor_trust_ledger',
        'staff_trust_delegation',
        'event_readiness_bus',
        'crisis_recovery',
      ],
      integrationPoints: [
        'vendor pickup',
        'arrival guide',
        'weather risk',
        'staff task board',
        'return-home follow-up',
      ],
      reuseGuidance:
        'Model the movement once, then attach equipment, storage, staff, and vendor obligations to it.',
      doNotDuplicateAs: ['delivery run', 'pickup errand', 'load-in trip', 'return trip'],
    },
    {
      key: 'transport_condition',
      kind: 'transport',
      label: 'Transport condition',
      definition:
        'A temperature, timing, fragility, access, vehicle, route, parking, elevator, stairs, weather, or cold-chain constraint affecting transport.',
      ownerModule: 'lib/travel',
      canonicalStateFields: ['capability', 'readiness', 'visibility'],
      allowedOwnershipKinds: ['chef_owned', 'venue_provided', 'vendor_provided', 'unknown'],
      defaultVisibility: 'chef_internal',
      sourceModules: ['lib/weather', 'lib/events/location-truth.ts', 'lib/venues', 'lib/vendors'],
      reusableBy: [
        'physical_event_loadout_brain',
        'sustainability_waste_ethics_ledger',
        'vendor_trust_ledger',
        'event_readiness_bus',
        'crisis_recovery',
      ],
      integrationPoints: [
        'cold-chain planning',
        'venue access notes',
        'weather checklist',
        'vendor handoff',
      ],
      reuseGuidance:
        'Attach constraints to transport legs and affected items. Do not bury transport risk only in private notes.',
      doNotDuplicateAs: ['delivery constraint', 'route issue', 'cold chain note', 'parking note'],
    },
    {
      key: 'storage_zone',
      kind: 'storage',
      label: 'Storage zone',
      definition:
        'A refrigerator, freezer, dry area, shelf, client storage area, venue hold area, cooler, hot hold, or staging zone.',
      ownerModule: 'lib/inventory',
      canonicalStateFields: ['capability', 'custody', 'readiness', 'visibility'],
      allowedOwnershipKinds: [
        'chef_owned',
        'tenant_owned',
        'client_owned',
        'venue_provided',
        'vendor_provided',
        'unknown',
      ],
      defaultVisibility: 'chef_internal',
      sourceModules: ['lib/inventory', 'lib/venues', 'lib/events', 'lib/household'],
      reusableBy: [
        'physical_event_loadout_brain',
        'client_household_operating_memory',
        'sustainability_waste_ethics_ledger',
        'event_readiness_bus',
      ],
      integrationPoints: [
        'venue capability',
        'leftover plan',
        'client household memory',
        'food safety checks',
      ],
      reuseGuidance:
        'Use one storage-zone concept across venue, household, leftovers, and loadout. Unknown storage capacity is a readiness risk.',
      doNotDuplicateAs: ['hold area', 'fridge slot', 'cooler space', 'dry storage'],
    },
    {
      key: 'cleanup_step',
      kind: 'cleanup',
      label: 'Cleanup step',
      definition:
        'A service-close, dish, packing, sanitation, leftover, venue reset, trash, compost, rental-return, or return-home action.',
      ownerModule: 'lib/service-days',
      canonicalStateFields: ['task', 'custody', 'readiness', 'visibility'],
      allowedOwnershipKinds: [
        'chef_owned',
        'tenant_owned',
        'staff_assigned',
        'venue_provided',
        'vendor_provided',
        'unknown',
      ],
      defaultVisibility: 'chef_internal',
      sourceModules: ['lib/service-days', 'lib/events', 'lib/sustainability', 'lib/staff'],
      reusableBy: [
        'physical_event_loadout_brain',
        'sustainability_waste_ethics_ledger',
        'staff_trust_delegation',
        'event_readiness_bus',
        'mobile_field_capture',
      ],
      integrationPoints: [
        'close-out wizard',
        'return-home checklist',
        'staff-safe task board',
        'post-event learning',
      ],
      reuseGuidance:
        'Treat cleanup as a task primitive that can close custody, waste, storage, and venue reset loops.',
      doNotDuplicateAs: ['closeout item', 'reset checklist', 'washdown task', 'breakdown task'],
    },
    {
      key: 'waste_stream',
      kind: 'waste',
      label: 'Waste stream',
      definition:
        'Food waste, trim, packaging, compost, donation, discard, reusable packaging return, or safety-blocked leftovers from a physical operation.',
      ownerModule: 'lib/sustainability',
      canonicalStateFields: ['task', 'readiness', 'visibility'],
      allowedOwnershipKinds: [
        'chef_owned',
        'tenant_owned',
        'client_owned',
        'venue_provided',
        'vendor_provided',
        'unknown',
      ],
      defaultVisibility: 'chef_internal',
      sourceModules: ['lib/sustainability', 'lib/waste', 'lib/inventory', 'lib/events'],
      reusableBy: [
        'sustainability_waste_ethics_ledger',
        'physical_event_loadout_brain',
        'client_household_operating_memory',
        'event_readiness_bus',
      ],
      integrationPoints: [
        'waste log',
        'leftover plan',
        'client-safe reheating/storage instructions',
        'sourcing and packaging claims',
      ],
      reuseGuidance:
        'Use this primitive for waste categorization and disposal path. Safety-blocked leftovers must not be converted into client-safe outputs.',
      doNotDuplicateAs: ['leftover waste', 'trash stream', 'compost row', 'discard plan'],
    },
    {
      key: 'staff_task',
      kind: 'staff_task',
      label: 'Staff task',
      definition:
        'A least-privilege assignment for a staff member, vendor, delegate, or collaborator that performs one physical-operation step.',
      ownerModule: 'lib/staff',
      canonicalStateFields: ['task', 'readiness', 'visibility'],
      allowedOwnershipKinds: ['staff_assigned', 'chef_owned', 'tenant_owned', 'vendor_provided'],
      defaultVisibility: 'staff_safe_task',
      sourceModules: ['lib/staff', 'lib/tasks', 'lib/delegation', 'lib/events'],
      reusableBy: [
        'staff_trust_delegation',
        'physical_event_loadout_brain',
        'vendor_trust_ledger',
        'event_readiness_bus',
        'mobile_field_capture',
      ],
      integrationPoints: [
        'staff portal',
        'assignment-scoped briefing',
        'vendor handoff',
        'mobile field capture',
      ],
      reuseGuidance:
        'Use staff tasks as safe execution DTOs. Private client memory, pricing, household access details, and internal risk labels stay out unless explicitly assignment-scoped and safe.',
      doNotDuplicateAs: ['crew todo', 'vendor todo', 'delegate job', 'checklist assignment'],
    },
  ]

export function getPhysicalOperationPrimitive(
  key: PhysicalOperationPrimitiveKey
): PhysicalOperationPrimitiveDefinition {
  const primitive = PHYSICAL_OPERATION_PRIMITIVE_REGISTRY.find((item) => item.key === key)
  if (!primitive) {
    throw new Error(`Unknown physical operation primitive: ${key}`)
  }
  return primitive
}

export function listPhysicalOperationPrimitivesByKind(
  kind: PhysicalOperationPrimitiveKind
): PhysicalOperationPrimitiveDefinition[] {
  return PHYSICAL_OPERATION_PRIMITIVE_REGISTRY.filter((primitive) => primitive.kind === kind)
}

export function getMissingRequiredPhysicalOperationPrimitiveKinds(
  registry: readonly PhysicalOperationPrimitiveDefinition[] = PHYSICAL_OPERATION_PRIMITIVE_REGISTRY
): PhysicalOperationPrimitiveKind[] {
  const covered = new Set(registry.map((primitive) => primitive.kind))
  return REQUIRED_PHYSICAL_OPERATION_PRIMITIVE_KINDS.filter((kind) => !covered.has(kind))
}

export function deriveMostRestrictivePhysicalReadinessState(
  states: readonly PhysicalReadinessState[]
): PhysicalReadinessState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    PHYSICAL_READINESS_STATE_RANK[candidate] > PHYSICAL_READINESS_STATE_RANK[current]
      ? candidate
      : current
  )
}

export function isStaffOrVendorSafePhysicalVisibility(
  visibility: PhysicalVisibilityLevel
): visibility is 'staff_safe_task' | 'vendor_safe_task' {
  return visibility === 'staff_safe_task' || visibility === 'vendor_safe_task'
}

export function requiresChefInternalPhysicalVisibility(
  visibility: PhysicalVisibilityLevel
): boolean {
  return visibility === 'private_only' || visibility === 'chef_internal'
}

function normalizePrimitiveAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function findPhysicalOperationPrimitiveCandidates(
  label: string
): PhysicalOperationPrimitiveDefinition[] {
  const normalizedLabel = normalizePrimitiveAlias(label)
  if (!normalizedLabel) return []

  return PHYSICAL_OPERATION_PRIMITIVE_REGISTRY.filter((primitive) => {
    const aliases = [primitive.key, primitive.kind, primitive.label, ...primitive.doNotDuplicateAs]
    return aliases.some((alias) => normalizePrimitiveAlias(alias) === normalizedLabel)
  })
}

export const LOADOUT_EQUIPMENT_OWNERSHIP_TYPES = [
  'owned',
  'rented',
  'borrowed',
  'venue_provided',
  'vendor_provided',
  'disposable',
  'consumable',
] as const

export type LoadoutEquipmentOwnershipType = (typeof LOADOUT_EQUIPMENT_OWNERSHIP_TYPES)[number]

export const LOADOUT_REQUIREMENT_SOURCES = [
  'manual_chef_input',
  'menu_dish',
  'recipe_equipment',
  'guest_scale',
  'venue_capability',
  'weather',
  'staff_plan',
  'rental',
  'prior_event',
  'workflow_stage',
  'derived',
] as const

export type LoadoutRequirementSource = (typeof LOADOUT_REQUIREMENT_SOURCES)[number]

export const VENUE_CAPABILITY_KINDS = [
  'burners',
  'oven',
  'refrigeration',
  'freezer',
  'counter_space',
  'sink',
  'parking',
  'load_in',
  'power',
  'elevator',
  'service_path',
  'storage',
  'water',
  'waste',
] as const

export type VenueCapabilityKind = (typeof VENUE_CAPABILITY_KINDS)[number]

export const VENUE_CAPABILITY_STATES = [
  'available',
  'limited',
  'unavailable',
  'unknown',
  'not_applicable',
] as const

export type VenueCapabilityState = (typeof VENUE_CAPABILITY_STATES)[number]

export const PACK_STATES = [
  'needed',
  'packed',
  'staged',
  'loaded',
  'used',
  'returned',
  'damaged',
  'missing',
] as const

export type PackState = (typeof PACK_STATES)[number]

export const LOADOUT_FULFILLMENT_STATES = [
  'fulfilled',
  'needs_rental',
  'needs_borrow',
  'needs_purchase',
  'venue_confirm_pending',
  'missing',
] as const

export type LoadoutFulfillmentState = (typeof LOADOUT_FULFILLMENT_STATES)[number]

export const STATION_PLAN_KINDS = [
  'prep',
  'hot',
  'cold',
  'plating',
  'beverage',
  'dishwashing',
  'storage',
  'waste',
] as const

export type StationPlanKind = (typeof STATION_PLAN_KINDS)[number]

export const SERVICE_DAY_CHECKLIST_MODES = [
  'planning',
  'packing',
  'vehicle_load',
  'on_site_setup',
  'service',
  'cleanup',
  'return_home',
] as const

export type ServiceDayChecklistMode = (typeof SERVICE_DAY_CHECKLIST_MODES)[number]

export const LOADOUT_VISIBILITY_LEVELS = [
  'private_only',
  'chef_internal',
  'staff_safe_task',
  'client_safe_summary',
] as const

export type LoadoutVisibilityLevel = (typeof LOADOUT_VISIBILITY_LEVELS)[number]

export const LOADOUT_READINESS_STATES = [
  'ready',
  'in_progress',
  'at_risk',
  'blocked',
  'unknown',
] as const

export type LoadoutReadinessState = (typeof LOADOUT_READINESS_STATES)[number]

export const LOADOUT_READINESS_STATE_RANK: Record<LoadoutReadinessState, number> = {
  ready: 0,
  in_progress: 1,
  at_risk: 2,
  blocked: 3,
  unknown: 4,
}

export type LoadoutConfidence = 'low' | 'medium' | 'high'

export type LoadoutSourceRef = {
  source:
    | 'event'
    | 'menu'
    | 'menu_dish'
    | 'recipe'
    | 'equipment_registry'
    | 'equipment_item'
    | 'equipment_rental'
    | 'event_packing_list'
    | 'venue_profile'
    | 'event_station_plan'
    | 'event_day_of_checklist'
    | 'event_safety_checklist'
    | 'weather_snapshot'
    | 'staff_assignment'
    | 'workflow_stage'
    | 'client_household_memory'
    | 'derived'
  table:
    | 'events'
    | 'menus'
    | 'dishes'
    | 'menu_items'
    | 'recipes'
    | 'chef_equipment_registry'
    | 'equipment_items'
    | 'equipment_rentals'
    | 'event_packing_lists'
    | 'event_packing_items'
    | 'venue_profiles'
    | 'event_station_dishes'
    | 'stations'
    | 'event_day_of_checklist'
    | 'event_safety_checklists'
    | 'weather_snapshots'
    | 'event_collaborators'
    | 'clients'
    | 'derived'
  rowId: string | null
}

export type LoadoutEquipmentItemContract = {
  id: string | null
  tenantId: string
  chefId: string
  name: string
  category: string
  ownershipType: LoadoutEquipmentOwnershipType
  quantityAvailable: number | null
  portable: boolean
  requiresMaintenanceCheck: boolean
  sourceRefs: LoadoutSourceRef[]
  visibility: LoadoutVisibilityLevel
}

export type VenueCapabilityContract = {
  tenantId: string
  eventId: string
  venueProfileId: string | null
  kind: VenueCapabilityKind
  state: VenueCapabilityState
  needed: boolean
  label: string
  notes: string | null
  sourceRefs: LoadoutSourceRef[]
  visibility: LoadoutVisibilityLevel
}

export type LoadoutRequirementContract = {
  id: string | null
  tenantId: string
  chefId: string
  eventId: string
  menuId: string | null
  dishId: string | null
  stationId: string | null
  itemName: string
  category: string
  requiredQuantity: number
  fulfilledQuantity: number
  ownershipPlan: LoadoutEquipmentOwnershipType | null
  source: LoadoutRequirementSource
  packState: PackState
  fulfillmentState: LoadoutFulfillmentState
  confidence: LoadoutConfidence
  riskLabels: string[]
  sourceRefs: LoadoutSourceRef[]
  visibility: LoadoutVisibilityLevel
}

export type StationPlanAssignmentContract = {
  dishId: string | null
  requirementIds: string[]
  label: string
  estimatedMinutes: number | null
  sourceRefs: LoadoutSourceRef[]
}

export type StationPlanContract = {
  id: string | null
  tenantId: string
  chefId: string
  eventId: string
  stationKind: StationPlanKind
  stationId: string | null
  label: string
  capabilityNeeds: VenueCapabilityKind[]
  assignments: StationPlanAssignmentContract[]
  visibility: LoadoutVisibilityLevel
}

export type StaffSafeLoadoutTaskContract = {
  id: string
  tenantId: string
  eventId: string
  mode: ServiceDayChecklistMode
  stationKind: StationPlanKind | null
  label: string
  instructions: string
  dueAt: string | null
  privateNotes: string | null
  sourceRefs: LoadoutSourceRef[]
  visibility: LoadoutVisibilityLevel
}

export type StaffSafeLoadoutTask = Omit<
  StaffSafeLoadoutTaskContract,
  'privateNotes' | 'visibility'
> & {
  visibility: 'staff_safe_task'
}

export type StaffSafeLoadoutTaskExport = {
  tenantId: string
  eventId: string
  tasks: StaffSafeLoadoutTask[]
  blockedPrivateTaskCount: number
  visibility: 'staff_safe_task'
}

export type ServiceDayChecklistItemContract = {
  id: string | null
  tenantId: string
  eventId: string
  mode: ServiceDayChecklistMode
  label: string
  completed: boolean
  packState: PackState | null
  requirementId: string | null
  stationKind: StationPlanKind | null
  sourceRefs: LoadoutSourceRef[]
  visibility: LoadoutVisibilityLevel
}

export type LoadoutPlanContract = {
  tenantId: string
  chefId: string
  eventId: string
  readinessState: LoadoutReadinessState
  requirements: LoadoutRequirementContract[]
  venueCapabilities: VenueCapabilityContract[]
  stationPlans: StationPlanContract[]
  checklistItems: ServiceDayChecklistItemContract[]
  staffSafeTaskExport: StaffSafeLoadoutTaskExport | null
  sourceRefs: LoadoutSourceRef[]
  visibility: 'chef_internal'
}

export function deriveMostRestrictiveLoadoutReadinessState(
  states: readonly LoadoutReadinessState[]
): LoadoutReadinessState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    LOADOUT_READINESS_STATE_RANK[candidate] > LOADOUT_READINESS_STATE_RANK[current]
      ? candidate
      : current
  )
}

export function hasVenueCapabilityRisk(capability: VenueCapabilityContract): boolean {
  return (
    capability.needed &&
    (capability.state === 'unknown' ||
      capability.state === 'limited' ||
      capability.state === 'unavailable')
  )
}

export function isStaffSafeLoadoutVisibility(visibility: LoadoutVisibilityLevel): boolean {
  return visibility === 'staff_safe_task' || visibility === 'client_safe_summary'
}

export function deriveLoadoutPlanReadiness(input: {
  requirements: readonly LoadoutRequirementContract[]
  venueCapabilities: readonly VenueCapabilityContract[]
}): LoadoutReadinessState {
  const states: LoadoutReadinessState[] = []

  if (input.requirements.length === 0) states.push('unknown')

  for (const requirement of input.requirements) {
    if (
      requirement.fulfillmentState === 'missing' ||
      requirement.packState === 'missing' ||
      requirement.packState === 'damaged' ||
      requirement.fulfilledQuantity < requirement.requiredQuantity
    ) {
      states.push('blocked')
      continue
    }

    if (
      requirement.fulfillmentState === 'needs_rental' ||
      requirement.fulfillmentState === 'needs_borrow' ||
      requirement.fulfillmentState === 'needs_purchase' ||
      requirement.fulfillmentState === 'venue_confirm_pending' ||
      requirement.confidence === 'low'
    ) {
      states.push('at_risk')
      continue
    }

    if (requirement.packState === 'needed') {
      states.push('in_progress')
      continue
    }

    states.push('ready')
  }

  for (const capability of input.venueCapabilities) {
    if (!capability.needed || capability.state === 'not_applicable') continue
    if (capability.state === 'unavailable') {
      states.push('blocked')
    } else if (capability.state === 'unknown' || capability.state === 'limited') {
      states.push('at_risk')
    } else {
      states.push('ready')
    }
  }

  return deriveMostRestrictiveLoadoutReadinessState(states)
}

export function buildStaffSafeLoadoutTaskExport(input: {
  tenantId: string
  eventId: string
  tasks: readonly StaffSafeLoadoutTaskContract[]
}): StaffSafeLoadoutTaskExport {
  const tasks = input.tasks
    .filter((task) => task.visibility === 'staff_safe_task')
    .map(({ privateNotes: _privateNotes, visibility: _visibility, ...task }) => ({
      ...task,
      visibility: 'staff_safe_task' as const,
    }))

  return {
    tenantId: input.tenantId,
    eventId: input.eventId,
    tasks,
    blockedPrivateTaskCount: input.tasks.length - tasks.length,
    visibility: 'staff_safe_task',
  }
}

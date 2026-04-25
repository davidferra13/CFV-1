export type PopUpLifecycleStage =
  | 'concept'
  | 'menu_build'
  | 'orders_open'
  | 'production_lock'
  | 'day_of'
  | 'closed'
  | 'analyzed'

export type PopUpOrderSource =
  | 'online'
  | 'dm'
  | 'comment'
  | 'word_of_mouth'
  | 'form'
  | 'walkup'
  | 'comp'

export type PopUpMenuItemPlan = {
  ticketTypeId?: string | null
  dishIndexId?: string | null
  recipeId?: string | null
  name: string
  plannedUnits: number
  suggestedUnits?: number | null
  bufferPercent?: number | null
  batchSize?: number | null
  unitCostCents?: number | null
  priceCents?: number | null
  targetMarginPercent?: number | null
  prepLeadHours?: number | null
  productionStatus?: 'not_started' | 'prep_started' | 'batched' | 'packed' | 'ready'
  equipmentNeeded?: string[]
  constraints?: string[]
  notes?: string
}

export type PopUpLocationProfile = {
  locationKind: 'cafe_collab' | 'standalone_drop' | 'private_event' | 'market' | 'other'
  accessWindow?: string
  kitchenAccess?: string
  equipmentAvailable: string[]
  coldStorage?: string
  holdingConstraints?: string[]
  loadInNotes?: string
}

export type PopUpCloseoutItem = {
  name: string
  plannedUnits: number
  producedUnits: number
  soldUnits: number
  wastedUnits: number
  soldOutAt?: string | null
  revenueCents: number
  estimatedCostCents: number
  notes?: string
}

export type PopUpConfig = {
  stage: PopUpLifecycleStage
  dropType: 'cafe_collab' | 'weekend_drop' | 'private_dessert_event' | 'other'
  preorderOpensAt?: string | null
  preorderClosesAt?: string | null
  productionLocksAt?: string | null
  pickupWindows?: string[]
  orderSources?: PopUpOrderSource[]
  locationProfile?: PopUpLocationProfile
  menuItems: PopUpMenuItemPlan[]
  closeout?: {
    itemResults: PopUpCloseoutItem[]
    overallNotes?: string
    nextDropIdeas?: string
  }
}

export type PopUpProductLibraryItem = {
  id: string
  name: string
  course: string | null
  recipeId: string | null
  recipeName: string | null
  seasonTags: string[]
  specialEquipment: string[]
  prepComplexity: string | null
  timesServed: number
  avgRating: number
  unitCostCents: number | null
}

const DEFAULT_POPUP_CONFIG: PopUpConfig = {
  stage: 'concept',
  dropType: 'weekend_drop',
  preorderOpensAt: null,
  preorderClosesAt: null,
  productionLocksAt: null,
  pickupWindows: [],
  orderSources: ['online', 'dm', 'comment', 'word_of_mouth', 'form', 'walkup', 'comp'],
  locationProfile: {
    locationKind: 'standalone_drop',
    equipmentAvailable: [],
  },
  menuItems: [],
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function normalizePopUpConfig(value: unknown): PopUpConfig {
  const input = value && typeof value === 'object' ? (value as Partial<PopUpConfig>) : {}
  return {
    ...DEFAULT_POPUP_CONFIG,
    ...input,
    stage: input.stage ?? DEFAULT_POPUP_CONFIG.stage,
    dropType: input.dropType ?? DEFAULT_POPUP_CONFIG.dropType,
    pickupWindows: normalizeStringList(input.pickupWindows),
    orderSources: (Array.isArray(input.orderSources) && input.orderSources.length
      ? input.orderSources
      : DEFAULT_POPUP_CONFIG.orderSources) as PopUpOrderSource[],
    locationProfile: {
      ...DEFAULT_POPUP_CONFIG.locationProfile,
      ...(input.locationProfile ?? {}),
      locationKind: input.locationProfile?.locationKind ?? 'standalone_drop',
      equipmentAvailable: normalizeStringList(input.locationProfile?.equipmentAvailable),
      holdingConstraints: normalizeStringList(input.locationProfile?.holdingConstraints),
    },
    menuItems: Array.isArray(input.menuItems)
      ? input.menuItems.map((item) => ({
          ...item,
          name: String(item.name || 'Untitled item'),
          plannedUnits: Math.max(0, Math.round(toNumber(item.plannedUnits, 24))),
          suggestedUnits:
            item.suggestedUnits === null || item.suggestedUnits === undefined
              ? null
              : Math.max(0, Math.round(toNumber(item.suggestedUnits))),
          batchSize:
            item.batchSize === null || item.batchSize === undefined
              ? null
              : Math.max(0, Math.round(toNumber(item.batchSize))),
          unitCostCents:
            item.unitCostCents === null || item.unitCostCents === undefined
              ? null
              : Math.max(0, Math.round(toNumber(item.unitCostCents))),
          priceCents:
            item.priceCents === null || item.priceCents === undefined
              ? null
              : Math.max(0, Math.round(toNumber(item.priceCents))),
          equipmentNeeded: normalizeStringList(item.equipmentNeeded),
          constraints: normalizeStringList(item.constraints),
          productionStatus: item.productionStatus ?? 'not_started',
        }))
      : [],
    closeout: input.closeout
      ? {
          itemResults: Array.isArray(input.closeout.itemResults)
            ? input.closeout.itemResults.map((item) => ({
                ...item,
                plannedUnits: Math.max(0, Math.round(toNumber(item.plannedUnits))),
                producedUnits: Math.max(0, Math.round(toNumber(item.producedUnits))),
                soldUnits: Math.max(0, Math.round(toNumber(item.soldUnits))),
                wastedUnits: Math.max(0, Math.round(toNumber(item.wastedUnits))),
                revenueCents: Math.max(0, Math.round(toNumber(item.revenueCents))),
                estimatedCostCents: Math.max(0, Math.round(toNumber(item.estimatedCostCents))),
              }))
            : [],
          overallNotes: input.closeout.overallNotes ?? '',
          nextDropIdeas: input.closeout.nextDropIdeas ?? '',
        }
      : undefined,
  }
}

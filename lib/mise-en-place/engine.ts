// Mise en Place Engine
// Pure computation: raw data in, organized station cards out.
// No database calls, no side effects.

import type {
  MiseStation,
  MiseIngredient,
  MiseComponent,
  MiseStationCard,
  MiseEquipment,
  MiseEnPlaceBoard,
  PackItem,
  AllergenZone,
  ConsolidatedIngredient,
  MiseCourseCard,
  TimelineSlot,
} from './types'

// --- Station inference ---

const CATEGORY_TO_STATION: Record<string, MiseStation> = {
  sauce: 'saucier',
  condiment: 'saucier',
  protein: 'rotisseur',
  starch: 'entremetier',
  vegetable: 'entremetier',
  soup: 'entremetier',
  salad: 'garde_manger',
  appetizer: 'garde_manger',
  cheese: 'garde_manger',
  fruit: 'garde_manger',
  dessert: 'patissier',
  bread: 'patissier',
  pasta: 'entremetier',
  beverage: 'general',
  garnish: 'garde_manger',
  other: 'general',
}

// Name-based hints (checked after category)
const NAME_STATION_HINTS: Array<[RegExp, MiseStation]> = [
  [/\b(grill|bbq|char)\b/i, 'rotisseur'],
  [/\b(roast|braise|sear)\b/i, 'rotisseur'],
  [/\b(sauce|jus|glaze|reduction|demi)\b/i, 'saucier'],
  [/\b(saute|pan[- ]?fry)\b/i, 'saucier'],
  [/\b(salad|ceviche|tartare|crudo|carpaccio)\b/i, 'garde_manger'],
  [/\b(terrine|pate|charcuteri)\b/i, 'garde_manger'],
  [/\b(cake|tart|pastry|mousse|sorbet|ice cream|gelato|custard|creme|panna cotta)\b/i, 'patissier'],
  [/\b(bread|dough|brioche|focaccia|biscuit)\b/i, 'patissier'],
  [/\b(soup|puree|veloute|bisque|consomme)\b/i, 'entremetier'],
  [/\b(risotto|polenta|gratin|potato|rice)\b/i, 'entremetier'],
]

export function inferStation(
  componentName: string,
  category: string | null,
  prepStation: string | null
): MiseStation {
  // Explicit prep_station from the component table takes priority
  if (prepStation) {
    const normalized = prepStation.toLowerCase().replace(/[^a-z_]/g, '')
    if (normalized in CATEGORY_TO_STATION) return normalized as MiseStation
    // Map brigade terms
    if (normalized.includes('sauce') || normalized === 'saucier') return 'saucier'
    if (normalized.includes('cold') || normalized.includes('garde')) return 'garde_manger'
    if (normalized.includes('pastry') || normalized.includes('patiss')) return 'patissier'
    if (
      normalized.includes('grill') ||
      normalized.includes('roast') ||
      normalized.includes('rotis')
    )
      return 'rotisseur'
    if (normalized.includes('veg') || normalized.includes('soup') || normalized.includes('entrem'))
      return 'entremetier'
  }

  // Name-based inference
  for (const [pattern, station] of NAME_STATION_HINTS) {
    if (pattern.test(componentName)) return station
  }

  // Category fallback
  if (category && category in CATEGORY_TO_STATION) {
    return CATEGORY_TO_STATION[category]
  }

  return 'general'
}

// --- Input types (what comes from the server action) ---

export interface MiseRawComponent {
  componentId: string
  componentName: string
  recipeName: string | null
  recipeId: string | null
  dishName: string
  courseName: string
  courseNumber: number
  category: string | null
  prepStation: string | null
  holdClass: string | null
  prepTier: string | null
  activeMinutes: number | null
  passiveMinutes: number | null
  totalMinutes: number
  peakHoursMin: number | null
  peakHoursMax: number | null
  storageMethod: string | null
  freezable: boolean
  ingredients: MiseRawIngredient[]
}

export interface MiseRawIngredient {
  ingredientId: string
  name: string
  quantity: number
  unit: string
  category: string
  allergenFlags: string[]
  prepNotes: string | null
  yieldPct: number
  lastPriceCents: number
  // Lifecycle data
  purchasedQty: number | null
  purchasedCostCents: number | null
}

export interface MiseRawInput {
  eventId: string
  eventName: string
  eventDate: string
  serveTime: string | null
  guestCount: number
  serviceStyle: string | null
  clientName: string | null
  components: MiseRawComponent[]
  equipment: MiseEquipment[]
  prepCompletions: string[] // item_key values from prep_completions
  groceryDeadline: string | null
  prepDeadline: string | null
}

// --- Engine ---

export function buildMiseEnPlace(input: MiseRawInput): MiseEnPlaceBoard {
  const stationMap = new Map<MiseStation, MiseComponent[]>()

  // Process each component, assign to station, build ingredients
  for (const raw of input.components) {
    const station = inferStation(raw.componentName, raw.category, raw.prepStation)
    const componentKey = `${raw.componentId}-${raw.componentName}`
    const isPrepped = input.prepCompletions.includes(componentKey)

    const ingredients: MiseIngredient[] = raw.ingredients.map((ing) => {
      const buyQty = (ing.quantity * 100) / Math.max(ing.yieldPct, 1)
      const ingKey = `ing-${ing.ingredientId}-${raw.componentId}`
      return {
        ingredientId: ing.ingredientId,
        name: ing.name,
        totalQuantity: round3(ing.quantity),
        unit: ing.unit,
        category: ing.category,
        allergenFlags: ing.allergenFlags,
        sources: [
          {
            recipeName: raw.recipeName ?? raw.componentName,
            componentId: raw.componentId,
            componentName: raw.componentName,
            dishName: raw.dishName,
            courseName: raw.courseName,
            quantity: round3(ing.quantity),
            prepNotes: ing.prepNotes,
          },
        ],
        buyQuantity: round3(buyQty),
        yieldPct: ing.yieldPct,
        sourced: ing.purchasedQty !== null && ing.purchasedQty > 0,
        purchasedQty: ing.purchasedQty,
        costCents:
          ing.purchasedCostCents ??
          (ing.lastPriceCents > 0 ? Math.round(buyQty * ing.lastPriceCents) : null),
        prepped: input.prepCompletions.includes(ingKey),
      }
    })

    const component: MiseComponent = {
      componentId: raw.componentId,
      componentName: raw.componentName,
      recipeName: raw.recipeName,
      recipeId: raw.recipeId,
      dishName: raw.dishName,
      courseName: raw.courseName,
      courseNumber: raw.courseNumber,
      station,
      holdClass: raw.holdClass,
      prepTier: raw.prepTier,
      activeMinutes: raw.activeMinutes ?? raw.totalMinutes,
      passiveMinutes: raw.passiveMinutes ?? 0,
      totalMinutes: raw.totalMinutes,
      peakHoursMin: raw.peakHoursMin,
      peakHoursMax: raw.peakHoursMax,
      storageMethod: raw.storageMethod,
      freezable: raw.freezable,
      ingredients,
      prepped: isPrepped,
    }

    const existing = stationMap.get(station) ?? []
    existing.push(component)
    stationMap.set(station, existing)
  }

  // Build station cards sorted by prep tier priority
  const tierOrder: Record<string, number> = { base: 0, secondary: 1, tertiary: 2, finishing: 3 }
  const stationOrder: MiseStation[] = [
    'rotisseur',
    'saucier',
    'entremetier',
    'garde_manger',
    'patissier',
    'general',
  ]

  const stations: MiseStationCard[] = []
  for (const stationKey of stationOrder) {
    const components = stationMap.get(stationKey)
    if (!components || components.length === 0) continue

    // Sort: prep tier (base first), then course number
    components.sort((a, b) => {
      const tierA = tierOrder[a.prepTier ?? 'finishing'] ?? 3
      const tierB = tierOrder[b.prepTier ?? 'finishing'] ?? 3
      if (tierA !== tierB) return tierA - tierB
      return a.courseNumber - b.courseNumber
    })

    const allIngredients = components.flatMap((c) => c.ingredients)
    const allergens = [...new Set(allIngredients.flatMap((i) => i.allergenFlags))]

    stations.push({
      station: stationKey,
      label: STATION_LABEL_MAP[stationKey],
      description: STATION_DESC_MAP[stationKey],
      components,
      totalActiveMinutes: components.reduce((sum, c) => sum + c.activeMinutes, 0),
      totalPassiveMinutes: components.reduce((sum, c) => sum + c.passiveMinutes, 0),
      ingredientCount: allIngredients.length,
      preppedCount: allIngredients.filter((i) => i.prepped).length,
      allergens,
    })
  }

  // Build pack manifest
  const packManifest: PackItem[] = input.equipment.map((eq) => ({
    name: eq.name,
    category: eq.category,
    quantity: eq.quantity,
    source: eq.source,
    packed: eq.packed,
    type: 'equipment' as const,
  }))

  // Build allergen zones
  const allergenMap = new Map<
    string,
    { stations: Set<MiseStation>; dishes: Set<string>; ingredients: Set<string> }
  >()
  for (const station of stations) {
    for (const comp of station.components) {
      for (const ing of comp.ingredients) {
        for (const flag of ing.allergenFlags) {
          const zone = allergenMap.get(flag) ?? {
            stations: new Set<MiseStation>(),
            dishes: new Set<string>(),
            ingredients: new Set<string>(),
          }
          zone.stations.add(station.station)
          zone.dishes.add(comp.dishName)
          zone.ingredients.add(ing.name)
          allergenMap.set(flag, zone)
        }
      }
    }
  }
  const allergenZones: AllergenZone[] = Array.from(allergenMap.entries()).map(
    ([allergen, zone]) => ({
      allergen,
      stations: [...zone.stations],
      dishes: [...zone.dishes],
      ingredients: [...zone.ingredients],
    })
  )

  // Compute readiness
  const allComponents = stations.flatMap((s) => s.components)
  const allIngredients = allComponents.flatMap((c) => c.ingredients)
  const totalIngredients = allIngredients.length
  const sourcedIngredients = allIngredients.filter((i) => i.sourced).length
  const preppedIngredients = allIngredients.filter((i) => i.prepped).length
  const totalComponents = allComponents.length
  const preppedComponents = allComponents.filter((c) => c.prepped).length
  const totalEquipment = input.equipment.length
  const packedEquipment = input.equipment.filter((e) => e.packed).length

  // Weighted readiness: sourcing 30%, prep 40%, equipment 20%, components 10%
  const sourcingScore = totalIngredients > 0 ? (sourcedIngredients / totalIngredients) * 30 : 30
  const prepScore = totalIngredients > 0 ? (preppedIngredients / totalIngredients) * 40 : 40
  const equipScore = totalEquipment > 0 ? (packedEquipment / totalEquipment) * 20 : 20
  const compScore = totalComponents > 0 ? (preppedComponents / totalComponents) * 10 : 10
  const score = Math.round(sourcingScore + prepScore + equipScore + compScore)

  let status: 'READY' | 'AT_RISK' | 'NOT_READY' = 'NOT_READY'
  if (score >= 85) status = 'READY'
  else if (score >= 50) status = 'AT_RISK'

  // --- Consolidated ingredient list (aggregated across all components) ---
  const ingredientAgg = new Map<string, ConsolidatedIngredient>()
  for (const comp of allComponents) {
    for (const ing of comp.ingredients) {
      const key = `${ing.ingredientId}:${ing.unit}`
      const existing = ingredientAgg.get(key)
      if (existing) {
        existing.totalQuantity = round3(existing.totalQuantity + ing.totalQuantity)
        existing.buyQuantity = round3(existing.buyQuantity + ing.buyQuantity)
        existing.sources.push(...ing.sources)
        existing.costCents = (existing.costCents ?? 0) + (ing.costCents ?? 0)
        // Sourced if ANY purchase exists
        if (ing.sourced) existing.sourced = true
        if (ing.purchasedQty !== null) {
          existing.purchasedQty = (existing.purchasedQty ?? 0) + ing.purchasedQty
        }
      } else {
        ingredientAgg.set(key, {
          ingredientId: ing.ingredientId,
          name: ing.name,
          totalQuantity: ing.totalQuantity,
          buyQuantity: ing.buyQuantity,
          unit: ing.unit,
          category: ing.category,
          allergenFlags: [...ing.allergenFlags],
          sources: [...ing.sources],
          yieldPct: ing.yieldPct,
          sourced: ing.sourced,
          purchasedQty: ing.purchasedQty,
          costCents: ing.costCents,
          prepped: ing.prepped,
        })
      }
    }
  }
  const consolidatedIngredients = Array.from(ingredientAgg.values()).sort((a, b) => {
    // Sort by category, then name
    const catCmp = a.category.localeCompare(b.category)
    if (catCmp !== 0) return catCmp
    return a.name.localeCompare(b.name)
  })

  // --- Course cards (fire-order view) ---
  const courseMap = new Map<number, MiseComponent[]>()
  for (const comp of allComponents) {
    const list = courseMap.get(comp.courseNumber) ?? []
    list.push(comp)
    courseMap.set(comp.courseNumber, list)
  }
  const courses: MiseCourseCard[] = Array.from(courseMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([courseNumber, components]) => {
      const ings = components.flatMap((c) => c.ingredients)
      return {
        courseNumber,
        courseName: components[0]?.courseName ?? `Course ${courseNumber}`,
        components,
        totalActiveMinutes: components.reduce((s, c) => s + c.activeMinutes, 0),
        totalPassiveMinutes: components.reduce((s, c) => s + c.passiveMinutes, 0),
        allergens: [...new Set(ings.flatMap((i) => i.allergenFlags))],
      }
    })

  // --- Timeline slots (timing rail) ---
  const slotBoundaries = [
    { label: 'T-72h+', hoursBeforeService: 72 },
    { label: 'T-48h', hoursBeforeService: 48 },
    { label: 'T-24h', hoursBeforeService: 24 },
    { label: 'T-4h', hoursBeforeService: 4 },
    { label: 'T-1h', hoursBeforeService: 1 },
    { label: 'Service', hoursBeforeService: 0 },
  ]

  const timelineSlots: TimelineSlot[] = slotBoundaries.map((slot, idx) => {
    const nextBoundary = idx > 0 ? slotBoundaries[idx - 1].hoursBeforeService : Infinity
    const thisBoundary = slot.hoursBeforeService

    const slotComponents = allComponents
      .filter((c) => {
        // Place by peak window midpoint, or holdClass for service-time items
        if (c.holdClass === 'serve_immediately' && thisBoundary === 0) return true
        if (c.holdClass === 'hold_warm' && thisBoundary <= 1) return true

        const peakMid =
          c.peakHoursMin != null && c.peakHoursMax != null
            ? (c.peakHoursMin + c.peakHoursMax) / 2
            : null

        if (peakMid !== null) {
          return peakMid >= thisBoundary && peakMid < nextBoundary
        }

        // No peak data: finishing tier = service, base = T-24h, others = T-4h
        if (thisBoundary === 0 && c.prepTier === 'finishing') return true
        if (thisBoundary === 24 && c.prepTier === 'base') return true
        if (
          thisBoundary === 4 &&
          (!c.prepTier || c.prepTier === 'secondary' || c.prepTier === 'tertiary')
        )
          return true

        return false
      })
      .map((c) => ({
        componentName: c.componentName,
        recipeName: c.recipeName,
        station: c.station,
        holdClass: c.holdClass,
        activeMinutes: c.activeMinutes,
      }))

    return {
      ...slot,
      components: slotComponents,
    }
  })

  // Estimated food cost
  const estimatedFoodCostCents = allIngredients.reduce((sum, ing) => sum + (ing.costCents ?? 0), 0)

  return {
    eventId: input.eventId,
    eventName: input.eventName,
    eventDate: input.eventDate,
    serveTime: input.serveTime,
    guestCount: input.guestCount,
    serviceStyle: input.serviceStyle,
    clientName: input.clientName,
    stations,
    courses,
    consolidatedIngredients,
    timelineSlots,
    equipment: input.equipment,
    packManifest,
    allergenZones,
    readiness: {
      score,
      status,
      totalIngredients,
      sourcedIngredients,
      preppedIngredients,
      totalComponents,
      preppedComponents,
      totalEquipment,
      packedEquipment,
    },
    groceryDeadline: input.groceryDeadline,
    prepDeadline: input.prepDeadline,
    estimatedFoodCostCents,
  }
}

// --- Helpers ---

const STATION_LABEL_MAP: Record<MiseStation, string> = {
  saucier: 'Saucier',
  garde_manger: 'Garde Manger',
  patissier: 'Patissier',
  rotisseur: 'Rotisseur',
  entremetier: 'Entremetier',
  general: 'General Prep',
}

const STATION_DESC_MAP: Record<MiseStation, string> = {
  saucier: 'Sauces, sautes, braises',
  garde_manger: 'Cold prep, salads, assembly',
  patissier: 'Pastry, desserts, baking',
  rotisseur: 'Roasting, grilling, proteins',
  entremetier: 'Soups, vegetables, starches',
  general: 'Multi-station items',
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000
}

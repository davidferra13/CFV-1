'use server'

// Labor Hour Forecasting
// Deterministic formula-based staffing estimates given menu complexity and guest count.
// Formula > AI: all calculations are pure math, no LLM involved.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ServiceStyle =
  | 'plated'
  | 'family_style'
  | 'buffet'
  | 'passed'
  | 'tasting'
  | 'stations'
  | 'cooking_class'
  | 'meal_prep'
  | 'drop_off'

export type MenuComplexity = 'low' | 'medium' | 'high'

export type LaborForecastInput = {
  guestCount: number
  courseCount: number
  serviceStyle: ServiceStyle
  menuComplexity?: MenuComplexity
  hasCocktailHour?: boolean
  hasBarService?: boolean
  isOutdoor?: boolean
}

export type RoleForecast = {
  role: string
  roleLabel: string
  staffCount: number
  hoursEach: number
  totalHours: number
  estimatedCostCents: number
}

export type LaborForecastResult = {
  roles: RoleForecast[]
  totalStaff: number
  totalHours: number
  totalCostCents: number
  confidence: 'low' | 'medium' | 'high'
  notes: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Default hourly rates (cents) used when no staff roster exists
const DEFAULT_RATES: Record<string, number> = {
  kitchen: 2500, // $25/hr
  server: 2000, // $20/hr
  bartender: 2200, // $22/hr
  dishwasher: 1800, // $18/hr
}

// Servers per guest ratio by service style
const SERVERS_PER_GUEST: Record<ServiceStyle, number> = {
  plated: 15,
  family_style: 20,
  buffet: 30,
  passed: 12,
  tasting: 10,
  stations: 25,
  cooking_class: 8,
  meal_prep: 50,
  drop_off: 100,
}

// ─── Forecasting Formula ─────────────────────────────────────────────────────

export function computeLaborForecast(input: LaborForecastInput): LaborForecastResult {
  const {
    guestCount,
    courseCount,
    serviceStyle,
    menuComplexity = 'medium',
    hasCocktailHour = false,
    hasBarService = false,
    isOutdoor = false,
  } = input

  const notes: string[] = []

  // ── Kitchen staff ──
  let kitchenHoursEach = 2 + (guestCount / 40) * courseCount * 0.5 + 1
  const kitchenCount = Math.max(1, Math.ceil(guestCount / 40))

  if (menuComplexity === 'high') {
    kitchenHoursEach *= 1.25
    notes.push('High menu complexity: +25% kitchen hours')
  }
  if (serviceStyle === 'buffet') {
    kitchenHoursEach *= 1.1
    notes.push('Buffet service: +10% kitchen hours')
  }
  if (isOutdoor) {
    kitchenHoursEach += 0.5
    notes.push('Outdoor venue: +0.5h setup for all roles')
  }

  // ── Servers ──
  const serversPerGuest = SERVERS_PER_GUEST[serviceStyle] || 20
  const serverCount = Math.max(1, Math.ceil(guestCount / serversPerGuest))
  let serverHoursEach = 1 + ((guestCount / 20) * 2) / serverCount + 0.5

  // Normalize: base server hours should scale with guest count but not explode
  // The formula gives hours each server works
  serverHoursEach = 1 + 2 + 0.5 // 3.5h base: 1h setup + 2h service + 0.5h cleanup

  if (serviceStyle === 'plated') {
    serverHoursEach *= 1.3
    notes.push('Plated service: +30% server hours')
  }
  if (serviceStyle === 'buffet') {
    serverHoursEach *= 0.8
    notes.push('Buffet service: -20% server hours')
  }
  if (hasCocktailHour) {
    serverHoursEach += 1
    notes.push('Cocktail hour: +1h for servers')
  }
  if (isOutdoor) {
    serverHoursEach += 0.5
  }

  // ── Bartenders ──
  let bartenderCount = 0
  let bartenderHoursEach = 0
  if (hasBarService) {
    bartenderCount = Math.max(1, Math.ceil(guestCount / 50))
    bartenderHoursEach = 1 + 3 + 0.5 // 4.5h: 1h setup + 3h service + 0.5h cleanup
    if (hasCocktailHour) {
      bartenderHoursEach += 1
      notes.push('Cocktail hour: +1h for bartenders')
    }
    if (isOutdoor) {
      bartenderHoursEach += 0.5
    }
  }

  // ── Dishwashers ──
  const dishwasherCount = Math.max(1, Math.ceil(guestCount / 75))
  let dishwasherHoursEach = ((guestCount / 50) * (courseCount * 0.75)) / dishwasherCount + 1
  // Normalize: each dishwasher's hours
  dishwasherHoursEach = Math.max(2, courseCount * 0.75 + 1)
  if (isOutdoor) {
    dishwasherHoursEach += 0.5
  }

  // Round hours to nearest 0.5
  const roundHalf = (n: number) => Math.round(n * 2) / 2

  kitchenHoursEach = roundHalf(kitchenHoursEach)
  serverHoursEach = roundHalf(serverHoursEach)
  bartenderHoursEach = roundHalf(bartenderHoursEach)
  dishwasherHoursEach = roundHalf(dishwasherHoursEach)

  // Build roles array
  const roles: RoleForecast[] = []

  roles.push({
    role: 'kitchen',
    roleLabel: 'Kitchen Staff',
    staffCount: kitchenCount,
    hoursEach: kitchenHoursEach,
    totalHours: kitchenCount * kitchenHoursEach,
    estimatedCostCents: kitchenCount * kitchenHoursEach * DEFAULT_RATES.kitchen,
  })

  if (serverCount > 0 && serviceStyle !== 'drop_off' && serviceStyle !== 'meal_prep') {
    roles.push({
      role: 'server',
      roleLabel: 'Servers',
      staffCount: serverCount,
      hoursEach: serverHoursEach,
      totalHours: serverCount * serverHoursEach,
      estimatedCostCents: serverCount * serverHoursEach * DEFAULT_RATES.server,
    })
  }

  if (bartenderCount > 0) {
    roles.push({
      role: 'bartender',
      roleLabel: 'Bartenders',
      staffCount: bartenderCount,
      hoursEach: bartenderHoursEach,
      totalHours: bartenderCount * bartenderHoursEach,
      estimatedCostCents: bartenderCount * bartenderHoursEach * DEFAULT_RATES.bartender,
    })
  }

  if (dishwasherCount > 0) {
    roles.push({
      role: 'dishwasher',
      roleLabel: 'Dishwashers',
      staffCount: dishwasherCount,
      hoursEach: dishwasherHoursEach,
      totalHours: dishwasherCount * dishwasherHoursEach,
      estimatedCostCents: dishwasherCount * dishwasherHoursEach * DEFAULT_RATES.dishwasher,
    })
  }

  // Totals
  const totalStaff = roles.reduce((s, r) => s + r.staffCount, 0)
  const totalHours = roles.reduce((s, r) => s + r.totalHours, 0)
  const totalCostCents = roles.reduce((s, r) => s + r.estimatedCostCents, 0)

  // Confidence based on how many factors were provided
  let factorsProvided = 2 // guestCount and courseCount are required
  if (menuComplexity !== 'medium') factorsProvided++
  if (hasCocktailHour) factorsProvided++
  if (hasBarService) factorsProvided++
  if (isOutdoor) factorsProvided++

  const confidence: 'low' | 'medium' | 'high' =
    factorsProvided >= 5 ? 'high' : factorsProvided >= 3 ? 'medium' : 'low'

  return {
    roles,
    totalStaff,
    totalHours,
    totalCostCents,
    confidence,
    notes,
  }
}

// ─── Server Action: forecast with actual staff rates ─────────────────────────

export async function forecastLaborHours(input: LaborForecastInput): Promise<LaborForecastResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Start with the deterministic formula
  const result = computeLaborForecast(input)

  // Try to use actual average rates from the chef's staff roster
  try {
    const { data: staffMembers } = await supabase
      .from('staff_members')
      .select('role, hourly_rate_cents')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'active')
      .gt('hourly_rate_cents', 0)

    if (staffMembers && staffMembers.length > 0) {
      // Compute average rate per role category
      const roleRates: Record<string, { total: number; count: number }> = {}
      for (const sm of staffMembers) {
        const category = mapStaffRoleToCategory(sm.role)
        if (!roleRates[category]) roleRates[category] = { total: 0, count: 0 }
        roleRates[category].total += sm.hourly_rate_cents
        roleRates[category].count++
      }

      // Override default rates with actual averages
      for (const role of result.roles) {
        const actual = roleRates[role.role]
        if (actual && actual.count > 0) {
          const avgRate = Math.round(actual.total / actual.count)
          role.estimatedCostCents = role.totalHours * avgRate
        }
      }

      // Recalculate total cost
      result.totalCostCents = result.roles.reduce((s, r) => s + r.estimatedCostCents, 0)
      result.notes.push('Costs based on your staff roster average rates')
    }
  } catch (err) {
    // Non-blocking: fall back to default rates
    console.error('[forecastLaborHours] Could not load staff rates:', err)
  }

  return result
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function mapStaffRoleToCategory(role: string): string {
  switch (role) {
    case 'sous_chef':
    case 'kitchen_assistant':
      return 'kitchen'
    case 'service_staff':
    case 'server':
      return 'server'
    case 'bartender':
      return 'bartender'
    case 'dishwasher':
      return 'dishwasher'
    default:
      return 'kitchen'
  }
}

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

const DEFAULT_RATES: Record<string, number> = {
  kitchen: 2500,
  server: 2000,
  bartender: 2200,
  dishwasher: 1800,
}

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

  const serversPerGuest = SERVERS_PER_GUEST[serviceStyle] || 20
  const serverCount = Math.max(1, Math.ceil(guestCount / serversPerGuest))
  let serverHoursEach = 1 + ((guestCount / 20) * 2) / serverCount + 0.5
  serverHoursEach = 1 + 2 + 0.5

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

  let bartenderCount = 0
  let bartenderHoursEach = 0
  if (hasBarService) {
    bartenderCount = Math.max(1, Math.ceil(guestCount / 50))
    bartenderHoursEach = 1 + 3 + 0.5
    if (hasCocktailHour) {
      bartenderHoursEach += 1
      notes.push('Cocktail hour: +1h for bartenders')
    }
    if (isOutdoor) {
      bartenderHoursEach += 0.5
    }
  }

  const dishwasherCount = Math.max(1, Math.ceil(guestCount / 75))
  let dishwasherHoursEach = ((guestCount / 50) * (courseCount * 0.75)) / dishwasherCount + 1
  dishwasherHoursEach = Math.max(2, courseCount * 0.75 + 1)
  if (isOutdoor) {
    dishwasherHoursEach += 0.5
  }

  const roundHalf = (n: number) => Math.round(n * 2) / 2

  kitchenHoursEach = roundHalf(kitchenHoursEach)
  serverHoursEach = roundHalf(serverHoursEach)
  bartenderHoursEach = roundHalf(bartenderHoursEach)
  dishwasherHoursEach = roundHalf(dishwasherHoursEach)

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

  const totalStaff = roles.reduce((sum, role) => sum + role.staffCount, 0)
  const totalHours = roles.reduce((sum, role) => sum + role.totalHours, 0)
  const totalCostCents = roles.reduce((sum, role) => sum + role.estimatedCostCents, 0)

  let factorsProvided = 2
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

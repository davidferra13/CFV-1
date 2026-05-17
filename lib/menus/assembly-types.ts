// Assembly Types - shared types for dish-level menu assembly
// No DB dependencies, pure type definitions.

export type AssemblyPick = {
  dishId: string
  course: string
  position: number
}

export type AssemblyDishInfo = {
  id: string
  name: string
  course: string
  description: string | null
  dietaryTags: string[]
  allergenFlags: string[]
  timesServed: number
  isSignature: boolean
  seasonAffinity: string[]
  rotationStatus: string
  linkedRecipeId: string | null
}

export type AssemblySuggestion = {
  dish: AssemblyDishInfo
  score: number
  reasons: string[]
}

export type CompatibilityWarning = {
  type: 'allergen_conflict' | 'cuisine_mismatch' | 'off_season' | 'client_repeat' | 'dietary_clash'
  severity: 'info' | 'warning' | 'critical'
  message: string
  dishIds: [string, string] | [string]
}

export type AssemblyContext = {
  selectedDishes: AssemblyDishInfo[]
  filledCourses: string[]
  eventMonth?: number
  clientHistory?: Array<{ dishId: string; eventDate: string | null }>
}

export type AssembleMenuInput = {
  title: string
  description?: string
  eventId?: string
  clientId?: string
  serviceStyle?: 'plated' | 'family_style' | 'buffet' | 'cocktail' | 'tasting_menu' | 'other'
  cuisineType?: string
  targetGuestCount?: number
  season?: 'spring' | 'summer' | 'fall' | 'winter'
  targetDate?: string
  dishes: AssemblyPick[]
}

export type AssemblyResult = {
  success: boolean
  menuId?: string
  menuName?: string
  dishResults?: Array<{
    dishId: string
    menuDishId: string
    courseNumber: number
    courseName: string
  }>
  errors?: string[]
}

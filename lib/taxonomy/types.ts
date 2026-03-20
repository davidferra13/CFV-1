// Taxonomy Extensions - Types
// Defines the shape of taxonomy entries and the supported categories.

export interface TaxonomyEntry {
  value: string
  displayLabel: string
  isSystem: boolean
  isHidden: boolean
  sortOrder: number
  category?: TaxonomyCategory
  metadata?: Record<string, unknown>
  /** Only set for custom (non-system) entries */
  id?: string
}

export type TaxonomyCategory =
  | 'cuisine'
  | 'occasion'
  | 'season'
  | 'meal_type'
  | 'course'
  | 'station'
  | 'inquiry_source'
  | 'menu_type'
  | 'expense_category'
  | 'equipment_category'
  | 'waste_reason'
  | 'sourcing_type'

export const TAXONOMY_CATEGORIES: {
  value: TaxonomyCategory
  label: string
  description: string
}[] = [
  {
    value: 'cuisine',
    label: 'Cuisines',
    description: 'Recipe cuisine types (Italian, French, etc.)',
  },
  {
    value: 'occasion',
    label: 'Occasions',
    description: 'Event occasion types (Wedding, Date Night, etc.)',
  },
  { value: 'season', label: 'Seasons', description: 'Seasonal tags for recipes' },
  {
    value: 'meal_type',
    label: 'Meal Types',
    description: 'Meal categories (Breakfast, Dinner, etc.)',
  },
  { value: 'course', label: 'Courses', description: 'Course types for fire order and menus' },
  { value: 'station', label: 'Kitchen Stations', description: 'Classical brigade stations' },
  { value: 'inquiry_source', label: 'Inquiry Sources', description: 'Where leads come from' },
  {
    value: 'menu_type',
    label: 'Menu/Service Types',
    description: 'Service styles (Plated, Buffet, etc.)',
  },
  {
    value: 'expense_category',
    label: 'Expense Categories',
    description: 'Categories for business expenses',
  },
  {
    value: 'equipment_category',
    label: 'Equipment Categories',
    description: 'Categories for kitchen equipment',
  },
  { value: 'waste_reason', label: 'Waste Reasons', description: 'Reasons for food waste tracking' },
  { value: 'sourcing_type', label: 'Sourcing Types', description: 'Ingredient sourcing methods' },
]

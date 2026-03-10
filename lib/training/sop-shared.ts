export type SOPCategory =
  | 'food_safety'
  | 'opening_closing'
  | 'recipes'
  | 'equipment'
  | 'customer_service'
  | 'cleaning'
  | 'emergency'
  | 'general'

export const SOP_CATEGORY_LABELS: Record<SOPCategory, string> = {
  food_safety: 'Food Safety',
  opening_closing: 'Opening / Closing',
  recipes: 'Recipes',
  equipment: 'Equipment',
  customer_service: 'Customer Service',
  cleaning: 'Cleaning',
  emergency: 'Emergency',
  general: 'General',
}

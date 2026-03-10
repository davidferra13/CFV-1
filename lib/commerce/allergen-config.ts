export const ALLERGENS = [
  { id: 'milk', label: 'Milk', icon: '\u{1F95B}' },
  { id: 'eggs', label: 'Eggs', icon: '\u{1F95A}' },
  { id: 'fish', label: 'Fish', icon: '\u{1F41F}' },
  { id: 'shellfish', label: 'Shellfish', icon: '\u{1F990}' },
  { id: 'tree_nuts', label: 'Tree Nuts', icon: '\u{1F330}' },
  { id: 'peanuts', label: 'Peanuts', icon: '\u{1F95C}' },
  { id: 'wheat', label: 'Wheat', icon: '\u{1F33E}' },
  { id: 'soy', label: 'Soy', icon: '\u{1FA98}' },
  { id: 'sesame', label: 'Sesame', icon: '\u26AA' },
] as const

export const DIETARY_FLAGS = [
  { id: 'vegetarian', label: 'Vegetarian', color: 'bg-green-600' },
  { id: 'vegan', label: 'Vegan', color: 'bg-green-700' },
  { id: 'gluten_free', label: 'Gluten Free', color: 'bg-amber-600' },
  { id: 'dairy_free', label: 'Dairy Free', color: 'bg-blue-600' },
  { id: 'nut_free', label: 'Nut Free', color: 'bg-orange-600' },
  { id: 'keto', label: 'Keto', color: 'bg-purple-600' },
  { id: 'halal', label: 'Halal', color: 'bg-teal-600' },
  { id: 'kosher', label: 'Kosher', color: 'bg-indigo-600' },
] as const

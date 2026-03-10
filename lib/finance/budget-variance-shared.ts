export const BUDGET_CATEGORIES = [
  'food_cost',
  'labor',
  'marketing',
  'equipment',
  'travel',
  'supplies',
  'other',
] as const

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  food_cost: 'Food & Ingredients',
  labor: 'Labor',
  marketing: 'Marketing',
  equipment: 'Equipment',
  travel: 'Travel',
  supplies: 'Supplies',
  other: 'Other',
}

// Expense categorizer constants - no 'use server'
// Separate file so these can be imported by both server actions and client components.
// (Next.js 'use server' files may only export async functions.)

export const EXPENSE_CATEGORIES = [
  'food_cost',
  'supplies',
  'equipment',
  'transport',
  'marketing',
  'professional_services',
  'utilities',
  'insurance',
  'licenses_permits',
  'staff',
  'rent',
  'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food_cost: 'Food Cost',
  supplies: 'Supplies',
  equipment: 'Equipment',
  transport: 'Transport',
  marketing: 'Marketing',
  professional_services: 'Professional Services',
  utilities: 'Utilities',
  insurance: 'Insurance',
  licenses_permits: 'Licenses & Permits',
  staff: 'Staff',
  rent: 'Rent',
  other: 'Other',
}

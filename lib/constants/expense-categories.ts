// Expense Category Constants — single source of truth
// All UI files and Zod schemas import from here.

// Canonical list of all expense category values (as const for Zod literal inference)
export const EXPENSE_CATEGORY_VALUES = [
  'groceries', 'alcohol', 'specialty_items',
  'gas_mileage', 'vehicle',
  'equipment', 'supplies', 'venue_rental', 'labor', 'uniforms',
  'subscriptions', 'marketing', 'insurance_licenses', 'professional_services', 'education', 'utilities',
  'other',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORY_VALUES[number]

type CategoryMeta = { label: string; color: string }

export type ExpenseCategoryGroup = {
  label: string
  categories: {
    value: ExpenseCategory
    label: string
    color: string
  }[]
}

// Flat map — all 17 categories with display metadata
export const EXPENSE_CATEGORIES: Record<ExpenseCategory, CategoryMeta> = {
  // Food & Drink
  groceries:             { label: 'Groceries',             color: 'bg-green-100 text-green-800' },
  alcohol:               { label: 'Alcohol',               color: 'bg-purple-100 text-purple-800' },
  specialty_items:       { label: 'Specialty Items',       color: 'bg-amber-100 text-amber-800' },
  // Travel & Vehicle
  gas_mileage:           { label: 'Gas/Mileage',           color: 'bg-brand-100 text-brand-800' },
  vehicle:               { label: 'Vehicle',               color: 'bg-blue-100 text-blue-800' },
  // Operations
  equipment:             { label: 'Equipment',             color: 'bg-stone-200 text-stone-800' },
  supplies:              { label: 'Supplies',              color: 'bg-cyan-100 text-cyan-800' },
  venue_rental:          { label: 'Venue/Rental',          color: 'bg-rose-100 text-rose-800' },
  labor:                 { label: 'Labor',                 color: 'bg-orange-100 text-orange-800' },
  uniforms:              { label: 'Uniforms',              color: 'bg-indigo-100 text-indigo-800' },
  // Business Overhead
  subscriptions:         { label: 'Subscriptions',         color: 'bg-violet-100 text-violet-800' },
  marketing:             { label: 'Marketing',             color: 'bg-pink-100 text-pink-800' },
  insurance_licenses:    { label: 'Insurance/Licenses',    color: 'bg-teal-100 text-teal-800' },
  professional_services: { label: 'Professional Services', color: 'bg-sky-100 text-sky-800' },
  education:             { label: 'Education',             color: 'bg-lime-100 text-lime-800' },
  utilities:             { label: 'Utilities',             color: 'bg-emerald-100 text-emerald-800' },
  // Catch-all
  other:                 { label: 'Other',                 color: 'bg-stone-100 text-stone-600' },
}

// Grouped structure for filter bars and form dropdowns
export const EXPENSE_CATEGORY_GROUPS: ExpenseCategoryGroup[] = [
  {
    label: 'Food & Drink',
    categories: [
      { value: 'groceries',       ...EXPENSE_CATEGORIES.groceries },
      { value: 'alcohol',         ...EXPENSE_CATEGORIES.alcohol },
      { value: 'specialty_items', ...EXPENSE_CATEGORIES.specialty_items },
    ],
  },
  {
    label: 'Travel & Vehicle',
    categories: [
      { value: 'gas_mileage', ...EXPENSE_CATEGORIES.gas_mileage },
      { value: 'vehicle',     ...EXPENSE_CATEGORIES.vehicle },
    ],
  },
  {
    label: 'Operations',
    categories: [
      { value: 'equipment',    ...EXPENSE_CATEGORIES.equipment },
      { value: 'supplies',     ...EXPENSE_CATEGORIES.supplies },
      { value: 'venue_rental', ...EXPENSE_CATEGORIES.venue_rental },
      { value: 'labor',        ...EXPENSE_CATEGORIES.labor },
      { value: 'uniforms',     ...EXPENSE_CATEGORIES.uniforms },
    ],
  },
  {
    label: 'Business Overhead',
    categories: [
      { value: 'subscriptions',         ...EXPENSE_CATEGORIES.subscriptions },
      { value: 'marketing',             ...EXPENSE_CATEGORIES.marketing },
      { value: 'insurance_licenses',    ...EXPENSE_CATEGORIES.insurance_licenses },
      { value: 'professional_services', ...EXPENSE_CATEGORIES.professional_services },
      { value: 'education',             ...EXPENSE_CATEGORIES.education },
      { value: 'utilities',             ...EXPENSE_CATEGORIES.utilities },
    ],
  },
  {
    label: 'Other',
    categories: [
      { value: 'other', ...EXPENSE_CATEGORIES.other },
    ],
  },
]

// Flat options for simple selects (e.g., import hub)
export const EXPENSE_CATEGORY_OPTIONS = EXPENSE_CATEGORY_VALUES.map(
  (value) => ({ value, label: EXPENSE_CATEGORIES[value].label })
)

// Helper: get label for a category value
export function getCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES[value as ExpenseCategory]?.label ?? value
}

// Helper: get color classes for a category value
export function getCategoryColor(value: string): string {
  return EXPENSE_CATEGORIES[value as ExpenseCategory]?.color ?? EXPENSE_CATEGORIES.other.color
}

import type { GoalType } from '@/lib/goals/types'

const BADGE_CONFIG: Record<GoalType, { label: string; className: string }> = {
  revenue_monthly:  { label: 'Monthly Revenue',  className: 'bg-emerald-100 text-emerald-800' },
  revenue_annual:   { label: 'Annual Revenue',   className: 'bg-emerald-100 text-emerald-800' },
  revenue_custom:   { label: 'Custom Revenue',   className: 'bg-emerald-100 text-emerald-800' },
  booking_count:    { label: 'Bookings',          className: 'bg-blue-100 text-blue-800' },
  new_clients:      { label: 'New Clients',       className: 'bg-violet-100 text-violet-800' },
  recipe_library:   { label: 'Recipe Library',   className: 'bg-amber-100 text-amber-800' },
  profit_margin:    { label: 'Profit Margin',     className: 'bg-teal-100 text-teal-800' },
  expense_ratio:    { label: 'Expense Ratio',     className: 'bg-rose-100 text-rose-800' },
}

export function GoalTypeBadge({ goalType }: { goalType: GoalType }) {
  const { label, className } = BADGE_CONFIG[goalType] ?? {
    label: goalType,
    className: 'bg-stone-100 text-stone-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

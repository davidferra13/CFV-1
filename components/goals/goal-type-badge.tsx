import type { GoalType } from '@/lib/goals/types'

const BADGE_CONFIG: Record<GoalType, { label: string; className: string }> = {
  // Financial
  revenue_monthly: { label: 'Monthly Revenue', className: 'bg-emerald-900 text-emerald-800' },
  revenue_annual: { label: 'Annual Revenue', className: 'bg-emerald-900 text-emerald-800' },
  revenue_custom: { label: 'Custom Revenue', className: 'bg-emerald-900 text-emerald-800' },
  profit_margin: { label: 'Profit Margin', className: 'bg-teal-900 text-teal-800' },
  expense_ratio: { label: 'Expense Ratio', className: 'bg-rose-900 text-rose-800' },
  // Business Growth
  booking_count: { label: 'Bookings', className: 'bg-brand-900 text-brand-800' },
  new_clients: { label: 'New Clients', className: 'bg-violet-900 text-violet-800' },
  repeat_booking_rate: { label: 'Repeat Rate', className: 'bg-brand-900 text-brand-800' },
  referrals_received: { label: 'Referrals', className: 'bg-brand-900 text-brand-800' },
  // Culinary Craft
  dishes_created: { label: 'New Dishes', className: 'bg-orange-900 text-orange-800' },
  cuisines_explored: { label: 'Cuisines', className: 'bg-orange-900 text-orange-800' },
  workshops_attended: { label: 'Workshops', className: 'bg-orange-900 text-orange-800' },
  recipe_library: { label: 'Recipe Library', className: 'bg-amber-900 text-amber-800' },
  // Reputation
  review_average: { label: 'Review Average', className: 'bg-yellow-900 text-yellow-800' },
  total_reviews: { label: 'Total Reviews', className: 'bg-yellow-900 text-yellow-800' },
  // Team & Leadership
  staff_training_hours: { label: 'Training Hours', className: 'bg-purple-900 text-purple-800' },
  vendor_relationships: { label: 'Vendors', className: 'bg-purple-900 text-purple-800' },
  // Learning
  books_read: { label: 'Books Read', className: 'bg-brand-900 text-brand-800' },
  courses_completed: { label: 'Courses', className: 'bg-brand-900 text-brand-800' },
  // Health & Wellbeing
  weekly_workouts: { label: 'Workouts', className: 'bg-rose-900 text-rose-800' },
  rest_days_taken: { label: 'Rest Days', className: 'bg-rose-900 text-rose-800' },
  // Work-Life Balance
  family_dinners: { label: 'Family Dinners', className: 'bg-teal-900 text-teal-800' },
  vacation_days: { label: 'Vacation Days', className: 'bg-teal-900 text-teal-800' },
  // Community
  charity_events: { label: 'Charity Events', className: 'bg-amber-900 text-amber-800' },
  meals_donated: { label: 'Meals Donated', className: 'bg-amber-900 text-amber-800' },
}

export function GoalTypeBadge({ goalType }: { goalType: GoalType }) {
  const { label, className } = BADGE_CONFIG[goalType] ?? {
    label: goalType,
    className: 'bg-stone-800 text-stone-300',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

import type { GoalType } from '@/lib/goals/types'

const BADGE_CONFIG: Record<GoalType, { label: string; className: string }> = {
  // Financial
  revenue_monthly: { label: 'Monthly Revenue', className: 'bg-emerald-900 text-emerald-200' },
  revenue_annual: { label: 'Annual Revenue', className: 'bg-emerald-900 text-emerald-200' },
  revenue_custom: { label: 'Custom Revenue', className: 'bg-emerald-900 text-emerald-200' },
  profit_margin: { label: 'Profit Margin', className: 'bg-teal-900 text-teal-200' },
  expense_ratio: { label: 'Expense Ratio', className: 'bg-rose-900 text-rose-200' },
  // Business Growth
  booking_count: { label: 'Bookings', className: 'bg-blue-900 text-blue-200' },
  new_clients: { label: 'New Clients', className: 'bg-violet-900 text-violet-200' },
  repeat_booking_rate: { label: 'Repeat Rate', className: 'bg-blue-900 text-blue-200' },
  referrals_received: { label: 'Referrals', className: 'bg-blue-900 text-blue-200' },
  // Culinary Craft
  dishes_created: { label: 'New Dishes', className: 'bg-orange-900 text-orange-200' },
  cuisines_explored: { label: 'Cuisines', className: 'bg-orange-900 text-orange-200' },
  workshops_attended: { label: 'Workshops', className: 'bg-orange-900 text-orange-200' },
  recipe_library: { label: 'Recipe Library', className: 'bg-amber-900 text-amber-200' },
  // Reputation
  review_average: { label: 'Review Average', className: 'bg-yellow-900 text-yellow-200' },
  total_reviews: { label: 'Total Reviews', className: 'bg-yellow-900 text-yellow-200' },
  // Team & Leadership
  staff_training_hours: { label: 'Training Hours', className: 'bg-purple-900 text-purple-200' },
  vendor_relationships: { label: 'Vendors', className: 'bg-purple-900 text-purple-200' },
  // Learning
  books_read: { label: 'Books Read', className: 'bg-indigo-900 text-indigo-200' },
  courses_completed: { label: 'Courses', className: 'bg-indigo-900 text-indigo-200' },
  // Health & Wellbeing
  weekly_workouts: { label: 'Workouts', className: 'bg-rose-900 text-rose-200' },
  rest_days_taken: { label: 'Rest Days', className: 'bg-rose-900 text-rose-200' },
  // Work-Life Balance
  family_dinners: { label: 'Family Dinners', className: 'bg-teal-900 text-teal-200' },
  vacation_days: { label: 'Vacation Days', className: 'bg-teal-900 text-teal-200' },
  // Community
  charity_events: { label: 'Charity Events', className: 'bg-amber-900 text-amber-200' },
  meals_donated: { label: 'Meals Donated', className: 'bg-amber-900 text-amber-200' },
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

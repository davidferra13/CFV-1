export interface MealTemplate {
  id: string
  group_id: string
  created_by_profile_id: string
  name: string
  description: string | null
  entries: unknown[]
  created_at: string
  updated_at: string
}

export interface ScheduleChange {
  id: string
  group_id: string
  posted_by_profile_id: string
  change_date: string
  change_type: string
  description: string
  affected_meals: string[]
  acknowledged_by_profile_id: string | null
  acknowledged_at: string | null
  resolved: boolean
  created_at: string
  updated_at: string
  posted_by?: { display_name: string }
}

export interface RecurringMealInput {
  groupId: string
  profileToken: string
  mealType: string
  title: string
  description?: string | null
  dietaryTags?: string[]
  allergenFlags?: string[]
  headCount?: number | null
  prepNotes?: string | null
  pattern: string
  dayOfWeek?: number | null
  activeFrom?: string
  activeUntil?: string | null
}

export interface FeedbackInsight {
  totalMeals: number
  totalFeedback: number
  overallScore: number
  topDishes: { title: string; score: number; count: number }[]
  bottomDishes: { title: string; score: number; count: number }[]
  categoryBreakdown: { category: string; avgScore: number; count: number }[]
  recentTrend: 'improving' | 'stable' | 'declining'
}

export interface MealHistoryEntry {
  title: string
  meal_type: string
  times_served: number
  last_served: string
  avg_score: number
  total_feedback: number
  loved_pct: number
}

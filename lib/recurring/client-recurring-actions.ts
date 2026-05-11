// Client Recurring Actions - View recurring service arrangements

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type ClientRecurringService = {
  id: string
  serviceType: string
  frequency: string
  dayOfWeek: number[] | null
  typicalGuestCount: number | null
  rateCents: number
  startDate: string
  endDate: string | null
  status: 'active' | 'paused' | 'ended'
  notes: string | null
  chefName: string | null
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  weekly_meal_prep: 'Weekly Meal Prep',
  weekly_dinners: 'Weekly Dinners',
  daily_meals: 'Daily Meals',
  biweekly_prep: 'Biweekly Prep',
  other: 'Other',
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
}

export { SERVICE_TYPE_LABELS, FREQUENCY_LABELS }

export async function getMyRecurringServices(): Promise<ClientRecurringService[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('recurring_services')
    .select(
      `
      id, service_type, frequency, day_of_week, typical_guest_count,
      rate_cents, start_date, end_date, status, notes,
      chef:chefs!recurring_services_chef_id_fkey(business_name)
    `
    )
    .eq('client_id', user.entityId)
    .order('status', { ascending: true })
    .order('start_date', { ascending: false })

  if (error) {
    console.error('[getMyRecurringServices] Query failed:', error)
    return []
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    serviceType: r.service_type,
    frequency: r.frequency,
    dayOfWeek: r.day_of_week,
    typicalGuestCount: r.typical_guest_count,
    rateCents: r.rate_cents,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    notes: r.notes,
    chefName: r.chef?.business_name || null,
  }))
}

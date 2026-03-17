import { requireChef } from '@/lib/auth/get-user'
import { verifySurveyToken } from '@/lib/feedback/survey-tokens'
import { createServerClient } from '@/lib/supabase/server'

export async function getSurveyData(token: string) {
  const tokenData = verifySurveyToken(token)
  if (!tokenData) return null

  const supabase = createServerClient({ admin: true })

  const { data: survey } = await supabase
    .from('post_event_surveys')
    .select('id, event_id, completed_at')
    .eq('id', tokenData.surveyId)
    .single()

  if (!survey) return null

  const { data: event } = await supabase
    .from('events')
    .select('occasion, event_date, menu_id')
    .eq('id', survey.event_id)
    .single()

  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', tokenData.tenantId)
    .single()

  let dishes: { id: string; name: string; course_name: string | null }[] = []
  if (event?.menu_id) {
    const { data: menuDishes } = await supabase
      .from('dishes')
      .select('id, name, course_name')
      .eq('menu_id', event.menu_id)
      .order('course_number', { ascending: true })

    dishes = menuDishes ?? []
  }

  return {
    surveyId: survey.id,
    alreadyCompleted: !!survey.completed_at,
    occasion: event?.occasion ?? 'your event',
    eventDate: event?.event_date ?? null,
    chefName: chef?.business_name ?? 'Your Chef',
    dishes,
  }
}

export async function getEventFeedback(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('post_event_surveys')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .maybeSingle()

  if (error) {
    console.error('[surveys] Load failed:', error.message)
    return null
  }

  return data
}

export async function getRecentFeedback(limit = 10) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('post_event_surveys')
    .select(
      `
      *,
      clients (full_name),
      events (occasion, event_date)
    `
    )
    .eq('tenant_id', user.entityId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[surveys] Recent feedback load failed:', error.message)
    return []
  }

  return data ?? []
}

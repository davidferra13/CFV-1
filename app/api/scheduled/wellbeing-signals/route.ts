import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'
import { computeBurnoutLevel } from '@/lib/wellbeing/burnout-score'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'

const SYSTEM_KEYS = {
  burnout: 'wellbeing_burnout_high',
  capacity: 'wellbeing_capacity_limit',
  education: 'wellbeing_no_education',
}

function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function getLocalWeekStart(date: Date): string {
  const day = date.getDay() // 0=Sun, 1=Mon, ...6=Sat
  const offset = day === 0 ? 6 : day - 1 // Monday start
  return localDateISO(new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset))
}

async function handleWellbeingSignals(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startedAt = Date.now()
  try {
    const db = createServerClient({ admin: true }) as any
    const now = new Date()
    const today = localDateISO(now)
    const weekStart = getLocalWeekStart(now)
    const _wsd = weekStart.split('-').map(Number)
    const weekEnd = localDateISO(new Date(_wsd[0], _wsd[1] - 1, _wsd[2] + 6))
    const monthStartStr = localDateISO(new Date(now.getFullYear(), now.getMonth(), 1))
    const monthEndStr = localDateISO(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    const ninetyDaysAgoStr = localDateISO(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
    )

    const { data: chefs } = await db
      .from('chefs')
      .select('id, max_events_per_week, max_events_per_month')
      .limit(10000)

    const chefRows = (chefs ?? []) as Array<{
      id: string
      max_events_per_week: number | null
      max_events_per_month: number | null
    }>
    if (chefRows.length === 0) {
      const emptyResult = {
        processed: 0,
        burnoutNotified: 0,
        capacityNotified: 0,
        educationNotified: 0,
        skipped: 0,
        errors: [],
      }
      await recordCronHeartbeat('wellbeing-signals', emptyResult, Date.now() - startedAt)
      return NextResponse.json(emptyResult)
    }

    const recipientCache = new Map<string, string | null>()
    let burnoutNotified = 0
    let capacityNotified = 0
    let educationNotified = 0
    let skipped = 0
    const errors: string[] = []

    for (const chef of chefRows) {
      try {
        const cached = recipientCache.get(chef.id)
        const recipientId =
          cached !== undefined
            ? cached
            : await getChefAuthUserId(chef.id).then((id) => {
                recipientCache.set(chef.id, id)
                return id
              })

        if (!recipientId) {
          skipped += 1
          continue
        }

        const [
          { count: weekCount },
          { count: monthCount },
          { data: recentEvent },
          { data: checkins },
        ] = await Promise.all([
          db
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', chef.id)
            .gte('event_date', weekStart)
            .lte('event_date', weekEnd)
            .not('status', 'in', '("cancelled","draft")'),
          db
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', chef.id)
            .gte('event_date', monthStartStr)
            .lte('event_date', monthEndStr)
            .not('status', 'in', '("cancelled","draft")'),
          db
            .from('events')
            .select('event_date')
            .eq('tenant_id', chef.id)
            .not('status', 'in', '("cancelled","draft")')
            .order('event_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
          db
            .from('chef_growth_checkins')
            .select('satisfaction_score')
            .eq('tenant_id', chef.id)
            .gte('checkin_date', ninetyDaysAgoStr)
            .not('satisfaction_score', 'is', null),
        ])

        let daysSinceLastDayOff = 0
        if (recentEvent?.event_date) {
          const lastEventDate = new Date(recentEvent.event_date)
          const diffMs = now.getTime() - lastEventDate.getTime()
          daysSinceLastDayOff = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        }

        let avgSatisfactionLast90d: number | null = null
        const scores = ((checkins ?? []) as Array<{ satisfaction_score: number | null }>)
          .map((row) => row.satisfaction_score)
          .filter((value): value is number => typeof value === 'number')
        if (scores.length > 0) {
          avgSatisfactionLast90d = scores.reduce((sum, value) => sum + value, 0) / scores.length
        }

        let daysSinceJournalEntry = 60
        try {
          const { data: journalEntry } = await db
            .from('chef_journey_entries')
            .select('entry_date')
            .eq('tenant_id', chef.id)
            .order('entry_date', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (journalEntry?.entry_date) {
            const lastEntryDate = new Date(journalEntry.entry_date)
            const diffMs = now.getTime() - lastEntryDate.getTime()
            daysSinceJournalEntry = Math.floor(diffMs / (1000 * 60 * 60 * 24))
          }
        } catch {
          daysSinceJournalEntry = 60
        }

        const burnoutLevel = computeBurnoutLevel({
          eventsThisWeek: weekCount ?? 0,
          eventsLastMonth: monthCount ?? 0,
          daysSinceLastDayOff,
          avgSatisfactionLast90d,
          daysSinceJournalEntry,
        })

        if (burnoutLevel === 'high') {
          const { data: existingBurnout } = await db
            .from('notifications')
            .select('id')
            .eq('tenant_id', chef.id)
            .eq('action', 'burnout_risk_high')
            .contains('metadata', {
              system_key: SYSTEM_KEYS.burnout,
              week_start: weekStart,
            })
            .limit(1)

          if ((existingBurnout?.length ?? 0) === 0) {
            await createNotification({
              tenantId: chef.id,
              recipientId,
              category: 'wellbeing',
              action: 'burnout_risk_high',
              title: 'High burnout risk detected',
              body: 'Workload and recovery signals are elevated this week. Protect a recovery day now.',
              actionUrl: '/settings/protection/business-health',
              metadata: {
                system_key: SYSTEM_KEYS.burnout,
                week_start: weekStart,
                events_this_week: weekCount ?? 0,
                events_this_month: monthCount ?? 0,
                days_since_last_day_off: daysSinceLastDayOff,
              },
            })
            burnoutNotified += 1
          } else {
            skipped += 1
          }
        }

        const weeklyLimit = chef.max_events_per_week
        const monthlyLimit = chef.max_events_per_month
        const weeklyRatio = weeklyLimit && weeklyLimit > 0 ? (weekCount ?? 0) / weeklyLimit : 0
        const monthlyRatio = monthlyLimit && monthlyLimit > 0 ? (monthCount ?? 0) / monthlyLimit : 0
        const approachingCapacity = weeklyRatio >= 0.8 || monthlyRatio >= 0.8

        if (approachingCapacity) {
          const useWeek = weeklyRatio >= monthlyRatio
          const periodType = useWeek ? 'week' : 'month'
          const periodStart = useWeek ? weekStart : monthStartStr
          const booked = useWeek ? (weekCount ?? 0) : (monthCount ?? 0)
          const limit = useWeek ? weeklyLimit : monthlyLimit

          const { data: existingCapacity } = await db
            .from('notifications')
            .select('id')
            .eq('tenant_id', chef.id)
            .eq('action', 'capacity_limit_approaching')
            .contains('metadata', {
              system_key: SYSTEM_KEYS.capacity,
              period_type: periodType,
              period_start: periodStart,
            })
            .limit(1)

          if ((existingCapacity?.length ?? 0) === 0) {
            await createNotification({
              tenantId: chef.id,
              recipientId,
              category: 'wellbeing',
              action: 'capacity_limit_approaching',
              title: 'Capacity limit approaching',
              body: `${booked} of ${limit} ${periodType}ly event slots are booked.`,
              actionUrl: '/settings',
              metadata: {
                system_key: SYSTEM_KEYS.capacity,
                period_type: periodType,
                period_start: periodStart,
                booked_events: booked,
                capacity_limit: limit,
              },
            })
            capacityNotified += 1
          } else {
            skipped += 1
          }
        }

        const { count: educationCount } = await db
          .from('professional_achievements')
          .select('id', { count: 'exact', head: true })
          .eq('chef_id', chef.id)
          .in('achieve_type', ['course', 'certification'])
          .gte('achieve_date', ninetyDaysAgoStr)

        if ((educationCount ?? 0) === 0) {
          const cycleMonth = today.slice(0, 7)
          const { data: existingEducation } = await db
            .from('notifications')
            .select('id')
            .eq('tenant_id', chef.id)
            .eq('action', 'no_education_logged_90d')
            .contains('metadata', {
              system_key: SYSTEM_KEYS.education,
              cycle_month: cycleMonth,
            })
            .limit(1)

          if ((existingEducation?.length ?? 0) === 0) {
            await createNotification({
              tenantId: chef.id,
              recipientId,
              category: 'wellbeing',
              action: 'no_education_logged_90d',
              title: 'No education logged in 90 days',
              body: 'Log a course, certification, or training milestone to keep growth momentum visible.',
              actionUrl: '/settings/professional',
              metadata: {
                system_key: SYSTEM_KEYS.education,
                cycle_month: cycleMonth,
                lookback_days: 90,
              },
            })
            educationNotified += 1
          } else {
            skipped += 1
          }
        }
      } catch (err) {
        errors.push(`${chef.id}: ${(err as Error).message}`)
      }
    }

    const result = {
      processed: chefRows.length,
      burnoutNotified,
      capacityNotified,
      educationNotified,
      skipped,
      errors,
    }
    await recordCronHeartbeat('wellbeing-signals', result, Date.now() - startedAt)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await recordCronError('wellbeing-signals', message, Date.now() - startedAt)
    console.error('[wellbeing-signals] Cron failed:', error)
    return NextResponse.json({ error: 'Wellbeing signal sweep failed' }, { status: 500 })
  }
}

export { handleWellbeingSignals as GET, handleWellbeingSignals as POST }

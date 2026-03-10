// Dashboard Caterer Cards - renders caterer-specific widgets
// Only shown when archetype is 'caterer' or 'restaurant'

import {
  getCatererWeekAtAGlance,
  getStaffAvailabilityOverview,
  getWeeklyLaborSummary,
} from '@/lib/dashboard/caterer-dashboard-actions'
import { CatererWeekGlance } from '@/components/dashboard/caterer-week-glance'
import { StaffAvailabilityWidget } from '@/components/dashboard/staff-availability-widget'
import { StatCard } from '@/components/dashboard/widget-cards/stat-card'
import { formatCurrency } from '@/lib/utils/currency'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/CatererCards] ${label} failed:`, err)
    return fallback
  }
}

export async function CatererCards() {
  const [weekData, staffData, laborData] = await Promise.all([
    safe('weekAtAGlance', getCatererWeekAtAGlance, {
      events: [],
      totalRevenueCents: 0,
      totalLaborEstimateCents: 0,
      totalGuests: 0,
      eventCount: 0,
    }),
    safe('staffAvailability', getStaffAvailabilityOverview, []),
    safe('laborSummary', getWeeklyLaborSummary, {
      totalScheduledHours: 0,
      estimatedLaborCostCents: 0,
      byRole: [],
    }),
  ])

  return (
    <>
      {/* Week at a Glance - 2 column wide */}
      <CatererWeekGlance data={weekData} />

      {/* Staff Availability */}
      <StaffAvailabilityWidget staff={staffData} />

      {/* Labor Summary */}
      <StatCard
        widgetId="weekly_labor"
        title="Weekly Labor"
        value={`${laborData.totalScheduledHours}h`}
        subtitle={`Est. cost: ${formatCurrency(laborData.estimatedLaborCostCents)}`}
        trend={
          laborData.byRole.length > 0
            ? laborData.byRole.map((r) => `${r.count} ${r.role}`).join(', ')
            : 'No staff assigned'
        }
        trendDirection={laborData.totalScheduledHours > 0 ? 'flat' : 'down'}
        href="/staff"
      />
    </>
  )
}

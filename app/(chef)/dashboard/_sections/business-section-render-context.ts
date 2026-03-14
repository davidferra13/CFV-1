import type { DashboardWidgetId } from '@/lib/scheduling/types'
import type { loadBusinessSectionData } from './business-section-loader'
import type { buildBusinessSectionMetrics } from './business-section-metrics'

type BusinessSectionData = Awaited<ReturnType<typeof loadBusinessSectionData>>
type BusinessSectionMetrics = ReturnType<typeof buildBusinessSectionMetrics>

interface BusinessSectionRenderHelpers {
  currentMonthName: string
  getWidgetOrder: (id: DashboardWidgetId) => number
  isWidgetEnabled: (id: DashboardWidgetId) => boolean
  userTenantId: string
}

export type BusinessSectionRenderContext = BusinessSectionData &
  BusinessSectionMetrics &
  BusinessSectionRenderHelpers

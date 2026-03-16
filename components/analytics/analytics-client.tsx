// Analytics Client Wrapper - Renders charts (must be 'use client' for Recharts)
'use client'

import { Card } from '@/components/ui/card'
import {
  SourceDistributionChart,
  ConversionFunnelChart,
  RevenueBySourceChart,
  SourceTrendsChart,
} from './source-charts'

export function AnalyticsClient({
  distribution,
  conversions,
  revenue,
  trends,
  trendSources,
}: {
  distribution: { name: string; count: number }[]
  conversions: { name: string; inquiries: number; confirmed: number; completed: number }[]
  revenue: { name: string; revenue_cents: number }[]
  trends: { month: string; [key: string]: string | number }[]
  trendSources: string[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Source Distribution */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Inquiry Sources</h2>
        <p className="text-xs text-stone-400 mb-3">Where are your inquiries coming from?</p>
        <SourceDistributionChart data={distribution} />
      </Card>

      {/* Conversion Funnel */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Conversion by Source</h2>
        <p className="text-xs text-stone-400 mb-3">How each source converts through the pipeline</p>
        <ConversionFunnelChart data={conversions} />
      </Card>

      {/* Revenue by Source */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Revenue by Source</h2>
        <p className="text-xs text-stone-400 mb-3">
          Total revenue from completed events by inquiry source
        </p>
        <RevenueBySourceChart data={revenue} />
      </Card>

      {/* Trends Over Time */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Source Trends</h2>
        <p className="text-xs text-stone-400 mb-3">
          Monthly inquiry count by top sources (last 12 months)
        </p>
        <SourceTrendsChart data={trends} sources={trendSources} />
      </Card>
    </div>
  )
}

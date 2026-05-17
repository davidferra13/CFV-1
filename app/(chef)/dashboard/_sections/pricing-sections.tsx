// Dashboard Pricing Sections - weekly briefing, trend alerts, pie attention, price glance,
// coverage health, openclaw live alerts, pipeline status badge.
// Self-contained server components moved from page.tsx during decomposition.

import { getWeeklyPriceBriefing } from '@/lib/openclaw/weekly-briefing-actions'
import { WeeklyBriefingCard } from '@/components/pricing/weekly-briefing-card'
import { PriceTrendAlerts } from '@/components/pricing/price-trend-alerts'
import { getTrendAlerts } from '@/lib/pricing/trend-alerts-actions'
import { getPieAttentionItems } from '@/lib/pricing/pie-attention-actions'
import { PieAttentionList } from '@/components/dashboard/pie-attention-card'
import { isAdmin } from '@/lib/auth/admin'
import { CoverageHealthWidget } from '@/components/pricing/coverage-health-widget'
import { OpenClawLiveAlerts } from '@/components/pricing/openclaw-live-alerts'
import { PipelineStatusBadge } from '@/components/pricing/pipeline-status-badge'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/Pricing] ${label} failed:`, err)
    return fallback
  }
}

export async function WeeklyBriefingSection() {
  const briefing = await safe('weeklyBriefing', getWeeklyPriceBriefing, null)
  if (!briefing) return null
  return <WeeklyBriefingCard briefing={briefing} />
}

export async function PriceTrendAlertsSection() {
  const alerts = await safe('trendAlerts', getTrendAlerts, [])
  if (alerts.length === 0) return null
  return <PriceTrendAlerts alerts={alerts} />
}

export async function PieAttentionSection() {
  const items = await safe('pieAttention', getPieAttentionItems, [])
  if (items.length === 0) return null
  return <PieAttentionList items={items} />
}

/** Compact pricing glance for the Focus section (always visible, not collapsed). */
export async function PriceGlanceSection() {
  const alerts = await safe('trendAlerts', getTrendAlerts, [])
  if (alerts.length === 0) return null

  const rising = alerts.filter((a: any) => a.direction === 'rising')
  const falling = alerts.filter((a: any) => a.direction === 'falling')

  const topThreat = rising[0]
  const topOpp = falling[0]

  if (!topThreat && !topOpp) return null

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="text-stone-500 font-medium uppercase tracking-wide">Prices</span>
      {topThreat && (
        <span className="inline-flex items-center gap-1 bg-red-950/30 border border-red-900/30 rounded-full px-2.5 py-1">
          <span className="text-red-400">{'↑'}</span>
          <span className="text-stone-300">{topThreat.ingredientName}</span>
          <span className="text-red-400">+{topThreat.changePct.toFixed(0)}%</span>
        </span>
      )}
      {topOpp && (
        <span className="inline-flex items-center gap-1 bg-emerald-950/30 border border-emerald-900/30 rounded-full px-2.5 py-1">
          <span className="text-emerald-400">{'↓'}</span>
          <span className="text-stone-300">{topOpp.ingredientName}</span>
          <span className="text-emerald-400">{topOpp.changePct.toFixed(0)}%</span>
        </span>
      )}
      {rising.length > 1 && (
        <a
          href="/culinary/costing"
          className="text-stone-500 hover:text-stone-300 transition-colors"
        >
          +{rising.length - 1} more rising
        </a>
      )}
    </div>
  )
}

export async function CoverageHealthSection() {
  const admin = await safe('isAdmin', isAdmin, false)
  if (!admin) return null
  return (
    <section>
      <div className="section-label mb-4">Price Coverage</div>
      <CoverageHealthWidget />
    </section>
  )
}

/** SSE subscriber for OpenClaw alerts (admin-only, renders nothing visible). */
export async function OpenClawLiveAlertsSection() {
  const admin = await safe('isAdmin', isAdmin, false)
  if (!admin) return null
  return <OpenClawLiveAlerts />
}

/** Pipeline status badge (admin-only). */
export async function PipelineStatusSection() {
  const admin = await safe('isAdmin', isAdmin, false)
  if (!admin) return null
  return <PipelineStatusBadge />
}

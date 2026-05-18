// Commitment Insights Analytics Card
// Surfaces override patterns: frequency, top categories, trend over time.
// Server component following IntelligenceCards / CilSignalSummary pattern.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  WidgetCardShell,
  WidgetCardEmpty,
} from '@/components/dashboard/widget-cards/widget-card-shell'
import { Badge } from '@/components/ui/badge'
import {
  DOMAIN_LABELS,
  OVERRIDE_CATEGORY_LABELS,
  type CommitmentDomain,
  type OverrideCategory,
} from '@/lib/commitment/types'
import { classifyOverrideReason } from '@/lib/commitment/override-taxonomy'

interface OverrideRow {
  id: string
  commitment_id: string
  category: string | null
  reason: string
  created_at: string
}

interface CommitmentRow {
  id: string
  domain: string
  override_count: number
  current_streak: number
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/CommitmentInsights] ${label} failed:`, err)
    return fallback
  }
}

export async function CommitmentInsightsCard() {
  const user = await safe('auth', () => requireChef(), null)
  if (!user?.tenantId) return null

  const tenantId = user.tenantId
  const client = createServerClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: commitmentRows }, { data: overrideRows90 }] = await Promise.all([
    client
      .from('commitments' as any)
      .select('id, domain, override_count, current_streak')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    client
      .from('commitment_overrides' as any)
      .select('id, commitment_id, category, reason, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: false }),
  ])

  const commitments = (commitmentRows ?? []) as CommitmentRow[]
  const overrides = (overrideRows90 ?? []) as OverrideRow[]

  if (commitments.length === 0) {
    return (
      <WidgetCardShell widgetId="commitment_insights" title="Commitment Insights" size="md">
        <WidgetCardEmpty
          message="No active commitments yet"
          actionLabel="Set up commitments"
          actionHref="/settings/commitments"
        />
      </WidgetCardShell>
    )
  }

  // Build commitment domain map
  const domainMap = new Map<string, CommitmentDomain>()
  for (const c of commitments) {
    domainMap.set(c.id, c.domain as CommitmentDomain)
  }

  // Compute override stats
  const totalOverrides90 = overrides.length
  const overrides30 = overrides.filter((o) => o.created_at >= thirtyDaysAgo)
  const overridesPrev30 = overrides.filter(
    (o) => o.created_at >= sixtyDaysAgo && o.created_at < thirtyDaysAgo
  )

  // Trend
  type TrendDirection = 'improving' | 'stable' | 'declining'
  let trend: TrendDirection = 'stable'
  if (overrides30.length < overridesPrev30.length) trend = 'improving'
  else if (overrides30.length > overridesPrev30.length) trend = 'declining'

  // Category breakdown (classify uncategorized overrides using taxonomy)
  const categoryCounts = new Map<OverrideCategory, number>()
  for (const o of overrides) {
    const cat: OverrideCategory =
      (o.category as OverrideCategory) || classifyOverrideReason(o.reason)
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)
  }

  const topCategories = [...categoryCounts.entries()].sort(([, a], [, b]) => b - a).slice(0, 4)

  // Domain breakdown (which domains get overridden most)
  const domainCounts = new Map<CommitmentDomain, number>()
  for (const o of overrides) {
    const domain = domainMap.get(o.commitment_id)
    if (domain) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1)
    }
  }

  const topDomains = [...domainCounts.entries()].sort(([, a], [, b]) => b - a).slice(0, 3)

  // Integrity score (simple: days without override / 90)
  const uniqueOverrideDays = new Set(overrides.map((o) => o.created_at.slice(0, 10))).size
  const integrityScore = Math.max(0, Math.round((1 - uniqueOverrideDays / 90) * 100))

  // Best active streaks
  const topStreaks = [...commitments]
    .filter((c) => c.current_streak > 0)
    .sort((a, b) => b.current_streak - a.current_streak)
    .slice(0, 3)

  const scoreColor = integrityScore >= 80 ? '#4ade80' : integrityScore >= 60 ? '#fbbf24' : '#f87171'

  const trendIcon = trend === 'improving' ? '▲' : trend === 'declining' ? '▼' : '▔'
  const trendColor =
    trend === 'improving'
      ? 'text-emerald-500'
      : trend === 'declining'
        ? 'text-red-500'
        : 'text-stone-400'

  return (
    <WidgetCardShell
      widgetId="commitment_insights"
      title="Commitment Insights"
      size="md"
      href="/settings/commitments"
    >
      <div className="space-y-3">
        {/* Top row: integrity score + override count + trend */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 shrink-0"
            style={{
              color: scoreColor,
              borderColor: `${scoreColor}40`,
              backgroundColor: `${scoreColor}15`,
            }}
          >
            {integrityScore}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-stone-300 font-medium">
                {overrides30.length} override{overrides30.length !== 1 ? 's' : ''} (30d)
              </span>
              <span className={`text-xs ${trendColor}`}>{trendIcon}</span>
            </div>
            <p className="text-xs text-stone-500">{totalOverrides90} total in 90 days</p>
          </div>
        </div>

        {/* Top override categories */}
        {topCategories.length > 0 && (
          <div className="space-y-1">
            <p className="text-xxs font-bold text-stone-500 uppercase tracking-wider">
              Top Reasons
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topCategories.map(([cat, count]) => (
                <Badge
                  key={cat}
                  variant={count >= 5 ? 'error' : count >= 3 ? 'warning' : 'default'}
                >
                  {OVERRIDE_CATEGORY_LABELS[cat]} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Most overridden domains */}
        {topDomains.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span className="text-stone-500">Hot spots:</span>
            {topDomains.map(([domain, count]) => (
              <span key={domain}>
                {DOMAIN_LABELS[domain]} ({count})
              </span>
            ))}
          </div>
        )}

        {/* Active streaks */}
        {topStreaks.length > 0 && (
          <div className="border-t border-stone-800 pt-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-stone-500">Streaks:</span>
              {topStreaks.map((c) => (
                <span key={c.id} className="text-emerald-400 font-medium">
                  {DOMAIN_LABELS[c.domain as CommitmentDomain]} {c.current_streak}d
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty overrides state */}
        {totalOverrides90 === 0 && (
          <p className="text-xs text-emerald-400 italic">
            No overrides in 90 days. Your commitments are holding strong.
          </p>
        )}
      </div>
    </WidgetCardShell>
  )
}

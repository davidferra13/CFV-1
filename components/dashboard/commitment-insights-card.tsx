import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import {
  DOMAIN_LABELS,
  DOMAIN_SEVERITY_ORDER,
  type Commitment,
  type CommitmentDomain,
  type CommitmentOverride,
} from '@/lib/commitment/types'

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    source: row.source,
    rule: row.rule,
    status: row.status,
    frictionLevel: row.friction_level,
    overrideCount: row.override_count,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    futureSelfletter: row.future_self_letter,
    seasonalProfile: row.seasonal_profile,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapOverrideRow(row: any): CommitmentOverride {
  return {
    id: row.id,
    commitmentId: row.commitment_id,
    tenantId: row.tenant_id,
    category: row.category,
    reason: row.reason,
    frictionTierAtOverride: row.friction_tier_at_override,
    regretPrediction: row.regret_prediction,
    context: row.context,
    createdAt: new Date(row.created_at),
  }
}

const DOMAIN_WEIGHTS: Partial<Record<CommitmentDomain, number>> = {
  dietary: 3,
  contingency: 2,
}

function scoreBadgeVariant(score: number): 'success' | 'warning' | 'error' {
  if (score >= 90) return 'success'
  if (score >= 70) return 'warning'
  return 'error'
}

function trendLabel(recent: number, prior: number): string {
  if (recent < prior) return 'Improving'
  if (recent > prior) return 'Declining'
  return 'Stable'
}

function trendColor(recent: number, prior: number): string {
  if (recent < prior) return 'text-emerald-500'
  if (recent > prior) return 'text-red-500'
  return 'text-stone-400'
}

/**
 * Compact commitment insights widget for the dashboard.
 * Shows: integrity score, domain health summary, recent override count.
 */
export async function CommitmentInsightsCard() {
  let user
  try {
    user = await requireChef()
  } catch {
    return null
  }
  const tenantId = user.tenantId!
  const client = createServerClient()

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: commitmentRows }, { data: overrideRows90 }] = await Promise.all([
    client
      .from('commitments' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    client
      .from('commitment_overrides' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', ninetyDaysAgo),
  ])

  const commitments = (commitmentRows ?? []).map(mapCommitmentRow)
  const allOverrides = (overrideRows90 ?? []).map(mapOverrideRow)

  // No commitments yet: show onboarding prompt
  if (commitments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Commitment Integrity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active commitments. Set your first commitment to start tracking your operational
            integrity.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Compute overall integrity score (weighted by domain severity)
  const commitmentsByDomain = new Map<CommitmentDomain, string[]>()
  for (const c of commitments) {
    const ids = commitmentsByDomain.get(c.domain) ?? []
    ids.push(c.id)
    commitmentsByDomain.set(c.domain, ids)
  }

  let weightedSum = 0
  let totalWeight = 0
  const domainHealth: Array<{ domain: CommitmentDomain; score: number; count: number }> = []

  for (const [domain, ids] of commitmentsByDomain) {
    const idSet = new Set(ids)
    const domainOverrides = allOverrides.filter((o: CommitmentOverride) =>
      idSet.has(o.commitmentId)
    )
    const uniqueDays = new Set(
      domainOverrides.map((o: CommitmentOverride) => o.createdAt.toISOString().slice(0, 10))
    )
    const score = Math.max(0, Math.round((1 - uniqueDays.size / 90) * 100))
    const weight = DOMAIN_WEIGHTS[domain] ?? 1
    weightedSum += score * weight
    totalWeight += weight
    domainHealth.push({ domain, score, count: ids.length })
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100

  // Trend: last 30 vs previous 30
  const recentOverrides = allOverrides.filter(
    (o: CommitmentOverride) => o.createdAt.getTime() > new Date(thirtyDaysAgo).getTime()
  ).length
  const priorOverrides = allOverrides.filter(
    (o: CommitmentOverride) =>
      o.createdAt.getTime() > new Date(sixtyDaysAgo).getTime() &&
      o.createdAt.getTime() <= new Date(thirtyDaysAgo).getTime()
  ).length

  // Sort domains by severity order
  domainHealth.sort(
    (a, b) => DOMAIN_SEVERITY_ORDER.indexOf(a.domain) - DOMAIN_SEVERITY_ORDER.indexOf(b.domain)
  )

  return (
    <Link href="/analytics/commitments" className="block">
      <Card interactive className="hover:border-primary/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Commitment Integrity</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${trendColor(recentOverrides, priorOverrides)}`}>
                {trendLabel(recentOverrides, priorOverrides)}
              </span>
              <Badge variant={scoreBadgeVariant(overallScore)}>{overallScore}/100</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Domain health grid (compact) */}
            <div className="grid grid-cols-2 gap-1.5">
              {domainHealth.slice(0, 6).map(({ domain, score, count }) => {
                const variant = scoreBadgeVariant(score)
                const dotColor =
                  variant === 'success'
                    ? 'bg-emerald-500'
                    : variant === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                return (
                  <div key={domain} className="flex items-center gap-1.5 text-xs">
                    <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                    <span className="text-muted-foreground truncate">{DOMAIN_LABELS[domain]}</span>
                    <span className="ml-auto font-medium tabular-nums">{score}%</span>
                  </div>
                )
              })}
            </div>

            {/* Recent overrides summary */}
            {recentOverrides > 0 && (
              <p className="text-xs text-muted-foreground">
                {recentOverrides} override{recentOverrides !== 1 ? 's' : ''} in the last 30 days
              </p>
            )}
            {recentOverrides === 0 && (
              <p className="text-xs text-emerald-600">Clean record for the last 30 days</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

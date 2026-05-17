import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import {
  DOMAIN_LABELS,
  DOMAIN_SEVERITY_ORDER,
  OVERRIDE_CATEGORY_LABELS,
  type Commitment,
  type CommitmentDomain,
  type CommitmentOverride,
  type OverrideCategory,
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

function computeDomainScore(
  domain: CommitmentDomain,
  overrides: CommitmentOverride[],
  commitmentIds: Set<string>
): number {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
  const domainOverrides = overrides.filter(
    (o) => commitmentIds.has(o.commitmentId) && o.createdAt.getTime() > ninetyDaysAgo
  )
  const uniqueDays = new Set(domainOverrides.map((o) => o.createdAt.toISOString().slice(0, 10)))
  return Math.max(0, Math.round((1 - uniqueDays.size / 90) * 100))
}

function computeOverallScore(domainScores: Partial<Record<CommitmentDomain, number>>): number {
  let totalWeight = 0
  let weightedSum = 0
  for (const [domain, score] of Object.entries(domainScores)) {
    const w = DOMAIN_WEIGHTS[domain as CommitmentDomain] ?? 1
    totalWeight += w
    weightedSum += score * w
  }
  if (totalWeight === 0) return 100
  return Math.round(weightedSum / totalWeight)
}

function scoreBadgeVariant(score: number): 'success' | 'warning' | 'error' {
  if (score >= 90) return 'success'
  if (score >= 70) return 'warning'
  return 'error'
}

function TrendArrow({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  if (trend === 'improving') return <span className="text-emerald-500">&#9650;</span>
  if (trend === 'declining') return <span className="text-red-500">&#9660;</span>
  return <span className="text-stone-400">&#9644;</span>
}

function computeTrend(overrides: CommitmentOverride[]): 'improving' | 'stable' | 'declining' {
  const now = Date.now()
  const thirtyAgo = now - 30 * 24 * 60 * 60 * 1000
  const sixtyAgo = now - 60 * 24 * 60 * 60 * 1000
  const recent = overrides.filter((o) => o.createdAt.getTime() > thirtyAgo).length
  const prior = overrides.filter(
    (o) => o.createdAt.getTime() > sixtyAgo && o.createdAt.getTime() <= thirtyAgo
  ).length
  if (recent < prior) return 'improving'
  if (recent > prior) return 'declining'
  return 'stable'
}

type PressureLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'

function computePressure(overrides: CommitmentOverride[]): {
  level: PressureLevel
  count: number
} {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const count = overrides.filter((o) => o.createdAt.getTime() > sevenDaysAgo).length
  let level: PressureLevel = 'LOW'
  if (count >= 5) level = 'CRITICAL'
  else if (count >= 3) level = 'HIGH'
  else if (count >= 1) level = 'MODERATE'
  return { level, count }
}

const PRESSURE_VARIANTS: Record<PressureLevel, 'success' | 'warning' | 'error'> = {
  LOW: 'success',
  MODERATE: 'warning',
  HIGH: 'error',
  CRITICAL: 'error',
}

export async function CommitmentCockpit() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const client = createServerClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: commitmentRows }, { data: recentOverrideRows }, { data: allOverrideRows }] =
    await Promise.all([
      client
        .from('commitments' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),
      client
        .from('commitment_overrides' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(5),
      client
        .from('commitment_overrides' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', ninetyDaysAgo),
    ])

  const commitments = (commitmentRows ?? []).map(mapCommitmentRow)
  const recentOverrides = (recentOverrideRows ?? []).map(mapOverrideRow)
  const allOverrides = (allOverrideRows ?? []).map(mapOverrideRow)

  if (commitments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commitment Health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            No active commitments yet. Create your first commitment to start tracking integrity.
          </p>
        </CardContent>
      </Card>
    )
  }

  const commitmentsByDomain = new Map<CommitmentDomain, Commitment[]>()
  for (const c of commitments) {
    const list = commitmentsByDomain.get(c.domain) ?? []
    list.push(c)
    commitmentsByDomain.set(c.domain, list)
  }

  const domainScores: Partial<Record<CommitmentDomain, number>> = {}
  for (const [domain, domainCommitments] of commitmentsByDomain) {
    const ids = new Set(domainCommitments.map((c) => c.id))
    domainScores[domain] = computeDomainScore(domain, allOverrides, ids)
  }

  const overallScore = computeOverallScore(domainScores)
  const trend = computeTrend(allOverrides)
  const pressure = computePressure(allOverrides)

  const topStreaks = [...commitments]
    .filter((c) => c.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 5)

  const activeDomains = DOMAIN_SEVERITY_ORDER.filter((d) => commitmentsByDomain.has(d))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Commitment Health</span>
            <div className="flex items-center gap-2">
              <TrendArrow trend={trend} />
              <Badge variant={scoreBadgeVariant(overallScore)}>{overallScore}/100</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Domain Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeDomains.map((domain) => {
              const domainCommitments = commitmentsByDomain.get(domain)!
              const score = domainScores[domain] ?? 100
              const thirtyDayOverrides = recentOverrides.filter((o: CommitmentOverride) =>
                domainCommitments.some((c: Commitment) => c.id === o.commitmentId)
              ).length
              const bestStreak = Math.max(...domainCommitments.map((c) => c.longestStreak), 0)
              const variant = scoreBadgeVariant(score)
              const stripeColor =
                variant === 'success'
                  ? 'border-l-emerald-500'
                  : variant === 'warning'
                    ? 'border-l-amber-500'
                    : 'border-l-red-500'

              return (
                <div
                  key={domain}
                  className={`rounded-lg border border-l-4 ${stripeColor} p-3 space-y-1`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{DOMAIN_LABELS[domain]}</span>
                    <Badge variant={variant} className="text-xs">
                      {score}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                    <div>
                      <span className="block font-medium text-foreground">
                        {domainCommitments.length}
                      </span>
                      active
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">{bestStreak}d</span>
                      best streak
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">
                        {thirtyDayOverrides}
                      </span>
                      30d overrides
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Streaks */}
          {topStreaks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Active Streaks</h3>
              <div className="space-y-1">
                {topStreaks.map((c: Commitment) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <Badge variant="default">{DOMAIN_LABELS[c.domain]}</Badge>
                    <span className="font-medium">{c.currentStreak} days</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Overrides */}
          {recentOverrides.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Recent Overrides</h3>
              <div className="space-y-2">
                {recentOverrides.map((o: CommitmentOverride) => {
                  const matched: Commitment | undefined = commitments.find(
                    (c: Commitment) => c.id === o.commitmentId
                  )
                  const domainLabel = matched
                    ? DOMAIN_LABELS[matched.domain as CommitmentDomain]
                    : null
                  const categoryLabel = o.category
                    ? OVERRIDE_CATEGORY_LABELS[o.category as OverrideCategory]
                    : o.reason.slice(0, 40)
                  return (
                    <div
                      key={o.id}
                      className="flex items-center justify-between text-sm border-b pb-1"
                    >
                      <div className="flex items-center gap-2">
                        {domainLabel && <Badge variant="default">{domainLabel}</Badge>}
                        <span className="text-muted-foreground">{categoryLabel}</span>
                      </div>
                      <Badge
                        variant={
                          o.frictionTierAtOverride >= 4
                            ? 'error'
                            : o.frictionTierAtOverride >= 3
                              ? 'warning'
                              : 'default'
                        }
                      >
                        Tier {o.frictionTierAtOverride}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Commitment Weather */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <span className="text-sm font-medium">Commitment Weather</span>
              <p className="text-xs text-muted-foreground">
                {pressure.count} override{pressure.count !== 1 ? 's' : ''} in the last 7 days
              </p>
            </div>
            <Badge variant={PRESSURE_VARIANTS[pressure.level]}>{pressure.level}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

const GATE_LABELS: Record<string, string> = {
  prep_timeline: 'Prep Timeline',
  dietary_constraints: 'Dietary Constraints',
  arrival_logistics: 'Arrival Logistics',
  service_plan_flow: 'Service Plan',
  packing_list: 'Packing List',
}

interface CommitmentInsights {
  totalOverrides: number
  priorPeriodOverrides: number
  trendPercent: number
  trendDirection: 'up' | 'down' | 'flat'
  mostOverriddenGate: { gate: string; count: number } | null
  timePressureCount: number
  avgConfidence: number | null
  menuUnlockCount: number
}

async function getCommitmentInsights(): Promise<CommitmentInsights | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const now = Date.now()
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()
  const oneEightyDaysAgo = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Current period overrides (last 90 days)
  const { data: currentOverrides } = await db
    .from('event_readiness_gates')
    .select('gate, metadata, event_id, resolved_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'overridden')
    .gte('resolved_at', ninetyDaysAgo)

  // 2. Prior period overrides (90-180 days ago)
  const { data: priorOverrides } = await db
    .from('event_readiness_gates')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'overridden')
    .gte('resolved_at', oneEightyDaysAgo)
    .lte('resolved_at', ninetyDaysAgo)

  // 3. Menu unlocks (last 30 days)
  const { data: unlocks } = await db
    .from('menu_state_transitions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('from_status', 'locked')
    .eq('to_status', 'draft')
    .gte('transitioned_at', thirtyDaysAgo)

  const totalOverrides = currentOverrides?.length ?? 0
  const priorPeriodOverrides = priorOverrides?.length ?? 0

  if (totalOverrides === 0 && priorPeriodOverrides === 0 && (!unlocks || unlocks.length === 0)) {
    return null
  }

  // Most overridden gate
  const gateCounts = new Map<string, number>()
  for (const row of currentOverrides ?? []) {
    gateCounts.set(row.gate, (gateCounts.get(row.gate) || 0) + 1)
  }
  let mostOverriddenGate: { gate: string; count: number } | null = null
  for (const [gate, count] of gateCounts) {
    if (!mostOverriddenGate || count > mostOverriddenGate.count) {
      mostOverriddenGate = { gate, count }
    }
  }

  // Time-pressure overrides (within 48hrs of event)
  let timePressureCount = 0
  if (currentOverrides && currentOverrides.length > 0) {
    const eventIds = [...new Set(currentOverrides.map((o: any) => o.event_id))]
    const { data: events } = await db.from('events').select('id, event_date').in('id', eventIds)

    if (events) {
      const eventDateMap = new Map<string, string>()
      for (const e of events) {
        if (e.event_date) eventDateMap.set(e.id, e.event_date)
      }

      for (const override of currentOverrides) {
        const eventDate = eventDateMap.get(override.event_id)
        if (!eventDate || !override.resolved_at) continue
        const eventMs = new Date(eventDate).getTime()
        const overrideMs = new Date(override.resolved_at).getTime()
        const hoursBeforeEvent = (eventMs - overrideMs) / (60 * 60 * 1000)
        if (hoursBeforeEvent >= 0 && hoursBeforeEvent < 48) {
          timePressureCount++
        }
      }
    }
  }

  // Average confidence at override time
  const confidences: number[] = []
  for (const row of currentOverrides ?? []) {
    const meta = row.metadata as Record<string, unknown> | null
    if (meta && typeof meta.confidence === 'number') {
      confidences.push(meta.confidence)
    }
  }
  const avgConfidence =
    confidences.length > 0 ? confidences.reduce((s, c) => s + c, 0) / confidences.length : null

  // Trend calculation
  let trendPercent = 0
  let trendDirection: 'up' | 'down' | 'flat' = 'flat'
  if (priorPeriodOverrides > 0) {
    trendPercent = Math.round(
      ((totalOverrides - priorPeriodOverrides) / priorPeriodOverrides) * 100
    )
    trendDirection = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'flat'
  } else if (totalOverrides > 0) {
    trendDirection = 'up'
    trendPercent = 100
  }

  return {
    totalOverrides,
    priorPeriodOverrides,
    trendPercent,
    trendDirection,
    mostOverriddenGate,
    timePressureCount,
    avgConfidence,
    menuUnlockCount: unlocks?.length ?? 0,
  }
}

export async function CommitmentInsightsCard() {
  const insights = await getCommitmentInsights().catch(() => null)

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commitment Insights</CardTitle>
          <CardDescription>Override patterns and readiness gate discipline</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            No override or menu unlock data yet
          </p>
        </CardContent>
      </Card>
    )
  }

  const confidencePercent = insights.avgConfidence ? Math.round(insights.avgConfidence * 100) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Commitment Insights
          <Badge
            variant={
              insights.trendDirection === 'down'
                ? 'success'
                : insights.trendDirection === 'up'
                  ? 'warning'
                  : 'default'
            }
          >
            {insights.trendDirection === 'flat'
              ? 'stable'
              : `${insights.trendDirection === 'up' ? '+' : ''}${insights.trendPercent}%`}
          </Badge>
        </CardTitle>
        <CardDescription>
          Override patterns and readiness gate discipline (last 90 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Total overrides:</span>
              <p className="font-semibold">{insights.totalOverrides}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Time-pressure:</span>
              <p
                className={`font-semibold ${insights.timePressureCount > 0 ? 'text-amber-600' : ''}`}
              >
                {insights.timePressureCount}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Menu unlocks (30d):</span>
              <p className="font-semibold">{insights.menuUnlockCount}</p>
            </div>
          </div>

          {insights.mostOverriddenGate && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="text-muted-foreground">Most overridden gate:</p>
              <p className="font-medium">
                {GATE_LABELS[insights.mostOverriddenGate.gate] || insights.mostOverriddenGate.gate}
                <span className="text-muted-foreground ml-2">
                  ({insights.mostOverriddenGate.count} times)
                </span>
              </p>
            </div>
          )}

          {confidencePercent !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg confidence at override:</span>
              <span
                className={`font-semibold ${
                  confidencePercent < 50
                    ? 'text-red-600'
                    : confidencePercent < 70
                      ? 'text-amber-600'
                      : 'text-green-600'
                }`}
              >
                {confidencePercent}%
              </span>
            </div>
          )}

          {insights.priorPeriodOverrides > 0 && (
            <p className="text-xs text-muted-foreground">
              Prior 90 days: {insights.priorPeriodOverrides} overrides
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getSeasonalDemandForecast,
  getRebookingPredictions,
  getCashFlowProjection,
  getSchedulingIntelligence,
  getInquiryTriage,
  getPostEventTriggers,
  getPriceAnomalies,
  getDietaryIntelligence,
  getIngredientConsolidation,
  getNetworkIntelligence,
} from '@/lib/intelligence'

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function TrendBadge({ trend }: { trend: string }) {
  const variant =
    trend === 'up' || trend === 'improving' || trend === 'rising' || trend === 'growing'
      ? 'success'
      : trend === 'down' || trend === 'declining' || trend === 'falling'
        ? 'error'
        : 'default'
  return <Badge variant={variant}>{trend}</Badge>
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant =
    severity === 'critical' || severity === 'alert'
      ? 'error'
      : severity === 'warning'
        ? 'warning'
        : 'info'
  return <Badge variant={variant}>{severity}</Badge>
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground italic">{message}</p>
}

export async function IntelligenceHubContent() {
  // Fetch all intelligence data in parallel
  const [
    seasonal,
    rebooking,
    cashflow,
    scheduling,
    triage,
    postEvent,
    pricing,
    dietary,
    ingredients,
    network,
  ] = await Promise.all([
    getSeasonalDemandForecast().catch(() => null),
    getRebookingPredictions().catch(() => null),
    getCashFlowProjection().catch(() => null),
    getSchedulingIntelligence().catch(() => null),
    getInquiryTriage().catch(() => null),
    getPostEventTriggers().catch(() => null),
    getPriceAnomalies().catch(() => null),
    getDietaryIntelligence().catch(() => null),
    getIngredientConsolidation().catch(() => null),
    getNetworkIntelligence().catch(() => null),
  ])

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. Seasonal Demand */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Seasonal Demand
            {seasonal && (
              <TrendBadge
                trend={
                  seasonal.peaks.find((p) => p.month === new Date().getMonth() + 1)?.strength ||
                  'average'
                }
              />
            )}
          </CardTitle>
          <CardDescription>Historical patterns predict your busy and slow seasons</CardDescription>
        </CardHeader>
        <CardContent>
          {seasonal ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Busiest month:</span>
                  <p className="font-semibold">{seasonal.busiestMonth}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Slowest month:</span>
                  <p className="font-semibold">{seasonal.slowestMonth}</p>
                </div>
              </div>
              {seasonal.peakSeasonMonths.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Peak season: </span>
                  <span className="font-medium">{seasonal.peakSeasonMonths.join(', ')}</span>
                </div>
              )}
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">Next month: {seasonal.nextMonthForecast.month}</p>
                <p className="text-muted-foreground">
                  Expected {seasonal.nextMonthForecast.expectedEvents} events, ~
                  {formatCents(seasonal.nextMonthForecast.expectedRevenueCents)} revenue
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {seasonal.nextMonthForecast.historicalBasis}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {seasonal.yearsOfData} years of data analyzed
              </p>
            </div>
          ) : (
            <EmptyState message="Not enough event history to detect seasonal patterns (need 3+ events)" />
          )}
        </CardContent>
      </Card>

      {/* 2. Rebooking Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Rebooking Predictions</CardTitle>
          <CardDescription>
            Clients most likely to book again, based on their history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rebooking ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Repeat client rate:</span>
                  <p className="font-semibold">{rebooking.repeatClientRate}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg rebooking interval:</span>
                  <p className="font-semibold">{rebooking.avgRebookingIntervalDays} days</p>
                </div>
              </div>
              {rebooking.upcomingRebookers.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Likely to rebook soon:</p>
                  <ul className="space-y-1">
                    {rebooking.upcomingRebookers.slice(0, 3).map((p) => (
                      <li key={p.clientId} className="text-sm flex items-center justify-between">
                        <span>{p.clientName}</span>
                        <Badge variant={p.likelihood === 'very_likely' ? 'success' : 'default'}>
                          {p.rebookingScore}%
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rebooking.overdueRebookers.length > 0 && (
                <div className="rounded-md bg-warning/10 p-2 text-sm">
                  <p className="font-medium">
                    {rebooking.overdueRebookers.length} clients overdue for rebooking
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Past their typical booking interval
                  </p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState message="Need client event history to predict rebookings" />
          )}
        </CardContent>
      </Card>

      {/* 3. Cash Flow Projections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Cash Flow
            {cashflow && <TrendBadge trend={cashflow.trend} />}
          </CardTitle>
          <CardDescription>Income vs expenses with 3-month projection</CardDescription>
        </CardHeader>
        <CardContent>
          {cashflow ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg income/mo:</span>
                  <p className="font-semibold text-green-600">
                    {formatCents(cashflow.avgMonthlyIncomeCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg expenses/mo:</span>
                  <p className="font-semibold text-red-600">
                    {formatCents(cashflow.avgMonthlyExpensesCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net/mo:</span>
                  <p
                    className={`font-semibold ${cashflow.avgMonthlyNetCents >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCents(cashflow.avgMonthlyNetCents)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Gross margin:</span>
                  <p className="font-semibold">{cashflow.grossMarginPercent}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Best month:</span>
                  <p className="font-semibold">
                    {cashflow.bestMonth.month} ({formatCents(cashflow.bestMonth.netCents)})
                  </p>
                </div>
              </div>
              {cashflow.projected.length > 0 && (
                <div className="rounded-md bg-muted/50 p-2 text-sm">
                  <p className="font-medium">3-month projection:</p>
                  {cashflow.projected.map((m) => (
                    <div key={m.month} className="flex justify-between text-xs">
                      <span>{m.month}</span>
                      <span className={m.netCents >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCents(m.netCents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <EmptyState message="Need financial data to project cash flow" />
          )}
        </CardContent>
      </Card>

      {/* 4. Smart Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Scheduling</CardTitle>
          <CardDescription>Spacing, burnout risk, and day-of-week optimization</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduling ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Optimal spacing:</span>
                  <p className="font-semibold">
                    {scheduling.optimalSpacingDays} day
                    {scheduling.optimalSpacingDays !== 1 ? 's' : ''}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Best day:</span>
                  <p className="font-semibold">{scheduling.bestPerformanceDay}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Top revenue:</span>
                  <p className="font-semibold">{scheduling.highestRevenueDay}</p>
                </div>
              </div>
              {scheduling.suggestions.length > 0 && (
                <div className="space-y-2">
                  {scheduling.suggestions.slice(0, 3).map((s, i) => (
                    <div key={i} className="rounded-md border p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={s.severity} />
                        <span className="font-medium">{s.title}</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">{s.description}</p>
                    </div>
                  ))}
                </div>
              )}
              {scheduling.upcomingDensity.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {scheduling.upcomingDensity.reduce((s, d) => s + d.eventCount, 0)} events in next
                  30 days
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 3+ events to analyze scheduling patterns" />
          )}
        </CardContent>
      </Card>

      {/* 5. Inquiry Triage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Inquiry Triage
            {triage && triage.urgentCount > 0 && (
              <Badge variant="error">{triage.urgentCount} urgent</Badge>
            )}
          </CardTitle>
          <CardDescription>Priority-ranked open inquiries with suggested actions</CardDescription>
        </CardHeader>
        <CardContent>
          {triage ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Open:</span>
                  <p className="font-semibold">{triage.totalOpenInquiries}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pipeline value:</span>
                  <p className="font-semibold">{formatCents(triage.estimatedPipelineValueCents)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg response:</span>
                  <p className="font-semibold">{triage.avgResponseTimeHours}h</p>
                </div>
              </div>
              {triage.triaged.slice(0, 4).map((t) => (
                <div
                  key={t.inquiryId}
                  className="flex items-center justify-between text-sm border-b pb-1"
                >
                  <div>
                    <span className="font-medium">{t.clientName || 'Unknown'}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{t.channel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t.suggestedAction}</span>
                    <Badge
                      variant={
                        t.priorityLevel === 'urgent'
                          ? 'error'
                          : t.priorityLevel === 'high'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {t.priorityScore}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No open inquiries to triage" />
          )}
        </CardContent>
      </Card>

      {/* 6. Post-Event Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Post-Event Tasks
            {postEvent && postEvent.overdueCount > 0 && (
              <Badge variant="error">{postEvent.overdueCount} overdue</Badge>
            )}
          </CardTitle>
          <CardDescription>Follow-up tasks generated from completed events</CardDescription>
        </CardHeader>
        <CardContent>
          {postEvent ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Overdue:</span>
                  <p className="font-semibold text-red-600">{postEvent.overdueCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Due today:</span>
                  <p className="font-semibold text-amber-600">{postEvent.dueTodayCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Completion rate:</span>
                  <p className="font-semibold">{postEvent.completionRate}%</p>
                </div>
              </div>
              {postEvent.tasks.slice(0, 4).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b pb-1">
                  <div>
                    <span className="font-medium">{t.title}</span>
                    <p className="text-xs text-muted-foreground">
                      {t.clientName} — {t.eventDate}
                    </p>
                  </div>
                  <Badge
                    variant={
                      t.priority === 'high'
                        ? 'error'
                        : t.priority === 'medium'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {t.daysOverdue > 0
                      ? `${t.daysOverdue}d overdue`
                      : t.daysOverdue === 0
                        ? 'today'
                        : `in ${Math.abs(t.daysOverdue)}d`}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No recently completed events" />
          )}
        </CardContent>
      </Card>

      {/* 7. Price Anomaly Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Price Intelligence
            {pricing && <TrendBadge trend={pricing.recentQuoteVsHistorical.trend} />}
          </CardTitle>
          <CardDescription>Outliers, expense spikes, and pricing benchmarks</CardDescription>
        </CardHeader>
        <CardContent>
          {pricing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg/person:</span>
                  <p className="font-semibold">
                    {formatCents(pricing.benchmarks.avgPerPersonCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg event:</span>
                  <p className="font-semibold">
                    {formatCents(pricing.benchmarks.avgEventValueCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Food cost:</span>
                  <p className="font-semibold">{pricing.benchmarks.avgFoodCostPercent}%</p>
                </div>
              </div>
              {pricing.recentQuoteVsHistorical.changePercent !== 0 && (
                <p className="text-sm">
                  Recent quotes are{' '}
                  <span
                    className={
                      pricing.recentQuoteVsHistorical.changePercent > 0
                        ? 'text-green-600 font-medium'
                        : 'text-red-600 font-medium'
                    }
                  >
                    {Math.abs(pricing.recentQuoteVsHistorical.changePercent)}%{' '}
                    {pricing.recentQuoteVsHistorical.trend}
                  </span>{' '}
                  vs historical average
                </p>
              )}
              {pricing.anomalies.slice(0, 3).map((a, i) => (
                <div key={i} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <span className="font-medium">{a.title}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{a.description}</p>
                </div>
              ))}
              {pricing.highestMarginOccasion && (
                <p className="text-xs text-muted-foreground">
                  Highest margin: {pricing.highestMarginOccasion}
                  {pricing.lowestMarginOccasion && ` | Lowest: ${pricing.lowestMarginOccasion}`}
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 5+ completed events with pricing data" />
          )}
        </CardContent>
      </Card>

      {/* 8. Dietary Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle>Dietary Trends</CardTitle>
          <CardDescription>
            Cross-client dietary patterns and specialization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dietary ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Clients with restrictions:</span>
                  <p className="font-semibold">
                    {dietary.percentWithRestrictions}% ({dietary.clientsWithRestrictions} of{' '}
                    {dietary.clientsWithRestrictions + dietary.clientsWithoutRestrictions})
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Top restrictions:</span>
                  <p className="font-semibold">
                    {dietary.topRestrictions.slice(0, 3).join(', ') || 'None'}
                  </p>
                </div>
              </div>
              {dietary.risingRestrictions.length > 0 && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-2 text-sm">
                  <p className="font-medium">
                    Rising demand: {dietary.risingRestrictions.join(', ')}
                  </p>
                </div>
              )}
              {dietary.insights.slice(0, 2).map((insight, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-muted-foreground text-xs">{insight.description}</p>
                </div>
              ))}
              {dietary.commonCombinations.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Common combo: {dietary.commonCombinations[0].restrictions.join(' + ')} (
                  {dietary.commonCombinations[0].count} clients)
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need client dietary data to analyze trends" />
          )}
        </CardContent>
      </Card>

      {/* 9. Ingredient Consolidation */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredient Consolidation</CardTitle>
          <CardDescription>
            Batch planning for upcoming events — save trips and money
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ingredients ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Events covered:</span>
                  <p className="font-semibold">{ingredients.eventsCovered}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Shared ingredients:</span>
                  <p className="font-semibold">{ingredients.sharedIngredientCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Est. total cost:</span>
                  <p className="font-semibold">
                    {formatCents(ingredients.totalEstimatedCostCents)}
                  </p>
                </div>
              </div>
              {ingredients.savingsOpportunities.length > 0 && (
                <div className="space-y-1">
                  {ingredients.savingsOpportunities.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-sm"
                    >
                      <p className="font-medium">{s.title}</p>
                      <p className="text-muted-foreground text-xs">{s.description}</p>
                    </div>
                  ))}
                </div>
              )}
              {ingredients.consolidatedList
                .filter((i) => i.eventCount >= 2)
                .slice(0, 5)
                .map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{item.ingredientName}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.eventCount} events
                      {item.totalQuantity ? ` — ${item.totalQuantity} ${item.unit || ''}` : ''}
                    </span>
                  </div>
                ))}
              <p className="text-xs text-muted-foreground">
                Covering {ingredients.dateRange.start} to {ingredients.dateRange.end}
              </p>
            </div>
          ) : (
            <EmptyState message="No upcoming events with menus and recipes to consolidate" />
          )}
        </CardContent>
      </Card>

      {/* 10. Network Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle>Network Intelligence</CardTitle>
          <CardDescription>
            Referral performance, best clients to ask, backup chef network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {network ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Best referral source:</span>
                  <p className="font-semibold">{network.bestReferralSource || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Referral revenue:</span>
                  <p className="font-semibold">
                    {network.networkStats.referralRevenuePercent}% of total
                  </p>
                </div>
              </div>
              {network.topReferringClients.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Most likely to refer you:</p>
                  <ul className="space-y-1">
                    {network.topReferringClients.slice(0, 3).map((c) => (
                      <li key={c.clientId} className="text-sm flex items-center justify-between">
                        <span>{c.clientName}</span>
                        <Badge variant={c.likelihood === 'high' ? 'success' : 'default'}>
                          {c.likelihood}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {network.referralSourcePerformance.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{s.source}</span>
                  <span className="text-muted-foreground text-xs">
                    {s.conversionRate}% conversion, {formatCents(s.avgValueCents)} avg
                  </span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {network.networkStats.activeBackupChefs} active backup chef
                {network.networkStats.activeBackupChefs !== 1 ? 's' : ''} in your network
              </p>
            </div>
          ) : (
            <EmptyState message="Need inquiry and client data to analyze your network" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

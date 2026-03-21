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
  getPrepTimeIntelligence,
  getCommunicationCadence,
  getVendorPriceIntelligence,
  getEventProfitability,
  getQuoteIntelligence,
  getUntappedMarkets,
  getGeographicIntelligence,
  getRevenuePerGuest,
  getSeasonalMenuCorrelation,
  getClientLifetimeJourneys,
  getChurnPreventionTriggers,
  getCapacityCeiling,
  getPriceElasticity,
  getReferralChainMapping,
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
    prepTime,
    communication,
    vendorPrices,
    profitability,
    quoteIntel,
    untappedMarkets,
    geographic,
    revenuePerGuest,
    seasonalMenu,
    clientLifetime,
    churnPrevention,
    capacity,
    priceElasticity,
    referralChains,
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
    getPrepTimeIntelligence().catch(() => null),
    getCommunicationCadence().catch(() => null),
    getVendorPriceIntelligence().catch(() => null),
    getEventProfitability().catch(() => null),
    getQuoteIntelligence().catch(() => null),
    getUntappedMarkets().catch(() => null),
    getGeographicIntelligence().catch(() => null),
    getRevenuePerGuest().catch(() => null),
    getSeasonalMenuCorrelation().catch(() => null),
    getClientLifetimeJourneys().catch(() => null),
    getChurnPreventionTriggers().catch(() => null),
    getCapacityCeiling().catch(() => null),
    getPriceElasticity().catch(() => null),
    getReferralChainMapping().catch(() => null),
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
                      {t.clientName} - {t.eventDate}
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
                <div className="rounded-md bg-brand-50 dark:bg-brand-950/20 p-2 text-sm">
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
            Batch planning for upcoming events - save trips and money
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
                      {item.totalQuantity ? ` - ${item.totalQuantity} ${item.unit || ''}` : ''}
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

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TIER 2 - Operational Intelligence                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* 11. Prep Time Estimator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Prep Time Intelligence
            {prepTime && <TrendBadge trend={prepTime.efficiencyTrend} />}
          </CardTitle>
          <CardDescription>Phase averages, efficiency trends, and time-per-guest</CardDescription>
        </CardHeader>
        <CardContent>
          {prepTime ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg minutes/guest:</span>
                  <p className="font-semibold">{prepTime.avgMinutesPerGuest} min</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Efficiency:</span>
                  <p className="font-semibold capitalize">{prepTime.efficiencyTrend}</p>
                </div>
              </div>
              {prepTime.phaseAverages
                .filter((p) => p.avgMinutes > 0)
                .map((phase) => (
                  <div key={phase.phase} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{phase.phase}</span>
                    <span className="text-muted-foreground">
                      {phase.avgMinutes} min avg ({phase.minMinutes}-{phase.maxMinutes})
                    </span>
                  </div>
                ))}
              {prepTime.fastestEvent && (
                <p className="text-xs text-muted-foreground">
                  Fastest: {prepTime.fastestEvent.totalMinutes} min (
                  {prepTime.fastestEvent.guestCount} guests) | Slowest:{' '}
                  {prepTime.slowestEvent?.totalMinutes} min ({prepTime.slowestEvent?.guestCount}{' '}
                  guests)
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need completed events with time tracking data" />
          )}
        </CardContent>
      </Card>

      {/* 12. Communication Cadence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Communication Cadence
            {communication && communication.pipelineAtRisk > 0 && (
              <Badge variant="error">{communication.pipelineAtRisk} at risk</Badge>
            )}
          </CardTitle>
          <CardDescription>Client response patterns and pipeline health</CardDescription>
        </CardHeader>
        <CardContent>
          {communication ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Your response:</span>
                  <p className="font-semibold">{communication.avgChefResponseHours}h avg</p>
                </div>
                <div>
                  <span className="text-muted-foreground">No reply:</span>
                  <p className="font-semibold text-amber-600">
                    {communication.openInquiriesWithoutReply}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">At risk:</span>
                  <p className="font-semibold text-red-600">{communication.pipelineAtRisk}</p>
                </div>
              </div>
              {communication.silentClients.slice(0, 3).map((c) => (
                <div
                  key={c.clientId}
                  className="flex items-center justify-between text-sm border-b pb-1"
                >
                  <div>
                    <span className="font-medium">{c.clientName}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {c.silentDays}d silent
                    </span>
                  </div>
                  <Badge variant={c.status === 'silent' ? 'error' : 'warning'}>{c.status}</Badge>
                </div>
              ))}
              {communication.fastestResponseClient && (
                <p className="text-xs text-muted-foreground">
                  Fastest responder: {communication.fastestResponseClient} | Slowest:{' '}
                  {communication.slowestResponseClient}
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need inquiry and quote data to track communication" />
          )}
        </CardContent>
      </Card>

      {/* 13. Vendor Price Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Vendor Price Tracking
            {vendorPrices && vendorPrices.alerts.length > 0 && (
              <Badge variant="warning">{vendorPrices.alerts.length} alerts</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Track vendor costs, spot price increases, and concentration risk
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendorPrices ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total vendors:</span>
                  <p className="font-semibold">{vendorPrices.totalVendors}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg/event:</span>
                  <p className="font-semibold">
                    {formatCents(vendorPrices.avgExpensePerEventCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">12mo spend:</span>
                  <p className="font-semibold">
                    {formatCents(vendorPrices.totalSpendLast12MonthsCents)}
                  </p>
                </div>
              </div>
              {vendorPrices.alerts.slice(0, 3).map((alert, i) => (
                <div key={i} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <SeverityBadge
                      severity={alert.alertType === 'price_increase' ? 'warning' : 'info'}
                    />
                    <span className="font-medium">{alert.title}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{alert.description}</p>
                </div>
              ))}
              {vendorPrices.vendors.slice(0, 3).map((v, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{v.vendorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {formatCents(v.totalSpendCents)}
                    </span>
                    <TrendBadge trend={v.priceChange} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Need expense records to track vendor prices" />
          )}
        </CardContent>
      </Card>

      {/* 14. Event Profitability */}
      <Card>
        <CardHeader>
          <CardTitle>Event Profitability</CardTitle>
          <CardDescription>
            Rank events by true profit margin and effective hourly rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profitability ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg margin:</span>
                  <p className="font-semibold">{profitability.avgMarginPercent}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg hourly:</span>
                  <p className="font-semibold">
                    {formatCents(profitability.avgEffectiveHourlyRateCents)}/hr
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total profit:</span>
                  <p className="font-semibold text-green-600">
                    {formatCents(profitability.totalProfitCents)}
                  </p>
                </div>
              </div>
              {profitability.topPerformers.slice(0, 3).map((e) => (
                <div
                  key={e.eventId}
                  className="flex items-center justify-between text-sm border-b pb-1"
                >
                  <div>
                    <span className="font-medium">{e.clientName}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {e.occasion || e.eventDate}
                    </span>
                  </div>
                  <Badge variant="success">{e.marginPercent}% margin</Badge>
                </div>
              ))}
              {profitability.mostProfitableOccasion && (
                <p className="text-xs text-muted-foreground">
                  Best occasion: {profitability.mostProfitableOccasion}
                  {profitability.leastProfitableOccasion &&
                    ` | Worst: ${profitability.leastProfitableOccasion}`}
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 3+ completed events with pricing and expense data" />
          )}
        </CardContent>
      </Card>

      {/* 15. Quote Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Quote Intelligence
            {quoteIntel && <TrendBadge trend={quoteIntel.recentTrend} />}
          </CardTitle>
          <CardDescription>
            Acceptance rates, sweet spot pricing, and time-to-decision
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quoteIntel ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Acceptance rate:</span>
                  <p className="font-semibold">{quoteIntel.overallAcceptanceRate}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg decision:</span>
                  <p className="font-semibold">{quoteIntel.avgTimeToDecisionDays} days</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Expired:</span>
                  <p className="font-semibold text-amber-600">{quoteIntel.expiredCount}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg accepted:</span>
                  <p className="font-semibold text-green-600">
                    {formatCents(quoteIntel.acceptedAvgCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg rejected:</span>
                  <p className="font-semibold text-red-600">
                    {formatCents(quoteIntel.rejectedAvgCents)}
                  </p>
                </div>
              </div>
              {quoteIntel.sweetSpot && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-sm">
                  <p className="font-medium">
                    Sweet spot: {formatCents(quoteIntel.sweetSpot.minCents)} -{' '}
                    {formatCents(quoteIntel.sweetSpot.maxCents)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {quoteIntel.sweetSpot.acceptanceRate}% acceptance in this range
                  </p>
                </div>
              )}
              {quoteIntel.byPricingModel.slice(0, 3).map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{m.model}</span>
                  <span className="text-muted-foreground text-xs">
                    {m.acceptanceRate}% acceptance ({m.count} quotes)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Need 5+ quotes with outcomes to analyze" />
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TIER 3 - Strategic Growth Intelligence                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* 16. Untapped Markets */}
      <Card>
        <CardHeader>
          <CardTitle>Untapped Markets</CardTitle>
          <CardDescription>
            Occasions, service styles, and guest brackets with growth potential
          </CardDescription>
        </CardHeader>
        <CardContent>
          {untappedMarkets ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Top untapped:</span>
                  <p className="font-semibold">{untappedMarkets.topUntappedOccasion || 'None'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Best converting:</span>
                  <p className="font-semibold">{untappedMarkets.bestConvertingOccasion || 'N/A'}</p>
                </div>
              </div>
              {untappedMarkets.occasions
                .filter((o) => o.status !== 'strong')
                .slice(0, 4)
                .map((o, i) => (
                  <div key={i} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{o.occasion}</span>
                      <Badge variant={o.status === 'untapped' ? 'error' : 'warning'}>
                        {o.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">{o.recommendation}</p>
                  </div>
                ))}
              {untappedMarkets.highestValueBracket && (
                <p className="text-xs text-muted-foreground">
                  Highest-value bracket: {untappedMarkets.highestValueBracket}
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 3+ inquiries to detect market opportunities" />
          )}
        </CardContent>
      </Card>

      {/* 17. Geographic Hotspots */}
      <Card>
        <CardHeader>
          <CardTitle>Geographic Hotspots</CardTitle>
          <CardDescription>
            Location performance, travel efficiency, and geographic concentration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {geographic ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Locations:</span>
                  <p className="font-semibold">{geographic.totalLocations}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Concentration:</span>
                  <p className="font-semibold">{geographic.locationConcentration}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg travel:</span>
                  <p className="font-semibold">
                    {geographic.travelEfficiency.avgTravelMinutes} min
                  </p>
                </div>
              </div>
              {geographic.hotspots.slice(0, 4).map((h, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b pb-1">
                  <div>
                    <span className="font-medium">{h.location}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {h.eventCount} events
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{formatCents(h.avgRevenueCents)} avg</span>
                    <TrendBadge trend={h.trend} />
                  </div>
                </div>
              ))}
              {geographic.topEfficiencyLocation && (
                <p className="text-xs text-muted-foreground">
                  Most efficient: {geographic.topEfficiencyLocation} | Top revenue:{' '}
                  {geographic.topRevenueLocation}
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 3+ events with location data" />
          )}
        </CardContent>
      </Card>

      {/* 18. Revenue Per Guest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Revenue Per Guest
            {revenuePerGuest && <TrendBadge trend={revenuePerGuest.trend} />}
          </CardTitle>
          <CardDescription>Per-guest economics across occasions and group sizes</CardDescription>
        </CardHeader>
        <CardContent>
          {revenuePerGuest ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg/guest:</span>
                  <p className="font-semibold">
                    {formatCents(revenuePerGuest.overallAvgPerGuestCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Median/guest:</span>
                  <p className="font-semibold">
                    {formatCents(revenuePerGuest.overallMedianPerGuestCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sweet spot:</span>
                  <p className="font-semibold">{revenuePerGuest.sweetSpotGuests ?? 'N/A'} guests</p>
                </div>
              </div>
              {revenuePerGuest.optimalRange && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-sm">
                  <p className="font-medium">
                    Optimal range: {revenuePerGuest.optimalRange.minGuests}-
                    {revenuePerGuest.optimalRange.maxGuests} guests
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatCents(revenuePerGuest.optimalRange.avgRevenuePerGuestCents)}/guest,
                    {formatCents(revenuePerGuest.optimalRange.avgTotalRevenueCents)} total avg
                  </p>
                </div>
              )}
              {revenuePerGuest.byOccasion.slice(0, 3).map((o, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{o.occasion}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatCents(o.avgRevenuePerGuestCents)}/guest ({o.eventCount} events)
                  </span>
                </div>
              ))}
              {revenuePerGuest.volumeVsValueInsight && (
                <p className="text-xs text-muted-foreground">
                  {revenuePerGuest.volumeVsValueInsight}
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 5+ completed events with guest counts" />
          )}
        </CardContent>
      </Card>

      {/* 19. Seasonal Menu Correlation */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Menu Intelligence</CardTitle>
          <CardDescription>Which dishes perform best in each season</CardDescription>
        </CardHeader>
        <CardContent>
          {seasonalMenu ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Dishes tracked:</span>
                  <p className="font-semibold">{seasonalMenu.totalDishesTracked}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Menu diversity:</span>
                  <p className="font-semibold">{seasonalMenu.menuDiversityScore}/100</p>
                </div>
              </div>
              {seasonalMenu.patterns.map((p) => (
                <div key={p.season} className="text-sm">
                  <span className="font-medium capitalize">{p.season}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    ({p.months}) - {p.eventCount} events, {formatCents(p.avgRevenueCents)} avg
                  </span>
                  {p.topDishes.length > 0 && (
                    <p className="text-xs text-muted-foreground ml-2">
                      Top:{' '}
                      {p.topDishes
                        .slice(0, 3)
                        .map((d) => d.name)
                        .join(', ')}
                    </p>
                  )}
                </div>
              ))}
              {seasonalMenu.currentSeasonRecommendations.slice(0, 2).map((r, i) => (
                <div key={i} className="rounded-md bg-brand-50 dark:bg-brand-950/20 p-2 text-sm">
                  <p className="text-muted-foreground text-xs">{r}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Need 5+ completed events with menus to analyze" />
          )}
        </CardContent>
      </Card>

      {/* 20. Client Lifetime Journey */}
      <Card>
        <CardHeader>
          <CardTitle>Client Lifetime Value</CardTitle>
          <CardDescription>
            Journey stages, cohort retention, and revenue growth per client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientLifetime ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg LTV:</span>
                  <p className="font-semibold">
                    {formatCents(clientLifetime.avgLifetimeValueCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Retention:</span>
                  <p className="font-semibold">{clientLifetime.retentionRate}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg events/client:</span>
                  <p className="font-semibold">{clientLifetime.avgEventsPerClient}</p>
                </div>
              </div>
              {clientLifetime.stageDistribution.map((s) => (
                <div key={s.stage} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{s.stage.replace('_', ' ')}</span>
                  <span className="text-muted-foreground text-xs">
                    {s.count} clients ({s.percent}%) - {formatCents(s.avgRevenueCents)} avg
                  </span>
                </div>
              ))}
              {clientLifetime.atRiskClients.length > 0 && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-2 text-sm">
                  <p className="font-medium">
                    {clientLifetime.atRiskClients.length} at-risk clients
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {clientLifetime.atRiskClients
                      .slice(0, 3)
                      .map((c) => c.clientName)
                      .join(', ')}
                  </p>
                </div>
              )}
              {clientLifetime.avgDaysBetweenFirstInquiryAndEvent !== null && (
                <p className="text-xs text-muted-foreground">
                  Avg {clientLifetime.avgDaysBetweenFirstInquiryAndEvent} days from first contact to
                  first event
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 3+ clients with event history" />
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TIER 4 - Predictive & Advanced Analytics                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* 21. Churn Prevention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Churn Prevention
            {churnPrevention && churnPrevention.totalAtRisk > 0 && (
              <Badge variant="error">{churnPrevention.totalAtRisk} at risk</Badge>
            )}
          </CardTitle>
          <CardDescription>Multi-signal churn detection with prevention actions</CardDescription>
        </CardHeader>
        <CardContent>
          {churnPrevention ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Churn rate:</span>
                  <p className="font-semibold">{churnPrevention.churnRate}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Revenue at risk:</span>
                  <p className="font-semibold text-red-600">
                    {formatCents(churnPrevention.totalRevenueAtRiskCents)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg pre-churn silence:</span>
                  <p className="font-semibold">{churnPrevention.avgDaysBeforeChurn} days</p>
                </div>
              </div>
              {churnPrevention.atRiskClients.slice(0, 4).map((c) => (
                <div key={c.clientId} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.clientName}</span>
                    <Badge variant={c.riskLevel === 'critical' ? 'error' : 'warning'}>
                      {c.riskScore}/100 risk
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{c.suggestedAction}</p>
                  {c.triggers.slice(0, 2).map((t, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      • {t.description}
                    </p>
                  ))}
                </div>
              ))}
              {churnPrevention.topPreventionAction && (
                <div className="rounded-md bg-brand-50 dark:bg-brand-950/20 p-2 text-sm">
                  <p className="font-medium">Top action: {churnPrevention.topPreventionAction}</p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState message="Need clients with event history to detect churn risk" />
          )}
        </CardContent>
      </Card>

      {/* 22. Capacity Ceiling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Capacity Ceiling
            {capacity && (
              <Badge
                variant={
                  capacity.capacityHeadroom < 20
                    ? 'error'
                    : capacity.capacityHeadroom < 40
                      ? 'warning'
                      : 'success'
                }
              >
                {capacity.capacityHeadroom}% headroom
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            How close you are to max capacity and where the bottlenecks are
          </CardDescription>
        </CardHeader>
        <CardContent>
          {capacity ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Max events/week:</span>
                  <p className="font-semibold">{capacity.maxEventsPerWeek}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg/week:</span>
                  <p className="font-semibold">{capacity.avgEventsPerWeek}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Utilization:</span>
                  <p className="font-semibold">{capacity.currentUtilization}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Theoretical max/mo:</span>
                  <p className="font-semibold">{capacity.theoreticalMaxEventsPerMonth} events</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Max revenue/mo:</span>
                  <p className="font-semibold">
                    {formatCents(capacity.theoreticalMaxRevenueCents)}
                  </p>
                </div>
              </div>
              {capacity.bottlenecks.slice(0, 3).map((b, i) => (
                <div key={i} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={b.severity} />
                    <span className="font-medium">{b.title}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{b.description}</p>
                </div>
              ))}
              {capacity.busiestMonth && (
                <p className="text-xs text-muted-foreground">
                  Busiest: {capacity.busiestMonth} | Slowest: {capacity.slowestMonth}
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 5+ events in the last 12 months" />
          )}
        </CardContent>
      </Card>

      {/* 23. Price Elasticity */}
      <Card>
        <CardHeader>
          <CardTitle>Price Elasticity</CardTitle>
          <CardDescription>
            How price-sensitive your clients are and where you can charge more
          </CardDescription>
        </CardHeader>
        <CardContent>
          {priceElasticity ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Elasticity:</span>
                  <p className="font-semibold">{priceElasticity.overallElasticity}/100</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current avg:</span>
                  <p className="font-semibold">
                    {formatCents(priceElasticity.currentAvgPerGuestCents)}/guest
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price headroom:</span>
                  <p className="font-semibold text-green-600">
                    +{priceElasticity.priceIncreaseHeadroom}%
                  </p>
                </div>
              </div>
              {priceElasticity.priceBands.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{b.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {b.acceptanceRate}% acceptance ({b.quotesInBand} quotes)
                  </span>
                </div>
              ))}
              {priceElasticity.revenueMaximizingPerGuestCents && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-sm">
                  <p className="font-medium">
                    Revenue-maximizing:{' '}
                    {formatCents(priceElasticity.revenueMaximizingPerGuestCents)}/guest
                  </p>
                  {priceElasticity.profitMaximizingPerGuestCents && (
                    <p className="text-muted-foreground text-xs">
                      Profit-maximizing:{' '}
                      {formatCents(priceElasticity.profitMaximizingPerGuestCents)}/guest
                    </p>
                  )}
                </div>
              )}
              {priceElasticity.insight && (
                <p className="text-xs text-muted-foreground">{priceElasticity.insight}</p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 10+ quotes with outcomes to model elasticity" />
          )}
        </CardContent>
      </Card>

      {/* 24. Referral Chain Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Chains</CardTitle>
          <CardDescription>
            Map how clients find you and the ripple effect of each referral
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralChains ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">From referrals:</span>
                  <p className="font-semibold">{referralChains.percentFromReferrals}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Network effect:</span>
                  <p className="font-semibold">{referralChains.networkEffectScore}/100</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg chain depth:</span>
                  <p className="font-semibold">{referralChains.avgReferralChainDepth}</p>
                </div>
              </div>
              {referralChains.topReferrer && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-sm">
                  <p className="font-medium">Top referrer: {referralChains.topReferrer}</p>
                  <p className="text-muted-foreground text-xs">
                    Generated {formatCents(referralChains.topReferrerRevenueCents)} in referred
                    revenue
                  </p>
                </div>
              )}
              {referralChains.sourceROI.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{s.source}</span>
                  <span className="text-muted-foreground text-xs">
                    {s.clientCount} clients, {formatCents(s.avgRevenuePerClientCents)} avg
                  </span>
                </div>
              ))}
              {referralChains.chains.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {referralChains.chains.length} referral chain
                  {referralChains.chains.length !== 1 ? 's' : ''} identified, longest depth:{' '}
                  {Math.max(...referralChains.chains.map((c) => c.maxDepth))}
                </p>
              )}
            </div>
          ) : (
            <EmptyState message="Need 3+ clients with referral source data" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

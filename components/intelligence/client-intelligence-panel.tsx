import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getClientIntelligenceContext,
  type ClientIntelligenceContext,
} from '@/lib/intelligence/client-intelligence-context'
import { formatCurrency } from '@/lib/utils/currency'

interface ClientIntelligencePanelProps {
  clientId: string
}

export async function ClientIntelligencePanel({ clientId }: ClientIntelligencePanelProps) {
  const context = await getClientIntelligenceContext(clientId).catch(() => null)

  if (!context) return null

  const churnColor =
    context.churnRisk.level === 'critical'
      ? 'text-red-400'
      : context.churnRisk.level === 'high'
        ? 'text-orange-400'
        : context.churnRisk.level === 'moderate'
          ? 'text-amber-400'
          : 'text-emerald-400'

  const churnBg =
    context.churnRisk.level === 'critical'
      ? 'bg-red-950 border-red-800/40'
      : context.churnRisk.level === 'high'
        ? 'bg-orange-950 border-orange-800/40'
        : context.churnRisk.level === 'moderate'
          ? 'bg-amber-950 border-amber-800/40'
          : 'bg-emerald-950 border-emerald-800/40'

  const trendIcon =
    context.revenueTrajectory.trend === 'growing'
      ? '↑'
      : context.revenueTrajectory.trend === 'declining'
        ? '↓'
        : context.revenueTrajectory.trend === 'stable'
          ? '→'
          : '~'

  const trendColor =
    context.revenueTrajectory.trend === 'growing'
      ? 'text-emerald-400'
      : context.revenueTrajectory.trend === 'declining'
        ? 'text-red-400'
        : 'text-stone-400'

  return (
    <Card className="border-brand-800/30 bg-brand-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-brand-400 uppercase tracking-wider">
          Relationship Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Churn Risk */}
          <div className={`rounded-lg border p-3 ${churnBg}`}>
            <p className="text-xs text-stone-500 mb-1">Churn Risk</p>
            <p className={`text-2xl font-bold ${churnColor}`}>{context.churnRisk.level}</p>
            {context.churnRisk.daysSinceLastEvent !== null && (
              <p className="text-xs text-stone-500 mt-0.5">
                {context.churnRisk.daysSinceLastEvent}d since last event
              </p>
            )}
            {context.churnRisk.avgBookingIntervalDays && (
              <p className="text-xs text-stone-500 mt-0.5">
                Avg interval: {context.churnRisk.avgBookingIntervalDays}d
                {context.churnRisk.isOverdue && (
                  <span className="text-amber-400 ml-1">(overdue)</span>
                )}
              </p>
            )}
          </div>

          {/* Rebooking Prediction */}
          <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
            <p className="text-xs text-stone-500 mb-1">Rebooking Forecast</p>
            {context.rebookingPrediction.predictedNextBookingDays !== null ? (
              <>
                <p className="text-2xl font-bold text-stone-100">
                  ~{context.rebookingPrediction.predictedNextBookingDays}d
                </p>
                <p className="text-xs text-stone-500 mt-0.5">predicted until next booking</p>
              </>
            ) : (
              <p className="text-lg font-bold text-stone-400">-</p>
            )}
            {context.rebookingPrediction.seasonalPattern && (
              <p className="text-xs text-stone-500 mt-1">
                Peak: {context.rebookingPrediction.seasonalPattern}
              </p>
            )}
            {context.rebookingPrediction.preferredOccasion && (
              <p className="text-xs text-stone-500 mt-0.5">
                Favorite: {context.rebookingPrediction.preferredOccasion}
              </p>
            )}
          </div>

          {/* Revenue Trajectory */}
          <div className="rounded-lg border border-stone-700/40 bg-stone-900 p-3">
            <p className="text-xs text-stone-500 mb-1">Revenue Trajectory</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-stone-100">
                {formatCurrency(context.revenueTrajectory.avgEventValueCents)}
              </p>
              <span className={`text-sm font-medium ${trendColor}`}>
                {trendIcon} {context.revenueTrajectory.trend}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">avg event value</p>
            {context.revenueTrajectory.eventsPerYear && (
              <p className="text-xs text-stone-500 mt-1">
                {context.revenueTrajectory.eventsPerYear} events/year
              </p>
            )}
          </div>
        </div>

        {/* Insights */}
        {context.insights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {context.insights.map((insight, i) => (
              <span key={i} className="text-xs bg-stone-800 text-stone-400 px-2 py-0.5 rounded">
                {insight}
              </span>
            ))}
          </div>
        )}

        {/* Churn Factors (for high/critical only) */}
        {(context.churnRisk.level === 'high' || context.churnRisk.level === 'critical') &&
          context.churnRisk.factors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-800">
              <p className="text-xs font-medium text-stone-400 mb-1">Risk Factors</p>
              <div className="flex flex-wrap gap-2">
                {context.churnRisk.factors.map((factor, i) => (
                  <span key={i} className="text-xs bg-red-950 text-red-300 px-2 py-0.5 rounded">
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  )
}

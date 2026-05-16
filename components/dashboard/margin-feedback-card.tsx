// Margin Feedback Card - compact repricing alerts for the chef dashboard

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getMarginFeedback, type MarginFeedbackResult } from '@/lib/pricing/margin-feedback'

export async function MarginFeedbackCard() {
  const feedback = await getMarginFeedback()

  const hasAlerts =
    feedback.menusNeedingRepricing.length > 0 || feedback.ingredientSpikes.length > 0
  if (!hasAlerts) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Margin Alerts</CardTitle>
        {feedback.summary.averageFoodCostPercent != null && (
          <p className="text-xs text-stone-500 mt-0.5">
            Avg food cost: {feedback.summary.averageFoodCostPercent}% across{' '}
            {feedback.summary.totalMenusChecked} menus
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {feedback.menusNeedingRepricing.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
              Repricing needed
            </p>
            <ul className="space-y-1">
              {feedback.menusNeedingRepricing.slice(0, 5).map((m) => (
                <li key={m.menuId} className="text-sm">
                  <span
                    className={
                      m.severity === 'critical'
                        ? 'text-red-400 font-medium'
                        : 'text-amber-400 font-medium'
                    }
                  >
                    {m.severity === 'critical' ? '!!' : '!'}
                  </span>{' '}
                  <span className="text-stone-200">{m.menuName}</span>
                  <span className="text-stone-500">
                    {' '}
                    &mdash; food cost {m.actualFoodCostPercent}% &gt; target{' '}
                    {m.targetFoodCostPercent}% (+{m.overTargetByPct}%)
                  </span>
                </li>
              ))}
            </ul>
            {feedback.menusNeedingRepricing.length > 5 && (
              <p className="text-xs text-stone-500">
                +{feedback.menusNeedingRepricing.length - 5} more
              </p>
            )}
          </div>
        )}

        {feedback.ingredientSpikes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
              Ingredient spikes
            </p>
            <ul className="space-y-1">
              {feedback.ingredientSpikes.slice(0, 5).map((s) => (
                <li key={s.ingredientId} className="text-sm">
                  <span className="text-amber-400 font-medium">{s.ingredientName}</span>
                  <span className="text-stone-500">
                    {' '}
                    +{s.spikePercent}% above avg, affects {s.affectedMenuCount} menu
                    {s.affectedMenuCount !== 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
            {feedback.ingredientSpikes.length > 5 && (
              <p className="text-xs text-stone-500">+{feedback.ingredientSpikes.length - 5} more</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

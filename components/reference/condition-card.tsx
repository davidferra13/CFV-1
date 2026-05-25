import { Card, CardContent } from '@/components/ui/card'
import type { DietaryConditionReference } from '@/lib/reference/types'
import {
  CONDITION_CATEGORY_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
} from '@/lib/reference/dietary-conditions'
import { ShieldAlert, AlertTriangle, Check } from '@/components/ui/icons'

export function ConditionCard({ condition }: { condition: DietaryConditionReference }) {
  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-stone-100">{condition.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-stone-500">
                {CONDITION_CATEGORY_LABELS[condition.category]}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${SEVERITY_COLORS[condition.severity]}`}
              >
                {SEVERITY_LABELS[condition.severity]}
              </span>
            </div>
          </div>
          {condition.crossContactRisk && (
            <div className="flex items-center gap-1 text-red-400">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-xs font-medium">Cross-contact risk</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <p className="text-sm text-stone-300">{condition.summary}</p>

        {/* Avoid list */}
        <div>
          <h4 className="text-xs font-medium text-red-400 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Avoid
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {condition.avoidList.map((item) => (
              <span
                key={item}
                className="inline-block px-2 py-0.5 rounded text-xs bg-red-950/50 text-red-300 border border-red-800/30"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-2">{condition.avoidDetails}</p>
        </div>

        {/* Safe alternatives */}
        <div>
          <h4 className="text-xs font-medium text-green-400 mb-1 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Safe Alternatives
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {condition.safeAlternatives.map((item) => (
              <span
                key={item}
                className="inline-block px-2 py-0.5 rounded text-xs bg-green-950/50 text-green-300 border border-green-800/30"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Cross-contact notes */}
        {condition.crossContactNotes && (
          <div>
            <h4 className="text-xs font-medium text-orange-400 mb-1">Cross-Contact Protocol</h4>
            <p className="text-xs text-stone-400">{condition.crossContactNotes}</p>
          </div>
        )}

        {/* Common mistakes */}
        {condition.commonMistakes.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-orange-400 mb-1">Common Mistakes</h4>
            <ul className="text-xs text-stone-400 list-disc list-inside space-y-0.5">
              {condition.commonMistakes.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Client questions */}
        {condition.clientQuestions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-blue-400 mb-1">Questions to Ask the Client</h4>
            <ul className="text-xs text-stone-400 list-disc list-inside space-y-0.5">
              {condition.clientQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Sources */}
        <p className="text-xs text-stone-600 pt-2 border-t border-stone-800">
          Sources: {condition.sources.join(', ')}
        </p>
      </CardContent>
    </Card>
  )
}

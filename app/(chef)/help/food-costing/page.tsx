// Food Costing Knowledge Base
// Full guide rendered as browsable sections with search.
// All content is static from lib/costing/knowledge.ts.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'
import {
  HELP_CONTENT,
  GUIDE_SECTIONS,
  OPERATOR_TARGETS,
  VALIDATION_RANGES,
  PRIME_COST_THRESHOLDS,
  VARIANCE_THRESHOLDS,
  type HelpTopic,
  type OperatorType,
} from '@/lib/costing/knowledge'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Food Costing Guide',
  description: 'Complete food costing methodology and reference for food operators',
}

// Group sections by part
function groupByPart(sections: typeof GUIDE_SECTIONS) {
  const groups: Record<number, typeof GUIDE_SECTIONS> = {}
  for (const s of sections) {
    if (!groups[s.part]) groups[s.part] = []
    groups[s.part].push(s)
  }
  return groups
}

const PART_LABELS: Record<number, string> = {
  1: 'What You Need Before You Can Cost Anything',
  2: 'The Two Methods',
  3: 'Advanced Concepts',
  4: 'Operator-Specific Guidance',
  5: 'Using ChefFlow for Costing',
  6: 'Common Mistakes',
}

export default async function FoodCostingGuidePage() {
  await requireChef()

  const grouped = groupByPart(GUIDE_SECTIONS)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/help"
          className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
        >
          ← Help Center
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-2">Food Costing Guide</h1>
        <p className="text-stone-400 mt-1">
          Everything you need to know about pricing and costing your food. From basic food cost
          percentage to advanced menu engineering.
        </p>
      </div>

      {/* Quick reference card */}
      <Card>
        <CardContent className="py-4">
          <h2 className="text-sm font-semibold text-stone-200 mb-3">Quick Reference</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-stone-500">Default Q-Factor</p>
              <p className="text-stone-200 font-medium">
                {VALIDATION_RANGES.Q_FACTOR_PCT_DEFAULT}%
              </p>
            </div>
            <div>
              <p className="text-stone-500">Target Food Cost</p>
              <p className="text-stone-200 font-medium">
                {VALIDATION_RANGES.TARGET_FOOD_COST_PCT_DEFAULT}%
              </p>
            </div>
            <div>
              <p className="text-stone-500">Prime Cost Threshold</p>
              <p className="text-stone-200 font-medium">{PRIME_COST_THRESHOLDS.ADVISORY}%</p>
            </div>
            <div>
              <p className="text-stone-500">Variance Target</p>
              <p className="text-stone-200 font-medium">&lt; 2 pts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table of contents */}
      <Card>
        <CardContent className="py-4">
          <h2 className="text-sm font-semibold text-stone-200 mb-3">Table of Contents</h2>
          <div className="space-y-4">
            {Object.entries(grouped).map(([part, sections]) => (
              <div key={part}>
                <h3 className="text-xs font-medium text-stone-400 mb-1.5">
                  Part {part}: {PART_LABELS[Number(part)] ?? ''}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="text-xs text-stone-400 hover:text-stone-200 transition-colors py-0.5"
                    >
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Concept cards (from HELP_CONTENT) */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Key Concepts</h2>
        <div className="space-y-3">
          {(Object.entries(HELP_CONTENT) as [HelpTopic, (typeof HELP_CONTENT)[HelpTopic]][]).map(
            ([topic, content]) => (
              <Card key={topic} id={content.guideSection}>
                <CardContent className="py-4">
                  <h3 className="font-semibold text-stone-100 text-sm mb-1">{content.title}</h3>
                  <p className="text-stone-400 text-sm mb-2">{content.summary}</p>

                  {content.formula && (
                    <p className="text-xs font-mono text-stone-500 bg-stone-900 rounded px-2 py-1.5 mb-2">
                      {content.formula}
                    </p>
                  )}

                  {content.targetRange && (
                    <p className="text-xs text-stone-500 mb-2">
                      <span className="font-medium text-stone-400">Target range:</span>{' '}
                      {content.targetRange}
                    </p>
                  )}

                  <p className="text-xs text-stone-500">{content.guidance}</p>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>

      {/* Operator targets table */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-4" id="operator-targets">
          Targets by Operation Type
        </h2>
        <Card>
          <CardContent className="py-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-stone-500 border-b border-stone-700">
                  <th className="pb-2 pr-4 font-medium">Operation Type</th>
                  <th className="pb-2 pr-4 font-medium">Food Cost %</th>
                  <th className="pb-2 pr-4 font-medium">Prime Cost Target</th>
                  <th className="pb-2 pr-4 font-medium">Default Q-Factor</th>
                  <th className="pb-2 font-medium">Re-Cost Frequency</th>
                </tr>
              </thead>
              <tbody className="text-stone-400">
                {(
                  Object.entries(OPERATOR_TARGETS) as [
                    OperatorType,
                    (typeof OPERATOR_TARGETS)[OperatorType],
                  ][]
                )
                  .filter(([key]) => key !== 'custom')
                  .map(([key, t]) => (
                    <tr key={key} className="border-b border-stone-800 last:border-0">
                      <td className="py-1.5 pr-4 text-stone-300">{t.label}</td>
                      <td className="py-1.5 pr-4">
                        {t.foodCostPctLow}-{t.foodCostPctHigh}%
                      </td>
                      <td className="py-1.5 pr-4">{t.primeCostPctTarget}%</td>
                      <td className="py-1.5 pr-4">{t.qFactorDefault}%</td>
                      <td className="py-1.5">{t.recostFrequency}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Variance thresholds */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 mb-4" id="variance-thresholds">
          Variance Response Thresholds
        </h2>
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              {VARIANCE_THRESHOLDS.map((t, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span
                    className={`inline-block w-16 text-center py-0.5 rounded text-xs font-medium ${
                      i === 0
                        ? 'bg-green-900/30 text-green-400'
                        : i === 1
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : i === 2
                            ? 'bg-amber-900/30 text-amber-400'
                            : i === 3
                              ? 'bg-orange-900/30 text-orange-400'
                              : 'bg-red-900/30 text-red-400'
                    }`}
                  >
                    {t.label}
                  </span>
                  <span className="text-stone-500 w-16">
                    {i === 0
                      ? '0-1 pts'
                      : t.maxPoints === Infinity
                        ? '5+ pts'
                        : `${VARIANCE_THRESHOLDS[i - 1].maxPoints}-${t.maxPoints} pts`}
                  </span>
                  <span className="text-stone-400 flex-1">{t.action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <Card>
        <CardContent className="py-4 text-center">
          <p className="text-xs text-stone-500">
            This guide is the canonical source of truth for all food costing methodology in
            ChefFlow. For the complete reference with 150+ yield factors, portion standards, and
            operator cost lines, see the in-app reference tables.
          </p>
          <Link
            href="/culinary/costing"
            className="inline-block mt-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            Go to Costing Dashboard →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

// Cost Line Reference Panel
// Shows operator-specific cost line templates so chefs know what expenses
// to account for when pricing their services. Read-only reference, not a form.

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCostLinesForOperator } from '@/lib/costing/operator-cost-lines'
import type { OperatorCostLine } from '@/lib/costing/operator-cost-lines'
import { archetypeToOperatorType, OPERATOR_TARGETS } from '@/lib/costing/knowledge'
import type { OperatorType } from '@/lib/costing/knowledge'
import { CostingHelpPopover } from './costing-help-popover'

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  labor: 'Labor',
  overhead: 'Overhead',
  incidental: 'Incidental',
  platform: 'Platform / Tech',
  packaging: 'Packaging',
  logistics: 'Logistics / Transport',
  regulatory: 'Regulatory / Compliance',
}

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  labor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  overhead: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  incidental: 'bg-stone-500/10 text-stone-400 border-stone-500/20',
  platform: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  packaging: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  logistics: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  regulatory: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const FREQUENCY_LABELS: Record<string, string> = {
  per_event: 'Per event',
  per_order: 'Per order',
  per_unit: 'Per unit',
  monthly: 'Monthly',
  annual: 'Annual',
  one_time: 'One-time',
}

interface Props {
  archetype?: string | null
}

export function CostLineReferencePanel({ archetype }: Props) {
  const [expanded, setExpanded] = useState(false)
  const operatorType = archetypeToOperatorType(archetype ?? 'private-chef')
  const costLines = getCostLinesForOperator(operatorType)
  const targets = OPERATOR_TARGETS[operatorType] ?? OPERATOR_TARGETS.private_chef

  // Group by category
  const grouped = costLines.reduce<Record<string, OperatorCostLine[]>>((acc, line) => {
    if (!acc[line.category]) acc[line.category] = []
    acc[line.category].push(line)
    return acc
  }, {})

  const defaultLines = costLines.filter((l) => l.isDefault)
  const optionalLines = costLines.filter((l) => !l.isDefault)

  if (costLines.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Cost Lines for Your Operation</CardTitle>
            <CostingHelpPopover topic="cost_plus" />
          </div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            {expanded ? 'Collapse' : `Show all ${costLines.length} lines`}
          </button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Common expenses for your operation type. Food cost target: {targets.foodCostPctLow}-
          {targets.foodCostPctHigh}%, prime cost target: {targets.primeCostPctTarget}%.
        </p>
      </CardHeader>
      <CardContent>
        {!expanded ? (
          // Collapsed: show default lines only
          <div className="space-y-2">
            <p className="text-xs text-stone-500 mb-2">
              Default cost lines ({defaultLines.length}):
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {defaultLines.map((line) => (
                <CostLineRow key={line.id} line={line} compact />
              ))}
            </div>
            {optionalLines.length > 0 && (
              <p className="text-xs text-stone-600 mt-2">+ {optionalLines.length} optional lines</p>
            )}
          </div>
        ) : (
          // Expanded: show all grouped by category
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, lines]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                  {CATEGORY_LABELS[category] ?? category}
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {lines.map((line) => (
                    <CostLineRow key={line.id} line={line} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CostLineRow({ line, compact }: { line: OperatorCostLine; compact?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-stone-800 bg-stone-900/30 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-stone-200 truncate">{line.label}</span>
          {line.isDefault && (
            <Badge variant="info" className="text-[10px] px-1 py-0">
              Default
            </Badge>
          )}
        </div>
        {!compact && line.notes && <p className="text-xs text-stone-500 mt-0.5">{line.notes}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[line.category] ?? CATEGORY_COLORS.incidental}`}
        >
          {CATEGORY_LABELS[line.category] ?? line.category}
        </span>
        <span className="text-[10px] text-stone-600">
          {FREQUENCY_LABELS[line.frequency] ?? line.frequency}
        </span>
      </div>
    </div>
  )
}

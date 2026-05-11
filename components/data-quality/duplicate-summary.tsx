// Duplicate Summary Card
// Overview showing counts of potential duplicates by entity type.

import { Card, CardContent } from '@/components/ui/card'
import type { DuplicateSummary } from '@/lib/data-quality/duplicates'

interface DuplicateSummaryCardProps {
  summary: DuplicateSummary
}

const ENTITY_CONFIG = [
  { key: 'clients' as const, label: 'Clients', icon: '👤', color: 'text-sky-400' },
  { key: 'ingredients' as const, label: 'Ingredients', icon: '🧅', color: 'text-amber-400' },
  { key: 'recipes' as const, label: 'Recipes', icon: '📖', color: 'text-emerald-400' },
]

export function DuplicateSummaryCard({ summary }: DuplicateSummaryCardProps) {
  const total = summary.clients + summary.ingredients + summary.recipes

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Potential Duplicates</h2>
            <p className="text-sm text-stone-400 mt-0.5">
              {total === 0
                ? 'No duplicates detected. Your data is clean.'
                : `${total} potential duplicate ${total === 1 ? 'pair' : 'pairs'} found across your data.`}
            </p>
          </div>
          {total > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-950 border border-amber-800 px-3 py-1 text-xs font-medium text-amber-300">
              {total} found
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ENTITY_CONFIG.map(({ key, label, icon, color }) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-lg border border-stone-700/50 bg-stone-800/40 px-4 py-3"
            >
              <span className="text-xl">{icon}</span>
              <div>
                <p className={`text-2xl font-bold ${summary[key] > 0 ? color : 'text-stone-500'}`}>
                  {summary[key]}
                </p>
                <p className="text-xs text-stone-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MenuRecommendationResult } from '@/lib/analytics/menu-recommendations'

interface MenuRecommendationHintsProps {
  result: MenuRecommendationResult
}

export function MenuRecommendationHints({ result }: MenuRecommendationHintsProps) {
  // Group hints by category
  const grouped = new Map<string, typeof result.hints>()
  for (const hint of result.hints) {
    const cat = hint.category ?? 'other'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(hint)
  }

  return (
    <Card className="p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-stone-900">Recipe Suggestions</h3>
        <Link href="/recipes" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
          Recipe Bible →
        </Link>
      </div>

      {/* Allergen filter notice */}
      {result.allergenWarning.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant="error">Allergen filter active</Badge>
          <span className="text-xs text-stone-500">
            {result.allergenWarning.join(', ')}
          </span>
          {result.filteredOutCount > 0 && (
            <span className="text-xs text-stone-400">
              ({result.filteredOutCount} recipe{result.filteredOutCount !== 1 ? 's' : ''} excluded)
            </span>
          )}
        </div>
      )}

      {result.status === 'insufficient_data' ? (
        <p className="text-sm text-stone-400 italic">
          Add recipes to your Recipe Bible to see suggestions here.
        </p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([category, hints]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 capitalize">
                {category.replace('_', ' ')}
              </p>
              <div className="space-y-1">
                {hints.map(hint => (
                  <div key={hint.id} className="flex items-center justify-between">
                    <Link
                      href={`/recipes/${hint.id}`}
                      className="text-sm text-stone-700 hover:text-brand-600 hover:underline flex-1 min-w-0 truncate"
                    >
                      {hint.name}
                    </Link>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <span className="text-xs text-stone-400">{hint.timesCooked}×</span>
                      {hint.reason === 'both' && <Badge variant="success">proven</Badge>}
                      {hint.reason === 'popular' && <Badge variant="info">popular</Badge>}
                      {hint.reason === 'recent' && <Badge variant="default">recent</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-stone-400 italic pt-1 border-t border-stone-100">
            Based on your cooking history. Add any recipe to this menu using the editor above.
          </p>
        </div>
      )}
    </Card>
  )
}

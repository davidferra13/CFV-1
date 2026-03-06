import { getDietaryIntelligence } from '@/lib/intelligence/dietary-trends'

export async function DietaryTrendsBar() {
  const dietary = await getDietaryIntelligence().catch(() => null)

  if (!dietary || dietary.trends.length === 0) return null

  const growing = dietary.trends.filter((t) => t.trend === 'growing')
  const topRestrictions = dietary.trends.slice(0, 5)

  return (
    <div className="space-y-2">
      {/* Top restrictions */}
      <div className="flex flex-wrap gap-2">
        {topRestrictions.map((t) => (
          <span
            key={t.restriction}
            className={`text-xs px-2 py-1 rounded-full border ${
              t.trend === 'growing'
                ? 'bg-emerald-950/50 border-emerald-800/40 text-emerald-400'
                : t.trend === 'declining'
                  ? 'bg-red-950/50 border-red-800/40 text-red-400'
                  : 'bg-stone-800 border-stone-700/40 text-stone-400'
            }`}
          >
            {t.restriction} ({t.percentOfClients}%)
            {t.trend === 'growing' ? ' ↑' : t.trend === 'declining' ? ' ↓' : ''}
          </span>
        ))}
      </div>

      {/* Growing trends callout */}
      {growing.length > 0 && (
        <p className="text-xs text-stone-500">
          Growing dietary needs: {growing.map((g) => g.restriction).join(', ')} — consider expanding
          menu options
        </p>
      )}

      {/* Common combos */}
      {dietary.commonCombinations.length > 0 && (
        <p className="text-xs text-stone-500">
          Common combos:{' '}
          {dietary.commonCombinations
            .slice(0, 2)
            .map((c) => c.restrictions.join(' + '))
            .join('; ')}
        </p>
      )}
    </div>
  )
}

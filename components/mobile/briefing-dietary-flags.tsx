'use client'

import { AlertTriangle } from '@/components/ui/icons'

const ALLERGY_COLORS: Record<string, string> = {
  nuts: 'bg-red-900 text-red-200',
  peanuts: 'bg-red-900 text-red-200',
  'tree nuts': 'bg-red-900 text-red-200',
  shellfish: 'bg-red-900 text-red-200',
  dairy: 'bg-yellow-900 text-yellow-200',
  lactose: 'bg-yellow-900 text-yellow-200',
  gluten: 'bg-orange-900 text-orange-200',
  'gluten-free': 'bg-orange-900 text-orange-200',
  soy: 'bg-purple-900 text-purple-200',
  eggs: 'bg-amber-900 text-amber-200',
  fish: 'bg-blue-900 text-blue-200',
  sesame: 'bg-stone-700 text-stone-200',
}

function getAllergyColor(flag: string): string {
  const lower = flag.toLowerCase()
  return ALLERGY_COLORS[lower] ?? 'bg-stone-700 text-stone-200'
}

export function BriefingDietaryFlags({
  guestCount,
  dietaryRestrictions,
  allergies,
}: {
  guestCount: number
  dietaryRestrictions: string[]
  allergies: string[]
}) {
  const hasFlags = dietaryRestrictions.length > 0 || allergies.length > 0

  return (
    <div className="space-y-3">
      {/* Guest count */}
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-stone-100">{guestCount}</span>
        <span className="text-base text-stone-400">
          {guestCount === 1 ? 'guest' : 'guests'}
        </span>
      </div>

      {/* Dietary flags */}
      {hasFlags && (
        <div className="space-y-2">
          {allergies.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-1" weight="fill" />
              <div className="flex flex-wrap gap-1.5">
                {allergies.map((a) => (
                  <span
                    key={a}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${getAllergyColor(a)}`}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {dietaryRestrictions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-6">
              {dietaryRestrictions.map((r) => (
                <span
                  key={r}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-800 text-stone-300"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

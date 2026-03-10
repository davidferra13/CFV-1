'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { DailySpecial, SpecialCategory } from '@/lib/commerce/daily-specials-actions'
import { toggleSpecialAvailability } from '@/lib/commerce/daily-specials-actions'
import { Badge } from '@/components/ui/badge'

// ============================================
// CATEGORY STYLES
// ============================================

const CATEGORY_COLORS: Record<SpecialCategory, string> = {
  appetizer: 'info',
  entree: 'success',
  dessert: 'warning',
  drink: 'default',
  side: 'default',
}

// ============================================
// TODAY'S SPECIALS (compact)
// ============================================

interface TodaysSpecialsProps {
  specials: DailySpecial[]
}

export function TodaysSpecials({ specials }: TodaysSpecialsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (specials.length === 0) {
    return <div className="text-center py-4 text-stone-500 text-sm">No specials today</div>
  }

  async function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleSpecialAvailability(id)
        router.refresh()
      } catch (err) {
        console.error('[todays-specials] toggle error:', err)
      }
    })
  }

  return (
    <div className="space-y-2">
      {specials.map((special) => (
        <div
          key={special.id}
          className={`flex items-center justify-between p-3 rounded-lg border ${
            special.available
              ? 'border-stone-700 bg-stone-800/40'
              : 'border-stone-800 bg-stone-900/40 opacity-60'
          }`}
        >
          <div className="flex items-center gap-3">
            <Badge variant={CATEGORY_COLORS[special.category] as any}>{special.category}</Badge>
            <div>
              <span className="text-stone-200 font-medium">{special.name}</span>
              {special.description && (
                <p className="text-xs text-stone-500 mt-0.5">{special.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-stone-300 font-medium">
              ${(special.priceCents / 100).toFixed(2)}
            </span>
            <button
              onClick={() => handleToggle(special.id)}
              disabled={isPending}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                special.available
                  ? 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'
                  : 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
              }`}
            >
              {special.available ? 'Available' : 'Sold Out'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Allergen & Dietary Flag Badges
// Small colored badges for displaying allergen/dietary info on product cards,
// menu displays, and KDS tickets. Reusable across the app.

import { ALLERGENS, DIETARY_FLAGS } from '@/lib/commerce/allergen-config'

type AllergenBadgesProps = {
  allergens: string[]
  dietaryFlags: string[]
  compact?: boolean
}

const ALLERGEN_MAP = new Map(ALLERGENS.map((a) => [a.id, a]))
const DIETARY_MAP = new Map(DIETARY_FLAGS.map((d) => [d.id, d]))

export function AllergenBadges({ allergens, dietaryFlags, compact = false }: AllergenBadgesProps) {
  if (allergens.length === 0 && dietaryFlags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {allergens.map((id) => {
        const info = ALLERGEN_MAP.get(id)
        if (!info) return null
        return (
          <span
            key={id}
            className={`inline-flex items-center gap-0.5 rounded-full bg-red-950/50 border border-red-800/50 text-red-300 ${
              compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
            }`}
            title={info.label}
          >
            <span>{info.icon}</span>
            {!compact && <span>{info.label}</span>}
          </span>
        )
      })}
      {dietaryFlags.map((id) => {
        const info = DIETARY_MAP.get(id)
        if (!info) return null
        return (
          <span
            key={id}
            className={`inline-flex items-center rounded-full ${info.color} text-white ${
              compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
            }`}
            title={info.label}
          >
            {info.label}
          </span>
        )
      })}
    </div>
  )
}

// Standalone allergen icon row (for compact displays like KDS tickets)
export function AllergenIcons({ allergens }: { allergens: string[] }) {
  if (allergens.length === 0) return null
  return (
    <span
      className="inline-flex gap-0.5"
      title={allergens.map((id) => ALLERGEN_MAP.get(id)?.label ?? id).join(', ')}
    >
      {allergens.map((id) => {
        const info = ALLERGEN_MAP.get(id)
        return info ? (
          <span key={id} className="text-sm">
            {info.icon}
          </span>
        ) : null
      })}
    </span>
  )
}

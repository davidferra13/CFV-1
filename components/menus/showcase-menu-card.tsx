'use client'

import { Badge } from '@/components/ui/badge'

type ShowcaseMenuCardProps = {
  menu: {
    id: string
    name: string
    description: string | null
    cuisineType: string | null
    serviceStyle: string | null
    dishCount: number
    timesUsed?: number
    dishes?: Array<{
      courseName: string
      description: string | null
      dietaryTags: string[]
    }>
  }
  onClick: (menuId: string) => void
  selected?: boolean
}

export function ShowcaseMenuCard({ menu, onClick, selected }: ShowcaseMenuCardProps) {
  // Collect unique dietary tags across all dishes
  const allTags = [...new Set((menu.dishes ?? []).flatMap((d) => d.dietaryTags))]

  return (
    <button
      type="button"
      onClick={() => onClick(menu.id)}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:border-brand-500 hover:shadow-md ${
        selected
          ? 'border-brand-500 bg-brand-950/30 ring-1 ring-brand-500'
          : 'border-stone-700 bg-stone-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-stone-100 text-sm leading-tight">{menu.name}</h3>
        <span className="text-xs text-stone-500 whitespace-nowrap">{menu.dishCount} courses</span>
      </div>

      {menu.description && (
        <p className="text-xs text-stone-400 mb-2 line-clamp-2">{menu.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {menu.cuisineType && <Badge variant="default">{menu.cuisineType}</Badge>}
        {menu.serviceStyle && <Badge variant="info">{menu.serviceStyle.replace('_', ' ')}</Badge>}
        {allTags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="warning">
            {tag}
          </Badge>
        ))}
        {allTags.length > 3 && <Badge variant="default">+{allTags.length - 3}</Badge>}
      </div>

      {(menu.timesUsed ?? 0) > 0 && (
        <p className="text-xs text-stone-500 mt-2">
          Used {menu.timesUsed} time{menu.timesUsed === 1 ? '' : 's'}
        </p>
      )}
    </button>
  )
}

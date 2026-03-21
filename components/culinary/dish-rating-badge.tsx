'use client'

interface DishRatingBadgeProps {
  avgRating: number
  totalReviews: number
  wouldServeAgainPct?: number
}

export function DishRatingBadge({
  avgRating,
  totalReviews,
  wouldServeAgainPct,
}: DishRatingBadgeProps) {
  if (totalReviews === 0) return null

  const color =
    avgRating >= 4.0 ? 'text-emerald-400' : avgRating >= 3.0 ? 'text-stone-300' : 'text-amber-400'

  const serveAgainText =
    wouldServeAgainPct != null ? ` ${wouldServeAgainPct}% would serve again.` : ''

  const tooltip = `Average rating: ${avgRating} from ${totalReviews} event${totalReviews === 1 ? '' : 's'}.${serveAgainText}`

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] leading-none font-medium ${color}`}
      title={tooltip}
    >
      <span className="text-[9px]">&#9733;</span>
      <span>{avgRating}</span>
      <span className="text-stone-500">({totalReviews})</span>
    </span>
  )
}

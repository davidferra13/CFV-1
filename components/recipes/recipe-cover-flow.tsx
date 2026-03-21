'use client'

import { useState, useCallback, useEffect, useRef, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { RecipeListItem } from '@/lib/recipes/actions'
import { useTaxonomy } from '@/components/hooks/use-taxonomy'

const CATEGORY_COLORS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  sauce: 'warning',
  protein: 'error',
  starch: 'default',
  vegetable: 'success',
  dessert: 'info',
  pasta: 'warning',
  soup: 'info',
  salad: 'success',
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  sauce: 'from-amber-900 to-orange-800',
  protein: 'from-red-900 to-rose-800',
  starch: 'from-stone-700 to-stone-600',
  vegetable: 'from-emerald-900 to-green-800',
  fruit: 'from-pink-900 to-fuchsia-800',
  dessert: 'from-brand-900 to-violet-800',
  bread: 'from-amber-800 to-yellow-700',
  pasta: 'from-yellow-900 to-amber-800',
  soup: 'from-brand-900 to-teal-800',
  salad: 'from-lime-900 to-emerald-800',
  appetizer: 'from-orange-900 to-red-800',
  condiment: 'from-yellow-800 to-lime-700',
  beverage: 'from-brand-900 to-brand-800',
  other: 'from-stone-800 to-stone-700',
}

type Props = {
  recipes: RecipeListItem[]
}

export function RecipeCoverFlow({ recipes }: Props) {
  const [activeIndex, setActiveIndex] = useState(Math.min(2, Math.floor(recipes.length / 2)))
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // Taxonomy-driven display labels
  const { entries: cuisineEntries } = useTaxonomy('cuisine')
  const { entries: mealTypeEntries } = useTaxonomy('meal_type')
  const cuisineLabelMap = Object.fromEntries(cuisineEntries.map((e) => [e.value, e.displayLabel]))
  const mealTypeLabelMap = Object.fromEntries(mealTypeEntries.map((e) => [e.value, e.displayLabel]))

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(Math.max(0, Math.min(recipes.length - 1, index)))
    },
    [recipes.length]
  )

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goPrev, goNext])

  // Touch/swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Only swipe if horizontal movement > vertical (not scrolling)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) goPrev()
      else goNext()
    }
  }

  // Mouse wheel navigation
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (e.deltaX > 30) goNext()
        else if (e.deltaX < -30) goPrev()
      }
    },
    [goNext, goPrev]
  )

  if (recipes.length === 0) return null

  const active = recipes[activeIndex]

  return (
    <div className="space-y-4">
      {/* Cover Flow Stage */}
      <div
        ref={containerRef}
        className="relative h-[420px] overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ perspective: '1200px' }}
      >
        {/* Reflection surface */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-stone-950/80 to-transparent pointer-events-none z-10" />

        {/* Cards */}
        <div className="absolute inset-0 flex items-center justify-center">
          {recipes.map((recipe, i) => {
            const offset = i - activeIndex
            const absOffset = Math.abs(offset)

            // Only render cards within visible range
            if (absOffset > 4) return null

            const isActive = offset === 0
            const translateX = isActive ? 0 : offset * 160 + (offset > 0 ? 80 : -80)
            const translateZ = isActive ? 100 : -80 * absOffset
            const rotateY = isActive ? 0 : offset > 0 ? -55 : 55
            const scale = isActive ? 1 : 0.75
            const opacity = absOffset > 3 ? 0 : 1
            const zIndex = 100 - absOffset

            return (
              <button
                key={recipe.id}
                onClick={() => {
                  if (isActive) return // Link handles active click
                  goTo(i)
                }}
                className="absolute transition-all duration-500 ease-out focus:outline-none"
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                }}
              >
                {isActive ? (
                  <Link href={`/recipes/${recipe.id}`} className="block">
                    <CoverCard recipe={recipe} isActive />
                  </Link>
                ) : (
                  <CoverCard recipe={recipe} isActive={false} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Recipe Detail Strip */}
      <div className="text-center space-y-2 min-h-[100px]">
        <Link
          href={`/recipes/${active.id}`}
          className="inline-block hover:text-brand-400 transition-colors"
        >
          <h2 className="text-2xl font-bold text-stone-100">{active.name}</h2>
        </Link>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Badge variant={CATEGORY_COLORS[active.category] || 'default'}>{active.category}</Badge>
          {active.cuisine && (
            <span className="text-sm text-brand-400">
              {cuisineLabelMap[active.cuisine] || active.cuisine}
            </span>
          )}
          {active.meal_type && active.meal_type !== 'any' && (
            <span className="text-sm text-purple-400">
              {mealTypeLabelMap[active.meal_type] || active.meal_type}
            </span>
          )}
        </div>

        {active.method && (
          <p className="text-sm text-stone-400 max-w-lg mx-auto line-clamp-2">{active.method}</p>
        )}

        <div className="flex items-center justify-center gap-4 text-xs text-stone-500">
          {active.ingredient_count != null && (
            <span>
              {active.ingredient_count} ingredient{active.ingredient_count !== 1 ? 's' : ''}
            </span>
          )}
          {active.calories_per_serving != null && (
            <span>{active.calories_per_serving} kcal/serving</span>
          )}
          {active.times_cooked > 0 && <span>Cooked {active.times_cooked}x</span>}
          {active.total_cost_cents != null && (
            <span>
              {active.has_all_prices ? '' : '~'}${(active.total_cost_cents / 100).toFixed(2)}
              {!active.has_all_prices ? ' est.' : ''}
            </span>
          )}
        </div>

        {/* Navigation dots */}
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="p-1 text-stone-500 hover:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous recipe"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12 15L7 10L12 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <span className="text-xs text-stone-500 tabular-nums px-2">
            {activeIndex + 1} / {recipes.length}
          </span>

          <button
            onClick={goNext}
            disabled={activeIndex === recipes.length - 1}
            className="p-1 text-stone-500 hover:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next recipe"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M8 5L13 10L8 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Memoized: rendered in .map() for each recipe in the cover flow carousel.
const CoverCard = memo(function CoverCard({
  recipe,
  isActive,
}: {
  recipe: RecipeListItem
  isActive: boolean
}) {
  const gradient = CATEGORY_GRADIENTS[recipe.category] || CATEGORY_GRADIENTS.other

  return (
    <div
      className={`
        w-[240px] h-[320px] rounded-2xl overflow-hidden shadow-2xl
        transition-shadow duration-500
        ${isActive ? 'shadow-brand-500/20 ring-2 ring-brand-500/30' : 'shadow-black/40'}
      `}
    >
      {recipe.photo_url ? (
        <div className="relative w-full h-full">
          <Image
            src={recipe.photo_url}
            alt={recipe.name}
            fill
            sizes="240px"
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-white leading-tight">{recipe.name}</h3>
            <p className="text-xs text-white/70 mt-1 capitalize">{recipe.category}</p>
          </div>
        </div>
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col justify-between p-5`}
        >
          {/* Category icon area */}
          <div className="flex justify-end">
            <span className="text-white/20 text-6xl font-serif italic select-none">
              {recipe.name.charAt(0)}
            </span>
          </div>

          {/* Recipe info */}
          <div>
            <h3 className="text-lg font-bold text-white leading-tight mb-1">{recipe.name}</h3>
            <p className="text-xs text-white/60 capitalize">{recipe.category}</p>
            {recipe.dietary_tags?.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {recipe.dietary_tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-xxs px-1.5 py-0.5 bg-white/10 text-white/70 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

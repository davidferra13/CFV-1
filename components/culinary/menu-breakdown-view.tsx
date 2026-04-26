'use client'

// MenuBreakdownView - Collapsible tree showing full menu cost hierarchy
// Menu > Course > Dish > Component > Recipe > Ingredient
// Each level shows scaled quantities and costs

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMenuBreakdown } from '@/lib/menus/menu-intelligence-actions'
import type {
  MenuCostBreakdown,
  CourseBreakdown,
  ComponentBreakdown,
  IngredientBreakdown,
} from '@/lib/menus/menu-intelligence-actions'

interface MenuBreakdownViewProps {
  menuId: string
  className?: string
}

function formatCents(cents: number | null): string {
  if (cents === null) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

function formatQuantity(qty: number, unit: string): string {
  const rounded = Math.round(qty * 100) / 100
  return `${rounded} ${unit}`.trim()
}

// Collapsible section
function CollapsibleSection({
  title,
  subtitle,
  cost,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string
  subtitle?: string
  cost?: string
  badge?: { text: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-l-2 border-stone-700 pl-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-stone-800/30 rounded-r-md px-2 -ml-2 transition-colors"
      >
        <span className="text-stone-500 text-xs w-4">{open ? '▼' : '▶'}</span>
        <span className="text-sm text-stone-200 font-medium flex-1 truncate">{title}</span>
        {subtitle && (
          <span className="text-xs text-stone-500 truncate max-w-[120px]">{subtitle}</span>
        )}
        {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
        {cost && <span className="text-sm text-stone-300 font-mono tabular-nums">{cost}</span>}
      </button>
      {open && <div className="ml-4 mt-1 space-y-1">{children}</div>}
    </div>
  )
}

function IngredientRow({
  ingredient,
  scaleFactor,
  showFormulas,
}: {
  ingredient: IngredientBreakdown
  scaleFactor: number
  showFormulas: boolean
}) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 text-xs hover:bg-stone-800/20 rounded">
      <span className="w-2 h-2 rounded-full bg-stone-600 flex-shrink-0" />
      <span className="text-stone-300 flex-1 truncate">{ingredient.name}</span>
      <span className="text-stone-500 tabular-nums">
        {formatQuantity(ingredient.scaledQuantity, ingredient.unit)}
      </span>
      {ingredient.hasMissingPrice ? (
        <span className="text-amber-400 text-xxs font-medium w-16 text-right">no price</span>
      ) : (
        <span className="text-stone-400 font-mono tabular-nums text-right whitespace-nowrap">
          {showFormulas && ingredient.priceCents !== null && (
            <span className="text-xs text-stone-500 mr-2">
              {formatQuantity(ingredient.quantity, ingredient.unit)} x{' '}
              {formatCents(ingredient.priceCents)}/{ingredient.unit}
              {scaleFactor !== 1 ? ` x ${scaleFactor}x` : ''} =
            </span>
          )}
          {formatCents(ingredient.scaledCostCents)}
        </span>
      )}
    </div>
  )
}

function ComponentSection({
  component,
  showFormulas,
}: {
  component: ComponentBreakdown
  showFormulas: boolean
}) {
  const hasIngredients = component.ingredients.length > 0

  if (!hasIngredients) {
    return (
      <div className="flex items-center gap-2 py-1 px-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-stone-600 flex-shrink-0" />
        <span className="text-stone-300">{component.componentName}</span>
        <Badge variant="default">{component.category}</Badge>
        {component.scaleFactor !== 1 && (
          <span className="text-stone-500">{component.scaleFactor}x</span>
        )}
        <span className="ml-auto text-stone-400 font-mono tabular-nums">
          {formatCents(component.scaledCostCents)}
        </span>
      </div>
    )
  }

  return (
    <CollapsibleSection
      title={component.componentName}
      subtitle={component.recipeName ? `Recipe: ${component.recipeName}` : undefined}
      cost={formatCents(component.scaledCostCents)}
      badge={
        component.scaleFactor !== 1
          ? { text: `${component.scaleFactor}x`, variant: 'info' as const }
          : undefined
      }
    >
      {component.ingredients.map((ing) => (
        <IngredientRow
          key={ing.ingredientId}
          ingredient={ing}
          scaleFactor={component.scaleFactor}
          showFormulas={showFormulas}
        />
      ))}
    </CollapsibleSection>
  )
}

function CourseSection({
  course,
  showFormulas,
}: {
  course: CourseBreakdown
  showFormulas: boolean
}) {
  return (
    <CollapsibleSection
      title={`Course ${course.courseNumber}: ${course.courseName}`}
      subtitle={course.dishName || undefined}
      cost={formatCents(course.totalCostCents)}
      defaultOpen
    >
      {course.components.length === 0 ? (
        <p className="text-xs text-stone-500 py-1 px-2">No components yet</p>
      ) : (
        course.components.map((comp) => (
          <ComponentSection key={comp.componentId} component={comp} showFormulas={showFormulas} />
        ))
      )}
    </CollapsibleSection>
  )
}

export function MenuBreakdownView({ menuId, className = '' }: MenuBreakdownViewProps) {
  const [isPending, startTransition] = useTransition()
  const [breakdown, setBreakdown] = useState<MenuCostBreakdown | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showFormulas, setShowFormulas] = useState(false)

  const loadBreakdown = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await getMenuBreakdown(menuId)
        setBreakdown(result)
        setLoadError(null)
      } catch (err) {
        console.error('[MenuBreakdownView] Failed to load:', err)
        setLoadError('Could not load menu breakdown')
      }
    })
  }, [menuId, startTransition])

  useEffect(() => {
    loadBreakdown()
  }, [loadBreakdown])

  if (loadError) {
    return (
      <div className={`rounded-lg border border-red-500/30 bg-red-500/10 p-4 ${className}`}>
        <p className="text-sm text-red-300">{loadError}</p>
        <Button variant="ghost" size="sm" onClick={loadBreakdown} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  if (!breakdown && isPending) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-stone-700 rounded w-1/3" />
          <div className="h-4 bg-stone-700 rounded w-full" />
          <div className="h-4 bg-stone-700 rounded w-5/6" />
          <div className="h-4 bg-stone-700 rounded w-4/6" />
        </div>
      </div>
    )
  }

  if (!breakdown) return null

  const hasCourses = breakdown.courses.length > 0

  return (
    <div className={`rounded-lg border border-stone-700 bg-stone-800/50 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-stone-300">Cost Breakdown</h3>
          <div className="flex items-center gap-2">
            {breakdown.alerts.map((alert, i) => (
              <Badge key={i} variant={alert.level === 'critical' ? 'error' : 'warning'}>
                {alert.level === 'critical' ? 'High cost' : 'Check cost'}
              </Badge>
            ))}
            {isPending && <span className="text-xs text-stone-500">Refreshing...</span>}
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-4 py-3 bg-stone-900/30 border-b border-stone-800 flex items-center gap-4 text-xs">
        <div>
          <span className="text-stone-500">Total: </span>
          <span className="text-stone-200 font-medium font-mono">
            {formatCents(breakdown.totalCostCents)}
          </span>
        </div>
        <div>
          <span className="text-stone-500">Per guest: </span>
          <span className="text-stone-200 font-medium font-mono">
            {formatCents(breakdown.costPerGuestCents)}
          </span>
        </div>
        <div>
          <span className="text-stone-500">Guests: </span>
          <span className="text-stone-200 font-medium">{breakdown.guestCount}</span>
        </div>
        {breakdown.foodCostPercent !== null && (
          <div>
            <span className="text-stone-500">Food cost: </span>
            <span
              className={`font-medium ${
                breakdown.foodCostPercent > 45
                  ? 'text-red-400'
                  : breakdown.foodCostPercent > 35
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {breakdown.foodCostPercent.toFixed(1)}%
            </span>
          </div>
        )}
        {!breakdown.hasAllPrices && (
          <Badge variant="warning">{breakdown.missingPriceCount} missing</Badge>
        )}
      </div>

      {/* Course tree */}
      <div className="p-4 space-y-2">
        <label className="flex items-center gap-2 text-sm text-stone-400 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showFormulas}
            onChange={(e) => setShowFormulas(e.target.checked)}
            className="rounded border-stone-600"
          />
          Show calculation formulas
        </label>
        {!hasCourses ? (
          <p className="text-sm text-stone-500 text-center py-4">
            No courses added yet. Add courses to see the cost breakdown.
          </p>
        ) : (
          breakdown.courses.map((course) => (
            <CourseSection key={course.dishId} course={course} showFormulas={showFormulas} />
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import type {
  ContextualRailData,
  ContextualRailCategoryData,
  RailCategory,
} from '@/lib/discovery/contextual-rail-types'
import { cn } from '@/lib/utils'
import { CategorySection } from './category-section'

// ---------------------------------------------------------------------------
// Chevron Up SVG
// ---------------------------------------------------------------------------

function ChevronUpIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-stone-500"
    >
      <path
        d="M4 10L8 6L12 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Column assignment: spread categories evenly, primary in column 1
// ---------------------------------------------------------------------------

function assignColumns(
  categories: RailCategory[],
  primaryCategory: RailCategory,
  columnCount: number
): RailCategory[][] {
  const columns: RailCategory[][] = Array.from({ length: columnCount }, () => [])

  // Exclude 'actions' (renders separately at bottom)
  const active = categories.filter((c) => c !== 'actions')

  // Primary first, then the rest in original order
  const ordered = [primaryCategory, ...active.filter((c) => c !== primaryCategory)]

  // Round-robin into columns
  ordered.forEach((cat, i) => {
    columns[i % columnCount].push(cat)
  })

  return columns
}

// ---------------------------------------------------------------------------
// Action bar at bottom
// ---------------------------------------------------------------------------

function ActionsRow({ categoryData }: { categoryData: ContextualRailCategoryData }) {
  if (categoryData.items.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-stone-800/40">
      {categoryData.items.map((item) => (
        <a
          key={item.definitionId}
          href={item.destination}
          className={cn(
            'inline-flex items-center h-8 px-3 rounded-md text-xs font-medium',
            'bg-stone-800 text-stone-200 hover:bg-stone-700 transition-colors',
            'no-underline'
          )}
        >
          {item.label}
        </a>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ExpandedPanel
// ---------------------------------------------------------------------------

export function ExpandedPanel({
  data,
  onCollapse,
}: {
  data: ContextualRailData
  onCollapse: () => void
}) {
  const isColumns = data.profile.layout === 'columns'
  const columnCount = data.profile.columnCount ?? 2

  const columns = isColumns
    ? assignColumns(data.profile.categories, data.profile.primaryCategory, columnCount)
    : [data.profile.categories.filter((c) => c !== 'actions')]

  const hasActions = data.categories.actions && data.categories.actions.items.length > 0

  const gridColsClass =
    columnCount === 2
      ? 'md:grid-cols-2'
      : columnCount === 3
        ? 'md:grid-cols-3'
        : columnCount === 4
          ? 'md:grid-cols-4'
          : 'md:grid-cols-2'

  return (
    <div
      className={cn(
        'bg-stone-950/95 backdrop-blur-md',
        'border border-stone-800/60 rounded-b-lg',
        'shadow-lg shadow-black/20',
        'max-h-[280px] overflow-y-auto scrollbar-thin'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-stone-800/40">
        <span className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
          Contextual Rail
        </span>
        <button
          type="button"
          onClick={onCollapse}
          className="flex items-center justify-center w-8 h-8 rounded hover:bg-stone-800/60 transition-colors cursor-pointer"
          aria-label="Collapse rail"
        >
          <ChevronUpIcon />
        </button>
      </div>

      {/* Category grid */}
      <div
        className={cn(
          'grid gap-3 px-3 py-2',
          isColumns ? `grid-cols-1 ${gridColsClass}` : 'grid-cols-1'
        )}
      >
        {columns.map((colCategories, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-2">
            {colCategories.map((cat) => {
              const catData = data.categories[cat]
              if (!catData || catData.items.length === 0) return null
              return (
                <CategorySection
                  key={cat}
                  category={catData.category}
                  items={catData.items}
                  colorClass={catData.colorClass}
                  label={catData.label}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      {hasActions && <ActionsRow categoryData={data.categories.actions} />}
    </div>
  )
}

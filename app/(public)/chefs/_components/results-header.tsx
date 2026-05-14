import Link from 'next/link'
import { X } from '@/components/ui/icons'

type ResultsHeaderProps = {
  resultCount: number
  totalCount: number
  activeFilters: Array<{ label: string; removeHref: string }>
  sortLabel: string
  hasFilters: boolean
}

export function ResultsHeader({
  resultCount,
  totalCount,
  activeFilters,
  sortLabel,
  hasFilters,
}: ResultsHeaderProps) {
  const isFiltered = resultCount !== totalCount

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-stone-400">
          {isFiltered ? (
            <>
              {resultCount} of {totalCount} chef{totalCount !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              {totalCount} chef{totalCount !== 1 ? 's' : ''}
            </>
          )}
          <span className="ml-2 text-stone-600">sorted by {sortLabel}</span>
        </p>

        {hasFilters && (
          <Link
            href="/chefs"
            className="text-xs text-stone-500 transition-colors hover:text-stone-300"
          >
            Clear all
          </Link>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Link
              key={filter.label}
              href={filter.removeHref}
              className="group inline-flex items-center gap-1.5 rounded-full border border-stone-600 bg-stone-900 px-3 py-1 text-xs text-stone-300 transition-colors hover:border-red-700/50 hover:bg-red-950/20 hover:text-red-300"
            >
              {filter.label}
              <X className="h-3 w-3 text-stone-500 transition-colors group-hover:text-red-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

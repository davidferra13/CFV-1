'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { ImageWithFallback } from '@/components/pricing/image-with-fallback'
import {
  type IngredientInspirationDetail,
  type SeasonalCalendarData,
  type SeasonalCalendarItem,
  formatAvailabilityWindow,
  getIngredientInspirationDetail,
  getSeasonalCalendarForMonth,
  MONTH_NAMES,
} from '@/lib/openclaw/seasonal-calendar-actions'
import { cn } from '@/lib/utils'

// --- Search + Filter Bar ---

function SearchFilterBar({
  search,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  totalVisible,
}: {
  search: string
  onSearchChange: (v: string) => void
  categories: string[]
  selectedCategory: string | null
  onCategoryChange: (c: string | null) => void
  totalVisible: number
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-stone-800 bg-stone-900/60 py-2.5 pl-10 pr-4 text-sm text-stone-100 placeholder-stone-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
        {search && (
          <button
            type="button"
            title="Clear search"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
            !selectedCategory
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat === selectedCategory ? null : cat)}
            className={cn(
              'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
              cat === selectedCategory
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            )}
          >
            {cat}
          </button>
        ))}
        <span className="ml-auto flex-shrink-0 text-xs text-stone-600">{totalVisible} showing</span>
      </div>
    </div>
  )
}

// --- Month Ribbon ---

function MonthRibbon({
  currentMonth,
  selectedMonth,
  onSelect,
  sectionCounts,
}: {
  currentMonth: number
  selectedMonth: number
  onSelect: (month: number) => void
  sectionCounts: { peaking: number; lastChance: number; coming: number }
}) {
  const shortMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/60 p-1.5">
        {shortMonths.map((label, i) => {
          const month = i + 1
          const isSelected = month === selectedMonth
          const isCurrent = month === currentMonth
          return (
            <button
              key={month}
              onClick={() => onSelect(month)}
              className={cn(
                'relative flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              )}
            >
              {label}
              {isCurrent && !isSelected && (
                <span className="absolute -top-0.5 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          )
        })}
      </div>
      {/* Summary chips */}
      <div className="flex gap-2 text-xs">
        {sectionCounts.peaking > 0 && (
          <span className="rounded-md bg-emerald-900/40 px-2 py-0.5 text-emerald-400">
            {sectionCounts.peaking} peaking
          </span>
        )}
        {sectionCounts.lastChance > 0 && (
          <span className="rounded-md bg-amber-900/40 px-2 py-0.5 text-amber-400">
            {sectionCounts.lastChance} ending soon
          </span>
        )}
        {sectionCounts.coming > 0 && (
          <span className="rounded-md bg-sky-900/40 px-2 py-0.5 text-sky-400">
            {sectionCounts.coming} coming next
          </span>
        )}
      </div>
    </div>
  )
}

// --- Mini Month Bar (on cards) ---

function MiniMonthBar({
  peakMonths,
  availableMonths,
  selectedMonth,
}: {
  peakMonths: number[]
  availableMonths: number[]
  selectedMonth: number
}) {
  return (
    <div className="flex gap-px">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
        <div
          key={m}
          className={cn(
            'h-1 flex-1 rounded-full',
            m === selectedMonth && 'ring-1 ring-white/40',
            peakMonths.includes(m)
              ? 'bg-emerald-500'
              : availableMonths.includes(m)
                ? 'bg-stone-600'
                : 'bg-stone-800/40'
          )}
        />
      ))}
    </div>
  )
}

// --- Ingredient Card ---

function IngredientCard({
  item,
  selectedMonth,
  onSelect,
}: {
  item: SeasonalCalendarItem
  selectedMonth: number
  onSelect: (item: SeasonalCalendarItem) => void
}) {
  const window = formatAvailabilityWindow(item.peakMonths)

  return (
    <button
      onClick={() => onSelect(item)}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-800 bg-stone-900/60 text-left transition-all hover:border-stone-600 hover:bg-stone-900"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <ImageWithFallback
          src={item.imageUrl}
          alt={item.ingredientName}
          category={item.category ?? undefined}
          className="h-full w-full transition-transform group-hover:scale-105"
        />
        {item.bestPriceCents != null && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-emerald-300">
            ${(item.bestPriceCents / 100).toFixed(2)}
          </span>
        )}
        {item.confidence != null && item.confidence >= 0.8 && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-emerald-300">
            High confidence
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="text-sm font-semibold capitalize leading-tight text-stone-100 group-hover:text-emerald-300">
          {item.ingredientName}
        </h3>
        <p className="text-[11px] text-stone-500">{window}</p>
        <MiniMonthBar
          peakMonths={item.peakMonths}
          availableMonths={item.availableMonths}
          selectedMonth={selectedMonth}
        />
        {item.category && (
          <span className="mt-0.5 inline-block self-start rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-400">
            {item.category}
          </span>
        )}
      </div>
    </button>
  )
}

// --- Inspiration Panel (slide-out) ---

function InspirationPanel({ item, onClose }: { item: SeasonalCalendarItem; onClose: () => void }) {
  const window = formatAvailabilityWindow(item.peakMonths)
  const [detail, setDetail] = useState<IngredientInspirationDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)

  // Keyboard: Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Load detail data on mount
  useEffect(() => {
    setLoadingDetail(true)
    setDetail(null)
    getIngredientInspirationDetail(item.ingredientName, item.systemIngredientId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false))
  }, [item.ingredientName, item.systemIngredientId])

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-stone-800 bg-stone-950 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 px-6 py-4">
        <h2 className="text-lg font-bold capitalize text-stone-100">{item.ingredientName}</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Image */}
        <div className="aspect-video w-full overflow-hidden rounded-xl">
          <ImageWithFallback
            src={item.imageUrl}
            alt={item.ingredientName}
            category={item.category ?? undefined}
            className="h-full w-full"
          />
        </div>

        {/* Availability bar */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Peak Season
          </h3>
          <p className="mt-1 text-stone-200">{window}</p>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <div key={m} className="flex flex-1 flex-col items-center gap-0.5">
                <div
                  className={cn(
                    'h-3 w-full rounded-sm',
                    item.peakMonths.includes(m)
                      ? 'bg-emerald-500'
                      : item.availableMonths.includes(m)
                        ? 'bg-stone-700'
                        : 'bg-stone-800/50'
                  )}
                />
                <span className="text-[8px] text-stone-600">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][m - 1]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-3 text-[10px] text-stone-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> Peak
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-stone-700" /> Available
            </span>
          </div>
        </div>

        {/* Price */}
        {item.bestPriceCents != null && (
          <div className="flex items-end justify-between rounded-lg bg-stone-900/80 p-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Median Price
              </h3>
              <p className="mt-0.5 text-2xl font-bold text-emerald-400">
                ${(item.bestPriceCents / 100).toFixed(2)}
              </p>
              {item.bestPriceStore && (
                <p className="text-xs text-stone-500">Best at {item.bestPriceStore}</p>
              )}
            </div>
            {item.category && (
              <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-medium uppercase text-stone-400">
                {item.category}
              </span>
            )}
          </div>
        )}

        {/* Shelf Life (from detail) */}
        {detail?.shelfLife && (
          <div className="rounded-lg border border-stone-800 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Storage
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {detail.shelfLife.fridgeDays && (
                <div>
                  <span className="text-stone-500">Fridge:</span>{' '}
                  <span className="text-stone-200">{detail.shelfLife.fridgeDays}</span>
                </div>
              )}
              {detail.shelfLife.freezerDays && (
                <div>
                  <span className="text-stone-500">Freezer:</span>{' '}
                  <span className="text-stone-200">{detail.shelfLife.freezerDays}</span>
                </div>
              )}
            </div>
            {detail.shelfLife.storageTips && (
              <p className="mt-2 text-xs text-stone-400">{detail.shelfLife.storageTips}</p>
            )}
          </div>
        )}

        {/* Flavor Profile */}
        {item.flavorProfile && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Flavor Profile
            </h3>
            <p className="mt-1 text-sm text-stone-300">{item.flavorProfile}</p>
          </div>
        )}

        {/* Culinary Uses */}
        {item.culinaryUses && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Culinary Uses
            </h3>
            <p className="mt-1 text-sm text-stone-300">{item.culinaryUses}</p>
          </div>
        )}

        {/* Pairings */}
        {item.typicalPairings.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Pairs Well With
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.typicalPairings.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Your Recipes */}
        {loadingDetail && (
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-stone-600 border-t-emerald-400" />
            Loading recipes and storage info...
          </div>
        )}
        {detail && detail.recipes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Your Recipes Using This
            </h3>
            <div className="mt-2 space-y-1.5">
              {detail.recipes.map((r) => (
                <a
                  key={r.id}
                  href={`/recipes/${r.id}`}
                  className="flex items-center gap-3 rounded-lg bg-stone-900 p-2 transition-colors hover:bg-stone-800"
                >
                  {r.photoUrl ? (
                    <ImageWithFallback
                      src={r.photoUrl}
                      alt={r.name}
                      className="h-8 w-8 rounded-md"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-800 text-stone-500">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-stone-200">{r.name}</p>
                    {r.category && (
                      <p className="text-[10px] capitalize text-stone-500">{r.category}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={`/culinary/price-catalog?q=${encodeURIComponent(item.ingredientName)}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Food Catalog
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
          {item.systemIngredientId && (
            <a
              href={`/ingredient/${item.systemIngredientId}`}
              className="inline-flex items-center justify-center rounded-lg border border-stone-700 px-4 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
            >
              Full Detail
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Section ---

function CalendarSection({
  title,
  subtitle,
  items,
  selectedMonth,
  onSelect,
  accent,
  defaultExpanded = true,
}: {
  title: string
  subtitle: string
  items: SeasonalCalendarItem[]
  selectedMonth: number
  onSelect: (item: SeasonalCalendarItem) => void
  accent: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (items.length === 0) return null

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mb-4 flex w-full items-baseline gap-3 text-left"
      >
        <h2 className={cn('text-xl font-bold', accent)}>{title}</h2>
        <span className="text-sm text-stone-500">
          {items.length} ingredient{items.length !== 1 ? 's' : ''} {subtitle}
        </span>
        <svg
          className={cn(
            'ml-auto h-4 w-4 flex-shrink-0 text-stone-500 transition-transform',
            expanded && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <IngredientCard
              key={item.ingredientName}
              item={item}
              selectedMonth={selectedMonth}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// --- Filter helper ---

function filterItems(items: SeasonalCalendarItem[], search: string, category: string | null) {
  let filtered = items
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (i) =>
        i.ingredientName.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.flavorProfile?.toLowerCase().includes(q) ||
        i.typicalPairings.some((p) => p.toLowerCase().includes(q))
    )
  }
  if (category) {
    filtered = filtered.filter((i) => i.category === category)
  }
  return filtered
}

// --- Main Client Component ---

export function SeasonalCalendarClient({ initialData }: { initialData: SeasonalCalendarData }) {
  const [data, setData] = useState(initialData)
  const [selectedMonth, setSelectedMonth] = useState(initialData.currentMonth)
  const [selectedItem, setSelectedItem] = useState<SeasonalCalendarItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const handleMonthChange = useCallback((month: number) => {
    setSelectedMonth(month)
    startTransition(async () => {
      try {
        const newData = await getSeasonalCalendarForMonth(month)
        setData(newData)
      } catch {
        // Keep current data on error
      }
    })
  }, [])

  // Filter all sections
  const peakingNow = useMemo(
    () => filterItems(data.peakingNow, search, selectedCategory),
    [data.peakingNow, search, selectedCategory]
  )
  const lastChance = useMemo(
    () => filterItems(data.lastChance, search, selectedCategory),
    [data.lastChance, search, selectedCategory]
  )
  const comingNext = useMemo(
    () => filterItems(data.comingNext, search, selectedCategory),
    [data.comingNext, search, selectedCategory]
  )
  const yearRound = useMemo(
    () => filterItems(data.yearRound, search, selectedCategory),
    [data.yearRound, search, selectedCategory]
  )

  const totalVisible = peakingNow.length + lastChance.length + comingNext.length + yearRound.length

  return (
    <>
      {/* Month Ribbon */}
      <MonthRibbon
        currentMonth={initialData.currentMonth}
        selectedMonth={selectedMonth}
        onSelect={handleMonthChange}
        sectionCounts={{
          peaking: data.peakingNow.length,
          lastChance: data.lastChance.length,
          coming: data.comingNext.length,
        }}
      />

      {/* Search + Category Filters */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        categories={data.categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        totalVisible={totalVisible}
      />

      {/* Loading state */}
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-stone-600 border-t-emerald-400" />
          Loading {MONTH_NAMES[selectedMonth]}...
        </div>
      )}

      {/* Sections */}
      <div className={cn('space-y-10', isPending && 'opacity-50 pointer-events-none')}>
        <CalendarSection
          title="Peaking Now"
          subtitle={`at their best in ${MONTH_NAMES[selectedMonth]}`}
          items={peakingNow}
          selectedMonth={selectedMonth}
          onSelect={setSelectedItem}
          accent="text-emerald-400"
        />

        <CalendarSection
          title="Last Chance"
          subtitle={`ending after ${MONTH_NAMES[selectedMonth]}`}
          items={lastChance}
          selectedMonth={selectedMonth}
          onSelect={setSelectedItem}
          accent="text-amber-400"
        />

        <CalendarSection
          title="Coming Next"
          subtitle={`arriving in ${MONTH_NAMES[selectedMonth === 12 ? 1 : selectedMonth + 1]}`}
          items={comingNext}
          selectedMonth={selectedMonth}
          onSelect={setSelectedItem}
          accent="text-sky-400"
        />

        {yearRound.length > 0 && (
          <CalendarSection
            title="Year Round"
            subtitle="always available"
            items={yearRound}
            selectedMonth={selectedMonth}
            onSelect={setSelectedItem}
            accent="text-stone-400"
            defaultExpanded={false}
          />
        )}

        {/* Empty state */}
        {totalVisible === 0 && !isPending && (
          <div className="py-16 text-center">
            {search || selectedCategory ? (
              <>
                <p className="text-lg text-stone-400">No matches for your filters.</p>
                <button
                  onClick={() => {
                    setSearch('')
                    setSelectedCategory(null)
                  }}
                  className="mt-2 text-sm text-emerald-400 hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-lg text-stone-400">No seasonal data available yet.</p>
                <p className="mt-1 text-sm text-stone-500">
                  Seasonal scores are computed from price history. Check back after more price data
                  accumulates.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Inspiration Panel */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedItem(null)} />
          <InspirationPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
        </>
      )}
    </>
  )
}

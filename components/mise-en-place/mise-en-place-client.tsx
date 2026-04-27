'use client'

import { useState, useTransition, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, differenceInHours } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Check,
  AlertTriangle,
  Snowflake,
  Flame,
  Thermometer,
  Clock,
  Package,
  ShoppingCart,
  Target,
  CookingPot,
  Leaf,
  Timer,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Printer,
} from '@/components/ui/icons'
import { toggleMiseItem, toggleEquipmentPacked } from '@/lib/mise-en-place/actions'
import type {
  MiseEnPlaceBoard,
  MiseStationCard,
  MiseComponent,
  MiseIngredient,
  MiseEquipment,
  AllergenZone,
  MiseStation,
  ConsolidatedIngredient,
  MiseCourseCard,
  TimelineSlot,
} from '@/lib/mise-en-place/types'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

type ViewMode = 'stations' | 'courses' | 'shopping' | 'timeline'

const VIEW_TABS: { key: ViewMode; label: string; icon: typeof CookingPot }[] = [
  { key: 'stations', label: 'Stations', icon: CookingPot },
  { key: 'courses', label: 'Courses', icon: ListChecks },
  { key: 'shopping', label: 'Shopping', icon: ShoppingCart },
  { key: 'timeline', label: 'Timeline', icon: Timer },
]

const STATION_COLORS: Record<MiseStation, { bg: string; border: string; icon: string }> = {
  rotisseur: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
  },
  saucier: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  entremetier: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
  },
  garde_manger: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-800',
    icon: 'text-sky-600 dark:text-sky-400',
  },
  patissier: {
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    border: 'border-pink-200 dark:border-pink-800',
    icon: 'text-pink-600 dark:text-pink-400',
  },
  general: {
    bg: 'bg-zinc-50 dark:bg-zinc-900/30',
    border: 'border-zinc-200 dark:border-zinc-700',
    icon: 'text-zinc-600 dark:text-zinc-400',
  },
}

const STATION_ICONS: Record<MiseStation, typeof CookingPot> = {
  rotisseur: Flame,
  saucier: CookingPot,
  entremetier: Leaf,
  garde_manger: Snowflake,
  patissier: Target,
  general: Timer,
}

const INGREDIENT_CATEGORY_ORDER = [
  'protein',
  'produce',
  'dairy',
  'pantry',
  'spice',
  'oil',
  'alcohol',
  'baking',
  'frozen',
  'canned',
  'fresh_herb',
  'dry_herb',
  'condiment',
  'beverage',
  'specialty',
  'other',
]

const CATEGORY_LABELS: Record<string, string> = {
  protein: 'Proteins',
  produce: 'Produce',
  dairy: 'Dairy & Eggs',
  pantry: 'Pantry',
  spice: 'Spices',
  oil: 'Oils & Fats',
  alcohol: 'Alcohol',
  baking: 'Baking',
  frozen: 'Frozen',
  canned: 'Canned',
  fresh_herb: 'Fresh Herbs',
  dry_herb: 'Dried Herbs',
  condiment: 'Condiments',
  beverage: 'Beverages',
  specialty: 'Specialty',
  other: 'Other',
}

// ═══════════════════════════════════════════════════════════════════════════
// READINESS GAUGE
// ═══════════════════════════════════════════════════════════════════════════

function ReadinessGauge({
  readiness,
  serveTime,
  eventDate,
}: {
  readiness: MiseEnPlaceBoard['readiness']
  serveTime: string | null
  eventDate: string
}) {
  const { score, status } = readiness
  const circumference = 2 * Math.PI * 45
  const filled = (score / 100) * circumference
  const colorClass =
    status === 'READY'
      ? 'text-emerald-500'
      : status === 'AT_RISK'
        ? 'text-amber-500'
        : 'text-red-500'
  const bgClass =
    status === 'READY'
      ? 'stroke-emerald-100 dark:stroke-emerald-900'
      : status === 'AT_RISK'
        ? 'stroke-amber-100 dark:stroke-amber-900'
        : 'stroke-red-100 dark:stroke-red-900'

  // T-minus countdown
  const serviceDateTime = useMemo(() => {
    const d = new Date(eventDate)
    if (serveTime) {
      const [h, m] = serveTime.split(':').map(Number)
      d.setHours(h, m, 0, 0)
    } else {
      d.setHours(18, 0, 0, 0)
    }
    return d
  }, [eventDate, serveTime])

  const hoursUntilService = Math.max(0, differenceInHours(serviceDateTime, new Date()))
  const tMinusLabel =
    hoursUntilService > 48
      ? `T-${Math.round(hoursUntilService / 24)}d`
      : hoursUntilService > 0
        ? `T-${hoursUntilService}h`
        : 'SERVICE TIME'

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative h-28 w-28 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" className={bgClass} />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-700`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${colorClass}`}>{score}%</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ready</span>
        </div>
      </div>

      <div className="flex-1 min-w-[200px]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <ReadinessStat
            label="Sourced"
            current={readiness.sourcedIngredients}
            total={readiness.totalIngredients}
          />
          <ReadinessStat
            label="Prepped"
            current={readiness.preppedIngredients}
            total={readiness.totalIngredients}
          />
          <ReadinessStat
            label="Components"
            current={readiness.preppedComponents}
            total={readiness.totalComponents}
          />
          <ReadinessStat
            label="Packed"
            current={readiness.packedEquipment}
            total={readiness.totalEquipment}
          />
        </div>
      </div>

      {/* T-minus countdown */}
      <div className="flex flex-col items-center justify-center rounded-lg border px-4 py-2 min-w-[90px]">
        <span
          className={`text-lg font-bold tabular-nums ${hoursUntilService <= 4 ? 'text-red-500' : hoursUntilService <= 24 ? 'text-amber-500' : 'text-muted-foreground'}`}
        >
          {tMinusLabel}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {serveTime ? format(serviceDateTime, 'EEE h:mm a') : format(serviceDateTime, 'EEE')}
        </span>
      </div>
    </div>
  )
}

function ReadinessStat({
  label,
  current,
  total,
}: {
  label: string
  current: number
  total: number
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 100
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <span className="font-medium tabular-nums">
          {current}/{total}
        </span>
        <div className="h-1.5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW TAB BAR
// ═══════════════════════════════════════════════════════════════════════════

function ViewTabBar({
  active,
  onChange,
  stationFilter,
  onStationFilter,
  stations,
}: {
  active: ViewMode
  onChange: (v: ViewMode) => void
  stationFilter: MiseStation | null
  onStationFilter: (s: MiseStation | null) => void
  stations: MiseStationCard[]
}) {
  return (
    <div className="space-y-2">
      {/* Main tabs */}
      <div className="flex gap-1 rounded-lg border bg-zinc-100 p-1 dark:bg-zinc-800/50 print:hidden">
        {VIEW_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active === key
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Station filter (mobile-friendly, only in station view) */}
      {active === 'stations' && stations.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1 print:hidden">
          <button
            onClick={() => onStationFilter(null)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              stationFilter === null
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            All Stations
          </button>
          {stations.map((s) => {
            const Icon = STATION_ICONS[s.station]
            return (
              <button
                key={s.station}
                onClick={() => onStationFilter(stationFilter === s.station ? null : s.station)}
                className={`flex whitespace-nowrap items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  stationFilter === s.station
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                <Icon className="h-3 w-3" />
                {s.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STATION VIEW (original, enhanced)
// ═══════════════════════════════════════════════════════════════════════════

function StationView({
  board,
  stationFilter,
}: {
  board: MiseEnPlaceBoard
  stationFilter: MiseStation | null
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const station of board.stations) {
      if (station.preppedCount < station.ingredientCount) s.add(station.station)
    }
    if (s.size === 0) board.stations.forEach((st) => s.add(st.station))
    return s
  })

  const toggle = useCallback((station: string) => {
    setExpanded((prev) => {
      const n = new Set(prev)
      n.has(station) ? n.delete(station) : n.add(station)
      return n
    })
  }, [])

  const filtered = stationFilter
    ? board.stations.filter((s) => s.station === stationFilter)
    : board.stations

  return (
    <div className="space-y-3">
      {filtered.map((card) => (
        <StationCard
          key={card.station}
          card={card}
          eventId={board.eventId}
          expanded={expanded.has(card.station)}
          onToggle={() => toggle(card.station)}
        />
      ))}
    </div>
  )
}

function StationCard({
  card,
  eventId,
  expanded,
  onToggle,
}: {
  card: MiseStationCard
  eventId: string
  expanded: boolean
  onToggle: () => void
}) {
  const colors = STATION_COLORS[card.station]
  const Icon = STATION_ICONS[card.station]
  const pct =
    card.ingredientCount > 0 ? Math.round((card.preppedCount / card.ingredientCount) * 100) : 100

  return (
    <Card
      className={`mise-station-card overflow-hidden border ${colors.border} ${colors.bg} print:break-inside-avoid`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity print:hover:opacity-100"
      >
        <Icon weight="duotone" className={`h-6 w-6 ${colors.icon}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{card.label}</h3>
            <span className="text-xs text-muted-foreground">{card.description}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {card.components.length} component{card.components.length !== 1 ? 's' : ''}
            </span>
            <span className="text-muted-foreground/50">{'\u00B7'}</span>
            <span>
              {card.ingredientCount} ingredient{card.ingredientCount !== 1 ? 's' : ''}
            </span>
            {card.totalActiveMinutes > 0 && (
              <>
                <span className="text-muted-foreground/50">{'\u00B7'}</span>
                <span>
                  <Clock className="mr-0.5 inline h-3 w-3" />
                  {card.totalActiveMinutes}m active
                  {card.totalPassiveMinutes > 0 ? ` + ${card.totalPassiveMinutes}m passive` : ''}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {card.allergens.length > 0 && (
            <Badge variant="warning" className="text-[10px]">
              <AlertTriangle className="mr-0.5 h-3 w-3" />
              {card.allergens.length}
            </Badge>
          )}
          <ProgressPill pct={pct} />
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-inherit px-4 py-3 space-y-4 print:block">
          {card.components.map((comp) => (
            <ComponentCard key={comp.componentId} component={comp} eventId={eventId} />
          ))}
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COURSE VIEW (fire-order)
// ═══════════════════════════════════════════════════════════════════════════

function CourseView({ board }: { board: MiseEnPlaceBoard }) {
  return (
    <div className="space-y-4">
      {board.courses.map((course) => (
        <Card key={course.courseNumber} className="overflow-hidden print:break-inside-avoid">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-zinc-50 dark:bg-zinc-900/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white text-sm font-bold dark:bg-zinc-100 dark:text-zinc-900">
              {course.courseNumber}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{course.courseName}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {course.components.length} component{course.components.length !== 1 ? 's' : ''}
                </span>
                {course.totalActiveMinutes > 0 && (
                  <span>
                    <Clock className="mr-0.5 inline h-3 w-3" />
                    {course.totalActiveMinutes}m active
                  </span>
                )}
                {course.allergens.length > 0 && (
                  <Badge variant="warning" className="text-[10px]">
                    <AlertTriangle className="mr-0.5 h-3 w-3" />
                    {course.allergens.join(', ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 space-y-3">
            {course.components.map((comp) => (
              <div key={comp.componentId} className="flex items-start gap-3">
                <div
                  className={`mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${STATION_COLORS[comp.station].bg} ${STATION_COLORS[comp.station].icon}`}
                >
                  {comp.station.replace('_', ' ')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{comp.componentName}</span>
                    {comp.holdClass === 'serve_immediately' && (
                      <Badge variant="error" className="text-[10px]">
                        <Flame className="mr-0.5 h-3 w-3" />
                        Fire Now
                      </Badge>
                    )}
                    {comp.holdClass === 'hold_warm' && (
                      <Badge variant="warning" className="text-[10px]">
                        <Thermometer className="mr-0.5 h-3 w-3" />
                        Hold
                      </Badge>
                    )}
                    {comp.holdClass === 'hold_cold_reheat' && (
                      <Badge variant="info" className="text-[10px]">
                        <Snowflake className="mr-0.5 h-3 w-3" />
                        Reheat
                      </Badge>
                    )}
                  </div>
                  {comp.ingredients.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {comp.ingredients
                        .map((i) => `${formatQty(i.buyQuantity)} ${i.unit} ${i.name}`)
                        .join(', ')}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {comp.activeMinutes > 0 && <span>{comp.activeMinutes}m</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOPPING VIEW (consolidated ingredient list)
// ═══════════════════════════════════════════════════════════════════════════

function ShoppingView({ board }: { board: MiseEnPlaceBoard }) {
  const [showSourced, setShowSourced] = useState(true)
  const grouped = useMemo(() => {
    const items = showSourced
      ? board.consolidatedIngredients
      : board.consolidatedIngredients.filter((i) => !i.sourced)
    return groupBy(items, (i) => i.category)
  }, [board.consolidatedIngredients, showSourced])

  const totalCost = board.consolidatedIngredients.reduce((s, i) => s + (i.costCents ?? 0), 0)
  const unsourcedCount = board.consolidatedIngredients.filter((i) => !i.sourced).length

  return (
    <div className="space-y-4">
      {/* Shopping summary bar */}
      <div className="flex items-center justify-between rounded-lg border px-4 py-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">{board.consolidatedIngredients.length} ingredients</span>
          {unsourcedCount > 0 && (
            <Badge variant="warning" className="text-[10px]">
              {unsourcedCount} unsourced
            </Badge>
          )}
          {totalCost > 0 && (
            <span className="text-muted-foreground">Est. ${(totalCost / 100).toFixed(2)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={!showSourced}
              onChange={() => setShowSourced(!showSourced)}
              className="rounded"
            />
            Unsourced only
          </label>
        </div>
      </div>

      {/* Category groups */}
      {INGREDIENT_CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat]
        if (!items?.length) return null
        return (
          <div key={cat} className="print:break-inside-avoid">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[cat] ?? cat}
            </h3>
            <Card className="overflow-hidden">
              <table className="mise-shopping-table w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-1.5 text-left font-medium print:hidden w-5"></th>
                    <th className="px-3 py-1.5 text-left font-medium">Ingredient</th>
                    <th className="px-3 py-1.5 text-right font-medium">Buy Qty</th>
                    <th className="px-3 py-1.5 text-left font-medium">Used In</th>
                    <th className="px-3 py-1.5 text-right font-medium">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((ing) => (
                    <tr
                      key={`${ing.ingredientId}-${ing.unit}`}
                      className={`${ing.sourced ? 'opacity-50' : ''}`}
                    >
                      <td className="px-3 py-1.5 print:hidden">
                        {ing.sourced ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-sm border border-zinc-300 dark:border-zinc-600" />
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-medium">
                        {ing.name}
                        {ing.allergenFlags.length > 0 && (
                          <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500" />
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                        {formatQty(ing.buyQuantity)} {ing.unit}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground text-xs max-w-[200px]">
                        {ing.sources
                          .map((s) => s.componentName)
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .join(', ')}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {ing.costCents != null && ing.costCents > 0
                          ? `$${(ing.costCents / 100).toFixed(2)}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE VIEW (visual timing rail)
// ═══════════════════════════════════════════════════════════════════════════

function TimelineView({ board }: { board: MiseEnPlaceBoard }) {
  const nonEmpty = board.timelineSlots.filter((s) => s.components.length > 0)
  const maxComponents = Math.max(...nonEmpty.map((s) => s.components.length), 1)

  return (
    <div className="mise-timeline-rail space-y-1">
      {/* Timeline rail */}
      <div className="relative">
        {board.timelineSlots.map((slot, idx) => {
          const isService = slot.hoursBeforeService === 0
          const barWidth =
            slot.components.length > 0
              ? Math.max(8, (slot.components.length / maxComponents) * 100)
              : 0
          const urgencyColor = isService
            ? 'bg-red-500'
            : slot.hoursBeforeService <= 4
              ? 'bg-amber-500'
              : slot.hoursBeforeService <= 24
                ? 'bg-blue-500'
                : 'bg-zinc-400'

          return (
            <div
              key={slot.label}
              className={`mise-timeline-slot flex items-stretch gap-3 ${idx > 0 ? 'mt-0' : ''}`}
            >
              {/* Time label */}
              <div className="flex w-16 flex-shrink-0 flex-col items-end justify-start pt-3">
                <span
                  className={`text-sm font-bold tabular-nums ${isService ? 'text-red-500' : 'text-muted-foreground'}`}
                >
                  {slot.label}
                </span>
              </div>

              {/* Connector line */}
              <div className="flex w-4 flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full border-2 ${slot.components.length > 0 ? urgencyColor + ' border-transparent' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}
                />
                {idx < board.timelineSlots.length - 1 && (
                  <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-4 ${slot.components.length === 0 ? 'py-1' : ''}`}>
                {slot.components.length === 0 ? (
                  <span className="text-xs text-muted-foreground/50 italic">nothing scheduled</span>
                ) : (
                  <Card className="overflow-hidden print:break-inside-avoid">
                    <div className="divide-y">
                      {slot.components.map((comp, ci) => (
                        <div key={ci} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <div
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATION_COLORS[comp.station].bg} ${STATION_COLORS[comp.station].icon}`}
                          >
                            {comp.station.replace('_', ' ')}
                          </div>
                          <span className="font-medium">{comp.componentName}</span>
                          {comp.recipeName && comp.recipeName !== comp.componentName && (
                            <span className="text-xs text-muted-foreground">
                              ({comp.recipeName})
                            </span>
                          )}
                          {comp.holdClass === 'serve_immediately' && (
                            <Flame className="h-3 w-3 text-red-500" />
                          )}
                          {comp.holdClass === 'hold_warm' && (
                            <Thermometer className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {comp.activeMinutes}m
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS (Component Card, Ingredient Row, Equipment, Allergens)
// ═══════════════════════════════════════════════════════════════════════════

function ComponentCard({ component, eventId }: { component: MiseComponent; eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [prepped, setPrepped] = useState(component.prepped)

  const handleToggle = useCallback(() => {
    const next = !prepped
    setPrepped(next)
    startTransition(async () => {
      try {
        const key = `${component.componentId}-${component.componentName}`
        await toggleMiseItem(eventId, key, next)
        router.refresh()
      } catch {
        setPrepped(!next)
      }
    })
  }, [prepped, component.componentId, component.componentName, eventId, router])

  return (
    <div
      className={`rounded-lg border bg-white/70 p-3 dark:bg-black/20 ${prepped ? 'opacity-60' : ''} transition-opacity print:opacity-100`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors print:hidden ${
            prepped
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-400'
          }`}
        >
          {prepped && <Check className="h-3 w-3" weight="bold" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${prepped ? 'line-through' : ''}`}>
              {component.componentName}
            </span>
            {component.recipeName && component.recipeName !== component.componentName && (
              <span className="text-xs text-muted-foreground">({component.recipeName})</span>
            )}
            <span className="text-xs text-muted-foreground">{component.courseName}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <HoldBadge holdClass={component.holdClass} />
            {component.freezable && (
              <Badge variant="info" className="text-[10px]">
                <Snowflake className="mr-0.5 h-3 w-3" />
                Freezable
              </Badge>
            )}
            {component.prepTier && (
              <Badge variant="default" className="text-[10px] capitalize">
                {component.prepTier}
              </Badge>
            )}
            {component.totalMinutes > 0 && (
              <span className="text-[10px] text-muted-foreground">
                <Clock className="mr-0.5 inline h-3 w-3" />
                {component.activeMinutes}m active
                {component.passiveMinutes > 0 ? ` + ${component.passiveMinutes}m passive` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
      {component.ingredients.length > 0 && (
        <div className="mt-2 ml-8">
          <table className="w-full text-xs">
            <tbody>
              {component.ingredients.map((ing, i) => (
                <IngredientRow
                  key={`${ing.ingredientId}-${i}`}
                  ingredient={ing}
                  eventId={eventId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function IngredientRow({ ingredient, eventId }: { ingredient: MiseIngredient; eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [prepped, setPrepped] = useState(ingredient.prepped)

  const handleToggle = useCallback(() => {
    const next = !prepped
    setPrepped(next)
    startTransition(async () => {
      try {
        const key = `ing-${ingredient.ingredientId}-${ingredient.sources[0]?.componentId ?? ''}`
        await toggleMiseItem(eventId, key, next)
        router.refresh()
      } catch {
        setPrepped(!next)
      }
    })
  }, [prepped, ingredient, eventId, router])

  const prepNote = ingredient.sources[0]?.prepNotes

  return (
    <tr className={`group ${prepped ? 'opacity-40' : ''} transition-opacity print:opacity-100`}>
      <td className="py-0.5 pr-1 w-5 print:hidden">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border transition-colors ${
            prepped
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-zinc-300 dark:border-zinc-600 group-hover:border-emerald-400'
          }`}
        >
          {prepped && <Check className="h-2 w-2" weight="bold" />}
        </button>
      </td>
      <td className={`py-0.5 pr-2 font-medium ${prepped ? 'line-through' : ''}`}>
        {ingredient.name}
        {ingredient.allergenFlags.length > 0 && (
          <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500" />
        )}
      </td>
      <td className="py-0.5 pr-2 text-right tabular-nums text-muted-foreground whitespace-nowrap">
        {formatQty(ingredient.buyQuantity)} {ingredient.unit}
      </td>
      <td className="py-0.5 text-muted-foreground max-w-[120px] truncate">
        {prepNote && <span className="italic">{prepNote}</span>}
      </td>
      <td className="py-0.5 pl-2 w-5">
        {ingredient.sourced ? (
          <ShoppingCart className="h-3 w-3 text-emerald-500" />
        ) : (
          <ShoppingCart className="h-3 w-3 text-zinc-300 dark:text-zinc-600" />
        )}
      </td>
    </tr>
  )
}

function HoldBadge({ holdClass }: { holdClass: string | null }) {
  if (holdClass === 'serve_immediately')
    return (
      <Badge variant="error" className="text-[10px]">
        <Flame className="mr-0.5 h-3 w-3" />
        Serve Immediately
      </Badge>
    )
  if (holdClass === 'hold_warm')
    return (
      <Badge variant="warning" className="text-[10px]">
        <Thermometer className="mr-0.5 h-3 w-3" />
        Hold Warm
      </Badge>
    )
  if (holdClass === 'hold_cold_reheat')
    return (
      <Badge variant="info" className="text-[10px]">
        <Snowflake className="mr-0.5 h-3 w-3" />
        Cold/Reheat
      </Badge>
    )
  return null
}

function EquipmentSection({ equipment, eventId }: { equipment: MiseEquipment[]; eventId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [packedState, setPackedState] = useState<Record<string, boolean>>(
    Object.fromEntries(equipment.map((e) => [e.id, e.packed]))
  )

  if (equipment.length === 0) return null

  const grouped = groupBy(equipment, (e) => e.category)
  const categories = ['cooking', 'serving', 'transport', 'setup', 'cleaning', 'other'] as const
  const totalPacked = Object.values(packedState).filter(Boolean).length

  return (
    <Card className="overflow-hidden print:break-inside-avoid">
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <Package weight="duotone" className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        <div className="flex-1">
          <h3 className="font-semibold">Equipment</h3>
          <span className="text-xs text-muted-foreground">
            {totalPacked}/{equipment.length} packed
          </span>
        </div>
        <ProgressPill
          pct={equipment.length > 0 ? Math.round((totalPacked / equipment.length) * 100) : 100}
        />
      </div>
      <div className="divide-y">
        {categories.map((cat) => {
          const items = grouped[cat]
          if (!items?.length) return null
          return (
            <div key={cat} className="px-4 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                {cat}
              </div>
              <div className="space-y-0.5">
                {items.map((eq) => (
                  <label
                    key={eq.id}
                    className="flex items-center gap-2 py-0.5 text-sm cursor-pointer group"
                  >
                    <button
                      disabled={isPending}
                      onClick={() => {
                        const next = !packedState[eq.id]
                        setPackedState((s) => ({ ...s, [eq.id]: next }))
                        startTransition(async () => {
                          try {
                            await toggleEquipmentPacked(eventId, eq.id, next)
                            router.refresh()
                          } catch {
                            setPackedState((s) => ({ ...s, [eq.id]: !next }))
                          }
                        })
                      }}
                      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors print:hidden ${
                        packedState[eq.id]
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-zinc-300 dark:border-zinc-600 group-hover:border-emerald-400'
                      }`}
                    >
                      {packedState[eq.id] && <Check className="h-2.5 w-2.5" weight="bold" />}
                    </button>
                    <span className={`${packedState[eq.id] ? 'line-through opacity-50' : ''}`}>
                      {eq.name}
                      {eq.quantity > 1 && (
                        <span className="text-muted-foreground"> x{eq.quantity}</span>
                      )}
                    </span>
                    {eq.source !== 'owned' && (
                      <Badge variant="default" className="text-[10px]">
                        {eq.source === 'rental' ? 'Rental' : 'Venue'}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function AllergenMap({ zones }: { zones: AllergenZone[] }) {
  if (zones.length === 0) return null
  return (
    <Card className="overflow-hidden border-amber-200 dark:border-amber-800 print:break-inside-avoid">
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
        <AlertTriangle weight="duotone" className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <h3 className="font-semibold">Allergen Map</h3>
      </div>
      <div className="divide-y divide-amber-100 dark:divide-amber-900">
        {zones.map((zone) => (
          <div key={zone.allergen} className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="text-[10px] uppercase">
                {zone.allergen}
              </Badge>
              <span className="text-xs text-muted-foreground">{zone.ingredients.join(', ')}</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Stations: {zone.stations.join(', ')} | Dishes: {zone.dishes.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DeadlinesBanner({
  groceryDeadline,
  prepDeadline,
  estimatedCost,
}: {
  groceryDeadline: string | null
  prepDeadline: string | null
  estimatedCost: number
}) {
  if (!groceryDeadline && !prepDeadline && estimatedCost === 0) return null
  return (
    <div className="flex flex-wrap gap-3">
      {groceryDeadline && (
        <div className="flex items-center gap-2 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 px-3 py-2">
          <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Grocery Deadline
            </div>
            <div className="text-sm font-medium">
              {format(parseISO(groceryDeadline), 'EEE, MMM d')}
            </div>
          </div>
        </div>
      )}
      {prepDeadline && (
        <div className="flex items-center gap-2 rounded-lg border bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 px-3 py-2">
          <Timer className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Prep Starts
            </div>
            <div className="text-sm font-medium">
              {format(parseISO(prepDeadline), 'EEE, MMM d')}
            </div>
          </div>
        </div>
      )}
      {estimatedCost > 0 && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Est. Food Cost
            </div>
            <div className="text-sm font-medium">${(estimatedCost / 100).toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProgressPill({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-12 rounded-full bg-white/60 dark:bg-black/20">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums">{pct}%</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BOARD
// ═══════════════════════════════════════════════════════════════════════════

export function MiseEnPlaceClient({ board }: { board: MiseEnPlaceBoard }) {
  const [viewMode, setViewMode] = useState<ViewMode>('stations')
  const [stationFilter, setStationFilter] = useState<MiseStation | null>(null)

  return (
    <div className="mise-board space-y-6">
      {/* Print-only header (hidden on screen) */}
      <div className="mise-print-header hidden print:block">
        <h1 className="text-xl font-bold">Mise en Place: {board.eventName}</h1>
        <p className="text-sm">
          {board.clientName && `${board.clientName} | `}
          {format(parseISO(board.eventDate), 'EEEE, MMMM d, yyyy')}
          {board.serveTime && ` at ${board.serveTime}`}
          {` | ${board.guestCount} guests`}
          {board.serviceStyle && ` | ${board.serviceStyle}`}
        </p>
        <p className="text-sm mt-1">
          Readiness: {board.readiness.score}% ({board.readiness.status})
        </p>
      </div>

      {/* Readiness + Deadlines */}
      <Card className="mise-readiness-gauge p-5">
        <ReadinessGauge
          readiness={board.readiness}
          serveTime={board.serveTime}
          eventDate={board.eventDate}
        />
        <div className="mt-4">
          <DeadlinesBanner
            groceryDeadline={board.groceryDeadline}
            prepDeadline={board.prepDeadline}
            estimatedCost={board.estimatedFoodCostCents}
          />
        </div>
      </Card>

      {/* View switcher + Print button */}
      <div className="mise-view-tabs flex items-center gap-2">
        <div className="flex-1">
          <ViewTabBar
            active={viewMode}
            onChange={setViewMode}
            stationFilter={stationFilter}
            onStationFilter={setStationFilter}
            stations={board.stations}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.print()}
          className="mise-print-btn print:hidden"
        >
          <Printer className="h-4 w-4" />
        </Button>
      </div>

      {/* Active view */}
      {viewMode === 'stations' && <StationView board={board} stationFilter={stationFilter} />}
      {viewMode === 'courses' && <CourseView board={board} />}
      {viewMode === 'shopping' && <ShoppingView board={board} />}
      {viewMode === 'timeline' && <TimelineView board={board} />}

      {/* Bottom rail: Allergen Map + Equipment (always visible) */}
      <div className="grid gap-4 md:grid-cols-2">
        <AllergenMap zones={board.allergenZones} />
        <EquipmentSection equipment={board.equipment} eventId={board.eventId} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatQty(qty: number): string {
  if (qty === 0) return '0'
  if (Number.isInteger(qty)) return qty.toString()
  if (qty < 0.01) return qty.toFixed(3)
  return qty.toFixed(qty < 1 ? 2 : 1)
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of arr) {
    const k = key(item)
    if (!result[k]) result[k] = []
    result[k].push(item)
  }
  return result
}

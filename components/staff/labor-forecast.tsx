'use client'

// Labor Hour Forecasting Component
// Deterministic staffing estimates based on guest count, menu complexity, and service style.
// Updates in real-time as inputs change (client-side calculation).

import { useState, useMemo, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  computeLaborForecast,
  type LaborForecastInput,
  type LaborForecastResult,
  type ServiceStyle,
  type MenuComplexity,
} from '@/lib/staff/labor-forecast-shared'
import { formatCurrency } from '@/lib/utils/currency'

const SERVICE_STYLES: { value: ServiceStyle; label: string }[] = [
  { value: 'plated', label: 'Plated' },
  { value: 'family_style', label: 'Family Style' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'passed', label: 'Passed / Canape' },
  { value: 'tasting', label: 'Tasting Menu' },
  { value: 'stations', label: 'Stations' },
  { value: 'cooking_class', label: 'Cooking Class' },
  { value: 'meal_prep', label: 'Meal Prep' },
  { value: 'drop_off', label: 'Drop Off' },
]

const COMPLEXITY_OPTIONS: { value: MenuComplexity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

type Props = {
  defaultGuestCount?: number
  defaultCourseCount?: number
  defaultServiceStyle?: ServiceStyle
  eventId?: string
  onApply?: (result: LaborForecastResult) => void
}

export function LaborForecast({
  defaultGuestCount = 20,
  defaultCourseCount = 3,
  defaultServiceStyle = 'plated',
  eventId,
  onApply,
}: Props) {
  const [guestCount, setGuestCount] = useState(defaultGuestCount)
  const [courseCount, setCourseCount] = useState(defaultCourseCount)
  const [serviceStyle, setServiceStyle] = useState<ServiceStyle>(defaultServiceStyle)
  const [menuComplexity, setMenuComplexity] = useState<MenuComplexity>('medium')
  const [hasCocktailHour, setHasCocktailHour] = useState(false)
  const [hasBarService, setHasBarService] = useState(false)
  const [isOutdoor, setIsOutdoor] = useState(false)

  // Real-time client-side calculation
  const forecast = useMemo<LaborForecastResult>(() => {
    const input: LaborForecastInput = {
      guestCount: Math.max(1, guestCount),
      courseCount: Math.max(1, courseCount),
      serviceStyle,
      menuComplexity,
      hasCocktailHour,
      hasBarService,
      isOutdoor,
    }
    return computeLaborForecast(input)
  }, [
    guestCount,
    courseCount,
    serviceStyle,
    menuComplexity,
    hasCocktailHour,
    hasBarService,
    isOutdoor,
  ])

  const confidenceBadge = {
    low: 'bg-amber-900/40 text-amber-300',
    medium: 'bg-blue-900/40 text-blue-300',
    high: 'bg-emerald-900/40 text-emerald-300',
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Guest Count */}
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-1">Guest Count</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={guestCount}
            onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
            className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Course Count */}
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-1">Number of Courses</label>
          <input
            type="number"
            min={1}
            max={20}
            value={courseCount}
            onChange={(e) => setCourseCount(parseInt(e.target.value) || 1)}
            className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Service Style */}
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-1">Service Style</label>
          <select
            value={serviceStyle}
            onChange={(e) => setServiceStyle(e.target.value as ServiceStyle)}
            className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          >
            {SERVICE_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Menu Complexity */}
        <div>
          <label className="block text-sm font-medium text-stone-400 mb-1">Menu Complexity</label>
          <select
            value={menuComplexity}
            onChange={(e) => setMenuComplexity(e.target.value as MenuComplexity)}
            className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          >
            {COMPLEXITY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Toggles */}
        <div className="space-y-3 lg:col-span-2">
          <label className="block text-sm font-medium text-stone-400 mb-1">Options</label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hasCocktailHour}
                onChange={(e) => setHasCocktailHour(e.target.checked)}
                className="rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500"
              />
              Cocktail Hour
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hasBarService}
                onChange={(e) => setHasBarService(e.target.checked)}
                className="rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500"
              />
              Bar Service
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isOutdoor}
                onChange={(e) => setIsOutdoor(e.target.checked)}
                className="rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500"
              />
              Outdoor Venue
            </label>
          </div>
        </div>
      </div>

      {/* Confidence Badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${confidenceBadge[forecast.confidence]}`}
        >
          {forecast.confidence.toUpperCase()} CONFIDENCE
        </span>
        <span className="text-xs text-stone-500">
          {forecast.confidence === 'low' && 'Add more event details for a better estimate'}
          {forecast.confidence === 'medium' && 'Good estimate based on provided factors'}
          {forecast.confidence === 'high' && 'Strong estimate with all key factors provided'}
        </span>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-lg border border-stone-700">
        <table className="w-full text-sm">
          <thead className="bg-stone-800 text-stone-400">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-right px-4 py-3 font-medium">Staff Count</th>
              <th className="text-right px-4 py-3 font-medium">Hours Each</th>
              <th className="text-right px-4 py-3 font-medium">Total Hours</th>
              <th className="text-right px-4 py-3 font-medium">Est. Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {forecast.roles.map((role) => (
              <tr key={role.role} className="text-stone-300">
                <td className="px-4 py-3 font-medium text-stone-100">{role.roleLabel}</td>
                <td className="text-right px-4 py-3">{role.staffCount}</td>
                <td className="text-right px-4 py-3">{role.hoursEach}h</td>
                <td className="text-right px-4 py-3">{role.totalHours}h</td>
                <td className="text-right px-4 py-3 font-mono">
                  {formatCurrency(role.estimatedCostCents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-stone-800/50 border-t-2 border-stone-600">
            <tr className="text-stone-100 font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="text-right px-4 py-3">{forecast.totalStaff}</td>
              <td className="text-right px-4 py-3"></td>
              <td className="text-right px-4 py-3">{forecast.totalHours}h</td>
              <td className="text-right px-4 py-3 font-mono">
                {formatCurrency(forecast.totalCostCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {forecast.notes.length > 0 && (
        <div className="rounded-lg bg-stone-800/50 border border-stone-700 p-4">
          <p className="text-xs font-medium text-stone-400 mb-2">ADJUSTMENT NOTES</p>
          <ul className="space-y-1 text-sm text-stone-400">
            {forecast.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">*</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Apply Button */}
      {onApply && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => onApply(forecast)}>
            Apply to Event
          </Button>
        </div>
      )}

      {/* Cost disclaimer */}
      <p className="text-xs text-stone-500">
        Cost estimates use{' '}
        {forecast.notes.some((n) => n.includes('roster'))
          ? 'your staff roster average rates'
          : 'default industry rates ($18-$25/hr)'}
        . Actual costs depend on your staff rates and hours worked.
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getSeasonalCalendar,
  getSeasonalAvailability,
  deleteSeasonalPeriod,
  copySeasonToNextYear,
  type MonthCalendarData,
  type SeasonalPeriod,
} from '@/lib/scheduling/seasonal-availability-actions'
import {
  getCurrentLocation,
  type CurrentLocationResult,
} from '@/lib/scheduling/seasonal-availability-actions'
import { Button } from '@/components/ui/button'
import { SeasonalPeriodForm } from './seasonal-period-form'
import { CurrentLocationBadge } from './current-location-badge'

// Generate distinct colors for different locations
const LOCATION_COLORS = [
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-500' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
  {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
  },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', dot: 'bg-teal-500' },
  {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
  },
  {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-300',
    dot: 'bg-indigo-500',
  },
]

const UNAVAILABLE_STYLE = {
  bg: 'bg-red-50',
  text: 'text-red-400',
  border: 'border-red-200',
  dot: 'bg-red-400',
}

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getLocationColor(location: string, locationMap: Map<string, number>) {
  if (!locationMap.has(location)) {
    locationMap.set(location, locationMap.size % LOCATION_COLORS.length)
  }
  return LOCATION_COLORS[locationMap.get(location)!]
}

export function SeasonalCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [calendar, setCalendar] = useState<MonthCalendarData[]>([])
  const [periods, setPeriods] = useState<SeasonalPeriod[]>([])
  const [currentLoc, setCurrentLoc] = useState<CurrentLocationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<SeasonalPeriod | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [calData, periodData, locData] = await Promise.all([
        getSeasonalCalendar(year),
        getSeasonalAvailability(year),
        getCurrentLocation(),
      ])
      setCalendar(calData)
      setPeriods(periodData)
      setCurrentLoc(locData)
    } catch {
      setError('Failed to load seasonal availability')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Build location color map from periods
  const locationMap = new Map<string, number>()
  periods.forEach((p) => {
    if (!locationMap.has(p.location)) {
      locationMap.set(p.location, locationMap.size % LOCATION_COLORS.length)
    }
  })

  const handleDayClick = (dateStr: string) => {
    // Check if there's already a period for this date
    const existing = periods.find((p) => dateStr >= p.start_date && dateStr <= p.end_date)
    if (existing) {
      setEditingPeriod(existing)
      setSelectedDate(null)
    } else {
      setEditingPeriod(null)
      setSelectedDate(dateStr)
    }
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteSeasonalPeriod(id)
    if (result.success) {
      await loadData()
    }
  }

  const handleCopyToNextYear = async (id: string) => {
    const result = await copySeasonToNextYear(id)
    if (result.success) {
      await loadData()
    }
  }

  const handleFormDone = () => {
    setShowForm(false)
    setEditingPeriod(null)
    setSelectedDate(null)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-stone-500">
        Loading seasonal calendar...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-stone-900">Seasonal Availability</h2>
          {currentLoc && <CurrentLocationBadge location={currentLoc} />}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setYear((y) => y - 1)}>
            &larr; {year - 1}
          </Button>
          <span className="min-w-[4rem] text-center font-medium text-stone-700">{year}</span>
          <Button variant="ghost" onClick={() => setYear((y) => y + 1)}>
            {year + 1} &rarr;
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingPeriod(null)
              setSelectedDate(null)
              setShowForm(true)
            }}
          >
            + Add Season
          </Button>
        </div>
      </div>

      {/* Legend */}
      {periods.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Array.from(locationMap.entries()).map(([location, idx]) => {
            const color = LOCATION_COLORS[idx % LOCATION_COLORS.length]
            return (
              <div key={location} className="flex items-center gap-1.5 text-sm">
                <span className={`h-3 w-3 rounded-full ${color.dot}`} />
                <span className="text-stone-600">{location}</span>
              </div>
            )
          })}
          <div className="flex items-center gap-1.5 text-sm">
            <span className={`h-3 w-3 rounded-full ${UNAVAILABLE_STYLE.dot}`} />
            <span className="text-stone-600">Unavailable</span>
          </div>
        </div>
      )}

      {/* 12-month grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {calendar.map((monthData) => (
          <MonthMiniCalendar
            key={monthData.month}
            data={monthData}
            locationMap={locationMap}
            onDayClick={handleDayClick}
          />
        ))}
      </div>

      {/* Periods list */}
      {periods.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide">Seasons</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {periods.map((p) => {
              const color = getLocationColor(p.location, locationMap)
              return (
                <div key={p.id} className={`rounded-lg border p-3 ${color.border} ${color.bg}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium ${color.text}`}>{p.season_name}</p>
                      <p className="text-sm text-stone-600">{p.location}</p>
                      <p className="text-xs text-stone-500 mt-1">
                        {p.start_date} to {p.end_date}
                      </p>
                      {!p.is_available && (
                        <span className="inline-block mt-1 text-xs text-red-600 font-medium">
                          Not available
                        </span>
                      )}
                      {p.travel_radius_miles && (
                        <span className="inline-block mt-1 text-xs text-stone-500 ml-2">
                          {p.travel_radius_miles} mi radius
                        </span>
                      )}
                      {p.is_recurring && (
                        <span className="inline-block mt-1 text-xs text-stone-500 ml-2">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="text-xs text-stone-400 hover:text-stone-600 p-1"
                        onClick={() => {
                          setEditingPeriod(p)
                          setSelectedDate(null)
                          setShowForm(true)
                        }}
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-stone-400 hover:text-stone-600 p-1"
                        onClick={() => handleCopyToNextYear(p.id)}
                        title="Copy to next year"
                      >
                        Copy
                      </button>
                      <button
                        className="text-xs text-red-400 hover:text-red-600 p-1"
                        onClick={() => handleDelete(p.id)}
                        title="Delete"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-900">
                {editingPeriod ? 'Edit Season' : 'Add Season'}
              </h3>
              <button
                className="text-stone-400 hover:text-stone-600"
                onClick={() => setShowForm(false)}
              >
                &times;
              </button>
            </div>
            <SeasonalPeriodForm
              period={editingPeriod}
              defaultStartDate={selectedDate}
              onDone={handleFormDone}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Mini Month Calendar ─────────────────────────────────────────────────────────

function MonthMiniCalendar({
  data,
  locationMap,
  onDayClick,
}: {
  data: MonthCalendarData
  locationMap: Map<string, number>
  onDayClick: (date: string) => void
}) {
  // Figure out which day of week the first day falls on (0=Mon in our grid)
  const firstDay = new Date(data.days[0].date)
  const dayOfWeek = (firstDay.getDay() + 6) % 7 // Convert Sun=0 to Mon=0

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <h4 className="mb-2 text-center text-sm font-medium text-stone-700">{data.monthName}</h4>
      <div className="grid grid-cols-7 gap-px text-center">
        {/* Weekday headers */}
        {WEEKDAY_HEADERS.map((d, i) => (
          <div key={i} className="text-[10px] font-medium text-stone-400 pb-1">
            {d}
          </div>
        ))}
        {/* Empty cells before first day */}
        {Array.from({ length: dayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {/* Day cells */}
        {data.days.map((day) => {
          let cellStyle = 'bg-white text-stone-600'

          if (day.location) {
            if (!day.is_available) {
              cellStyle = `${UNAVAILABLE_STYLE.bg} ${UNAVAILABLE_STYLE.text}`
            } else {
              const color = getLocationColor(day.location, locationMap)
              cellStyle = `${color.bg} ${color.text}`
            }
          }

          return (
            <button
              key={day.date}
              className={`
                relative rounded text-[11px] leading-6 transition-colors
                hover:ring-1 hover:ring-stone-300
                ${cellStyle}
                ${day.isToday ? 'font-bold ring-2 ring-stone-900' : ''}
              `}
              onClick={() => onDayClick(day.date)}
              title={
                day.location
                  ? `${day.season_name} - ${day.location}${!day.is_available ? ' (unavailable)' : ''}`
                  : 'No season set'
              }
            >
              {day.dayOfMonth}
            </button>
          )
        })}
      </div>
    </div>
  )
}

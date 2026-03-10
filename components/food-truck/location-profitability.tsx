'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  getAllLocationRankings,
  getLocationProfitability,
  getBestTimeSlots,
  type LocationRanking,
  type LocationDetail,
  type TimeSlotPerformance,
} from '@/lib/food-truck/location-profit-actions'

// ── Helpers ──

function centsToUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type SortField =
  | 'rank'
  | 'locationName'
  | 'totalVisits'
  | 'totalRevenueCents'
  | 'avgRevenueCentsPerVisit'
  | 'avgCoversPerVisit'
  | 'profitScore'
type SortDir = 'asc' | 'desc'
type DatePreset = '30' | '60' | '90' | 'all'

// ── Component ──

export function LocationProfitability() {
  const [rankings, setRankings] = useState<LocationRanking[]>([])
  const [selectedLocation, setSelectedLocation] = useState<LocationDetail | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlotPerformance[]>([])
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [datePreset, setDatePreset] = useState<DatePreset>('90')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  // Load rankings
  useEffect(() => {
    loadRankings()
    loadTimeSlots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset])

  function loadRankings() {
    const days = datePreset === 'all' ? undefined : parseInt(datePreset)
    startTransition(async () => {
      try {
        setError(null)
        const data = await getAllLocationRankings(days)
        setRankings(data)
      } catch (err) {
        setError('Failed to load location rankings')
        setRankings([])
      }
    })
  }

  function loadTimeSlots() {
    startTransition(async () => {
      try {
        const data = await getBestTimeSlots()
        setTimeSlots(data)
      } catch {
        // Non-critical
      }
    })
  }

  function openDetail(locationId: string) {
    const days = datePreset === 'all' ? undefined : parseInt(datePreset)
    const now = new Date()
    const dateRange = days
      ? {
          start: new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10),
          end: now.toISOString().slice(0, 10),
        }
      : undefined

    startTransition(async () => {
      try {
        setDetailError(null)
        const detail = await getLocationProfitability(locationId, dateRange)
        setSelectedLocation(detail)
      } catch (err) {
        setDetailError('Failed to load location details')
      }
    })
  }

  // Sort logic
  const sorted = [...rankings].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    const aNum = typeof aVal === 'number' ? aVal : 0
    const bNum = typeof bVal === 'number' ? bVal : 0
    return sortDir === 'asc' ? aNum - bNum : bNum - aNum
  })

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function sortIcon(field: SortField) {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  // Summary cards
  const bestLocation = rankings.length > 0 ? rankings[0] : null
  const mostVisited =
    rankings.length > 0 ? [...rankings].sort((a, b) => b.totalVisits - a.totalVisits)[0] : null
  const highestAvgTicket =
    rankings.length > 0
      ? [...rankings].sort((a, b) => b.avgRevenueCentsPerVisit - a.avgRevenueCentsPerVisit)[0]
      : null

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Period:</span>
        {(['30', '60', '90', 'all'] as DatePreset[]).map((preset) => (
          <button
            key={preset}
            onClick={() => setDatePreset(preset)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              datePreset === preset
                ? 'bg-orange-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {preset === 'all' ? 'All Time' : `${preset}d`}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {rankings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bestLocation && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-400 uppercase tracking-wide">Best Location</p>
              <p className="text-lg font-semibold text-white mt-1">{bestLocation.locationName}</p>
              <p className="text-sm text-orange-400">Score: {bestLocation.profitScore}</p>
            </div>
          )}
          {mostVisited && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-400 uppercase tracking-wide">Most Visited</p>
              <p className="text-lg font-semibold text-white mt-1">{mostVisited.locationName}</p>
              <p className="text-sm text-blue-400">{mostVisited.totalVisits} visits</p>
            </div>
          )}
          {highestAvgTicket && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
              <p className="text-xs text-zinc-400 uppercase tracking-wide">Highest Avg Ticket</p>
              <p className="text-lg font-semibold text-white mt-1">
                {highestAvgTicket.locationName}
              </p>
              <p className="text-sm text-green-400">
                {centsToUsd(highestAvgTicket.avgRevenueCentsPerVisit)}/visit
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rankings Table */}
      {rankings.length === 0 && !isPending && !error && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-8 text-center">
          <p className="text-zinc-400">
            No location data yet. Complete some truck schedule visits to see profitability rankings.
          </p>
        </div>
      )}

      {rankings.length > 0 && (
        <div className="rounded-lg border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800/80">
                  {(
                    [
                      ['rank', '#'],
                      ['locationName', 'Location'],
                      ['totalVisits', 'Visits'],
                      ['totalRevenueCents', 'Total Revenue'],
                      ['avgRevenueCentsPerVisit', 'Avg/Visit'],
                      ['avgCoversPerVisit', 'Avg Covers'],
                      ['profitScore', 'Score'],
                    ] as [SortField, string][]
                  ).map(([field, label]) => (
                    <th
                      key={field}
                      className="px-4 py-3 text-left text-zinc-400 font-medium cursor-pointer hover:text-zinc-200 transition-colors select-none"
                      onClick={() => toggleSort(field)}
                    >
                      {label}
                      {sortIcon(field)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((loc) => (
                  <tr
                    key={loc.locationId}
                    className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    onClick={() => openDetail(loc.locationId)}
                  >
                    <td className="px-4 py-3 text-zinc-500">{loc.rank}</td>
                    <td className="px-4 py-3 text-white font-medium">
                      {loc.locationName}
                      {loc.permitRequired && (
                        <span className="ml-2 text-xs bg-yellow-900/50 text-yellow-400 px-1.5 py-0.5 rounded">
                          Permit
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{loc.totalVisits}</td>
                    <td className="px-4 py-3 text-zinc-300">{centsToUsd(loc.totalRevenueCents)}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {centsToUsd(loc.avgRevenueCentsPerVisit)}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{loc.avgCoversPerVisit}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          loc.profitScore >= 70
                            ? 'text-green-400'
                            : loc.profitScore >= 40
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }`}
                      >
                        {loc.profitScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail View */}
      {selectedLocation && (
        <LocationDetailPanel
          detail={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          error={detailError}
        />
      )}

      {/* Best Time Slots */}
      {timeSlots.length > 0 && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Best Day + Location Combos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {timeSlots.slice(0, 9).map((slot, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-zinc-900/50 rounded-md p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{slot.locationName}</p>
                  <p className="text-xs text-zinc-400">
                    {slot.dayOfWeek} ({slot.visits} visits)
                  </p>
                </div>
                <p className="text-sm font-semibold text-green-400">
                  {centsToUsd(slot.avgRevenueCents)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPending && <div className="text-center text-zinc-400 py-4">Loading...</div>}
    </div>
  )
}

// ── Detail Panel ──

function LocationDetailPanel({
  detail,
  onClose,
  error,
}: {
  detail: LocationDetail
  onClose: () => void
  error: string | null
}) {
  const { profitability: p, visitHistory, bestDayOfWeek, worstDayOfWeek, dayBreakdown } = detail

  // Find max revenue for bar chart scaling
  const maxRevenue = Math.max(
    1, // prevent division by zero
    ...visitHistory.filter((v) => v.revenueCents != null).map((v) => v.revenueCents!)
  )

  return (
    <div className="rounded-lg border border-zinc-600 bg-zinc-900 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">{p.locationName}</h3>
          {p.address && <p className="text-sm text-zinc-400">{p.address}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors px-3 py-1"
        >
          Close
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Revenue" value={centsToUsd(p.totalRevenueCents)} />
        <StatCard label="Completed Visits" value={String(p.completedVisits)} />
        <StatCard label="Avg Revenue/Visit" value={centsToUsd(p.avgRevenueCentsPerVisit)} />
        <StatCard label="Avg Covers/Visit" value={String(p.avgCoversPerVisit)} />
      </div>

      {/* Best/Worst Days */}
      {(bestDayOfWeek || worstDayOfWeek) && (
        <div className="flex gap-4">
          {bestDayOfWeek && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Best day:</span>
              <span className="text-sm font-medium text-green-400">{bestDayOfWeek}</span>
            </div>
          )}
          {worstDayOfWeek && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Weakest day:</span>
              <span className="text-sm font-medium text-red-400">{worstDayOfWeek}</span>
            </div>
          )}
        </div>
      )}

      {/* Day Breakdown */}
      {dayBreakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Revenue by Day of Week</h4>
          <div className="space-y-1">
            {dayBreakdown.map((d) => (
              <div key={d.day} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-24">{d.day}</span>
                <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-orange-600/70 rounded"
                    style={{
                      width: `${Math.max(2, (d.avgRevenueCents / (dayBreakdown[0]?.avgRevenueCents || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-zinc-300 w-20 text-right">
                  {centsToUsd(d.avgRevenueCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visit History Bar Chart */}
      {visitHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-2">
            Recent Visits ({visitHistory.length})
          </h4>
          <div className="flex items-end gap-1 h-32">
            {visitHistory
              .slice(0, 12)
              .reverse()
              .map((v) => {
                const revenue = v.revenueCents || 0
                const heightPct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0
                return (
                  <div
                    key={v.id}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${v.date}: ${centsToUsd(revenue)} (${v.actualCovers || 0} covers)`}
                  >
                    <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                      <div
                        className={`w-full rounded-t ${
                          v.status === 'completed' ? 'bg-orange-500' : 'bg-zinc-600'
                        }`}
                        style={{ height: `${Math.max(2, heightPct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                      {v.date.slice(5)}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800/50 rounded-md p-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
    </div>
  )
}

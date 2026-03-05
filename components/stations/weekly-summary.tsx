/* eslint-disable react-hooks/exhaustive-deps */
'use client'

// Weekly Summary â€” The "8th page" aggregated view
// Shows per-component totals (made, waste, average on-hand, 86 count) and station-level stats.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getWasteSummary } from '@/lib/stations/waste-actions'
import { getClipboardForDate } from '@/lib/stations/clipboard-actions'

type Props = {
  stationId: string
  stationName: string
}

type DaySummary = {
  date: string
  entries: any[]
}

type ComponentSummary = {
  name: string
  total_made: number
  total_waste: number
  avg_on_hand: number
  count_86: number
  days_counted: number
}

export function WeeklySummary({ stationId, stationName }: Props) {
  const [loading, setLoading] = useState(false)
  const [weekStart, setWeekStart] = useState<string>(() => {
    // Default to Monday of current week
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff)).toISOString().split('T')[0]
  })
  const [componentSummaries, setComponentSummaries] = useState<ComponentSummary[]>([])
  const [stationStats, setStationStats] = useState({
    busiest_day: '',
    most_waste_day: '',
    highest_86_count: 0,
    total_made: 0,
    total_waste: 0,
  })
  const [wasteSummary, setWasteSummary] = useState<any>(null)

  useEffect(() => {
    loadWeekData()
  }, [weekStart])

  async function loadWeekData() {
    setLoading(true)
    try {
      // Generate the 7 dates Mon-Sun
      const dates: string[] = []
      const start = new Date(weekStart)
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        dates.push(d.toISOString().split('T')[0])
      }
      const weekEnd = dates[6]

      // Load clipboard data for each day
      const dayData: DaySummary[] = []
      for (const date of dates) {
        try {
          const entries = await getClipboardForDate(stationId, date)
          dayData.push({ date, entries })
        } catch {
          dayData.push({ date, entries: [] })
        }
      }

      // Load waste summary
      let waste = null
      try {
        waste = await getWasteSummary(weekStart, weekEnd)
      } catch {
        waste = { total_entries: 0, total_value_cents: 0, by_reason: [], by_station: [] }
      }
      setWasteSummary(waste)

      // Build per-component summaries
      const compMap: Record<string, ComponentSummary> = {}
      let busiestDay = { date: '', total: 0 }
      let mostWasteDay = { date: '', total: 0 }
      let max86Count = 0
      let grandTotalMade = 0
      let grandTotalWaste = 0

      for (const day of dayData) {
        let dayMade = 0
        let dayWaste = 0
        let day86 = 0

        for (const entry of day.entries) {
          const compName = entry.station_components?.name ?? 'Unknown'
          if (!compMap[compName]) {
            compMap[compName] = {
              name: compName,
              total_made: 0,
              total_waste: 0,
              avg_on_hand: 0,
              count_86: 0,
              days_counted: 0,
            }
          }

          compMap[compName].total_made += entry.made ?? 0
          compMap[compName].total_waste += entry.waste_qty ?? 0
          compMap[compName].avg_on_hand += entry.on_hand ?? 0
          compMap[compName].days_counted += 1
          if (entry.is_86d) compMap[compName].count_86 += 1

          dayMade += entry.made ?? 0
          dayWaste += entry.waste_qty ?? 0
          if (entry.is_86d) day86 += 1
        }

        if (dayMade > busiestDay.total) {
          busiestDay = { date: day.date, total: dayMade }
        }
        if (dayWaste > mostWasteDay.total) {
          mostWasteDay = { date: day.date, total: dayWaste }
        }
        if (day86 > max86Count) max86Count = day86

        grandTotalMade += dayMade
        grandTotalWaste += dayWaste
      }

      // Compute averages
      for (const comp of Object.values(compMap)) {
        if (comp.days_counted > 0) {
          comp.avg_on_hand = Math.round((comp.avg_on_hand / comp.days_counted) * 10) / 10
        }
      }

      setComponentSummaries(Object.values(compMap).sort((a, b) => b.total_made - a.total_made))
      setStationStats({
        busiest_day: busiestDay.date || 'N/A',
        most_waste_day: mostWasteDay.date || 'N/A',
        highest_86_count: max86Count,
        total_made: grandTotalMade,
        total_waste: grandTotalWaste,
      })
    } catch (err) {
      console.error('[WeeklySummary] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  function shiftWeek(offset: number) {
    const start = new Date(weekStart)
    start.setDate(start.getDate() + offset * 7)
    setWeekStart(start.toISOString().split('T')[0])
  }

  const weekEndDate = (() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d.toISOString().split('T')[0]
  })()

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Week selector */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => shiftWeek(-1)}
            className="px-2 py-1 text-sm text-stone-400 hover:text-stone-200 rounded border border-stone-700"
          >
            Prev Week
          </button>
          <span className="text-sm font-medium text-stone-200">
            {weekStart} to {weekEndDate}
          </span>
          <button
            onClick={() => shiftWeek(1)}
            className="px-2 py-1 text-sm text-stone-400 hover:text-stone-200 rounded border border-stone-700"
          >
            Next Week
          </button>
        </div>
        <Button onClick={() => window.print()} variant="ghost" size="sm">
          Print Summary
        </Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="text-xl font-bold">{stationName} â€” Weekly Summary</h2>
        <p className="text-sm">
          {weekStart} to {weekEndDate}
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-stone-500 text-sm">Loading week data...</div>
      ) : (
        <>
          {/* Station-level stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <div className="text-xl font-bold text-stone-100">{stationStats.total_made}</div>
                <div className="text-xs text-stone-500">Total Made</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <div className="text-xl font-bold text-red-400">{stationStats.total_waste}</div>
                <div className="text-xs text-stone-500">Total Waste</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <div className="text-xl font-bold text-stone-100">{stationStats.busiest_day}</div>
                <div className="text-xs text-stone-500">Busiest Day</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <div className="text-xl font-bold text-amber-400">
                  {stationStats.most_waste_day}
                </div>
                <div className="text-xs text-stone-500">Most Waste Day</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3 text-center">
                <div className="text-xl font-bold text-red-400">
                  {stationStats.highest_86_count}
                </div>
                <div className="text-xs text-stone-500">Highest 86 Count</div>
              </CardContent>
            </Card>
          </div>

          {/* Component breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Component Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {componentSummaries.length === 0 ? (
                <div className="p-4 text-sm text-stone-500">No data for this week.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700 text-left text-xs text-stone-400 uppercase">
                      <th className="px-4 py-2 font-medium">Component</th>
                      <th className="px-4 py-2 font-medium text-right">Total Made</th>
                      <th className="px-4 py-2 font-medium text-right">Total Waste</th>
                      <th className="px-4 py-2 font-medium text-right">Avg On Hand</th>
                      <th className="px-4 py-2 font-medium text-right">86 Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {componentSummaries.map((comp) => (
                      <tr key={comp.name} className="border-b border-stone-800">
                        <td className="px-4 py-2 text-stone-200 font-medium">{comp.name}</td>
                        <td className="px-4 py-2 text-right text-stone-300">{comp.total_made}</td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={comp.total_waste > 0 ? 'text-red-400' : 'text-stone-400'}
                          >
                            {comp.total_waste}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-stone-300">{comp.avg_on_hand}</td>
                        <td className="px-4 py-2 text-right">
                          {comp.count_86 > 0 ? (
                            <Badge variant="error">{comp.count_86}</Badge>
                          ) : (
                            <span className="text-stone-500">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Waste breakdown by reason */}
          {wasteSummary && wasteSummary.by_reason.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Waste by Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {wasteSummary.by_reason.map((r: any) => (
                    <div key={r.reason} className="bg-stone-800 rounded-lg px-4 py-2">
                      <div className="text-xs text-stone-400">{r.reason_label}</div>
                      <div className="text-lg font-bold text-stone-200">{r.count}</div>
                      {r.total_value_cents > 0 && (
                        <div className="text-xs text-red-400">
                          ${(r.total_value_cents / 100).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {wasteSummary.total_value_cents > 0 && (
                  <div className="mt-3 text-sm text-stone-400">
                    Total estimated waste value:{' '}
                    <span className="text-red-400 font-medium">
                      ${(wasteSummary.total_value_cents / 100).toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// Capacity Planning Charts
// Client-side Recharts components for the capacity planning page.
'use client'

import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import type {
  CapacityAnalysis,
  CapacityTrendWeek,
  TimeBreakdown,
  DayHeatmapEntry,
} from '@/lib/analytics/capacity-planning'
import { simulateAdditionalLoad } from '@/lib/analytics/capacity-planning'

// ============================================
// Utilization Gauge
// ============================================

export function UtilizationGauge({ percent }: { percent: number }) {
  const radius = 80
  const strokeWidth = 14
  const circumference = Math.PI * radius // half circle
  const filled = (Math.min(percent, 100) / 100) * circumference

  const color =
    percent >= 80 ? '#ef4444' : percent >= 60 ? '#f59e0b' : '#10b981'

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-all duration-700 ease-out"
        />
        {/* Percentage text */}
        <text
          x="100"
          y="90"
          textAnchor="middle"
          className="text-3xl font-bold"
          fill={color}
          fontSize="32"
          fontWeight="700"
        >
          {percent}%
        </text>
        <text
          x="100"
          y="110"
          textAnchor="middle"
          fill="#78716c"
          fontSize="12"
        >
          Utilization
        </text>
      </svg>
    </div>
  )
}

// ============================================
// Time Breakdown Pie
// ============================================

export function TimeBreakdownChart({ data }: { data: TimeBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400">
        No time data available yet
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: d.category,
    value: Math.round(d.minutes / 60 * 10) / 10,
    minutes: d.minutes,
    color: d.color,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: number, name: string) => [`${value} hrs/week`, name]}
        />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-stone-600">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ============================================
// Weekly Trend Area Chart
// ============================================

export function WeeklyTrendChart({ data }: { data: CapacityTrendWeek[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400">
        Not enough data for trends yet
      </div>
    )
  }

  const chartData = data.map((w) => ({
    week: formatWeekLabel(w.weekStart),
    used: w.hoursUsed,
    available: w.hoursAvailable,
    utilization: w.utilizationPercent,
    events: w.eventCount,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#78716c' }} />
        <YAxis tick={{ fontSize: 12, fill: '#78716c' }} unit="h" />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: number, name: string) => {
            if (name === 'used') return [`${value} hrs`, 'Hours Used']
            if (name === 'available') return [`${value} hrs`, 'Available']
            return [value, name]
          }}
        />
        <Area
          type="monotone"
          dataKey="available"
          fill="#e7e5e4"
          stroke="#a8a29e"
          fillOpacity={0.3}
          strokeWidth={1}
        />
        <Area
          type="monotone"
          dataKey="used"
          fill="#8b5cf6"
          stroke="#7c3aed"
          fillOpacity={0.4}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ============================================
// Day Heatmap
// ============================================

const INTENSITY_COLORS: Record<DayHeatmapEntry['intensity'], string> = {
  free: '#f5f5f4',
  light: '#bbf7d0',
  moderate: '#fde68a',
  busy: '#fdba74',
  overloaded: '#fca5a5',
}

export function DayHeatmap({ data }: { data: DayHeatmapEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-stone-400">
        No schedule data yet
      </div>
    )
  }

  // Group by week (rows) and day of week (columns)
  const weeks: DayHeatmapEntry[][] = []
  let currentWeek: DayHeatmapEntry[] = []

  // Pad start to align with day of week
  const firstDow = new Date(data[0].date).getDay()
  for (let i = 0; i < firstDow; i++) {
    currentWeek.push({ date: '', eventCount: 0, totalMinutes: 0, intensity: 'free' })
  }

  for (const entry of data) {
    currentWeek.push(entry)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="space-y-1">
      <div className="flex gap-1 mb-1">
        {dayLabels.map((label, i) => (
          <div
            key={i}
            className="w-4 h-4 text-[9px] text-stone-400 flex items-center justify-center"
          >
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-1">
          {week.map((day, di) => (
            <div
              key={di}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: day.date ? INTENSITY_COLORS[day.intensity] : 'transparent' }}
              title={
                day.date
                  ? `${day.date}: ${day.eventCount} event${day.eventCount !== 1 ? 's' : ''} (${Math.round(day.totalMinutes / 60)}h)`
                  : ''
              }
            />
          ))}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-stone-500">
        <span>Less</span>
        {(['free', 'light', 'moderate', 'busy', 'overloaded'] as const).map((intensity) => (
          <div
            key={intensity}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: INTENSITY_COLORS[intensity] }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

// ============================================
// Scenario Planner
// ============================================

export function ScenarioPlanner({
  baseAnalysis,
}: {
  baseAnalysis: CapacityAnalysis
}) {
  const [addMealPrep, setAddMealPrep] = useState(0)
  const [addEvents, setAddEvents] = useState(0)

  const simulated = useMemo(
    () => simulateAdditionalLoad(baseAnalysis, addMealPrep, addEvents),
    [baseAnalysis, addMealPrep, addEvents]
  )

  const hasChanges = addMealPrep > 0 || addEvents > 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Meal Prep Slider */}
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-2">
            Additional weekly meal prep clients
          </label>
          <input
            type="range"
            min={0}
            max={10}
            value={addMealPrep}
            onChange={(e) => setAddMealPrep(Number(e.target.value))}
            className="w-full accent-violet-600"
          />
          <div className="flex justify-between text-xs text-stone-500 mt-1">
            <span>0</span>
            <span className="font-medium text-stone-200">+{addMealPrep}</span>
            <span>10</span>
          </div>
        </div>

        {/* One-off Events Slider */}
        <div>
          <label className="block text-sm font-medium text-stone-200 mb-2">
            Additional events per week
          </label>
          <input
            type="range"
            min={0}
            max={10}
            value={addEvents}
            onChange={(e) => setAddEvents(Number(e.target.value))}
            className="w-full accent-violet-600"
          />
          <div className="flex justify-between text-xs text-stone-500 mt-1">
            <span>0</span>
            <span className="font-medium text-stone-200">+{addEvents}</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Simulated Results */}
      {hasChanges && (
        <div className="bg-stone-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-4">
            <UtilizationGauge percent={simulated.utilizationPercent} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-600">Projected hours:</span>
                <span className="font-semibold text-stone-900">
                  {simulated.weeklyHoursUsed}h / {simulated.weeklyHoursAvailable}h
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-600">Burnout risk:</span>
                <BurnoutBadge risk={simulated.burnoutRisk} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-600">Remaining capacity:</span>
                <span className="font-semibold text-stone-900">
                  {simulated.additionalEventsPerWeek} more events possible
                </span>
              </div>
            </div>
          </div>

          {simulated.recommendations.length > 0 && (
            <div className="space-y-1">
              {simulated.recommendations.map((rec, i) => (
                <p key={i} className="text-sm text-stone-600">
                  {rec}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasChanges && (
        <p className="text-sm text-stone-400 text-center py-4">
          Move the sliders above to see how additional work would affect your capacity
        </p>
      )}
    </div>
  )
}

// ============================================
// Burnout Badge
// ============================================

export function BurnoutBadge({ risk }: { risk: CapacityAnalysis['burnoutRisk'] }) {
  const config = {
    low: { bg: 'bg-green-100', text: 'text-green-200', label: 'Low Risk' },
    moderate: { bg: 'bg-amber-100', text: 'text-amber-200', label: 'Moderate' },
    high: { bg: 'bg-red-100', text: 'text-red-200', label: 'High Risk' },
  }

  const c = config[risk]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

// ============================================
// Commitments Bar Chart
// ============================================

export function CommitmentsChart({
  commitments,
}: {
  commitments: CapacityAnalysis['commitments']
}) {
  const data = [
    { name: 'Recurring', hours: commitments.recurringWeekly * 3 }, // ~3h per recurring client
    { name: 'One-off Events', hours: Math.round(commitments.averageOneOffPerWeek * 5 * 10) / 10 }, // ~5h per event
    { name: 'Travel', hours: commitments.travelHoursPerWeek },
    { name: 'Admin', hours: commitments.adminHoursPerWeek },
  ].filter((d) => d.hours > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-stone-400">
        No commitment data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#78716c' }} unit="h" />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#44403c' }}
          width={100}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4' }}
          formatter={(value: number) => [`${value} hrs/week`, 'Estimated Hours']}
        />
        <Bar dataKey="hours" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ============================================
// Helpers
// ============================================

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

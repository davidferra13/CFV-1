'use client'

import { useState } from 'react'
import YoyRevenueChart from './yoy-revenue-chart'
import SeasonalTrendsPanel from './seasonal-trends-panel'
import GrowthMetricsCard from './growth-metrics-card'

type Tab = 'overview' | 'revenue' | 'seasonal'

export default function YoyComparisonDashboard() {
  const currentYear = new Date().getFullYear()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [year, setYear] = useState(currentYear)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'seasonal', label: 'Seasonal' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Year-over-Year Comparison</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track growth and seasonal trends across years
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Growth metrics at top */}
          <GrowthMetricsCard defaultYear={year} />

          {/* Revenue chart and seasonal side by side on larger screens */}
          <div className="grid gap-6 lg:grid-cols-2">
            <YoyRevenueChart defaultYear1={year - 1} defaultYear2={year} />
            <SeasonalTrendsPanel />
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <YoyRevenueChart defaultYear1={year - 1} defaultYear2={year} />
        </div>
      )}

      {activeTab === 'seasonal' && (
        <div className="space-y-6">
          <SeasonalTrendsPanel />
        </div>
      )}
    </div>
  )
}

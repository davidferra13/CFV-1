'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { IncidentDashboardData } from '@/lib/incidents/reader'
import { getIncidentContent } from '@/lib/incidents/reader'

// ============================================
// TYPES
// ============================================

type Severity = 'info' | 'warning' | 'error' | 'critical'

// ============================================
// CONSTANTS
// ============================================

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  error: 'bg-orange-100 text-orange-800 border-orange-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
}

const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-red-500',
  error: 'bg-orange-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
}

const SYSTEM_LABELS: Record<string, string> = {
  ollama: 'Ollama',
  queue: 'Task Queue',
  'circuit-breaker': 'Circuit Breaker',
  health: 'Health Check',
  webhook: 'Webhook',
  general: 'General',
}

const SYSTEM_ICONS: Record<string, string> = {
  ollama: '🤖',
  queue: '📋',
  'circuit-breaker': '⚡',
  health: '💓',
  webhook: '🔗',
  general: '📎',
}

// ============================================
// MAIN COMPONENT
// ============================================

export function IncidentsDashboard({ data }: { data: IncidentDashboardData }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedContent, setExpandedContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)

  const activeDate = searchParams.get('date') || ''
  const activeSystem = searchParams.get('system') || ''
  const activeSeverity = searchParams.get('severity') || ''

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/settings/incidents?${params.toString()}`)
  }

  function clearFilters() {
    router.push('/settings/incidents')
  }

  async function toggleExpand(file: string, fullPath: string) {
    if (expandedId === file) {
      setExpandedId(null)
      setExpandedContent('')
      return
    }

    setExpandedId(file)
    setLoadingContent(true)
    try {
      const content = await getIncidentContent(fullPath)
      setExpandedContent(content)
    } catch {
      setExpandedContent('Failed to load report.')
    } finally {
      setLoadingContent(false)
    }
  }

  const hasFilters = activeDate || activeSystem || activeSeverity

  return (
    <div className="space-y-6">
      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={data.total} color="bg-stone-50 border-stone-200" />
        <StatCard
          label="Critical"
          value={data.bySeverity.critical}
          color="bg-red-50 border-red-200"
          highlight={data.bySeverity.critical > 0}
          onClick={() => applyFilter('severity', activeSeverity === 'critical' ? '' : 'critical')}
          active={activeSeverity === 'critical'}
        />
        <StatCard
          label="Errors"
          value={data.bySeverity.error}
          color="bg-orange-50 border-orange-200"
          onClick={() => applyFilter('severity', activeSeverity === 'error' ? '' : 'error')}
          active={activeSeverity === 'error'}
        />
        <StatCard
          label="Warnings"
          value={data.bySeverity.warning}
          color="bg-yellow-50 border-yellow-200"
          onClick={() => applyFilter('severity', activeSeverity === 'warning' ? '' : 'warning')}
          active={activeSeverity === 'warning'}
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-stone-500">Filter:</span>

        {/* System filter chips */}
        {Object.entries(data.bySystem).map(([system, count]) => (
          <button
            key={system}
            onClick={() => applyFilter('system', activeSystem === system ? '' : system)}
            className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full border transition-colors ${
              activeSystem === system
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
            }`}
          >
            <span>{SYSTEM_ICONS[system] || '📎'}</span>
            <span>{SYSTEM_LABELS[system] || system}</span>
            <span className="text-xs opacity-70">({count})</span>
          </button>
        ))}

        {/* Date filter */}
        {data.dates.length > 1 && (
          <select
            value={activeDate}
            onChange={(e) => applyFilter('date', e.target.value)}
            className="px-3 py-1 text-sm rounded-full border border-stone-200 bg-white text-stone-700"
          >
            <option value="">All dates</option>
            {data.dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm rounded-full border border-stone-300 text-stone-500 hover:bg-stone-100 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Incident List ── */}
      {data.incidents.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-stone-900">No incidents</h3>
          <p className="text-stone-500 mt-1 text-sm">
            {hasFilters
              ? 'No incidents match these filters. Try clearing them.'
              : 'Everything is running smoothly. Incidents will appear here automatically when something fails.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.incidents.map((incident) => {
            const isExpanded = expandedId === incident.file
            const timeDisplay = incident.time.replace(/-/g, ':')

            return (
              <div
                key={incident.file}
                className={`rounded-lg border bg-white overflow-hidden transition-all ${
                  isExpanded ? 'border-stone-400 shadow-sm' : 'border-stone-200'
                }`}
              >
                {/* Summary row */}
                <button
                  onClick={() => toggleExpand(incident.file, incident.fullPath)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors"
                >
                  {/* Severity dot */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[incident.severity]}`}
                  />

                  {/* System icon */}
                  <span className="text-base flex-shrink-0">
                    {SYSTEM_ICONS[incident.system] || '📎'}
                  </span>

                  {/* Title */}
                  <span className="font-medium text-stone-900 flex-1 truncate">
                    {incident.title}
                  </span>

                  {/* Severity badge */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${SEVERITY_COLORS[incident.severity]}`}
                  >
                    {incident.severity}
                  </span>

                  {/* Date/time */}
                  <span className="text-xs text-stone-400 flex-shrink-0 tabular-nums">
                    {incident.date} {timeDisplay}
                  </span>

                  {/* Expand arrow */}
                  <svg
                    className={`w-4 h-4 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-stone-200 px-4 py-4 bg-stone-50">
                    {loadingContent ? (
                      <div className="text-sm text-stone-500 animate-pulse">Loading report...</div>
                    ) : (
                      <pre className="text-sm text-stone-700 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                        {expandedContent}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatCard({
  label,
  value,
  color,
  highlight = false,
  onClick,
  active = false,
}: {
  label: string
  value: number
  color: string
  highlight?: boolean
  onClick?: () => void
  active?: boolean
}) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-center transition-all ${color} ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      } ${active ? 'ring-2 ring-stone-900 ring-offset-1' : ''}`}
    >
      <div className={`text-2xl font-bold ${highlight ? 'text-red-700' : 'text-stone-900'}`}>
        {value}
      </div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
    </Component>
  )
}

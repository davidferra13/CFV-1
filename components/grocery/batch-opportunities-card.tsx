'use client'

import { useState, useEffect } from 'react'
import { getBatchOpportunities, type BatchOpportunity } from '@/lib/grocery/batch-opportunities'
import { format, startOfWeek, endOfWeek } from 'date-fns'

export function BatchOpportunitiesCard() {
  const [opportunities, setOpportunities] = useState<BatchOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadOpportunities()
  }, [])

  async function loadOpportunities() {
    try {
      const now = new Date()
      const start = startOfWeek(now, { weekStartsOn: 1 })
      const end = endOfWeek(now, { weekStartsOn: 1 })
      const data = await getBatchOpportunities(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      )
      setOpportunities(data)
    } catch (err) {
      console.error('[batch-opportunities] Failed to load', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null
  if (opportunities.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">Batch Opportunities This Week</h3>
          <p className="text-xs text-muted-foreground">
            {opportunities.length} shared ingredient{opportunities.length !== 1 ? 's' : ''} across
            events
          </p>
        </div>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {opportunities.map((opp) => (
            <div key={opp.ingredientId} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-foreground">{opp.ingredientName}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {opp.totalQuantity} {opp.unit}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{opp.eventCount} events</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

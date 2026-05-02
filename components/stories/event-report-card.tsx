'use client'

// Event Storytelling Report Card
// Module: more (analytics)
// Renders post-event report with narrative, financials, timeline, feedback.
// Fetches data on demand; shown on event wrap tab.

import { useState, useTransition } from 'react'
import {
  getEventReport,
  exportEventReportCSV,
  type EventReportData,
} from '@/lib/stories/event-report-actions'
import { format } from 'date-fns'

type Props = {
  eventId: string
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ratingStars(rating: number | null): string {
  if (rating == null) return '-'
  return '\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating)
}

export function EventReportCard({ eventId }: Props) {
  const [report, setReport] = useState<EventReportData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isExporting, startExport] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      try {
        const data = await getEventReport(eventId)
        setReport(data)
      } catch {
        // Non-blocking
      }
    })
  }

  function handleExport() {
    startExport(async () => {
      try {
        const { csv, filename } = await exportEventReportCSV(eventId)
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        // Non-blocking
      }
    })
  }

  if (!report) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-stone-300">Event Report</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Full narrative with financials, timeline, and feedback
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 disabled:opacity-50"
          >
            {isPending ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    )
  }

  const s = report.story

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-stone-100">{s.occasion || 'Event'} Report</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {format(new Date(s.eventDate), 'MMMM d, yyyy')}
            {s.locationCity &&
              ` \u00B7 ${s.locationCity}${s.locationState ? `, ${s.locationState}` : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="text-xs px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Guests" value={String(s.guestCount)} />
        <StatBox label="Courses" value={String(s.courseCount)} />
        <StatBox label="Photos" value={String(report.photoCount)} />
        <StatBox label="Dietary" value={String(s.dietaryAccommodations)} />
      </div>

      {/* Menu */}
      {s.dishes.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
            {s.menuName || 'Menu'}
            {s.cuisineType ? ` \u00B7 ${s.cuisineType}` : ''}
          </h4>
          {s.dishes.map((dish, i) => (
            <div key={i} className="flex items-baseline gap-2 text-xs">
              <span className="text-stone-600 shrink-0">#{dish.courseNumber}</span>
              <span className="text-stone-300">{dish.courseName}</span>
              {dish.dietaryTags.length > 0 && (
                <span className="text-stone-600">({dish.dietaryTags.join(', ')})</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Financials */}
      <div className="space-y-2 pt-2 border-t border-stone-800">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Financials</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <FinancialRow label="Revenue" cents={report.financials.revenueCents} />
          <FinancialRow
            label="Food Cost"
            cents={report.financials.foodCostCents}
            pct={report.financials.foodCostPct}
          />
          <FinancialRow
            label="Labor"
            cents={report.financials.laborCostCents}
            pct={report.financials.laborCostPct}
          />
          <FinancialRow label="Total Expenses" cents={report.financials.expenseCents} />
          <FinancialRow
            label="Gross Profit"
            cents={report.financials.grossProfitCents}
            pct={report.financials.marginPct}
            highlight
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-1 pt-2 border-t border-stone-800">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Timeline</h4>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {report.timeline.proposedAt && (
            <span className="text-stone-500">
              Proposed: {format(new Date(report.timeline.proposedAt), 'MMM d')}
            </span>
          )}
          {report.timeline.acceptedAt && (
            <span className="text-stone-500">
              Accepted: {format(new Date(report.timeline.acceptedAt), 'MMM d')}
            </span>
          )}
          {report.timeline.confirmedAt && (
            <span className="text-stone-500">
              Confirmed: {format(new Date(report.timeline.confirmedAt), 'MMM d')}
            </span>
          )}
          {report.timeline.completedAt && (
            <span className="text-emerald-500">
              Completed: {format(new Date(report.timeline.completedAt), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      {/* Feedback */}
      {report.feedback.aarFiled && (
        <div className="space-y-2 pt-2 border-t border-stone-800">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
            Self-Assessment
          </h4>
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-stone-500">Calm: </span>
              <span className="text-amber-400">{ratingStars(report.feedback.calmRating)}</span>
            </div>
            <div>
              <span className="text-stone-500">Execution: </span>
              <span className="text-amber-400">{ratingStars(report.feedback.executionRating)}</span>
            </div>
          </div>
          {report.feedback.whatWentWell && (
            <p className="text-xs text-emerald-400/80">{report.feedback.whatWentWell}</p>
          )}
          {report.feedback.whatWentWrong && (
            <p className="text-xs text-red-400/80">{report.feedback.whatWentWrong}</p>
          )}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-stone-800/50 px-3 py-2 text-center">
      <div className="text-lg font-bold text-stone-200">{value}</div>
      <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function FinancialRow({
  label,
  cents,
  pct,
  highlight,
}: {
  label: string
  cents: number
  pct?: number
  highlight?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] text-stone-500">{label}</div>
      <div
        className={`text-sm font-medium ${highlight ? (cents >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-stone-300'}`}
      >
        {fmt(cents)}
        {pct != null && <span className="text-stone-500 text-[10px] ml-1">({pct}%)</span>}
      </div>
    </div>
  )
}

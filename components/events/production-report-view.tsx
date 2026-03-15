// Production Report View - Interactive collapsible view of the production report.
// Shows scaled ingredients, methods, time badges, and allergen/dietary summaries.

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  generateProductionReport,
  generateProductionReportPdf,
  type ProductionReport,
  type ReportCourse,
  type ReportComponent,
} from '@/lib/events/production-report-actions'

type ProductionReportViewProps = {
  eventId: string
  onClose: () => void
}

export function ProductionReportView({ eventId, onClose }: ProductionReportViewProps) {
  const [report, setReport] = useState<ProductionReport | null>(null)
  const [loading, startLoad] = useTransition()
  const [pdfLoading, startPdf] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Load report on first render
  useState(() => {
    startLoad(async () => {
      try {
        const data = await generateProductionReport(eventId)
        setReport(data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load report'
        setError(msg)
        toast.error(msg)
      }
    })
  })

  function handleDownloadPdf() {
    startPdf(async () => {
      try {
        const buffer = await generateProductionReportPdf(eventId)
        const blob = new Blob([buffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate PDF'
        toast.error(msg)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-zinc-500">Loading production report...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="flex flex-col gap-4 print:gap-2">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold print:text-base">Production Report</h2>
          <p className="text-sm text-zinc-500">
            {report.eventName} - {formatDate(report.eventDate)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="secondary" size="sm" loading={pdfLoading} onClick={handleDownloadPdf}>
            Download PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
        <InfoCard label="Client" value={report.clientName} />
        <InfoCard label="Guests" value={String(report.guestCount)} />
        <InfoCard label="Total Prep" value={formatMinutes(report.totalPrepMinutes)} />
        <InfoCard label="Total Cook" value={formatMinutes(report.totalCookMinutes)} />
      </div>

      {/* Courses */}
      {report.courses.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
          No dishes found on this menu.
        </div>
      ) : (
        report.courses.map((course) => <CourseSection key={course.courseNumber} course={course} />)
      )}

      {/* Allergen/Dietary summary */}
      {(report.allergenSummary.length > 0 || report.dietarySummary.length > 0) && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2 print:grid-cols-2">
          {report.allergenSummary.length > 0 && (
            <SummaryCard title="Allergens" items={report.allergenSummary} variant="danger" />
          )}
          {report.dietarySummary.length > 0 && (
            <SummaryCard
              title="Dietary Requirements"
              items={report.dietarySummary}
              variant="info"
            />
          )}
        </div>
      )}
    </div>
  )
}

// -- Sub-components --

function CourseSection({ course }: { course: ReportCourse }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-lg border border-zinc-200 print:border-zinc-300">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-sm hover:bg-zinc-50 print:hover:bg-transparent"
        onClick={() => setOpen(!open)}
      >
        <span>
          Course {course.courseNumber}: {course.courseName}
        </span>
        <span className="text-zinc-400 print:hidden">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-2 print:border-zinc-200">
          {course.dishes.map((dish, di) => (
            <div key={di} className="mt-3 first:mt-0">
              <h4 className="font-medium text-sm">{dish.dishName}</h4>
              <div className="mt-2 flex flex-col gap-3">
                {dish.components.map((comp, ci) => (
                  <ComponentCard key={ci} component={comp} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ComponentCard({ component }: { component: ReportComponent }) {
  const [showMethod, setShowMethod] = useState(false)

  return (
    <div className="rounded border border-zinc-100 bg-zinc-50 p-3 print:bg-white print:border-zinc-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-medium text-sm">{component.componentName}</span>
          {component.recipeName && component.recipeName !== component.componentName && (
            <span className="ml-2 text-xs text-zinc-500">({component.recipeName})</span>
          )}
        </div>
        <div className="flex gap-1.5">
          {component.prepTimeMinutes != null && component.prepTimeMinutes > 0 && (
            <TimeBadge label="Prep" minutes={component.prepTimeMinutes} />
          )}
          {component.cookTimeMinutes != null && component.cookTimeMinutes > 0 && (
            <TimeBadge label="Cook" minutes={component.cookTimeMinutes} />
          )}
        </div>
      </div>

      {/* Ingredients table */}
      {component.scaledIngredients.length > 0 && (
        <div className="mt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="pb-1 font-medium">Ingredient</th>
                <th className="pb-1 font-medium text-right">Qty</th>
                <th className="pb-1 font-medium">Unit</th>
                <th className="pb-1 font-medium">Prep</th>
              </tr>
            </thead>
            <tbody>
              {component.scaledIngredients.map((ing, i) => (
                <tr key={i} className="border-b border-zinc-100 last:border-0">
                  <td className="py-1">{ing.name}</td>
                  <td className="py-1 text-right font-mono">{formatQuantity(ing.quantity)}</td>
                  <td className="py-1 text-zinc-600">{ing.unit}</td>
                  <td className="py-1 text-zinc-500">{ing.preparation ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Method toggle */}
      {component.method && (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 print:hidden"
            onClick={() => setShowMethod(!showMethod)}
          >
            {showMethod ? 'Hide method' : 'Show method'}
          </button>
          {/* Always visible in print */}
          <div
            className={`mt-1 text-xs text-zinc-600 whitespace-pre-wrap ${showMethod ? '' : 'hidden print:block'}`}
          >
            {component.method}
          </div>
        </div>
      )}
    </div>
  )
}

function TimeBadge({ label, minutes }: { label: string; minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 print:bg-zinc-100">
      <span className="font-medium">{label}:</span>
      <span>{formatMinutes(minutes)}</span>
    </span>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 print:border-zinc-300">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-0.5 font-semibold text-sm">{value}</div>
    </div>
  )
}

function SummaryCard({
  title,
  items,
  variant,
}: {
  title: string
  items: string[]
  variant: 'danger' | 'info'
}) {
  const bg = variant === 'danger' ? 'bg-red-50' : 'bg-blue-50'
  const border = variant === 'danger' ? 'border-red-200' : 'border-blue-200'
  const titleColor = variant === 'danger' ? 'text-red-700' : 'text-blue-700'
  const textColor = variant === 'danger' ? 'text-red-600' : 'text-blue-600'

  return (
    <div className={`rounded-lg border ${border} ${bg} p-3`}>
      <div className={`text-xs font-semibold ${titleColor}`}>{title}</div>
      <div className={`mt-1 flex flex-wrap gap-1.5`}>
        {items.map((item) => (
          <span
            key={item}
            className={`inline-block rounded-full px-2 py-0.5 text-xs ${textColor} bg-white/60`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// -- Helpers --

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0min'
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatQuantity(qty: number): string {
  if (Number.isInteger(qty)) return String(qty)
  return qty.toFixed(2).replace(/\.?0+$/, '')
}

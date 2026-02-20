// Interactive Document Viewer
// Renders a live, tappable version of any operational PDF for use during prep / shopping / service.
// State is localStorage-only per (eventId, docType) — no server roundtrip per item.
// Each document type calls its existing fetch*Data() function and converts the result
// to a normalized InteractiveDocSpec via the converter in lib/documents/interactive-specs.ts.
// Packing list is intentionally excluded — it has its own specialized page at /events/[id]/pack.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Button } from '@/components/ui/button'
import { InteractiveDocClient } from '@/components/events/interactive-doc-client'
import {
  groceryListToSpec,
  prepSheetToSpec,
  checklistToSpec,
  resetChecklistToSpec,
  contentShotListToSpec,
  travelRouteToSpec,
  eventSummaryToSpec,
  executionSheetToSpec,
  fohMenuToSpec,
  type InteractiveDocSpec,
} from '@/lib/documents/interactive-specs'
import { fetchGroceryListData } from '@/lib/documents/generate-grocery-list'
import { fetchPrepSheetData } from '@/lib/documents/generate-prep-sheet'
import { fetchChecklistData } from '@/lib/documents/generate-checklist'
import { fetchResetChecklistData } from '@/lib/documents/generate-reset-checklist'
import { fetchContentShotListData } from '@/lib/documents/generate-content-shot-list'
import { fetchTravelRouteData } from '@/lib/documents/generate-travel-route'
import { fetchEventSummaryData } from '@/lib/documents/generate-event-summary'
import { fetchExecutionSheetData } from '@/lib/documents/generate-execution-sheet'
import { fetchFrontOfHouseMenuData } from '@/lib/documents/generate-front-of-house-menu'

// ─── Label map ────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  summary: 'Event Summary',
  grocery: 'Grocery List',
  foh: 'Front-of-House Menu',
  prep: 'Prep Sheet',
  execution: 'Execution Sheet',
  checklist: 'Non-Negotiables Checklist',
  reset: 'Post-Service Reset Checklist',
  shots: 'Content Shot List',
  travel: 'Travel Route',
}

// ─── Spec resolver ────────────────────────────────────────────────────────────

async function resolveSpec(
  eventId: string,
  type: string,
): Promise<InteractiveDocSpec | null> {
  switch (type) {
    case 'summary': {
      const data = await fetchEventSummaryData(eventId)
      return data ? eventSummaryToSpec(data) : null
    }
    case 'grocery': {
      const data = await fetchGroceryListData(eventId)
      return data ? groceryListToSpec(data) : null
    }
    case 'foh': {
      const data = await fetchFrontOfHouseMenuData(eventId)
      return data ? fohMenuToSpec(data) : null
    }
    case 'prep': {
      const data = await fetchPrepSheetData(eventId)
      return data ? prepSheetToSpec(data) : null
    }
    case 'execution': {
      const data = await fetchExecutionSheetData(eventId)
      return data ? executionSheetToSpec(data) : null
    }
    case 'checklist': {
      const data = await fetchChecklistData(eventId)
      return data ? checklistToSpec(data) : null
    }
    case 'reset': {
      const data = await fetchResetChecklistData(eventId)
      return data ? resetChecklistToSpec(data) : null
    }
    case 'shots': {
      const data = await fetchContentShotListData(eventId)
      return data ? contentShotListToSpec(data) : null
    }
    case 'travel': {
      const data = await fetchTravelRouteData(eventId)
      return data ? travelRouteToSpec(data) : null
    }
    default:
      return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InteractivePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { type?: string }
}) {
  await requireChef()

  const type = searchParams.type ?? ''
  const label = DOC_LABELS[type]
  if (!label) notFound()

  const spec = await resolveSpec(params.id, type)
  if (!spec) notFound()

  const pdfUrl = `/api/documents/${params.id}?type=${type}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/events/${params.id}`}
            className="text-sm text-stone-500 hover:text-stone-700 mb-1 block"
          >
            ← Back to event
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">{spec.title}</h1>
          {spec.subtitle && (
            <p className="text-stone-500 text-sm mt-0.5">{spec.subtitle}</p>
          )}
        </div>

        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 mt-6">
          <Button variant="secondary" size="sm">
            Open PDF ↗
          </Button>
        </a>
      </div>

      {/* Header pills — event, client, date, guests, etc. */}
      {spec.headerPills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {spec.headerPills.map(pill => (
            <div key={pill.label} className="bg-stone-100 rounded-lg px-3 py-1.5">
              <p className="text-xs text-stone-500">{pill.label}</p>
              <p className="text-sm font-medium text-stone-900">{pill.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Interactive checklist / reference view */}
      <InteractiveDocClient
        eventId={params.id}
        docType={type}
        spec={spec}
      />
    </div>
  )
}

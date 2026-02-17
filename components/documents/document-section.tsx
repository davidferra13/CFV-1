// Document Section — shows document readiness and download/print buttons
// Placed on the event detail page for chef access to the three printed sheets
'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { DocumentReadiness } from '@/lib/documents/actions'

type DocumentSectionProps = {
  eventId: string
  readiness: DocumentReadiness
  hasMenu: boolean
}

function ReadinessIndicator({ ready, missing }: { ready: boolean; missing: string[] }) {
  if (ready) {
    return <span className="text-green-600 text-sm font-medium">Ready</span>
  }
  return (
    <span className="text-amber-600 text-sm">
      Needs: {missing.join(', ')}
    </span>
  )
}

export function DocumentSection({ eventId, readiness, hasMenu }: DocumentSectionProps) {
  const baseUrl = `/api/documents/${eventId}`

  if (!hasMenu) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Printed Documents</h2>
        <p className="text-stone-500 text-sm">
          Documents will be available once a menu is confirmed for this event.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Printed Documents (3 Sheets)</h2>
      <p className="text-stone-500 text-sm mb-4">
        Generate your three printed sheets for this event. Each document is exactly one page.
      </p>

      <div className="space-y-3">
        {/* Prep Sheet */}
        <div className="flex items-center justify-between py-2 border-b border-stone-100">
          <div>
            <p className="font-medium text-stone-900">Prep Sheet</p>
            <p className="text-xs text-stone-500">At-home prep tasks by course + on-site execution</p>
            <ReadinessIndicator ready={readiness.prepSheet.ready} missing={readiness.prepSheet.missing} />
          </div>
          <a
            href={`${baseUrl}?type=prep`}
            target="_blank"
            rel="noopener noreferrer"
            className={!readiness.prepSheet.ready ? 'pointer-events-none' : ''}
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={!readiness.prepSheet.ready}
            >
              View PDF
            </Button>
          </a>
        </div>

        {/* Execution Sheet */}
        <div className="flex items-center justify-between py-2 border-b border-stone-100">
          <div>
            <p className="font-medium text-stone-900">Execution Sheet</p>
            <p className="text-xs text-stone-500">Clean menu + execution plan + dietary warnings</p>
            <ReadinessIndicator ready={readiness.executionSheet.ready} missing={readiness.executionSheet.missing} />
          </div>
          <a
            href={`${baseUrl}?type=execution`}
            target="_blank"
            rel="noopener noreferrer"
            className={!readiness.executionSheet.ready ? 'pointer-events-none' : ''}
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={!readiness.executionSheet.ready}
            >
              View PDF
            </Button>
          </a>
        </div>

        {/* Checklist */}
        <div className="flex items-center justify-between py-2 border-b border-stone-100">
          <div>
            <p className="font-medium text-stone-900">Non-Negotiables Checklist</p>
            <p className="text-xs text-stone-500">Permanent items + event-specific + learned from AARs</p>
            <ReadinessIndicator ready={readiness.checklist.ready} missing={readiness.checklist.missing} />
          </div>
          <a
            href={`${baseUrl}?type=checklist`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" size="sm">
              View PDF
            </Button>
          </a>
        </div>
      </div>

      {/* Print All button */}
      <div className="mt-5 pt-4 border-t border-stone-200">
        <a
          href={`${baseUrl}?type=all`}
          target="_blank"
          rel="noopener noreferrer"
          className={!readiness.prepSheet.ready ? 'pointer-events-none' : ''}
        >
          <Button
            variant="primary"
            disabled={!readiness.prepSheet.ready}
            className="w-full"
          >
            Print All (3 Sheets)
          </Button>
        </a>
      </div>
    </Card>
  )
}

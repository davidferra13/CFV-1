// Document Section — shows document readiness and view/print buttons
// Placed on the event detail page (and inquiry pages with a linked event) for chef access
// "View PDF" opens an inline iframe modal. ↗ opens in a new tab as a fallback.
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PdfViewerModal } from '@/components/documents/pdf-viewer-modal'
import type { DocumentReadiness, BusinessDocInfo } from '@/lib/documents/actions'

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent to client',
  viewed: 'Client viewed',
  signed: 'Signed',
  voided: 'Voided',
}

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Declined',
  expired: 'Expired',
}

type DocumentSectionProps = {
  eventId: string
  readiness: DocumentReadiness
  businessDocs?: BusinessDocInfo | null
}

type DocEntry = {
  type: string
  label: string
  description: string
  ready: boolean
  missing: string[]
}

function ReadinessIndicator({ ready, missing }: { ready: boolean; missing: string[] }) {
  if (ready) {
    return <span className="text-emerald-600 text-sm font-medium">Ready</span>
  }
  return <span className="text-amber-600 text-sm">Needs: {missing.join(', ')}</span>
}

export function DocumentSection({ eventId, readiness, businessDocs }: DocumentSectionProps) {
  const baseUrl = `/api/documents/${eventId}`
  const [viewingDoc, setViewingDoc] = useState<{ type: string; label: string } | null>(null)

  const docs: DocEntry[] = [
    {
      type: 'summary',
      label: 'Event Summary',
      description: 'Full-picture reorientation: client, location, dietary, financial, history',
      ready: readiness.eventSummary.ready,
      missing: readiness.eventSummary.missing,
    },
    {
      type: 'grocery',
      label: 'Grocery List',
      description: 'Ingredients by store section + stop — bring to the store',
      ready: readiness.groceryList.ready,
      missing: readiness.groceryList.missing,
    },
    {
      type: 'foh',
      label: 'Front-of-House Menu',
      description: 'Client-facing menu formatted for table print',
      ready: readiness.frontOfHouseMenu.ready,
      missing: readiness.frontOfHouseMenu.missing,
    },
    {
      type: 'prep',
      label: 'Prep Sheet',
      description: 'At-home prep tasks by course + on-site execution',
      ready: readiness.prepSheet.ready,
      missing: readiness.prepSheet.missing,
    },
    {
      type: 'execution',
      label: 'Execution Sheet',
      description: 'Clean menu + execution plan + dietary warnings',
      ready: readiness.executionSheet.ready,
      missing: readiness.executionSheet.missing,
    },
    {
      type: 'checklist',
      label: 'Non-Negotiables Checklist',
      description: 'Permanent items + event-specific + learned from AARs',
      ready: readiness.checklist.ready,
      missing: readiness.checklist.missing,
    },
    {
      type: 'packing',
      label: 'Packing List',
      description: 'Food by transport zone + equipment + component counts',
      ready: readiness.packingList.ready,
      missing: readiness.packingList.missing,
    },
    {
      type: 'reset',
      label: 'Post-Service Reset Checklist',
      description: 'Night-of or by-noon checklist: car, cooler, equipment, laundry, finances',
      ready: readiness.resetChecklist.ready,
      missing: readiness.resetChecklist.missing,
    },
  ]

  const travelRouteReady = readiness.travelRoute.ready
  const travelRouteMissing = readiness.travelRoute.missing

  return (
    <>
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Printed Documents (8 Sheets)</h2>
        <p className="text-stone-500 text-sm mb-4">
          Generate your eight printed sheets for this event. Each document is exactly one page.
        </p>

        <div className="space-y-3">
          {docs.map((doc, i) => (
            <div
              key={doc.type}
              className={`flex items-center justify-between py-2 ${i < docs.length - 1 ? 'border-b border-stone-800' : ''}`}
            >
              <div>
                <p className="font-medium text-stone-100">{doc.label}</p>
                <p className="text-xs text-stone-500">{doc.description}</p>
                <ReadinessIndicator ready={doc.ready} missing={doc.missing} />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Packing list gets a specialized "Pack Now" interactive page */}
                {doc.type === 'packing' && (
                  <a href={`/events/${eventId}/pack`}>
                    <Button variant="secondary" size="sm">
                      Pack Now
                    </Button>
                  </a>
                )}

                {/* Interactive viewer — all operational docs except packing */}
                {doc.type !== 'packing' &&
                  (doc.ready ? (
                    <a href={`/events/${eventId}/interactive?type=${doc.type}`}>
                      <Button variant="secondary" size="sm">
                        Interactive
                      </Button>
                    </a>
                  ) : (
                    <Button variant="secondary" size="sm" disabled>
                      Interactive
                    </Button>
                  ))}

                {/* View PDF — opens inline modal */}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!doc.ready}
                  onClick={() => doc.ready && setViewingDoc({ type: doc.type, label: doc.label })}
                >
                  View PDF
                </Button>

                {/* ↗ escape hatch — opens PDF in a new tab */}
                {doc.ready && (
                  <a
                    href={`${baseUrl}?type=${doc.type}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 hover:text-stone-300 text-sm"
                    title="Open in new tab"
                    aria-label={`Open ${doc.label} in new tab`}
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Print All — combined 8-page PDF; stays as new-tab link for multi-page print */}
        <div className="mt-5 pt-4 border-t border-stone-700">
          <a href={`${baseUrl}?type=all`} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" className="w-full">
              Print All (8 Sheets)
            </Button>
          </a>
        </div>
      </Card>

      {/* Travel Route — separate card; variable-length, not part of the 8-sheet set */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-1">Travel Route</h2>
        <p className="text-stone-500 text-sm mb-4">
          Complete route sheet for all planned trips — specialty sourcing, grocery runs, venue
          travel, and return home. One page per leg.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <ReadinessIndicator ready={travelRouteReady} missing={travelRouteMissing} />
            {!travelRouteReady && (
              <p className="text-xs text-stone-400 mt-1">
                <a
                  href={`/events/${eventId}/travel`}
                  className="underline underline-offset-2 hover:text-stone-300"
                >
                  Open Travel Plan
                </a>{' '}
                to add your route.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={`/events/${eventId}/travel`}>
              <Button variant="secondary" size="sm">
                Plan Route
              </Button>
            </a>
            {travelRouteReady && (
              <a href={`/events/${eventId}/interactive?type=travel`}>
                <Button variant="secondary" size="sm">
                  Interactive
                </Button>
              </a>
            )}
            {travelRouteReady && (
              <a href={`${baseUrl}?type=travel`} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="sm">
                  Print Route ↗
                </Button>
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* Content Asset Capture Sheet — marketing tool, separate from operational packet */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-1">Content Asset Capture Sheet</h2>
        <p className="text-stone-500 text-sm mb-4">
          Shot list for capturing 20+ marketing assets per event — organized by phase, with platform
          specs and brand consistency reminders. Bring this alongside your other printed sheets.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-emerald-600 text-sm font-medium">Always ready</span>
            <p className="text-xs text-stone-400 mt-1">Static checklist — no menu data required</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={`/events/${eventId}/interactive?type=shots`}>
              <Button variant="secondary" size="sm">
                Interactive
              </Button>
            </a>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewingDoc({ type: 'shots', label: 'Content Asset Capture Sheet' })}
            >
              View PDF
            </Button>
            <a
              href={`${baseUrl}?type=shots`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-300 text-sm"
              title="Open in new tab"
              aria-label="Open Content Asset Capture Sheet in new tab"
            >
              ↗
            </a>
          </div>
        </div>
      </Card>

      {/* Business Documents — quote, contract, invoice */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-1">Business Documents</h2>
        <p className="text-stone-500 text-sm mb-4">Quote, contract, and invoice for this event.</p>
        <div className="space-y-0">
          {/* Quote */}
          {businessDocs?.quote ? (
            <div className="flex items-center justify-between py-3 border-b border-stone-800">
              <div>
                <p className="font-medium text-stone-100">Quote / Proposal</p>
                <p className="text-xs text-stone-500">{businessDocs.quote.ref}</p>
                <span className="text-sm text-stone-400">
                  {QUOTE_STATUS_LABELS[businessDocs.quote.status] ?? businessDocs.quote.status}
                </span>
              </div>
              <a
                href={`/api/documents/quote/${businessDocs.quote.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-stone-500 hover:text-stone-200 font-medium shrink-0"
              >
                Download PDF ↗
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between py-3 border-b border-stone-800">
              <div>
                <p className="font-medium text-stone-100">Quote / Proposal</p>
                <span className="text-sm text-stone-400">None yet</span>
              </div>
              <a href={`/events/${eventId}`} className="text-sm text-stone-400">
                Create via event page
              </a>
            </div>
          )}

          {/* Contract */}
          {businessDocs?.contract ? (
            <div className="flex items-center justify-between py-3 border-b border-stone-800">
              <div>
                <p className="font-medium text-stone-100">Service Agreement</p>
                <span className="text-sm text-stone-400">
                  {CONTRACT_STATUS_LABELS[businessDocs.contract.status] ??
                    businessDocs.contract.status}
                  {businessDocs.contract.status === 'signed' && businessDocs.contract.signedAt && (
                    <span className="text-stone-400 ml-1">
                      — {new Date(businessDocs.contract.signedAt).toLocaleDateString()}
                    </span>
                  )}
                </span>
              </div>
              {businessDocs.contract.status !== 'voided' && (
                <a
                  href={`/api/documents/contract/${businessDocs.contract.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-stone-500 hover:text-stone-200 font-medium shrink-0"
                >
                  {businessDocs.contract.status === 'signed'
                    ? 'Download Signed PDF ↗'
                    : 'Preview PDF ↗'}
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between py-3 border-b border-stone-800">
              <div>
                <p className="font-medium text-stone-100">Service Agreement</p>
                <span className="text-sm text-stone-400">None generated</span>
              </div>
            </div>
          )}

          {/* Invoice */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-stone-100">Invoice</p>
              {businessDocs?.invoiceNumber ? (
                <p className="text-xs text-stone-500">{businessDocs.invoiceNumber}</p>
              ) : (
                <span className="text-sm text-stone-400">Assigned on first payment</span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href={`/events/${eventId}/invoice`}
                className="text-sm text-stone-500 hover:text-stone-200 font-medium"
              >
                View
              </a>
              {businessDocs?.invoiceNumber && (
                <a
                  href={`/api/documents/invoice/${eventId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-stone-500 hover:text-stone-200 font-medium"
                >
                  Download PDF ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Inline PDF viewer modal */}
      {viewingDoc && (
        <PdfViewerModal
          src={`${baseUrl}?type=${viewingDoc.type}`}
          title={viewingDoc.label}
          isOpen={viewingDoc !== null}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </>
  )
}

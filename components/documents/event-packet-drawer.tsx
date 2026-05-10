'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { DocumentReadiness } from '@/lib/documents/actions'
import type { ReadinessResult } from '@/lib/events/readiness'

// All 10 documents in the private chef packet
const PACKET_DOCS = [
  {
    key: 'eventSummary' as keyof DocumentReadiness,
    type: 'summary',
    label: 'Event Summary',
    description: 'Full-picture reorientation: client, location, dietary, financial, history',
    fixPath: (id: string) => `/events/${id}/interactive?type=summary`,
  },
  {
    key: 'groceryList' as keyof DocumentReadiness,
    type: 'grocery',
    label: 'Grocery List',
    description: 'Ingredients by store section and stop',
    fixPath: (id: string) => `/events/${id}/interactive?type=grocery`,
  },
  {
    key: 'frontOfHouseMenu' as keyof DocumentReadiness,
    type: 'foh',
    label: 'Front-of-House Menu',
    description: 'Client-facing menu formatted for table print',
    fixPath: (id: string) => `/events/${id}/interactive?type=foh`,
  },
  {
    key: 'prepSheet' as keyof DocumentReadiness,
    type: 'prep',
    label: 'Prep Sheet',
    description: 'Chronological day-before and morning-of prep list by recipe',
    fixPath: (id: string) => `/events/${id}/interactive?type=prep`,
  },
  {
    key: 'executionSheet' as keyof DocumentReadiness,
    type: 'execution',
    label: 'Execution Sheet',
    description: 'Course-by-course service timeline with arrival-relative times',
    fixPath: (id: string) => `/events/${id}/interactive?type=execution`,
  },
  {
    key: 'checklist' as keyof DocumentReadiness,
    type: 'checklist',
    label: 'Checklist',
    description: 'Pre-event checklist: equipment, tools, supplies, and car check',
    fixPath: (id: string) => `/events/${id}/interactive?type=checklist`,
  },
  {
    key: 'packingList' as keyof DocumentReadiness,
    type: 'packing',
    label: 'Packing List',
    description: 'Cooler zones: cold, frozen, room temp, fragile, liquid',
    fixPath: (id: string) => `/events/${id}/pack`,
  },
  {
    key: 'resetChecklist' as keyof DocumentReadiness,
    type: 'reset',
    label: 'Reset Checklist',
    description: 'Night-of or by-noon checklist: car, cooler, equipment, laundry, finances',
    fixPath: (id: string) => `/events/${id}/interactive?type=reset`,
  },
  {
    key: 'travelRoute' as keyof DocumentReadiness,
    type: 'travel',
    label: 'Travel Route',
    description: 'Route sheet for sourcing runs, venue travel, and return home',
    fixPath: (id: string) => `/events/${id}/travel`,
  },
  {
    key: 'platingGuide' as keyof DocumentReadiness,
    type: 'plating',
    label: 'Plating Guide',
    description: 'Per-dish plate type, garnish, portion, and presentation notes',
    fixPath: (id: string) => `/events/${id}/interactive?type=plating`,
  },
  {
    key: 'allergenReference' as keyof DocumentReadiness,
    type: 'allergen',
    label: 'Allergen Quick-Reference',
    description: 'Per-guest allergens and per-dish safety notes for station tape',
    fixPath: (id: string) => `/events/${id}/interactive?type=allergen`,
  },
  {
    key: 'venueRecon' as keyof DocumentReadiness,
    type: 'venue',
    label: 'Venue/Kitchen Recon',
    description: 'Kitchen equipment, utilities, storage, and access checklist',
    fixPath: (id: string) => `/events/${id}/interactive?type=venue`,
  },
  {
    key: 'beverageNotes' as keyof DocumentReadiness,
    type: 'beverage',
    label: 'Beverage & Pairing Notes',
    description: 'Per-course pairings, temps, glassware, client-provided drinks',
    fixPath: (id: string) => `/events/${id}/interactive?type=beverage`,
  },
  {
    key: 'clientContact' as keyof DocumentReadiness,
    type: 'contact',
    label: 'Client Contact & Access',
    description: 'Client phone, address, gate code, parking, emergency info',
    fixPath: (id: string) => `/events/${id}/interactive?type=contact`,
  },
  {
    key: 'miseCheck' as keyof DocumentReadiness,
    type: 'mise',
    label: 'Mise en Place Verification',
    description: 'Component-level portioning, labeling, and taste verification',
    fixPath: (id: string) => `/events/${id}/interactive?type=mise`,
  },
  {
    key: null,
    type: 'shots',
    label: 'Photo Shot List',
    description: 'Plating and presentation shots to capture during service',
    fixPath: null,
  },
] as const

type PacketDoc = (typeof PACKET_DOCS)[number]

function isReadinessKey(key: PacketDoc['key']): key is keyof DocumentReadiness {
  return key !== null
}

function DocRow({
  doc,
  ready,
  missing,
  eventId,
}: {
  doc: PacketDoc
  ready: boolean
  missing: string[]
  eventId: string
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-stone-800 last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">
          {ready ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-900/60 text-emerald-400 text-xs font-bold">
              &#10003;
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-900/60 text-amber-400 text-xs font-bold">
              !
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-100">{doc.label}</p>
          <p className="text-xs text-stone-500 truncate">{doc.description}</p>
          {!ready && missing.length > 0 && (
            <p className="text-xs text-amber-500 mt-0.5">Needs: {missing.join(', ')}</p>
          )}
        </div>
      </div>
      {!ready && doc.fixPath && (
        <a
          href={doc.fixPath(eventId)}
          className="ml-3 shrink-0 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 whitespace-nowrap"
        >
          Fix it
        </a>
      )}
    </div>
  )
}

export function EventPacketDrawer({
  eventId,
  readiness,
  readinessGate,
}: {
  eventId: string
  readiness: DocumentReadiness
  readinessGate: ReadinessResult | null
}) {
  const [open, setOpen] = useState(false)

  const readyCount = PACKET_DOCS.filter((doc) => {
    if (!isReadinessKey(doc.key)) return true // shots is always ready
    return readiness[doc.key].ready
  }).length

  const allReady = readyCount === PACKET_DOCS.length
  const hasBlockers = readinessGate && readinessGate.counts.blockers > 0

  function handleDownload() {
    window.open(`/api/documents/${eventId}?type=all&archive=1`, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setOpen(true)}
        className="relative"
        aria-label="Open event packet drawer"
      >
        Print Event Packet
        <span
          className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${
            allReady ? 'bg-emerald-700 text-emerald-100' : 'bg-amber-800/80 text-amber-200'
          }`}
        >
          {readyCount}/{PACKET_DOCS.length}
        </span>
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Event Packet"
            className="fixed right-0 top-0 h-full w-full max-w-md bg-stone-900 border-l border-stone-700 shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-stone-700 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-stone-100">Event Packet</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  {readyCount} of {PACKET_DOCS.length} documents ready to print
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-xl leading-none p-1"
                aria-label="Close drawer"
              >
                &times;
              </button>
            </div>

            {/* Readiness warning */}
            {hasBlockers && (
              <div className="mx-5 mt-3 px-3 py-2 rounded bg-amber-950/60 border border-amber-800/60 text-xs text-amber-300 shrink-0">
                {readinessGate.counts.blockers} blocker
                {readinessGate.counts.blockers !== 1 ? 's' : ''} detected. Some documents may be
                incomplete. You can still download the packet.
              </div>
            )}

            {/* Doc list */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {PACKET_DOCS.map((doc) => {
                const ready = isReadinessKey(doc.key) ? readiness[doc.key].ready : true
                const missing = isReadinessKey(doc.key) ? readiness[doc.key].missing : []
                return (
                  <DocRow
                    key={doc.type}
                    doc={doc}
                    ready={ready}
                    missing={missing}
                    eventId={eventId}
                  />
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-stone-700 space-y-2 shrink-0">
              <Button variant="primary" className="w-full" onClick={handleDownload}>
                Download Full Packet (PDF)
              </Button>
              <p className="text-xs text-stone-500 text-center">
                Opens the combined packet in a new tab. One PDF, all {PACKET_DOCS.length} sheets.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}

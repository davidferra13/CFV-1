import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import {
  DOCUMENT_DEFINITIONS,
  type OperationalDocumentType,
} from '@/lib/documents/document-definitions'
import { getDocumentReadiness } from '@/lib/documents/actions'
import { evaluateReadinessForDocumentGeneration } from '@/lib/events/readiness'
import {
  EVENT_OPERATION_DOCUMENTS,
  EVENT_PRINT_CENTER_PACKET_TYPES,
  EVENT_SAFETY_PRINTS,
  EVENT_SERVICE_PACKET_DOCUMENT_TYPES,
  buildEventMobileRunModeHref,
  buildEventOperationDocumentHref,
  buildEventOperationPacketHref,
  buildEventOperationWorkspaceHref,
  buildEventSafetyPrintHref,
  getEventOperationReadiness,
} from '@/lib/events/operation-registry'
import { EventRunModeRail } from '@/components/events/event-run-mode-rail'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function formatEventDate(value: string | null | undefined): string {
  if (!value) return 'Date TBD'
  return format(new Date(value), 'EEEE, MMMM d, yyyy')
}

export default async function EventPrintCenterPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [event, readiness, readinessGate] = await Promise.all([
    getEventById(params.id),
    getDocumentReadiness(params.id),
    evaluateReadinessForDocumentGeneration(params.id).catch(() => null),
  ])

  if (!event) notFound()

  const eventTitle = event.occasion || 'Untitled Event'
  const coreReady: OperationalDocumentType[] = EVENT_PRINT_CENTER_PACKET_TYPES.map((type) =>
    EVENT_OPERATION_DOCUMENTS.find((card) => card.type === type)
  )
    .filter((card): card is (typeof EVENT_OPERATION_DOCUMENTS)[number] => Boolean(card))
    .filter((card) => getEventOperationReadiness(card, readiness).ready)
    .map((card) => card.type)
  const servicePacketTypes = EVENT_SERVICE_PACKET_DOCUMENT_TYPES.filter((type) =>
    coreReady.includes(type)
  )
  const fullPacketTypes: OperationalDocumentType[] = coreReady
  const hasReadinessBlockers = (readinessGate?.counts.blockers ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3">
            <Link
              href={`/events/${params.id}`}
              className="text-sm text-stone-400 hover:text-stone-200"
            >
              Back to event
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-100">Print Center</h1>
          <p className="mt-2 text-stone-300">
            {eventTitle} - {formatEventDate(event.event_date)}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Generate the kitchen, service, handoff, and mobile run-mode surfaces for this event.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href={`/events/${params.id}/documents`} variant="secondary">
            Document Archive
          </Button>
          <Button href={buildEventMobileRunModeHref(params.id, 'dop')} variant="primary">
            Open Mobile DOP
          </Button>
        </div>
      </div>

      {hasReadinessBlockers && (
        <Card className="border-amber-500/30 bg-amber-950/30 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-amber-200">Readiness blockers found</p>
              <p className="text-sm text-amber-100/80">
                Packet generation is available per document below. Full packets should wait until
                blockers are resolved or intentionally overridden from the document workflow.
              </p>
            </div>
            <Badge variant="warning">{readinessGate?.counts.blockers ?? 0} blockers</Badge>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-100">Operational Packets</h2>
              <p className="mt-1 text-sm text-stone-400">
                One-click PDFs assembled from existing event data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {servicePacketTypes.length > 0 ? (
                <Button
                  href={buildEventOperationPacketHref(params.id, servicePacketTypes, {
                    archive: true,
                  })}
                  variant="primary"
                >
                  Service Packet
                </Button>
              ) : (
                <Button variant="secondary" disabled>
                  Service Packet
                </Button>
              )}
              {fullPacketTypes.length > 0 ? (
                <Button
                  href={buildEventOperationPacketHref(params.id, fullPacketTypes, {
                    archive: true,
                  })}
                  variant="secondary"
                >
                  Full Ready Packet
                </Button>
              ) : (
                <Button variant="secondary" disabled>
                  Full Ready Packet
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold text-stone-100">Safety Quick Prints</h2>
          <p className="mt-1 text-sm text-stone-400">
            High-visibility sheets for hands-on service.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {EVENT_SAFETY_PRINTS.map((print) => (
              <Button
                key={print.id}
                href={buildEventSafetyPrintHref(params.id, print)}
                variant="secondary"
              >
                {print.title}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-stone-100">Printouts</h2>
            <p className="text-sm text-stone-400">
              Each card connects the work surface, PDF output, and readiness state.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {EVENT_OPERATION_DOCUMENTS.map((card) => {
            const doc = DOCUMENT_DEFINITIONS[card.type]
            const status = getEventOperationReadiness(card, readiness)
            const ready = status.ready

            return (
              <Card key={card.type} className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      {card.moment}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-stone-100">{card.title}</h3>
                  </div>
                  <Badge variant={ready ? 'success' : 'warning'}>
                    {ready ? 'Ready' : 'Needs data'}
                  </Badge>
                </div>
                <p className="text-sm text-stone-400">{card.description}</p>
                {!ready && status.missing.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                      Missing
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
                      {status.missing.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    href={buildEventOperationWorkspaceHref(params.id, card)}
                    variant="secondary"
                    size="sm"
                  >
                    Open Surface
                  </Button>
                  {ready ? (
                    <Button
                      href={buildEventOperationDocumentHref(params.id, card.type, {
                        archive: true,
                      })}
                      variant="primary"
                      size="sm"
                    >
                      Generate PDF
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled>
                      Generate PDF
                    </Button>
                  )}
                </div>
                <p className="text-xs text-stone-600">Template: {doc.label}</p>
              </Card>
            )
          })}
        </div>
      </section>

      <EventRunModeRail
        eventId={params.id}
        status={event.status}
        showPrintCenter={false}
        showDocuments={false}
      />
    </div>
  )
}

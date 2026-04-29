import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import {
  DOCUMENT_DEFINITIONS,
  type OperationalDocumentType,
} from '@/lib/documents/document-definitions'
import { getDocumentReadiness, type DocumentReadiness } from '@/lib/documents/actions'
import { evaluateReadinessForDocumentGeneration } from '@/lib/events/readiness'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type PrintCard = {
  type: OperationalDocumentType
  title: string
  moment: string
  description: string
  workspaceHref: string
  readinessKey?: keyof DocumentReadiness
}

type MobileRunMode = {
  title: string
  description: string
  href: string
  moment: string
}

const CORE_PRINT_CARDS: PrintCard[] = [
  {
    type: 'summary',
    title: 'Event Brief',
    moment: 'Before event',
    description: 'Client, location, menu, timeline, and operational context in one packet.',
    workspaceHref: 'interactive?type=summary',
    readinessKey: 'eventSummary',
  },
  {
    type: 'prep',
    title: 'Prep Sheet',
    moment: 'Prep',
    description: 'Station prep, menu-linked work, quantities, and timing controls.',
    workspaceHref: 'interactive?type=prep',
    readinessKey: 'prepSheet',
  },
  {
    type: 'grocery',
    title: 'Shopping List',
    moment: 'Shopping',
    description: 'Ingredient buying list grouped for store execution.',
    workspaceHref: 'interactive?type=grocery',
    readinessKey: 'groceryList',
  },
  {
    type: 'packing',
    title: 'Packing Checklist',
    moment: 'Loadout',
    description: 'Equipment and transport list for the car, venue, and final pass.',
    workspaceHref: 'pack',
    readinessKey: 'packingList',
  },
  {
    type: 'execution',
    title: 'Execution Sheet',
    moment: 'Service',
    description: 'Fire order, service timing, course controls, and allergy callouts.',
    workspaceHref: 'execution',
    readinessKey: 'executionSheet',
  },
  {
    type: 'checklist',
    title: 'Pre-Service Checklist',
    moment: 'Service',
    description: 'Non-negotiable checks before service starts.',
    workspaceHref: 'safety',
    readinessKey: 'checklist',
  },
  {
    type: 'foh',
    title: 'Front-of-House Menu',
    moment: 'Client-facing',
    description: 'Clean menu printout for the table, host, or venue team.',
    workspaceHref: 'menu-approval',
    readinessKey: 'frontOfHouseMenu',
  },
  {
    type: 'reset',
    title: 'Reset Checklist',
    moment: 'Closeout',
    description: 'Post-service reset, cleanup, leftovers, and final checks.',
    workspaceHref: 'close-out',
    readinessKey: 'resetChecklist',
  },
  {
    type: 'travel',
    title: 'Travel Route',
    moment: 'Travel',
    description: 'Route, parking, stop timing, and venue arrival logistics.',
    workspaceHref: 'travel',
    readinessKey: 'travelRoute',
  },
  {
    type: 'shots',
    title: 'Content Shot List',
    moment: 'Marketing',
    description: 'Capture checklist for prep, plating, venue, and final dishes.',
    workspaceHref: 'story',
  },
  {
    type: 'beo',
    title: 'Banquet Event Order',
    moment: 'Venue handoff',
    description: 'Consolidated BEO for staff, venue coordinators, and operator handoff.',
    workspaceHref: 'documents',
  },
]

function getWorkspaceHref(eventId: string, card: PrintCard): string {
  if (card.workspaceHref.startsWith('interactive')) {
    return `/events/${eventId}/${card.workspaceHref}`
  }
  return `/events/${eventId}/${card.workspaceHref}`
}

function getDocumentHref(eventId: string, type: OperationalDocumentType): string {
  return `/api/documents/${eventId}?type=${type}&archive=1`
}

function getPacketHref(eventId: string, types: OperationalDocumentType[]): string {
  return `/api/documents/${eventId}?type=pack&types=${types.join(',')}&archive=1`
}

function getReadiness(card: PrintCard, readiness: DocumentReadiness) {
  if (!card.readinessKey) return { ready: true, missing: [] }
  return readiness[card.readinessKey]
}

function formatEventDate(value: string | null | undefined): string {
  if (!value) return 'Date TBD'
  return format(new Date(value), 'EEEE, MMMM d, yyyy')
}

function buildMobileRunModes(eventId: string): MobileRunMode[] {
  return [
    {
      title: 'Day-Of Protocol',
      description: 'Phone-first step list for the event day.',
      href: `/events/${eventId}/dop/mobile`,
      moment: 'Service',
    },
    {
      title: 'Packing Mode',
      description: 'Interactive loadout checklist with packed state.',
      href: `/events/${eventId}/pack`,
      moment: 'Loadout',
    },
    {
      title: 'Mise en Place',
      description: 'Prep-stage execution view for kitchen work.',
      href: `/events/${eventId}/mise-en-place`,
      moment: 'Prep',
    },
    {
      title: 'Travel Plan',
      description: 'Arrival, route, parking, and stop plan.',
      href: `/events/${eventId}/travel`,
      moment: 'Travel',
    },
    {
      title: 'Closeout',
      description: 'Post-service wrap, reset, and final event actions.',
      href: `/events/${eventId}/close-out`,
      moment: 'Closeout',
    },
  ]
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
  const coreReady: OperationalDocumentType[] = CORE_PRINT_CARDS.filter(
    (card) => card.type !== 'beo' && card.type !== 'shots'
  )
    .filter((card) => getReadiness(card, readiness).ready)
    .map((card) => card.type)
  const servicePacketCandidates: OperationalDocumentType[] = [
    'summary',
    'prep',
    'grocery',
    'packing',
    'execution',
    'checklist',
  ]
  const servicePacketTypes = servicePacketCandidates.filter((type) => coreReady.includes(type))
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
          <Button href={`/events/${params.id}/dop/mobile`} variant="primary">
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
                <Button href={getPacketHref(params.id, servicePacketTypes)} variant="primary">
                  Service Packet
                </Button>
              ) : (
                <Button variant="secondary" disabled>
                  Service Packet
                </Button>
              )}
              {fullPacketTypes.length > 0 ? (
                <Button href={getPacketHref(params.id, fullPacketTypes)} variant="secondary">
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
            <Button href={`/api/documents/${params.id}?type=allergy-card`} variant="secondary">
              Allergy Card
            </Button>
            <Button href={`/api/documents/${params.id}?type=beo&archive=1`} variant="secondary">
              BEO
            </Button>
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
          {CORE_PRINT_CARDS.map((card) => {
            const doc = DOCUMENT_DEFINITIONS[card.type]
            const status = getReadiness(card, readiness)
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
                  <Button href={getWorkspaceHref(params.id, card)} variant="secondary" size="sm">
                    Open Surface
                  </Button>
                  {ready ? (
                    <Button
                      href={getDocumentHref(params.id, card.type)}
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

      <section>
        <div className="mb-3">
          <h2 className="text-xl font-semibold text-stone-100">Mobile Run Modes</h2>
          <p className="text-sm text-stone-400">
            Phone-first layouts for wet hands, loadout, service, and closeout.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {buildMobileRunModes(params.id).map((mode) => (
            <Card key={mode.href} className="flex h-full flex-col gap-3 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {mode.moment}
                </p>
                <h3 className="mt-1 font-semibold text-stone-100">{mode.title}</h3>
              </div>
              <p className="text-sm text-stone-400">{mode.description}</p>
              <Button href={mode.href} variant="secondary" size="sm" className="mt-auto">
                Open
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

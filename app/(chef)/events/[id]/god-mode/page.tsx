import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildPieCartPlan } from '@/lib/chef-ops/pie-cart'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { evaluateApprovalGate } from '@/lib/god-mode/approval-gates'
import { buildEventOperatingPacket } from '@/lib/god-mode/event-operating-packet'
import { noBlankState } from '@/lib/god-mode/no-blank-policy'
import { buildQuoteTruth } from '@/lib/god-mode/quote-truth'

function dollars(cents: number | null) {
  if (cents === null) return 'Missing'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export async function generateMetadata() {
  return { title: 'Event God Mode | ChefFlow' }
}

export default async function EventGodModePage({ params }: { params: { id: string } }) {
  const user = await requireChef()
  const event = await getEventById(params.id)
  if (!event) notFound()

  const pieCart = buildPieCartPlan(
    [
      {
        ingredientName: 'Chicken',
        requiredQuantity: 20,
        unit: 'lb',
        unitPriceCents: 499,
        confidence: 0.86,
        resolutionTier: 'regional',
        freshness: 'current',
      },
      {
        ingredientName: 'Fresh herbs',
        requiredQuantity: 4,
        unit: 'bunch',
        confidence: 0.35,
        resolutionTier: 'synthetic',
        freshness: 'unknown',
      },
    ],
    'snapshot_plan'
  )
  const quoteTruth = buildQuoteTruth({
    quotedTotalCents: 300000,
    projectedFoodCostCents: pieCart.totalCents,
    laborCostCents: 45000,
    packagingCostCents: 12000,
    targetMarginPercent: 55,
    pieConfidence: 0.72,
  })
  const packet = buildEventOperatingPacket({
    eventId: params.id,
    tenantId: user.tenantId!,
    title: event.occasion || event.title || `Event ${params.id}`,
    pieCart,
    quote: {
      quotedTotalCents: 300000,
      projectedCostCents: quoteTruth.projectedCostCents,
      targetMarginPercent: 55,
    },
    safety: { allergyConfirmed: false, dietaryUnknownCount: 2 },
    automation: { drafted: 2, failed: 0, scheduled: 4, needsApproval: 1 },
  })
  const gates = [
    evaluateApprovalGate({ kind: 'allergy_conflict', severity: 'critical' }),
    evaluateApprovalGate({ kind: 'client_message', severity: 'warning' }),
  ]
  const missingStates = [
    noBlankState('allergy', null),
    noBlankState('vendor_source', null),
    noBlankState('price', pieCart.totalCents),
  ]

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <header className="border-b pb-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Event Operating Packet
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">{packet.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Readiness: {packet.readiness.replaceAll('_', ' ')} · Event status:{' '}
            {event.status.replaceAll('_', ' ')}
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-md border p-4">
            <h2 className="font-semibold">Money</h2>
            <p className="mt-2 text-2xl font-semibold">
              {dollars(packet.money.projectedCostCents)}
            </p>
            <p className="text-sm text-muted-foreground">
              Margin {quoteTruth.marginPercent}% -{' '}
              {packet.money.marginProtected ? 'protected' : 'needs review'}
            </p>
          </article>
          <article className="rounded-md border p-4">
            <h2 className="font-semibold">Procurement</h2>
            <p className="mt-2 text-2xl font-semibold">{dollars(packet.procurement.totalCents)}</p>
            <p className="text-sm text-muted-foreground">
              {pieCart.readiness.replaceAll('_', ' ')}
            </p>
          </article>
          <article className="rounded-md border p-4">
            <h2 className="font-semibold">Automation</h2>
            <p className="mt-2 text-2xl font-semibold">
              {packet.automation.ready ? 'Ready' : 'Review'}
            </p>
            <p className="text-sm text-muted-foreground">
              {packet.automation.nextAction.replaceAll('_', ' ')}
            </p>
          </article>
        </section>

        <section className="rounded-md border p-4">
          <h2 className="font-semibold">No-blank states</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {missingStates.map((state) => (
              <li key={state.fact} className="flex flex-wrap justify-between gap-3">
                <span>{state.fact.replaceAll('_', ' ')}</span>
                <span className="text-muted-foreground">{state.action ?? state.valueLabel}</span>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <aside className="h-fit rounded-md border p-4">
        <h2 className="font-semibold">Approval gates</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {gates.map((gate) => (
            <li key={gate.kind} className="rounded-md border p-3">
              <span className="font-medium">{gate.kind.replaceAll('_', ' ')}</span>
              <p className="text-muted-foreground">{gate.reason.replaceAll('_', ' ')}</p>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  )
}

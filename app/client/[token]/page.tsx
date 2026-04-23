import Link from 'next/link'
import { format } from 'date-fns'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Lock,
  Sparkles,
  Users,
} from '@/components/ui/icons'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { getClientPortalData } from '@/lib/client-portal/actions'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { formatCurrency } from '@/lib/utils/currency'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: {
    token: string
  }
  searchParams?: {
    payment?: string | string[]
    event?: string | string[]
  }
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function formatEventDate(dateValue: string) {
  return format(new Date(dateValue), "EEEE, MMMM d, yyyy 'at' h:mm a")
}

function getEventStepCopy(input: {
  status: string
  outstandingCents: number
  hasProposal: boolean
}) {
  if (input.hasProposal && input.status === 'proposed') {
    return {
      title: 'Proposal ready for review',
      detail: 'Review the current proposal to keep the date moving.',
    }
  }

  if (input.outstandingCents > 0 && ['accepted', 'paid'].includes(input.status)) {
    return {
      title: 'Payment is the next unlock',
      detail: 'Complete the published payment step to keep the event on track.',
    }
  }

  if (input.status === 'confirmed') {
    return {
      title: 'Your date is locked in',
      detail: 'Your chef should now be finalizing menu and service logistics.',
    }
  }

  if (input.status === 'in_progress') {
    return {
      title: 'Service window is live',
      detail: 'Your event is currently underway.',
    }
  }

  if (input.status === 'completed') {
    return {
      title: 'Event completed',
      detail: 'Everything for this service has been wrapped up.',
    }
  }

  if (input.status === 'paid') {
    return {
      title: 'Deposit received',
      detail: 'Your chef can continue the final confirmation work from here.',
    }
  }

  if (input.status === 'accepted') {
    return {
      title: 'Accepted and moving forward',
      detail: 'The next published step is payment or final paperwork.',
    }
  }

  return {
    title: 'Awaiting next update',
    detail: 'Your chef will update the event as the next step is ready.',
  }
}

function PortalStatCard({
  label,
  value,
  support,
}: {
  label: string
  value: string
  support: string
}) {
  return (
    <Card className="border-stone-700 bg-stone-950/70">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</p>
        <p className="mt-3 text-3xl font-semibold text-stone-100">{value}</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-400">{support}</p>
      </CardContent>
    </Card>
  )
}

function ActionCard({
  eyebrow,
  title,
  detail,
  href,
  ctaLabel,
  badge,
  tone,
}: {
  eyebrow: string
  title: string
  detail: string
  href: string
  ctaLabel: string
  badge: string
  tone: 'payment' | 'proposal'
}) {
  const toneClasses =
    tone === 'payment'
      ? 'border-amber-800/60 bg-amber-950/20'
      : 'border-brand-800/60 bg-brand-950/20'

  const badgeVariant = tone === 'payment' ? 'warning' : 'info'

  return (
    <Card className={`${toneClasses} shadow-[var(--shadow-card)]`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              {eyebrow}
            </p>
            <h3 className="mt-3 text-xl font-semibold text-stone-100">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">{detail}</p>
          </div>
          <Badge variant={badgeVariant}>{badge}</Badge>
        </div>
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-white"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}

export default async function ClientPortalPage({ params, searchParams }: PageProps) {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  const rl = await checkRateLimit(`portal:${ip}`)
  if (!rl.success) {
    notFound()
  }

  const portal = await getClientPortalData(params.token)
  if (!portal) {
    notFound()
  }

  const paymentState = firstParam(searchParams?.payment)
  const paymentEventId = firstParam(searchParams?.event)
  const paymentEvent = [...portal.upcomingEvents, ...portal.pastEvents].find(
    (event) => event.id === paymentEventId
  )

  const greetingName = portal.clientName.split(' ')[0] || portal.clientName
  const chefLabel = portal.chefBusinessName || portal.chefName || 'your chef'
  const actionItemCount = portal.pendingPayments.length + portal.pendingProposals.length
  const totalPaidCents = portal.paymentHistory.reduce(
    (sum, payment) => sum + payment.amountCents,
    0
  )
  const nextEvent = portal.upcomingEvents[0] ?? null
  const rebookHref =
    portal.chefBookingEnabled && (portal.chefBookingSlug || portal.chefSlug)
      ? `/book/${portal.chefBookingSlug || portal.chefSlug}`
      : portal.chefBookingSlug || portal.chefSlug
        ? `/chef/${portal.chefBookingSlug || portal.chefSlug}/inquire`
        : null

  const pendingProposalByEvent = new Map(
    portal.pendingProposals
      .filter((proposal) => proposal.eventId)
      .map((proposal) => [proposal.eventId as string, proposal])
  )
  const pendingPaymentByEvent = new Map(
    portal.pendingPayments.map((payment) => [payment.eventId, payment])
  )

  return (
    <div className="min-h-screen bg-stone-900">
      <div className="border-b border-stone-800 bg-[radial-gradient(circle_at_top,_rgba(232,143,71,0.18),_rgba(28,25,23,0.92)_48%,_rgba(12,10,9,1)_78%)]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1.5">
              <Lock className="h-3.5 w-3.5" />
              Private Client Portal
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-950/60 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Shared by {chefLabel}
            </span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <h1 className="text-4xl font-display tracking-tight text-stone-100 sm:text-5xl">
                Hello, {greetingName}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-300 sm:text-lg">
                This portal is the cleanest path for active decisions, payment, and event status. No
                login is required, and every action shown here stays inside this secure link.
              </p>

              {paymentState === 'success' && (
                <div className="mt-6 max-w-2xl">
                  <Alert variant="success" title="Payment received">
                    Stripe returned you to the portal after payment
                    {paymentEvent?.occasion ? ` for ${paymentEvent.occasion}` : ''}. If the balance
                    does not refresh immediately, give it a moment and reload.
                  </Alert>
                </div>
              )}
              {paymentState === 'cancelled' && (
                <div className="mt-6 max-w-2xl">
                  <Alert variant="warning" title="Payment not completed">
                    No charge was made
                    {paymentEvent?.occasion ? ` for ${paymentEvent.occasion}` : ''}. You can retry
                    from the action center whenever you are ready.
                  </Alert>
                </div>
              )}
            </div>

            <Card className="border-stone-700 bg-stone-950/70">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Current focus
                </p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                    <p className="text-sm font-semibold text-stone-100">
                      {nextEvent?.occasion || 'No upcoming event on deck'}
                    </p>
                    <p className="mt-1 text-sm text-stone-400">
                      {nextEvent
                        ? formatEventDate(nextEvent.event_date)
                        : 'You are caught up right now.'}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-stone-300">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-400" />
                    <span>
                      Every action here is token-safe and can be completed without sign-in.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-stone-300">
                    <Clock className="mt-0.5 h-4 w-4 text-brand-400" />
                    <span>
                      Use this link for active decisions. Reply to your chef directly for custom
                      changes.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-3">
          <PortalStatCard
            label="Action Items"
            value={String(actionItemCount)}
            support={
              actionItemCount > 0
                ? 'These are the steps currently waiting on you.'
                : 'Nothing is blocking your next event right now.'
            }
          />
          <PortalStatCard
            label="Upcoming Events"
            value={String(portal.upcomingEvents.length)}
            support={
              nextEvent
                ? `Next service: ${format(new Date(nextEvent.event_date), 'MMM d')}.`
                : 'No future events are currently scheduled.'
            }
          />
          <PortalStatCard
            label="Payments Recorded"
            value={formatCurrency(totalPaidCents)}
            support="A running total of payments already recorded in ChefFlow."
          />
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Action Center
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                The next steps that actually matter.
              </h2>
            </div>
          </div>

          {actionItemCount === 0 ? (
            <Card className="mt-5 border-stone-700 bg-stone-950/70">
              <CardContent className="p-6">
                <p className="text-lg font-semibold text-stone-100">No action required.</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-400">
                  Your chef does not need anything from you right now. Keep this portal handy for
                  future updates, payment requests, or event follow-through.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {portal.pendingPayments.map((payment) => (
                <ActionCard
                  key={`payment-${payment.eventId}`}
                  eyebrow="Payment"
                  title={`Complete payment for ${payment.occasion || 'your event'}`}
                  detail={`Hosted by Stripe. Current published balance: ${formatCurrency(payment.outstandingCents)}.`}
                  href={payment.paymentUrl}
                  ctaLabel="Pay securely"
                  badge="Action required"
                  tone="payment"
                />
              ))}
              {portal.pendingProposals.map((proposal) => (
                <ActionCard
                  key={`proposal-${proposal.id}`}
                  eyebrow="Proposal"
                  title={proposal.eventOccasion || proposal.title}
                  detail={
                    proposal.expiresAt
                      ? `${formatCurrency(proposal.amountCents)}. Review before ${format(
                          new Date(proposal.expiresAt),
                          'MMMM d, yyyy'
                        )}.`
                      : `${formatCurrency(proposal.amountCents)}. Review the current proposal and accept when it feels right.`
                  }
                  href={proposal.publicUrl}
                  ctaLabel="Review proposal"
                  badge="Awaiting review"
                  tone="proposal"
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Upcoming Events
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                What is scheduled and what happens next.
              </h2>
            </div>
            {rebookHref && (
              <Link
                href={rebookHref}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-950/70 px-4 py-2.5 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
              >
                Plan another event
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {portal.upcomingEvents.length === 0 ? (
            <Card className="mt-5 border-stone-700 bg-stone-950/70">
              <CardContent className="p-6">
                <p className="text-lg font-semibold text-stone-100">
                  No upcoming events scheduled.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">
                  When your chef confirms another dinner or service, it will appear here with the
                  next step and any action required from you.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-5 space-y-4">
              {portal.upcomingEvents.map((event) => {
                const pendingProposal = pendingProposalByEvent.get(event.id) ?? null
                const pendingPayment = pendingPaymentByEvent.get(event.id) ?? null
                const stepCopy = getEventStepCopy({
                  status: event.status,
                  outstandingCents: event.outstandingCents,
                  hasProposal: Boolean(pendingProposal),
                })

                return (
                  <Card key={event.id} className="border-stone-700 bg-stone-950/70">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-stone-100">
                              {event.occasion || 'Upcoming event'}
                            </h3>
                            <EventStatusBadge status={event.status as any} />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-400">
                            <span className="inline-flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-brand-400" />
                              {formatEventDate(event.event_date)}
                            </span>
                            {event.guest_count ? (
                              <span className="inline-flex items-center gap-2">
                                <Users className="h-4 w-4 text-brand-400" />
                                {event.guest_count} guests
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-5 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                            <p className="text-sm font-semibold text-stone-100">{stepCopy.title}</p>
                            <p className="mt-2 text-sm leading-relaxed text-stone-400">
                              {stepCopy.detail}
                            </p>
                          </div>
                        </div>

                        <div className="lg:w-72 lg:flex-shrink-0">
                          {pendingProposal ? (
                            <Link
                              href={pendingProposal.publicUrl}
                              className="flex items-center justify-between rounded-2xl border border-brand-800/60 bg-brand-950/20 px-4 py-4 text-left transition-colors hover:border-brand-700"
                            >
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                                  Proposal ready
                                </p>
                                <p className="mt-2 text-sm font-semibold text-stone-100">
                                  Review current proposal
                                </p>
                                <p className="mt-1 text-xs text-stone-400">
                                  {formatCurrency(pendingProposal.amountCents)}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-brand-300" />
                            </Link>
                          ) : pendingPayment ? (
                            <Link
                              href={pendingPayment.paymentUrl}
                              className="flex items-center justify-between rounded-2xl border border-amber-800/60 bg-amber-950/20 px-4 py-4 text-left transition-colors hover:border-amber-700"
                            >
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
                                  Payment due
                                </p>
                                <p className="mt-2 text-sm font-semibold text-stone-100">
                                  Continue to Stripe
                                </p>
                                <p className="mt-1 text-xs text-stone-400">
                                  {formatCurrency(pendingPayment.outstandingCents)}
                                </p>
                              </div>
                              <CreditCard className="h-4 w-4 text-amber-300" />
                            </Link>
                          ) : (
                            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                                Status
                              </p>
                              <p className="mt-2 text-sm font-semibold text-stone-100">
                                No client action published right now
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-stone-400">
                                Keep this link handy for updates and reply to your chef directly if
                                you need changes.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {(portal.pastEvents.length > 0 || portal.paymentHistory.length > 0) && (
          <section className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            {portal.pastEvents.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Past Events
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                  Recent services with {chefLabel}.
                </h2>
                <div className="mt-5 space-y-3">
                  {portal.pastEvents.map((event) => (
                    <Card key={event.id} className="border-stone-700 bg-stone-950/70">
                      <CardContent className="flex items-center justify-between gap-4 p-5">
                        <div>
                          <p className="text-base font-semibold text-stone-100">
                            {event.occasion || 'Past event'}
                          </p>
                          <p className="mt-1 text-sm text-stone-400">
                            {format(new Date(event.event_date), 'MMMM d, yyyy')}
                          </p>
                        </div>
                        <EventStatusBadge status={event.status as any} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {portal.paymentHistory.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Payment History
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-100">Recorded payments.</h2>
                <div className="mt-5 space-y-3">
                  {portal.paymentHistory.map((payment) => (
                    <Card key={payment.id} className="border-stone-700 bg-stone-950/70">
                      <CardContent className="flex items-center justify-between gap-4 p-5">
                        <div>
                          <p className="text-base font-semibold text-emerald-400">
                            {formatCurrency(payment.amountCents)}
                          </p>
                          <p className="mt-1 text-sm text-stone-400">
                            {payment.type.replace(/_/g, ' ')}
                            {payment.eventOccasion ? ` for ${payment.eventOccasion}` : ''}
                          </p>
                        </div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
                          {format(new Date(payment.date), 'MMM d, yyyy')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}

        <section className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="border-stone-700 bg-stone-950/70">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Private access
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                This link is meant for active planning, not general sharing.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-400">
                Use this portal for proposal review, payment, and event status. Share it only with
                people you trust to make decisions for your event.
              </p>
            </CardContent>
          </Card>

          <Card className="border-stone-700 bg-stone-950/70">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Need another experience?
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                If you want to plan something new with {chefLabel}, use the public booking path
                below.
              </p>
              {rebookHref ? (
                <Link
                  href={rebookHref}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Start a new request
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderQueueBoard } from '@/components/commerce/order-queue-board'
import { contactWaitlistEntry, expireWaitlistEntry } from '@/lib/availability/actions'
import {
  setReservationStatus,
  type GuestReservationStatus,
} from '@/lib/guests/reservation-actions'
import type { OrderOpsItem, OrderOpsSnapshot } from '@/lib/order-operations/types'

type Props = {
  snapshot: OrderOpsSnapshot
  activeOrders: any[]
}

const LANE_LABELS: Record<OrderOpsItem['lane'], string> = {
  attention: 'Needs attention',
  active: 'In progress',
  ready: 'Ready',
  scheduled: 'Scheduled',
  done: 'Done',
}
function entityId(item: OrderOpsItem) {
  return item.id.includes(':') ? item.id.slice(item.id.indexOf(':') + 1) : item.id
}

function formatMoney(cents: number | null) {
  if (cents == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatWhen(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function interactionVariant(mode: OrderOpsItem['interactionMode']) {
  if (mode === 'NATIVE') return 'success' as const
  if (mode === 'INTEGRATED') return 'info' as const
  return 'warning' as const
}

function coverageVariant(state: OrderOpsSnapshot['coverage'][number]['state']) {
  if (state === 'configured') return 'success' as const
  if (state === 'available') return 'info' as const
  return 'default' as const
}
export function OrderOperationsDashboard({ snapshot, activeOrders }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const openItems = snapshot.items.filter((item) => item.lane !== 'done')
  const nonNativeOrders = openItems.filter(
    (item) => item.kind !== 'order' || item.interactionMode !== 'NATIVE'
  )

  function updateReservation(item: OrderOpsItem, status: GuestReservationStatus) {
    startTransition(async () => {
      try {
        await setReservationStatus(entityId(item), status)
        toast.success(`Reservation marked ${status.replace('_', ' ')}`)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Reservation update failed')
      }
    })
  }

  function updateWaitlist(item: OrderOpsItem, action: 'contact' | 'expire') {
    startTransition(async () => {
      try {
        if (action === 'contact') await contactWaitlistEntry(entityId(item))
        else await expireWaitlistEntry(entityId(item))
        toast.success(action === 'contact' ? 'Waitlist guest marked contacted' : 'Waitlist entry expired')
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Waitlist update failed')
      }
    })
  }
  const metrics = [
    ['Open work', snapshot.metrics.totalOpen],
    ['Needs attention', snapshot.metrics.needsAttention],
    ['Live orders', snapshot.metrics.activeOrders],
    ['Reservations', snapshot.metrics.upcomingReservations],
    ['Waitlist', snapshot.metrics.waitingDemand],
    ['External signals', snapshot.metrics.externalSignals],
  ] as const

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold text-stone-100">{value}</div>
              <div className="mt-1 text-xs text-stone-500">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Live fulfillment</h2>
            <p className="text-sm text-stone-500">Advance ChefFlow orders without leaving this screen.</p>
          </div>
          <Link href="/commerce/register" className="text-sm text-amber-500 hover:text-amber-400">
            Open register
          </Link>
        </div>
        <OrderQueueBoard orders={activeOrders} />
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Reservations, waitlist + channels</h2>
          <p className="text-sm text-stone-500">
            One demand queue. Native ChefFlow work is actionable here; observed channel data stays read-only until its write adapter is verified.
          </p>
        </div>

        {nonNativeOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-stone-500">No reservation, waitlist, or external-channel work is open.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {nonNativeOrders.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-stone-100">{item.title}</p>
                        <Badge variant={interactionVariant(item.interactionMode)}>{item.interactionMode}</Badge>
                        <Badge variant="default">{LANE_LABELS[item.lane]}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.source.label} · {item.status.replaceAll('_', ' ')}
                      </p>
                    </div>
                    {formatMoney(item.amountCents) && (
                      <span className="text-sm font-medium text-stone-200">{formatMoney(item.amountCents)}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                    {item.guestName && <span>Guest: {item.guestName}</span>}
                    {item.partySize != null && <span>Party: {item.partySize}</span>}
                    {item.tableLabel && <span>Table: {item.tableLabel}</span>}
                    {formatWhen(item.scheduledAt) && <span>When: {formatWhen(item.scheduledAt)}</span>}
                  </div>

                  {item.subtitle && <p className="text-xs text-stone-500">{item.subtitle}</p>}

                  <div className="flex flex-wrap gap-2">
                    {item.kind === 'reservation' && item.interactionMode === 'NATIVE' && item.status === 'confirmed' && (
                      <>
                        <Button size="sm" onClick={() => updateReservation(item, 'seated')} disabled={isPending}>Seat</Button>
                        <Button size="sm" variant="secondary" onClick={() => updateReservation(item, 'no_show')} disabled={isPending}>No show</Button>
                        <Button size="sm" variant="ghost" onClick={() => updateReservation(item, 'cancelled')} disabled={isPending}>Cancel</Button>
                      </>
                    )}
                    {item.kind === 'reservation' && item.interactionMode === 'NATIVE' && item.status === 'seated' && (
                      <Button size="sm" onClick={() => updateReservation(item, 'completed')} disabled={isPending}>Complete</Button>
                    )}
                    {item.kind === 'waitlist' && item.interactionMode === 'NATIVE' && item.status === 'waiting' && (
                      <Button size="sm" onClick={() => updateWaitlist(item, 'contact')} disabled={isPending}>Mark contacted</Button>
                    )}
                    {item.kind === 'waitlist' && item.interactionMode === 'NATIVE' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          href={`/events/new?waitlist_id=${encodeURIComponent(entityId(item))}`}
                        >
                          Create event
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateWaitlist(item, 'expire')} disabled={isPending}>Expire</Button>
                      </>
                    )}
                    {item.interactionMode === 'OBSERVED' && (
                      <span className="rounded-md border border-amber-900/60 bg-amber-950/20 px-2.5 py-1.5 text-xs text-amber-300">
                        Read only until command adapter is verified
                      </span>
                    )}
                    {item.chefFlowHref && item.kind !== 'waitlist' && (
                      <Link href={item.chefFlowHref} className="self-center text-xs text-stone-500 hover:text-stone-300">
                        View in ChefFlow
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Channel coverage</h2>
            <p className="text-sm text-stone-500">Connection state is separated from verified command capability.</p>
          </div>
          <Link href="/settings/integrations" className="text-sm text-amber-500 hover:text-amber-400">Manage connections</Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.coverage.map((channel) => (
            <div key={channel.system} className="rounded-lg border border-stone-800 bg-stone-950/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-stone-200">{channel.system}</span>
                <Badge variant={coverageVariant(channel.state)}>{channel.state.replaceAll('_', ' ')}</Badge>
              </div>
              <p className="mt-2 text-xs text-stone-500">{channel.detail}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-stone-600">
                {channel.maturity.replaceAll('_', ' ')}{channel.requiresPartnerApproval ? ' · partner access required' : ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      {snapshot.debt.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stack-elimination backlog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshot.debt.slice(0, 12).map((item) => (
              <div key={item.id} className="rounded-md border border-stone-800 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-stone-200">{item.system}</span>
                  <Badge variant="warning">Unresolved</Badge>
                </div>
                <p className="mt-1 text-xs text-stone-400">{item.reason}</p>
                <p className="mt-1 text-xs text-stone-600">Next: {item.nextStep}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

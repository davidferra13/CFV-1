'use client'

import { ExitLinkButton } from '@/components/exit-links/ExitLinkButton'
import {
  getEventContext,
  getClientContext,
  getChefContext,
  mergeContext,
} from '@/lib/exit-links/context-helpers'
import { MapPin, Cloud, ShoppingCart, Calendar, CreditCard, Phone, Plane } from 'lucide-react'

interface EventExitLinksSectionProps {
  event: Record<string, unknown>
  client: Record<string, unknown> | null
  user: Record<string, unknown>
}

const GROUP_ICON_CLASS = 'h-3.5 w-3.5 text-muted-foreground'

export function EventExitLinksSection({ event, client, user }: EventExitLinksSectionProps) {
  const eventCtx = getEventContext({
    ...event,
    venue: {
      address: event.location_address,
      city: event.location_city,
      state: event.location_state,
      zip: event.location_zip,
      lat: event.location_lat,
      longitude: event.location_lng,
    },
    name: event.occasion ?? event.event_name ?? 'Dinner',
    date: event.event_date,
    startDate: event.event_date,
    endDate: event.event_date,
    type: event.service_style,
    stripePaymentId: event.stripe_payment_id,
  })

  const clientCtx = client
    ? getClientContext({
        name: client.full_name,
        email: client.email,
        phone: client.phone,
      })
    : {}

  const chefCtx = getChefContext(user)

  // Default message for SMS/WhatsApp context
  const messageCtx = {
    message: client
      ? `Hi ${String(client.full_name ?? '').split(' ')[0] || 'there'}, just following up about your upcoming event.`
      : '',
  }

  const ctx = mergeContext(eventCtx, clientCtx, chefCtx, messageCtx)

  // Show travel links only for destination events (venue city differs from chef city)
  const isDestination =
    ctx.venueCity && ctx.city && ctx.venueCity.toLowerCase() !== ctx.city.toLowerCase()

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-4">
      <h3 className="text-sm font-medium text-foreground">Quick Links</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Navigation & Venue */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            <MapPin className={GROUP_ICON_CLASS} />
            Venue
          </div>
          <div className="flex flex-col gap-0.5">
            <ExitLinkButton exitId={25} context={ctx} variant="compact" />
            <ExitLinkButton exitId={55} context={ctx} variant="compact" />
            <ExitLinkButton exitId={60} context={ctx} variant="compact" />
          </div>
        </div>

        {/* Weather */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            <Cloud className={GROUP_ICON_CLASS} />
            Weather
          </div>
          <div className="flex flex-col gap-0.5">
            <ExitLinkButton exitId={56} context={ctx} variant="compact" />
            <ExitLinkButton exitId={26} context={ctx} variant="compact" />
          </div>
        </div>

        {/* Nearby */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            <ShoppingCart className={GROUP_ICON_CLASS} />
            Nearby
          </div>
          <div className="flex flex-col gap-0.5">
            <ExitLinkButton exitId={57} context={ctx} variant="compact" />
            <ExitLinkButton exitId={58} context={ctx} variant="compact" />
          </div>
        </div>

        {/* Calendar */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            <Calendar className={GROUP_ICON_CLASS} />
            Calendar
          </div>
          <div className="flex flex-col gap-0.5">
            <ExitLinkButton exitId={14} context={ctx} variant="compact" />
          </div>
        </div>

        {/* Payment */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            <CreditCard className={GROUP_ICON_CLASS} />
            Payment
          </div>
          <div className="flex flex-col gap-0.5">
            <ExitLinkButton exitId={29} context={ctx} variant="compact" />
            <ExitLinkButton exitId={44} context={ctx} variant="compact" />
          </div>
        </div>

        {/* Contact (only if client exists) */}
        {client && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              <Phone className={GROUP_ICON_CLASS} />
              Contact
            </div>
            <div className="flex flex-col gap-0.5">
              <ExitLinkButton exitId={30} context={ctx} variant="compact" />
              <ExitLinkButton exitId={31} context={ctx} variant="compact" />
              <ExitLinkButton exitId={32} context={ctx} variant="compact" />
            </div>
          </div>
        )}

        {/* Travel (only for destination events) */}
        {isDestination && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              <Plane className={GROUP_ICON_CLASS} />
              Travel
            </div>
            <div className="flex flex-col gap-0.5">
              <ExitLinkButton exitId={43} context={ctx} variant="compact" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import Link from 'next/link'
import { format } from 'date-fns'
import type { EventDetailTab } from '@/components/events/event-detail-mobile-nav'
import { EventDetailSection } from '@/components/events/event-detail-mobile-nav'
import { DOPProgressBar } from '@/components/scheduling/dop-view'
import { ChefGuestPanel } from '@/components/sharing/chef-guest-panel'
import { MessageThread } from '@/components/messages/message-thread'
import { MessageLogForm } from '@/components/messages/message-log-form'
import { ContractSection } from '@/components/contracts/contract-section'
import { ClientPortalQR } from '@/components/events/client-portal-qr'
import { MenuNutritionalPanel } from '@/components/ai/menu-nutritional-panel'
import { ContractGeneratorPanel } from '@/components/ai/contract-generator-panel'
import { AllergenRiskPanel } from '@/components/ai/allergen-risk-panel'
import { GuestCodePanel } from '@/components/events/guest-code-panel'
import { GuestMessagesPanel } from '@/components/events/guest-messages-panel'
import { GuestExperiencePanel } from '@/components/sharing/guest-experience-panel'
import { PostEventOutreachPanel } from '@/components/events/post-event-outreach-panel'
import { PhotoConsentSummary } from '@/components/events/photo-consent-summary'
import { RSVPTrackerPanel } from '@/components/events/rsvp-tracker-panel'
import { GeocodeAddressButton } from '@/components/events/geocode-address-button'
import { WeatherPanel } from '@/components/events/weather-panel'
import { EventHubLinkPanel } from '@/components/hub/event-hub-link-panel'
import { HostMessageTemplate } from '@/components/sharing/host-message-template'
import { getEventMapUrl } from '@/lib/maps/mapbox'
import { getQrCodeUrl } from '@/lib/qr/qr-code'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SendWorksheetButton } from '@/components/events/send-worksheet-button'
import { RepeatMenuAlert } from '@/components/menus/repeat-menu-alert'
import { AllergenConflictAlert } from '@/components/events/allergen-conflict-alert'

type EventDetailOverviewTabProps = {
  activeTab: EventDetailTab
  event: any
  dopProgress: any
  packingConfirmedCount: number
  travelInfo: { distanceMiles: number; durationMinutes: number } | null
  eventLoyaltyImpact: any
  eventLoyaltyPoints: number
  activeShare: any
  shortShareUrl: string | null
  fullShareUrl: string | null
  eventMenus: string | false | null
  hubGroupToken: string | null
  guestList: any[]
  rsvpSummary: any
  chefDisplayName: string
  guestLeadCount: number
  guestWallMessages: any[]
  messages: any[]
  templates: any[]
  chatConversationId?: string | null
}

export function EventDetailOverviewTab(props: EventDetailOverviewTabProps) {
  const {
    activeTab,
    event,
    dopProgress,
    packingConfirmedCount,
    travelInfo,
    eventLoyaltyImpact,
    eventLoyaltyPoints,
    activeShare,
    shortShareUrl,
    fullShareUrl,
    eventMenus,
    hubGroupToken,
    guestList,
    rsvpSummary,
    chefDisplayName,
    guestLeadCount,
    guestWallMessages,
    messages,
    templates,
    chatConversationId,
  } = props

  return (
    <EventDetailSection tab="overview" activeTab={activeTab}>
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Details */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Event Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-stone-500">Location</dt>
              <dd className="text-sm text-stone-100 mt-1">
                {[
                  event.location_address,
                  event.location_city,
                  event.location_state,
                  event.location_zip,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Not set'}
              </dd>
              {(event as any).location_lat && (event as any).location_lng ? (
                <div className="mt-2 space-y-2">
                  {/* Mapbox static map â€” clickable to open Google Maps directions */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${(event as any).location_lat},${(event as any).location_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getEventMapUrl((event as any).location_lng, (event as any).location_lat)}
                      alt="Event location map"
                      className="w-full h-[200px] object-cover rounded-lg border border-stone-700"
                    />
                  </a>
                  {/* Travel distance/time from chef's home */}
                  {travelInfo && (
                    <p className="text-xs text-stone-300">
                      {travelInfo.distanceMiles} miles &middot; ~{travelInfo.durationMinutes} min
                      drive from home
                    </p>
                  )}
                  {/* Open-Meteo weather forecast for the event date */}
                  <WeatherPanel
                    lat={(event as any).location_lat}
                    lng={(event as any).location_lng}
                    eventDate={event.event_date}
                  />
                </div>
              ) : event.location_address ? (
                <GeocodeAddressButton eventId={event.id} />
              ) : null}
            </div>
            {(event as any).referral_partner && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Partner Venue</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  <Link
                    href={`/partners/${(event as any).referral_partner_id}`}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    {(event as any).referral_partner.name}
                  </Link>
                  {(event as any).partner_location && (
                    <span className="text-stone-500">
                      {' '}
                      â†’ {(event as any).partner_location.name}
                      {(event as any).partner_location.city && (
                        <span className="text-stone-300">
                          {' '}
                          (
                          {[
                            (event as any).partner_location.city,
                            (event as any).partner_location.state,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                          )
                        </span>
                      )}
                    </span>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-stone-500">Number of Guests</dt>
              <dd className="text-sm text-stone-100 mt-1">{event.guest_count}</dd>
            </div>
            {event.special_requests && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Special Requests</dt>
                <dd className="text-sm text-stone-100 mt-1 whitespace-pre-wrap">
                  {event.special_requests}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-stone-500">Created</dt>
              <dd className="text-sm text-stone-100 mt-1">
                {format(new Date(event.created_at), 'MMM d, yyyy')}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Client Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Client Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-stone-500">Name</dt>
              <dd className="text-sm text-stone-100 mt-1">{event.client?.full_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Email</dt>
              <dd className="text-sm text-stone-100 mt-1">
                <a
                  href={`mailto:${event.client?.email}`}
                  className="text-brand-600 hover:underline"
                >
                  {event.client?.email}
                </a>
              </dd>
            </div>
            {event.client?.phone && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Phone</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  <a href={`tel:${event.client.phone}`} className="text-brand-600 hover:underline">
                    {event.client.phone}
                  </a>
                </dd>
              </div>
            )}
            {eventLoyaltyImpact && (
              <div className="pt-2 border-t border-stone-800">
                <dt className="text-sm font-medium text-stone-500">Loyalty</dt>
                <dd className="text-sm text-stone-100 mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-brand-950 px-2 py-0.5 text-xs font-semibold text-brand-300 capitalize">
                      {eventLoyaltyImpact.currentTier}
                    </span>
                    <span className="text-stone-300">
                      {eventLoyaltyImpact.pointsBalance.toLocaleString()} points
                    </span>
                  </div>
                  {event.status === 'completed' ? (
                    eventLoyaltyPoints > 0 ? (
                      <p className="text-xs text-emerald-700">
                        This event awarded {eventLoyaltyPoints} points.
                      </p>
                    ) : (
                      <p className="text-xs text-stone-500">
                        No points were awarded for this event.
                      </p>
                    )
                  ) : eventLoyaltyImpact.programMode === 'full' ? (
                    <p className="text-xs text-stone-300">
                      Estimated earn: {eventLoyaltyImpact.estimatedPoints} pts (
                      {eventLoyaltyImpact.estimatedBreakdown}).
                    </p>
                  ) : eventLoyaltyImpact.programMode === 'lite' ? (
                    <p className="text-xs text-stone-300">
                      Lite mode active: this event contributes to visit-based tier progress.
                    </p>
                  ) : (
                    <p className="text-xs text-stone-500">Loyalty program is currently off.</p>
                  )}
                  {eventLoyaltyImpact.nextTierName && eventLoyaltyImpact.pointsToNextTier > 0 && (
                    <p className="text-xs text-stone-500">
                      {eventLoyaltyImpact.pointsToNextTier.toLocaleString()} points to{' '}
                      {eventLoyaltyImpact.nextTierName}.
                    </p>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* Client Portal QR Code */}
      {event.status !== 'cancelled' && event.status !== 'draft' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Client Portal Access</h2>
          <p className="text-sm text-stone-500 mb-4">
            Share this QR code or link so your client can view their event portal.
          </p>
          <ClientPortalQR eventId={event.id} />
          <div className="mt-4 pt-4 border-t border-stone-800">
            <p className="text-sm text-stone-500 mb-3">
              Send a pre-dinner worksheet for your client to fill out their preferences, allergies,
              and details.
            </p>
            <SendWorksheetButton
              eventId={event.id}
              clientId={event.client_id}
              eventDate={event.event_date}
              occasion={event.occasion}
            />
          </div>
        </Card>
      )}

      {/* Share QR Code â€” only when an active event share link exists */}
      {activeShare && shortShareUrl && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Share QR</h2>
          <p className="text-sm text-stone-500 mb-4">
            Guests scan this code to view event details, RSVP, and more.
          </p>
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getQrCodeUrl(shortShareUrl, 150)}
                alt="Event share QR code"
                width={150}
                height={150}
                className="rounded-lg border border-stone-700 shadow-sm"
              />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs text-stone-300 break-all">{shortShareUrl}</p>
              <a
                href={fullShareUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-brand-600 hover:underline"
              >
                Open share page â†-
              </a>
            </div>
          </div>
        </Card>
      )}

      {/* Service Contract */}
      <ContractSection eventId={event.id} eventStatus={event.status} />

      {/* AI Contract Generator */}
      {!['cancelled'].includes(event.status) && <ContractGeneratorPanel eventId={event.id} />}

      {/* Social Hub Link */}
      {event.status !== 'draft' && event.status !== 'cancelled' && (
        <EventHubLinkPanel groupToken={hubGroupToken as string | null} eventId={event.id} />
      )}

      {/* Guests & RSVPs */}
      {event.status !== 'draft' && event.status !== 'cancelled' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Guests & RSVPs</h2>
          <ChefGuestPanel
            eventShareId={activeShare?.id || null}
            guests={guestList as any[]}
            summary={rsvpSummary as any}
            originalGuestCount={event.guest_count}
            visibility={(activeShare?.visibility_settings as any) || null}
          />
          {activeShare && shortShareUrl && (
            <HostMessageTemplate
              shareUrl={shortShareUrl}
              occasion={event.occasion}
              eventDate={event.event_date}
              chefName={chefDisplayName}
            />
          )}

          {/* RSVP Tracker + Photo Consent â€” below the guest panel */}
          {(guestList as any[]).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <RSVPTrackerPanel
                guests={guestList as any[]}
                totalExpected={event.guest_count}
                shareUrl={shortShareUrl}
                occasion={event.occasion}
              />
              <PhotoConsentSummary guests={guestList as any[]} />
            </div>
          )}
        </Card>
      )}

      {/* Share Recap â€” for completed events with an active share link */}
      {event.status === 'completed' && activeShare && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-stone-100">Event Recap</h3>
              <p className="text-sm text-stone-500 mt-0.5">
                Share a keepsake page with guests â€” photos, messages, and a booking link.
              </p>
            </div>
            <Button
              variant="secondary"
              href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/share/${activeShare.token}/recap`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Recap Page
            </Button>
          </div>
        </Card>
      )}

      {/* Guest Pipeline QR Code */}
      {event.status !== 'cancelled' && (event as any).guest_code && (
        <GuestCodePanel
          eventId={event.id}
          guestCode={(event as any).guest_code}
          guestLeadCount={guestLeadCount as number}
        />
      )}

      {/* Guest Excitement Wall â€” Chef Moderation */}
      {event.status !== 'cancelled' && (guestWallMessages as any[]).length > 0 && (
        <GuestMessagesPanel messages={guestWallMessages as any[]} eventId={event.id} />
      )}

      {/* Guest Experience Panel (reminders, messages, dietary, docs, feedback, attendance) */}
      {event.status !== 'draft' && event.status !== 'cancelled' && (
        <GuestExperiencePanel eventId={event.id} eventStatus={event.status} />
      )}

      {/* Post-Event Guest Outreach (completed events only) */}
      {event.status === 'completed' && <PostEventOutreachPanel eventId={event.id} />}

      {/* Deterministic Allergen Conflict Check (instant, no AI) */}
      {event.menu_id && event.status !== 'draft' && event.status !== 'cancelled' && (
        <AllergenConflictAlert eventId={event.id} />
      )}

      {/* AI Allergen Risk Matrix (on-demand, deeper analysis) */}
      {event.status !== 'draft' && event.status !== 'cancelled' && (
        <AllergenRiskPanel eventId={event.id} />
      )}

      {/* Repeat Menu Detection */}
      {eventMenus && event.menu_id && !['draft', 'cancelled'].includes(event.status) && (
        <RepeatMenuAlert eventId={event.id} clientName={event.client?.full_name} />
      )}

      {/* AI Menu Nutritional Summary */}
      {eventMenus && event.status !== 'cancelled' && <MenuNutritionalPanel eventId={event.id} />}

      {/* Communication Log */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Communication</h2>
          {chatConversationId && (
            <Link href={`/communication/chat/${chatConversationId}`}>
              <Button variant="ghost" size="sm">
                Open Chat →
              </Button>
            </Link>
          )}
        </div>
        {event.inquiry_id && messages.some((m: any) => m.inquiry_id) && (
          <p className="text-xs text-stone-300 mb-3">
            Includes messages from the original inquiry.
          </p>
        )}
        <MessageThread messages={messages} />
        <div className="mt-4 pt-4 border-t border-stone-700">
          <MessageLogForm
            eventId={event.id}
            clientId={event.client_id ?? undefined}
            templates={templates}
          />
        </div>
      </Card>
    </EventDetailSection>
  )
}

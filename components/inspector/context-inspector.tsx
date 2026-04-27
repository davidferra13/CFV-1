'use client'

// Context Inspector - collapsible sidebar/panel that shows ALL relevant context
// when creating or editing menus, quotes, events, inquiries.
// Fetches data on mount via server action and displays in collapsible sections.

import { useEffect, useState, useTransition, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  ChevronRight,
  User,
  AlertTriangle,
  Calendar,
  MapPin,
  Star,
  Heart,
  Info,
  Utensils,
} from '@/components/ui/icons'
import { getInspectorData, type InspectorData } from '@/lib/inspector/inspector-actions'
import { formatCurrency } from '@/lib/utils/currency'
import Link from 'next/link'

// ─── Collapsible Section ─────────────────────────────────────────────────────

function InspectorSection({
  id,
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
  isEmpty = false,
}: {
  id: string
  title: string
  icon: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  isEmpty?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (isEmpty) return null

  return (
    <div className="border-b border-stone-800/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-stone-800/30 transition-colors"
      >
        <span className="text-stone-400 shrink-0">{icon}</span>
        <span className="text-xs font-semibold text-stone-200 flex-1 truncate">{title}</span>
        {badge && <span className="shrink-0">{badge}</span>}
        <span className="shrink-0 text-stone-500">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 space-y-1.5">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Data Row ────────────────────────────────────────────────────────────────

function DataRow({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <span className="text-[11px] text-stone-500 shrink-0">{label}</span>
      {href ? (
        <Link
          href={href}
          className="text-[11px] text-brand-400 hover:text-brand-300 text-right truncate max-w-[60%]"
        >
          {value}
        </Link>
      ) : (
        <span className="text-[11px] text-stone-300 text-right truncate max-w-[60%]">{value}</span>
      )}
    </div>
  )
}

function TagList({
  items,
  variant = 'default',
}: {
  items: string[]
  variant?: 'default' | 'warning' | 'error'
}) {
  if (!items.length) return null
  const colors = {
    default: 'bg-stone-700/50 text-stone-300',
    warning: 'bg-amber-900/40 text-amber-300',
    error: 'bg-red-900/40 text-red-300',
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className={`text-[10px] px-1.5 py-0.5 rounded-md ${colors[variant]}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

// ─── Section: Client Profile ─────────────────────────────────────────────────

function ClientProfileSection({ client }: { client: InspectorData['client'] }) {
  if (!client) return null

  return (
    <InspectorSection
      id="client-profile"
      title={client.fullName}
      icon={<User size={14} />}
      defaultOpen
      badge={
        <>
          {client.isVip && (
            <Badge variant="success" className="text-[9px] px-1 py-0">
              VIP
            </Badge>
          )}
          {client.isRepeat && (
            <Badge variant="info" className="text-[9px] px-1 py-0">
              Repeat
            </Badge>
          )}
        </>
      }
    >
      <DataRow label="Email" value={client.email} />
      <DataRow label="Phone" value={client.phone} />
      <DataRow
        label="Events"
        value={`${client.totalEvents} total (${client.completedEvents} completed)`}
      />
      <DataRow
        label="Total Spent"
        value={client.totalSpentCents > 0 ? formatCurrency(client.totalSpentCents) : null}
      />
      <DataRow
        label="Avg Event"
        value={
          client.averageEventValueCents > 0 ? formatCurrency(client.averageEventValueCents) : null
        }
      />
      {client.daysSinceLastEvent !== null && (
        <DataRow label="Last Event" value={`${client.daysSinceLastEvent}d ago`} />
      )}
      <DataRow label="Loyalty" value={client.loyaltyTier} />
      <DataRow label="Tipping" value={client.tippingPattern} />
      <DataRow label="Profile" value="View full profile" href={`/clients/${client.id}`} />
    </InspectorSection>
  )
}

// ─── Section: Dietary & Allergies ────────────────────────────────────────────

function DietarySection({
  client,
  allergens,
}: {
  client: InspectorData['client']
  allergens: InspectorData['allergens']
}) {
  const hasDietary = (client?.dietaryRestrictions?.length ?? 0) > 0
  const hasAllergies = (client?.allergies?.length ?? 0) > 0
  const hasAllergens = allergens.length > 0
  if (!hasDietary && !hasAllergies && !hasAllergens) return null

  const confirmedAllergens = allergens.filter((a) => a.confirmed)
  const unconfirmedAllergens = allergens.filter((a) => !a.confirmed)

  return (
    <InspectorSection
      id="dietary"
      title="Dietary & Allergies"
      icon={<AlertTriangle size={14} />}
      defaultOpen
      badge={
        hasAllergies || hasAllergens ? (
          <Badge variant="error" className="text-[9px] px-1 py-0">
            {(client?.allergies?.length ?? 0) + allergens.length}
          </Badge>
        ) : null
      }
    >
      {hasDietary && (
        <div>
          <p className="text-[10px] text-stone-500 mb-1">Dietary Restrictions</p>
          <TagList items={client!.dietaryRestrictions} variant="warning" />
        </div>
      )}
      {hasAllergies && (
        <div>
          <p className="text-[10px] text-stone-500 mb-1">Allergies</p>
          <TagList items={client!.allergies} variant="error" />
        </div>
      )}
      {confirmedAllergens.length > 0 && (
        <div>
          <p className="text-[10px] text-stone-500 mb-1">Confirmed Allergens</p>
          <TagList
            items={confirmedAllergens.map(
              (a) => `${a.allergen}${a.severity ? ` (${a.severity})` : ''}`
            )}
            variant="error"
          />
        </div>
      )}
      {unconfirmedAllergens.length > 0 && (
        <div>
          <p className="text-[10px] text-stone-500 mb-1">Suspected</p>
          <TagList items={unconfirmedAllergens.map((a) => a.allergen)} variant="warning" />
        </div>
      )}
    </InspectorSection>
  )
}

// ─── Section: Event Details ──────────────────────────────────────────────────

function EventSection({ event }: { event: InspectorData['event'] }) {
  if (!event) return null

  return (
    <InspectorSection
      id="event-details"
      title="Event Details"
      icon={<Calendar size={14} />}
      defaultOpen
      badge={
        event.status ? (
          <Badge variant="info" className="text-[9px] px-1 py-0">
            {event.status}
          </Badge>
        ) : null
      }
    >
      <DataRow label="Occasion" value={event.occasion} />
      <DataRow label="Date" value={event.eventDate} />
      <DataRow label="Guest Count" value={event.guestCount} />
      <DataRow label="Service Style" value={event.serviceStyle} />
      <DataRow
        label="Time"
        value={
          event.startTime ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}` : null
        }
      />
      <DataRow label="Venue" value={event.venueAddress} />
      <DataRow
        label="Quoted"
        value={event.quotedPriceCents ? formatCurrency(event.quotedPriceCents) : null}
      />
      <DataRow
        label="Client"
        value={event.clientName}
        href={event.clientId ? `/clients/${event.clientId}` : undefined}
      />
      {event.notes && (
        <div className="mt-1">
          <p className="text-[10px] text-stone-500 mb-0.5">Notes</p>
          <p className="text-[11px] text-stone-400 leading-relaxed">{event.notes}</p>
        </div>
      )}
    </InspectorSection>
  )
}

// ─── Section: Client Preferences ─────────────────────────────────────────────

function PreferencesSection({
  client,
  lovedDishes,
  dislikedDishes,
}: {
  client: InspectorData['client']
  lovedDishes: string[]
  dislikedDishes: string[]
}) {
  const hasPrefs =
    client?.vibeNotes ||
    client?.whatTheyCareAbout ||
    lovedDishes.length > 0 ||
    dislikedDishes.length > 0
  if (!hasPrefs) return null

  return (
    <InspectorSection id="preferences" title="Client Preferences" icon={<Heart size={14} />}>
      {client?.whatTheyCareAbout && (
        <div>
          <p className="text-[10px] text-stone-500 mb-0.5">What They Care About</p>
          <p className="text-[11px] text-stone-300 leading-relaxed">{client.whatTheyCareAbout}</p>
        </div>
      )}
      {client?.vibeNotes && (
        <div>
          <p className="text-[10px] text-stone-500 mb-0.5">Vibe Notes</p>
          <p className="text-[11px] text-stone-400 leading-relaxed">{client.vibeNotes}</p>
        </div>
      )}
      {lovedDishes.length > 0 && (
        <div>
          <p className="text-[10px] text-stone-500 mb-1">Loved Dishes</p>
          <TagList items={lovedDishes.slice(0, 8)} />
        </div>
      )}
      {dislikedDishes.length > 0 && (
        <div>
          <p className="text-[10px] text-stone-500 mb-1">Disliked</p>
          <TagList items={dislikedDishes.slice(0, 6)} variant="warning" />
        </div>
      )}
    </InspectorSection>
  )
}

// ─── Section: Past Meals ─────────────────────────────────────────────────────

function PastMealsSection({ pastMeals }: { pastMeals: InspectorData['pastMeals'] }) {
  if (!pastMeals.length) return null

  return (
    <InspectorSection
      id="past-meals"
      title="Past Meals"
      icon={<Utensils size={14} />}
      badge={<span className="text-[10px] text-stone-500">{pastMeals.length}</span>}
    >
      <div className="space-y-2">
        {pastMeals.slice(0, 5).map((meal) => (
          <div key={meal.eventId} className="border-l-2 border-stone-700 pl-2">
            <div className="flex items-center gap-1.5">
              {meal.eventDate && (
                <span className="text-[10px] text-stone-500">{meal.eventDate}</span>
              )}
              {meal.eventOccasion && (
                <span className="text-[10px] text-stone-400">{meal.eventOccasion}</span>
              )}
            </div>
            {meal.menuName && (
              <p className="text-[11px] text-stone-300 font-medium">{meal.menuName}</p>
            )}
            {meal.dishes.length > 0 && (
              <p className="text-[10px] text-stone-500 leading-relaxed">
                {meal.dishes.slice(0, 6).join(', ')}
                {meal.dishes.length > 6 && ` +${meal.dishes.length - 6} more`}
              </p>
            )}
          </div>
        ))}
      </div>
      {pastMeals.length > 5 && (
        <p className="text-[10px] text-stone-500 mt-1">+{pastMeals.length - 5} more meals</p>
      )}
    </InspectorSection>
  )
}

// ─── Section: Feedback History ───────────────────────────────────────────────

function FeedbackSection({
  lastFeedback,
  averageFeedback,
}: {
  lastFeedback: InspectorData['lastFeedback']
  averageFeedback: InspectorData['averageFeedback']
}) {
  if (!lastFeedback && !averageFeedback) return null

  return (
    <InspectorSection id="feedback" title="Client Feedback" icon={<Star size={14} />}>
      {averageFeedback && averageFeedback.overall !== null && (
        <DataRow
          label="Avg Rating"
          value={`${averageFeedback.overall.toFixed(1)}/5 (${averageFeedback.count} reviews)`}
        />
      )}
      {lastFeedback && (
        <>
          {lastFeedback.overall !== null && (
            <DataRow label="Last Rating" value={`${lastFeedback.overall}/5`} />
          )}
          {lastFeedback.foodQuality !== null && (
            <DataRow label="Food Quality" value={`${lastFeedback.foodQuality}/5`} />
          )}
          {lastFeedback.whatTheyLoved && (
            <div>
              <p className="text-[10px] text-stone-500 mb-0.5">What They Loved</p>
              <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                {lastFeedback.whatTheyLoved}
              </p>
            </div>
          )}
          {lastFeedback.whatCouldImprove && (
            <div>
              <p className="text-[10px] text-stone-500 mb-0.5">Could Improve</p>
              <p className="text-[11px] text-amber-400/80 leading-relaxed">
                {lastFeedback.whatCouldImprove}
              </p>
            </div>
          )}
        </>
      )}
    </InspectorSection>
  )
}

// ─── Section: Venue Notes ────────────────────────────────────────────────────

function VenueNotesSection({ venueNotes }: { venueNotes: InspectorData['lastVenueNotes'] }) {
  if (!venueNotes || (!venueNotes.kitchenNotes && !venueNotes.siteNotes)) return null

  return (
    <InspectorSection id="venue-notes" title="Last Venue Notes" icon={<MapPin size={14} />}>
      {venueNotes.location && <DataRow label="Location" value={venueNotes.location} />}
      {venueNotes.kitchenNotes && (
        <div>
          <p className="text-[10px] text-stone-500 mb-0.5">Kitchen</p>
          <p className="text-[11px] text-stone-400 leading-relaxed">{venueNotes.kitchenNotes}</p>
        </div>
      )}
      {venueNotes.siteNotes && (
        <div>
          <p className="text-[10px] text-stone-500 mb-0.5">Site</p>
          <p className="text-[11px] text-stone-400 leading-relaxed">{venueNotes.siteNotes}</p>
        </div>
      )}
    </InspectorSection>
  )
}

// ─── Section: Milestones ─────────────────────────────────────────────────────

function MilestonesSection({ milestones }: { milestones: InspectorData['upcomingMilestones'] }) {
  if (!milestones.length) return null

  return (
    <InspectorSection
      id="milestones"
      title="Upcoming Milestones"
      icon={<Calendar size={14} />}
      badge={<span className="text-[10px] text-stone-500">{milestones.length}</span>}
    >
      {milestones.slice(0, 4).map((m, i) => (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className="text-[10px] text-stone-500 shrink-0">{m.date}</span>
          <span className="text-[11px] text-stone-300">{m.description}</span>
        </div>
      ))}
    </InspectorSection>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export type ContextInspectorProps = {
  clientId?: string | null
  eventId?: string | null
  inquiryId?: string | null
  /** Which sections to show. Default: all */
  sections?: Array<
    | 'client'
    | 'dietary'
    | 'event'
    | 'preferences'
    | 'pastMeals'
    | 'feedback'
    | 'venue'
    | 'milestones'
  >
  /** Start collapsed on mobile */
  defaultCollapsed?: boolean
  className?: string
}

export function ContextInspector({
  clientId,
  eventId,
  inquiryId,
  sections,
  defaultCollapsed = true,
  className = '',
}: ContextInspectorProps) {
  const [data, setData] = useState<InspectorData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const hasAnyId = !!(clientId || eventId || inquiryId)

  const load = useCallback(() => {
    if (!hasAnyId) return
    startTransition(async () => {
      try {
        const result = await getInspectorData({ clientId, eventId, inquiryId })
        setData(result)
      } catch (err) {
        console.error('[ContextInspector] Failed to load data', err)
      }
    })
  }, [clientId, eventId, inquiryId, hasAnyId])

  useEffect(() => {
    load()
  }, [load])

  if (!hasAnyId) return null

  const showSection = (s: string) => !sections || sections.includes(s as any)

  // Count how many data points we have
  const dataCount = data
    ? [
        data.client ? 1 : 0,
        data.allergens.length > 0 ? 1 : 0,
        data.event ? 1 : 0,
        data.pastMeals.length > 0 ? 1 : 0,
        data.lastFeedback ? 1 : 0,
        data.lastVenueNotes ? 1 : 0,
        data.upcomingMilestones.length > 0 ? 1 : 0,
      ].reduce((a, b) => a + b, 0)
    : 0

  return (
    <div className={`${className}`}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg bg-stone-800/40 border border-stone-700/40 hover:bg-stone-800/60 transition-colors mb-1"
      >
        <Info size={14} className="text-brand-400" />
        <span className="text-xs font-semibold text-stone-200 flex-1 text-left">
          Context Inspector
        </span>
        {isPending && <span className="text-[10px] text-stone-500 animate-pulse">Loading...</span>}
        {!isPending && data && dataCount > 0 && (
          <span className="text-[10px] text-stone-500">{dataCount} sections</span>
        )}
        <span className="text-stone-500">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Content */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: collapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">
          {data ? (
            <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 divide-y divide-stone-800/60">
              {showSection('client') && <ClientProfileSection client={data.client} />}
              {showSection('dietary') && (
                <DietarySection client={data.client} allergens={data.allergens} />
              )}
              {showSection('event') && <EventSection event={data.event} />}
              {showSection('preferences') && (
                <PreferencesSection
                  client={data.client}
                  lovedDishes={data.lovedDishes}
                  dislikedDishes={data.dislikedDishes}
                />
              )}
              {showSection('pastMeals') && <PastMealsSection pastMeals={data.pastMeals} />}
              {showSection('feedback') && (
                <FeedbackSection
                  lastFeedback={data.lastFeedback}
                  averageFeedback={data.averageFeedback}
                />
              )}
              {showSection('venue') && <VenueNotesSection venueNotes={data.lastVenueNotes} />}
              {showSection('milestones') && (
                <MilestonesSection milestones={data.upcomingMilestones} />
              )}

              {!data.client && !data.event && (
                <div className="px-3 py-4 text-center">
                  <p className="text-[11px] text-stone-500">No context data available yet.</p>
                  <p className="text-[10px] text-stone-600 mt-1">
                    Select a client or link to an event to see details.
                  </p>
                </div>
              )}
            </div>
          ) : isPending ? (
            <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-6 text-center">
              <p className="text-[11px] text-stone-500 animate-pulse">Loading context...</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Reactive Wrapper ────────────────────────────────────────────────────────
// Use this when the clientId can change (e.g., form dropdown selection)

export function ReactiveContextInspector({
  clientId,
  eventId,
  inquiryId,
  ...props
}: ContextInspectorProps) {
  // Re-key the component when IDs change to force a fresh fetch
  const key = `${clientId ?? ''}-${eventId ?? ''}-${inquiryId ?? ''}`
  if (!clientId && !eventId && !inquiryId) return null
  return (
    <ContextInspector
      key={key}
      clientId={clientId}
      eventId={eventId}
      inquiryId={inquiryId}
      {...props}
    />
  )
}

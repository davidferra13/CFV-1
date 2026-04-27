'use client'

import { useState, useTransition, useEffect, useCallback, type FormEvent } from 'react'
import {
  joinTicketWaitlist,
  purchaseTicket,
  retryTicketPurchase,
} from '@/lib/tickets/purchase-actions'
import type { PublicEventInfo } from '@/lib/tickets/purchase-actions'
import type { EventTicketType } from '@/lib/tickets/types'
import { submitDinnerCircleVendorInterest } from '@/lib/dinner-circles/actions'
import { subscribeToChefEvents } from '@/lib/audience/subscriber-actions'
import { buildEventDefaultLayer } from '@/lib/events/default-behaviors'

type Props = {
  event: PublicEventInfo
  shareToken: string
  justPurchased: boolean
  purchaseCancelled: boolean
  ticketId?: string
  circleUrl: string | null
}

type ViewMode = 'purchase' | 'confirmation' | 'cancelled'

const fieldClass =
  'w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60'

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatWholeMoney(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

function formatEventDate(value: string | null) {
  if (!value) return null

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getRemaining(ticketType: EventTicketType) {
  if (typeof ticketType.remaining !== 'undefined') return ticketType.remaining
  if (ticketType.capacity === null) return null

  return Math.max(0, ticketType.capacity - ticketType.sold_count)
}

function getMaxQuantity(ticketType: EventTicketType) {
  const remaining = getRemaining(ticketType)
  if (remaining === null) return 20

  return Math.max(1, Math.min(20, remaining))
}

function getCapacityLabel(ticketType: EventTicketType) {
  const remaining = getRemaining(ticketType)

  if (ticketType.capacity === null) return 'Available'
  if (remaining === null) return 'Available'
  if (remaining <= 0) return 'Sold out'

  return `${remaining} of ${ticketType.capacity} remaining`
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return ''
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}

function getSaleStatusLabel(
  status: string | undefined
): { text: string; className: string } | null {
  switch (status) {
    case 'not_started':
      return {
        text: 'Coming soon',
        className: 'border-amber-500/50 bg-amber-950/60 text-amber-200',
      }
    case 'early_access':
      return {
        text: 'Early access',
        className: 'border-emerald-500/50 bg-emerald-950/60 text-emerald-200',
      }
    case 'on_sale':
      return null
    case 'ended':
      return { text: 'Sales ended', className: 'border-stone-600 bg-stone-900 text-stone-400' }
    default:
      return null
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message

  return 'Unable to start checkout. Please try again.'
}

function getVendorErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Unable to send request'
  if (error.message.includes('too_small') || error.message.includes('invalid_format')) {
    return 'Please add your name, email, and role.'
  }

  return error.message || 'Unable to send request'
}

function formatRole(role: string) {
  const roleLabels: Record<string, string> = {
    primary: 'Host',
    co_host: 'Co-host',
    sous_chef: 'Sous chef',
    observer: 'Collaborator',
  }

  return (
    roleLabels[role] ||
    role
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  )
}

function groupMenuDishes(dishes: NonNullable<PublicEventInfo['menuDishes']>) {
  const groups: Array<{
    course: string
    dishes: NonNullable<PublicEventInfo['menuDishes']>
  }> = []

  for (const dish of dishes) {
    const course = dish.course?.trim() || 'Menu'
    const existing = groups.find((group) => group.course === course)

    if (existing) {
      existing.dishes.push(dish)
    } else {
      groups.push({ course, dishes: [dish] })
    }
  }

  return groups
}

function joinList(selected: string[], other: string) {
  return [
    ...selected,
    ...other
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  ]
}

export function PublicEventView({
  event,
  shareToken,
  justPurchased,
  purchaseCancelled,
  ticketId,
  circleUrl,
}: Props) {
  const initialMode: ViewMode = justPurchased
    ? 'confirmation'
    : purchaseCancelled
      ? 'cancelled'
      : 'purchase'

  const [mode, setMode] = useState<ViewMode>(initialMode)
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [dietary, setDietary] = useState<string[]>([])
  const [dietaryOther, setDietaryOther] = useState('')
  const [allergies, setAllergies] = useState<string[]>([])
  const [allergiesOther, setAllergiesOther] = useState('')
  const [notes, setNotes] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [vendorEmail, setVendorEmail] = useState('')
  const [vendorRole, setVendorRole] = useState('')
  const [vendorNote, setVendorNote] = useState('')
  const [vendorStatus, setVendorStatus] = useState<string | null>(null)
  const [waitlistName, setWaitlistName] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState<string | null>(null)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyStatus, setNotifyStatus] = useState<string | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map())
  const [countdownMs, setCountdownMs] = useState<number | null>(null)
  const [countdownTarget, setCountdownTarget] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isVendorPending, startVendorTransition] = useTransition()
  const [isWaitlistPending, startWaitlistTransition] = useTransition()
  const [isNotifyPending, startNotifyTransition] = useTransition()
  const isCompleted = event.lifecycleState === 'completed'
  const isLive = event.lifecycleState === 'live'

  const activeTicketTypes = event.ticketTypes.filter((ticketType) => ticketType.is_active)
  const selectedTicketType =
    activeTicketTypes.find((ticketType) => ticketType.id === selectedTicketTypeId) ?? null
  const eventDate = event.showDate ? formatEventDate(event.eventDate) : null
  const config = event.circleConfig
  const dateTimeLabel =
    eventDate && event.serveTime
      ? `${eventDate} at ${event.serveTime}`
      : eventDate || (event.showDate ? event.serveTime : null)
  const totalSold = event.ticketsSold
  const remainingSpots =
    event.totalCapacity > 0 ? Math.max(0, event.totalCapacity - event.ticketsReserved) : null
  const selectedTypeMaxQuantity = selectedTicketType ? getMaxQuantity(selectedTicketType) : 20
  const selectedMaxQuantity =
    remainingSpots === null
      ? selectedTypeMaxQuantity
      : Math.max(0, Math.min(selectedTypeMaxQuantity, remainingSpots))
  const orderQuantity = Math.min(quantity, Math.max(1, selectedMaxQuantity))
  const orderTotalCents = selectedTicketType ? selectedTicketType.price_cents * orderQuantity : 0
  const availabilityPercent =
    remainingSpots !== null && event.totalCapacity > 0 ? remainingSpots / event.totalCapacity : 0
  const availabilityClass =
    availabilityPercent > 0.5
      ? 'text-emerald-400'
      : availabilityPercent > 0.2
        ? 'text-amber-300'
        : 'text-red-300'
  const eventReservedOut = event.totalCapacity > 0 && event.ticketsReserved >= event.totalCapacity
  const ticketsClosed = isCompleted || isLive
  const menuDishGroups =
    event.menuDishes && event.menuDishes.length > 0 ? groupMenuDishes(event.menuDishes) : []
  const collaboratorNames = event.collaborators.map((collaborator) => collaborator.businessName)
  const hostLine =
    event.showChefName && event.chefName
      ? collaboratorNames.length > 0
        ? `Hosted by ${event.chefName} with ${collaboratorNames.slice(0, 2).join(', ')}${
            collaboratorNames.length > 2 ? ` +${collaboratorNames.length - 2}` : ''
          }`
        : `Hosted by ${event.chefName}`
      : null

  // Countdown timer for timed ticket drops
  const earliestDrop = activeTicketTypes
    .filter((tt) => tt.sale_status === 'not_started' && tt.sale_starts_at)
    .sort(
      (a, b) => new Date(a.sale_starts_at!).getTime() - new Date(b.sale_starts_at!).getTime()
    )[0]

  useEffect(() => {
    if (!earliestDrop?.sale_starts_at) {
      setCountdownMs(null)
      setCountdownTarget(null)
      return
    }
    setCountdownTarget(earliestDrop.sale_starts_at)
    const target = new Date(earliestDrop.sale_starts_at).getTime()
    const tick = () => {
      const remaining = target - Date.now()
      setCountdownMs(remaining > 0 ? remaining : 0)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [earliestDrop?.sale_starts_at])

  // Addon total for order summary
  const addonTotalCents = Array.from(selectedAddons.entries()).reduce((sum, [addonId, qty]) => {
    const addon = event.addons.find((a) => a.id === addonId)
    return sum + (addon ? addon.priceCents * qty : 0)
  }, 0)
  const grandTotalCents = orderTotalCents + addonTotalCents * orderQuantity

  const toggleAddon = useCallback((addonId: string, maxPerTicket: number | null) => {
    setSelectedAddons((prev) => {
      const next = new Map(prev)
      if (next.has(addonId)) {
        next.delete(addonId)
      } else {
        next.set(addonId, 1)
      }
      return next
    })
  }, [])

  const setAddonQuantity = useCallback(
    (addonId: string, qty: number, maxPerTicket: number | null) => {
      setSelectedAddons((prev) => {
        const next = new Map(prev)
        const clamped = Math.max(1, Math.min(qty, maxPerTicket ?? 10))
        next.set(addonId, clamped)
        return next
      })
    },
    []
  )

  function handleNotifySubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setNotifyStatus(null)

    startNotifyTransition(async () => {
      try {
        const result = await subscribeToChefEvents({
          chefId: event.tenantId,
          email: notifyEmail.trim(),
          sourceEventId: event.eventId,
        })
        if (result.success) {
          setNotifyEmail('')
          setNotifyStatus('You will be notified of future events.')
        } else {
          setNotifyStatus(result.error || 'Failed to subscribe.')
        }
      } catch {
        setNotifyStatus('Something went wrong. Try again.')
      }
    })
  }

  function buildPublicDefaults(shareUrl: string) {
    return buildEventDefaultLayer({
      eventId: event.eventId,
      eventName: event.eventName,
      status: event.status,
      eventDate: event.eventDate,
      launchedAt: event.createdAt,
      guestCount: event.guestCount,
      ticketsSold: event.ticketsSold,
      totalCapacity: event.totalCapacity,
      publicPhotosCount: event.publicPhotos.length,
      publicStory: config.publicPage?.story ?? event.menuSummary,
      shareUrl,
      locationText: event.locationText,
      chefName: event.chefName,
      collaborators: event.collaborators,
      supplierIngredientLines: config.supplier?.ingredientLines ?? [],
      sourceLinksCount: config.supplier?.sourceLinks?.length ?? 0,
      layoutZoneKinds: config.layout?.zones?.map((zone) => zone.kind) ?? [],
      accessibilityNotes: config.layout?.chefNotes?.toLowerCase().includes('accessible')
        ? config.layout.chefNotes
        : null,
      seatingStyle: config.layout?.chefNotes?.toLowerCase().includes('seating')
        ? config.layout.chefNotes
        : null,
    })
  }

  const defaultLayer = buildPublicDefaults(`/e/${shareToken}`)

  function formatGoogleCalDate(date: string, time?: string | null, hoursToAdd = 0): string {
    const calendarDate = new Date(`${date}T${time || '18:00'}:00`)
    calendarDate.setHours(calendarDate.getHours() + hoursToAdd)
    return calendarDate
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  }

  function getPublicEventUrl() {
    return window.location.origin + window.location.pathname
  }

  function handleShare() {
    const url = getPublicEventUrl()
    const share = buildPublicDefaults(url).shareSnippets
    const text = share.text.replace(url, '').trim() || `Join ${event.eventName}`

    if (navigator.share) {
      navigator.share({ title: event.eventName, text, url }).catch(() => {})
      return
    }

    navigator.clipboard.writeText(share.text)
    alert('Link copied!')
  }

  function copyShareSnippet(kind: 'text' | 'social') {
    const share = buildPublicDefaults(getPublicEventUrl()).shareSnippets
    navigator.clipboard.writeText(share[kind])
    alert(kind === 'text' ? 'Text copy copied!' : 'Social copy copied!')
  }

  function handleDownloadCalendar() {
    if (!event.eventDate) return

    const icsDate = event.eventDate.replace(/-/g, '')
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${icsDate}T${(event.serveTime || '18:00').replace(':', '')}00`,
      `SUMMARY:${event.eventName}`,
      event.locationText ? `LOCATION:${event.locationText}` : '',
      circleUrl ? `DESCRIPTION:Dinner Circle: ${circleUrl}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${event.eventName || 'event'}.ics`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function selectTicketType(ticketType: EventTicketType) {
    const remaining = getRemaining(ticketType)
    if (remaining !== null && remaining <= 0) return

    setSelectedTicketTypeId(ticketType.id)
    setQuantity((current) => Math.min(current, getMaxQuantity(ticketType)))
    setError(null)
  }

  function handleQuantityChange(value: string) {
    const nextQuantity = Number.parseInt(value, 10)
    if (Number.isNaN(nextQuantity)) {
      setQuantity(1)
      return
    }

    setQuantity(Math.min(Math.max(nextQuantity, 1), selectedMaxQuantity))
  }

  function handleRetry() {
    setError(null)
    if (!ticketId) {
      setMode('purchase')
      window.history.replaceState(null, '', `/e/${shareToken}`)
      return
    }

    startTransition(async () => {
      try {
        const result = await retryTicketPurchase({ shareToken, ticketId })
        window.location.href = result.checkoutUrl
      } catch (retryError) {
        setMode('purchase')
        setError(getErrorMessage(retryError))
        window.history.replaceState(null, '', `/e/${shareToken}`)
      }
    })
  }

  function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (!selectedTicketType) return

    setError(null)

    const addonSelections = Array.from(selectedAddons.entries())
      .filter(([, qty]) => qty > 0)
      .map(([addonId, quantity]) => ({ addonId, quantity }))

    startTransition(async () => {
      try {
        const result = await purchaseTicket({
          shareToken,
          ticketTypeId: selectedTicketType.id,
          quantity: orderQuantity,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          buyerPhone: buyerPhone.trim() || undefined,
          dietaryRestrictions: joinList(dietary, dietaryOther),
          allergies: joinList(allergies, allergiesOther),
          notes: notes.trim() || undefined,
          addons: addonSelections.length > 0 ? addonSelections : undefined,
        })

        window.location.href = result.checkoutUrl
      } catch (purchaseError) {
        // Handle timed drop not-yet-started error with countdown info
        if (purchaseError instanceof Error) {
          try {
            const parsed = JSON.parse(purchaseError.message)
            if (parsed.code === 'SALE_NOT_STARTED' && parsed.saleStartsAt) {
              setCountdownTarget(parsed.saleStartsAt)
              setError(`Tickets go on sale ${new Date(parsed.saleStartsAt).toLocaleString()}`)
              return
            }
          } catch {
            // Not JSON, use normal error display
          }
        }
        setError(getErrorMessage(purchaseError))
      }
    })
  }

  function handleVendorSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setVendorStatus(null)

    startVendorTransition(async () => {
      try {
        await submitDinnerCircleVendorInterest({
          shareToken,
          name: vendorName,
          email: vendorEmail,
          role: vendorRole,
          note: vendorNote,
        })
        setVendorName('')
        setVendorEmail('')
        setVendorRole('')
        setVendorNote('')
        setVendorStatus('Sent')
      } catch (vendorError) {
        setVendorStatus(getVendorErrorMessage(vendorError))
      }
    })
  }

  function handleWaitlistSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setWaitlistStatus(null)

    startWaitlistTransition(async () => {
      try {
        await joinTicketWaitlist({
          shareToken,
          guestName: waitlistName,
          guestEmail: waitlistEmail,
          quantity: 1,
        })
        setWaitlistName('')
        setWaitlistEmail('')
        setWaitlistStatus('You are on the waitlist.')
      } catch (waitlistError) {
        setWaitlistStatus(
          waitlistError instanceof Error ? waitlistError.message : 'Unable to join waitlist'
        )
      }
    })
  }

  if (mode === 'confirmation') {
    return (
      <main className="min-h-screen bg-stone-950 px-4 py-10 text-stone-100">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center">
          <section className="w-full rounded-lg border border-stone-700 bg-stone-900 p-6 text-center sm:p-8">
            <p className="mb-3 text-sm font-medium text-emerald-400">Confirmed</p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-stone-100">You're in!</h1>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Your tickets are confirmed. Check your email for details.
            </p>

            {circleUrl && (
              <a
                href={circleUrl}
                className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-emerald-500 sm:w-auto"
              >
                Join the Dinner Circle
              </a>
            )}

            {event.eventDate && (
              <div className="mt-4 flex gap-3">
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.eventName)}&dates=${formatGoogleCalDate(event.eventDate, event.serveTime)}/${formatGoogleCalDate(event.eventDate, event.serveTime, 3)}&location=${encodeURIComponent(event.locationText || '')}&details=${encodeURIComponent(`Dinner Circle: ${circleUrl || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-stone-800 px-4 py-2 text-center text-sm text-stone-300 transition-colors hover:bg-stone-700"
                >
                  Google Calendar
                </a>
                <button
                  type="button"
                  onClick={handleDownloadCalendar}
                  className="flex-1 rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-300 transition-colors hover:bg-stone-700"
                >
                  Apple / Outlook
                </button>
              </div>
            )}

            <div className="mt-6 border-t border-stone-700 pt-6">
              <p className="mb-3 text-sm text-stone-400">Share with friends</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-1 rounded-lg bg-stone-700 px-4 py-2 text-sm text-stone-200 transition-colors hover:bg-stone-600"
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `I'm going to ${event.eventName}! Get your tickets:`
                    )
                    const url = encodeURIComponent(getPublicEventUrl())
                    window.open(
                      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }}
                  className="rounded-lg bg-stone-700 px-4 py-2 text-sm text-stone-200 transition-colors hover:bg-stone-600"
                >
                  Post on X
                </button>
              </div>
            </div>

            <div className="mt-6">
              <a
                href={`/e/${shareToken}`}
                className="text-sm font-medium text-stone-400 transition hover:text-stone-100"
              >
                Back to event
              </a>
            </div>
          </section>
        </div>
      </main>
    )
  }

  if (mode === 'cancelled') {
    return (
      <main className="min-h-screen bg-stone-950 px-4 py-10 text-stone-100">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center">
          <section className="w-full rounded-lg border border-stone-700 bg-stone-900 p-6 text-center sm:p-8">
            <p className="text-sm font-medium text-red-300">Checkout stopped</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-stone-100">
              Payment was cancelled.
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              No charge was made. You can choose your tickets again when you are ready.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isPending}
              className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-emerald-500 sm:w-auto"
            >
              {isPending ? 'Restarting checkout...' : 'Try again'}
            </button>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-8 text-stone-100 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-emerald-400">Ticketed dinner</p>
              {isCompleted && (
                <span className="rounded-full border border-stone-600 bg-stone-900 px-2.5 py-1 text-xs font-semibold text-stone-300">
                  Permanent recap
                </span>
              )}
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  defaultLayer.statusTone === 'urgent'
                    ? 'border-amber-500/50 bg-amber-950/60 text-amber-200'
                    : defaultLayer.statusTone === 'closed'
                      ? 'border-stone-600 bg-stone-900 text-stone-300'
                      : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                }`}
              >
                {defaultLayer.statusMessage}
              </span>
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-stone-100 sm:text-5xl">
              {event.eventName}
            </h1>
          </div>

          <div className="space-y-2 text-sm leading-6 text-stone-400">
            {dateTimeLabel && <p>{dateTimeLabel}</p>}
            {event.showLocation && event.locationText && <p>{event.locationText}</p>}
            {hostLine && <p>{hostLine}</p>}
          </div>
        </header>

        {defaultLayer.expectations.length > 0 && (
          <section className="grid gap-3 sm:grid-cols-2">
            {defaultLayer.expectations.slice(0, 4).map((detail) => (
              <div key={detail.id} className="rounded-lg border border-stone-700 bg-stone-900 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {detail.label}
                </p>
                <p className="mt-1 text-sm leading-5 text-stone-300">{detail.message}</p>
              </div>
            ))}
          </section>
        )}

        {(config.adaptive?.clientExpectationNote ||
          config.adaptive?.changeWindowNote ||
          config.menu?.fixedElements ||
          config.menu?.flexibleElements) && (
          <section className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Seasonal Menu State
                </p>
                <h2 className="mt-1 text-xl font-semibold text-stone-100">
                  {config.menu?.versionLabel || 'Working seasonal menu'}
                </h2>
              </div>
              <span className="rounded-full border border-emerald-700/70 px-3 py-1 text-xs font-semibold text-emerald-200">
                {config.adaptive?.finalValidationLocked ? 'Final menu locked' : 'Sourcing active'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {config.adaptive?.clientExpectationNote && (
                <p className="rounded-lg bg-stone-950 px-3 py-2 text-sm leading-5 text-stone-300">
                  {config.adaptive.clientExpectationNote}
                </p>
              )}
              {config.adaptive?.changeWindowNote && (
                <p className="rounded-lg bg-stone-950 px-3 py-2 text-sm leading-5 text-stone-300">
                  {config.adaptive.changeWindowNote}
                </p>
              )}
              {config.menu?.fixedElements && (
                <p className="rounded-lg bg-stone-950 px-3 py-2 text-sm leading-5 text-stone-300">
                  {config.menu.fixedElements}
                </p>
              )}
              {config.menu?.flexibleElements && (
                <p className="rounded-lg bg-stone-950 px-3 py-2 text-sm leading-5 text-stone-300">
                  {config.menu.flexibleElements}
                </p>
              )}
            </div>
          </section>
        )}

        {(config.publicPage?.story || event.publicPhotos.length > 0) && (
          <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            {config.publicPage?.story && (
              <div className="rounded-lg border border-stone-700 bg-stone-900 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
                  Story
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-300">
                  {config.publicPage.story}
                </p>
              </div>
            )}
            {event.publicPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {event.publicPhotos.slice(0, 4).map((photo) => (
                  <figure
                    key={photo.id}
                    className="overflow-hidden rounded-lg border border-stone-800 bg-stone-900"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Event photo'}
                      loading="lazy"
                      decoding="async"
                      className="h-32 w-full object-cover"
                    />
                  </figure>
                ))}
              </div>
            )}
          </section>
        )}

        {(event.chefName || event.collaborators.length > 0) && (
          <section className="rounded-lg border border-stone-700 bg-stone-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Your Hosts
            </h2>
            <div className="mt-4 space-y-3">
              {event.chefName && (
                <div>
                  <p className="font-medium text-stone-100">{event.chefName}</p>
                  <p className="text-sm text-stone-400">Host</p>
                </div>
              )}
              {event.collaborators.map((collaborator) => (
                <div key={`${collaborator.businessName}-${collaborator.role}`}>
                  <p className="font-medium text-stone-100">{collaborator.businessName}</p>
                  <p className="text-sm text-stone-400">{formatRole(collaborator.role)}</p>
                </div>
              ))}
              {defaultLayer.contributorBalance.message && (
                <p className="rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-400">
                  {defaultLayer.contributorBalance.message}
                </p>
              )}
            </div>
          </section>
        )}

        {event.showMenu &&
          ((event.menuDishes && event.menuDishes.length > 0) || event.menuSummary) && (
            <section className="rounded-lg border border-stone-700 bg-stone-900 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
                The Menu
              </h2>
              {menuDishGroups.length > 0 ? (
                <div className="mt-4 space-y-5">
                  {menuDishGroups.map((group) => (
                    <div key={group.course}>
                      <h3 className="text-sm font-semibold text-stone-200">{group.course}</h3>
                      <div className="mt-2 space-y-3">
                        {group.dishes.map((dish) => (
                          <div key={`${group.course}-${dish.name}`}>
                            <p className="font-semibold text-stone-100">{dish.name}</p>
                            {dish.description && (
                              <p className="mt-1 text-sm leading-5 text-stone-400">
                                {dish.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-300">
                  {event.menuSummary}
                </p>
              )}
            </section>
          )}

        {isCompleted && (
          <section className="space-y-4 rounded-lg border border-emerald-900/70 bg-emerald-950/20 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Event Recap
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-100">
                  This event is preserved at this link.
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  The full menu, people, ingredients, media, feedback, and performance history stay
                  connected to this event and its Dinner Circle.
                </p>
              </div>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-emerald-500"
              >
                Share recap
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-stone-800 bg-stone-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Tickets
                </p>
                <p className="mt-1 text-2xl font-semibold text-stone-100">
                  {event.hostStats.tickets}
                </p>
              </div>
              <div className="rounded-lg border border-stone-800 bg-stone-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Attendance
                </p>
                <p className="mt-1 text-2xl font-semibold text-stone-100">
                  {event.hostStats.attendance}
                </p>
              </div>
              <div className="rounded-lg border border-stone-800 bg-stone-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Revenue
                </p>
                <p className="mt-1 text-2xl font-semibold text-stone-100">
                  {formatWholeMoney(event.hostStats.revenueCents)}
                </p>
              </div>
              <div className="rounded-lg border border-stone-800 bg-stone-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Rating
                </p>
                <p className="mt-1 text-2xl font-semibold text-stone-100">
                  {event.feedback.averageOverall !== null
                    ? `${event.feedback.averageOverall.toFixed(1)}/5`
                    : 'Pending'}
                </p>
              </div>
            </div>

            {(event.feedback.responseCount > 0 || event.feedback.comments.length > 0) && (
              <div className="rounded-lg border border-stone-800 bg-stone-950 p-4">
                <div className="flex flex-wrap gap-3 text-sm text-stone-300">
                  <span>{event.feedback.responseCount} feedback response(s)</span>
                  {event.feedback.averageFood !== null && (
                    <span>Food {event.feedback.averageFood.toFixed(1)}/5</span>
                  )}
                  {event.feedback.averageExperience !== null && (
                    <span>Experience {event.feedback.averageExperience.toFixed(1)}/5</span>
                  )}
                </div>
                {event.feedback.comments.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {event.feedback.comments.map((comment, index) => (
                      <blockquote
                        key={`${comment.text}-${index}`}
                        className="border-l-2 border-emerald-600 pl-3 text-sm leading-6 text-stone-300"
                      >
                        {comment.text}
                        {comment.rating !== null && (
                          <span className="mt-1 block text-xs text-stone-500">
                            {comment.rating}/5
                          </span>
                        )}
                      </blockquote>
                    ))}
                  </div>
                )}
              </div>
            )}

            {event.collaboratorInsights.length > 0 && (
              <div className="rounded-lg border border-stone-800 bg-stone-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Collaborator Insights
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {event.collaboratorInsights.map((insight) => (
                    <p
                      key={insight}
                      className="rounded-md bg-stone-900 px-3 py-2 text-sm text-stone-300"
                    >
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {(config.supplier?.ingredientLines?.length ||
          config.supplier?.sourceLinks?.length ||
          config.farm?.enabled) && (
          <section className="rounded-lg border border-stone-700 bg-stone-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Ingredients And Source
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {config.supplier?.ingredientLines?.length ? (
                <div className="space-y-2">
                  {config.supplier.ingredientLines.slice(0, 8).map((line) => (
                    <div
                      key={line}
                      className="rounded-lg bg-stone-950 px-3 py-2 text-sm text-stone-300"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="space-y-2 text-sm text-stone-300">
                {config.supplier?.sourceLinks?.map((link) => (
                  <p key={`${link.ingredient}-${link.sourceName}`}>
                    <span className="font-medium text-stone-100">{link.ingredient}</span>
                    <span className="text-stone-500"> from </span>
                    {link.sourceName}
                  </p>
                ))}
                {config.farm?.enabled && config.farm.notes && (
                  <p className="leading-6 text-stone-400">{config.farm.notes}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {config.publicPage?.showGuestMap && config.layout?.zones?.length ? (
          <section className="rounded-lg border border-stone-700 bg-stone-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Map</h2>
            <div className="relative mt-4 aspect-[16/9] rounded-lg border border-stone-800 bg-stone-950">
              {config.layout.zones
                .filter(
                  (zone) => zone.kind === 'guest' || zone.kind === 'service' || zone.kind === 'path'
                )
                .map((zone) => (
                  <div
                    key={zone.id}
                    className="absolute rounded-md border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: `${zone.w}%`,
                      height: `${zone.h}%`,
                    }}
                  >
                    {zone.label}
                  </div>
                ))}
            </div>
          </section>
        ) : null}

        {(config.farm?.animals?.length ||
          config.social?.posts?.length ||
          config.publicPage?.pastLinks?.length) && (
          <section className="grid gap-4 md:grid-cols-3">
            {config.farm?.animals?.slice(0, 3).map((animal) => (
              <div
                key={animal.name}
                className="rounded-lg border border-stone-700 bg-stone-900 p-4"
              >
                {animal.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={animal.photoUrl}
                    alt={animal.name}
                    loading="lazy"
                    decoding="async"
                    className="mb-3 h-28 w-full rounded-md object-cover"
                  />
                )}
                <p className="font-semibold text-stone-100">{animal.name}</p>
                {animal.notes && <p className="mt-1 text-sm text-stone-400">{animal.notes}</p>}
              </div>
            ))}
            {config.social?.posts?.slice(0, 3).map((post) => (
              <a
                key={`${post.label}-${post.url}`}
                href={post.url || '#'}
                className="rounded-lg border border-stone-700 bg-stone-900 p-4"
              >
                <p className="font-semibold text-stone-100">{post.label}</p>
                {post.body && <p className="mt-1 text-sm text-stone-400">{post.body}</p>}
              </a>
            ))}
            {config.publicPage?.pastLinks?.slice(0, 3).map((link) => (
              <a
                key={link.url}
                href={link.url}
                className="rounded-lg border border-stone-700 bg-stone-900 p-4"
              >
                <p className="font-semibold text-stone-100">{link.label}</p>
                <p className="mt-1 text-sm text-stone-500">Past event</p>
              </a>
            ))}
          </section>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-100">
              {ticketsClosed ? 'Ticketing closed' : 'Choose tickets'}
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              {ticketsClosed
                ? 'This link remains available for the full event details, recap, and sharing.'
                : 'Select a ticket type to continue.'}
            </p>
          </div>

          {remainingSpots !== null && (
            <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
              {eventReservedOut ? (
                <p className="text-sm font-semibold text-red-300">Sold Out</p>
              ) : (
                <p className={`text-sm font-semibold ${availabilityClass}`}>
                  {remainingSpots} of {event.totalCapacity} spots remaining
                </p>
              )}
            </div>
          )}

          {countdownMs !== null && countdownMs > 0 && countdownTarget && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Tickets drop in
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-[-0.04em] text-amber-100">
                {formatCountdown(countdownMs)}
              </p>
              <p className="mt-1 text-xs text-amber-400/70">
                {new Date(countdownTarget).toLocaleString()}
              </p>
            </div>
          )}

          {ticketsClosed ? (
            <div className="rounded-lg border border-stone-700 bg-stone-900 p-5 text-sm text-stone-400">
              This event is no longer selling tickets. The page now works as the permanent recap and
              proof page.
            </div>
          ) : !event.ticketsEnabled || activeTicketTypes.length === 0 ? (
            <div className="rounded-lg border border-stone-700 bg-stone-900 p-5 text-sm text-stone-400">
              Tickets are not available for this event.
            </div>
          ) : eventReservedOut ? (
            <div className="rounded-lg border border-stone-700 bg-stone-900 p-5">
              <p className="text-sm text-stone-400">This dinner is fully booked.</p>
              <form
                onSubmit={handleWaitlistSubmit}
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  className={fieldClass}
                  value={waitlistName}
                  onChange={(changeEvent) => setWaitlistName(changeEvent.target.value)}
                  placeholder="Name"
                  required
                  disabled={isWaitlistPending}
                />
                <input
                  className={fieldClass}
                  value={waitlistEmail}
                  onChange={(changeEvent) => setWaitlistEmail(changeEvent.target.value)}
                  placeholder="Email"
                  type="email"
                  required
                  disabled={isWaitlistPending}
                />
                <button
                  type="submit"
                  disabled={isWaitlistPending}
                  className="inline-flex items-center justify-center rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-700 disabled:opacity-60"
                >
                  {isWaitlistPending ? 'Joining...' : 'Waitlist'}
                </button>
              </form>
              {waitlistStatus && <p className="mt-3 text-sm text-stone-400">{waitlistStatus}</p>}

              <div className="mt-6 border-t border-stone-700 pt-4">
                <p className="text-sm font-medium text-stone-300">Get notified of future events</p>
                <form onSubmit={handleNotifySubmit} className="mt-2 flex gap-2">
                  <input
                    className={fieldClass}
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="Your email"
                    type="email"
                    required
                    disabled={isNotifyPending}
                  />
                  <button
                    type="submit"
                    disabled={isNotifyPending}
                    className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {isNotifyPending ? 'Saving...' : 'Notify me'}
                  </button>
                </form>
                {notifyStatus && <p className="mt-2 text-xs text-stone-400">{notifyStatus}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {totalSold > 0 && (
                <div className="mb-4 text-center">
                  <p className="text-sm text-stone-400">
                    <span className="font-medium text-emerald-400">{totalSold}</span>
                    {totalSold === 1 ? ' person' : ' people'} going
                  </p>
                </div>
              )}

              {activeTicketTypes.map((ticketType) => {
                const remaining = getRemaining(ticketType)
                const soldOut = remaining !== null && remaining <= 0
                const selected = selectedTicketTypeId === ticketType.id
                const saleStatus = getSaleStatusLabel(ticketType.sale_status)
                const notOnSale =
                  ticketType.sale_status === 'not_started' || ticketType.sale_status === 'ended'
                const isDisabled = soldOut || notOnSale

                return (
                  <div key={ticketType.id} className="space-y-3">
                    <button
                      type="button"
                      onClick={() => selectTicketType(ticketType)}
                      disabled={isDisabled}
                      aria-pressed={selected}
                      className={`w-full rounded-lg border bg-stone-900 p-4 text-left transition ${
                        selected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-stone-700 hover:border-stone-500'
                      } ${
                        isDisabled
                          ? 'cursor-not-allowed border-stone-800 bg-stone-900/60 opacity-60 hover:border-stone-800'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-stone-100">
                              {ticketType.name}
                            </h3>
                            {saleStatus && (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${saleStatus.className}`}
                              >
                                {saleStatus.text}
                              </span>
                            )}
                          </div>
                          {ticketType.description && (
                            <p className="text-sm leading-5 text-stone-400">
                              {ticketType.description}
                            </p>
                          )}
                          <p className="text-xs font-medium text-stone-500">
                            {getCapacityLabel(ticketType)}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-lg font-semibold text-stone-100">
                            {formatMoney(ticketType.price_cents)}
                          </p>
                          {soldOut && (
                            <p className="mt-1 text-xs font-medium text-red-300">Sold out</p>
                          )}
                        </div>
                      </div>
                    </button>

                    {selected && circleUrl && (
                      <p className="text-xs text-stone-500">
                        Ticket holders join the Dinner Circle for event updates and guest
                        coordination.
                      </p>
                    )}

                    {selected && selectedTicketType && (
                      <form
                        onSubmit={handleSubmit}
                        className="space-y-4 rounded-lg border border-stone-700 bg-stone-900 p-5"
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-stone-100">
                            {selectedTicketType.name}
                          </h3>
                          <p className="mt-1 text-sm text-stone-400">
                            {formatMoney(selectedTicketType.price_cents)} per ticket
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-1.5 text-sm font-medium text-stone-300">
                            <span>Name</span>
                            <input
                              type="text"
                              value={buyerName}
                              onChange={(changeEvent) => setBuyerName(changeEvent.target.value)}
                              required
                              autoComplete="name"
                              className={fieldClass}
                              placeholder="Your full name"
                              disabled={isPending}
                            />
                          </label>

                          <label className="space-y-1.5 text-sm font-medium text-stone-300">
                            <span>Email</span>
                            <input
                              type="email"
                              value={buyerEmail}
                              onChange={(changeEvent) => setBuyerEmail(changeEvent.target.value)}
                              required
                              autoComplete="email"
                              className={fieldClass}
                              placeholder="you@example.com"
                              disabled={isPending}
                            />
                          </label>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-1.5 text-sm font-medium text-stone-300">
                            <span>Phone</span>
                            <input
                              type="tel"
                              value={buyerPhone}
                              onChange={(changeEvent) => setBuyerPhone(changeEvent.target.value)}
                              autoComplete="tel"
                              className={fieldClass}
                              placeholder="Optional"
                              disabled={isPending}
                            />
                          </label>

                          <label className="space-y-1.5 text-sm font-medium text-stone-300">
                            <span>Quantity</span>
                            <input
                              type="number"
                              value={orderQuantity}
                              onChange={(changeEvent) =>
                                handleQuantityChange(changeEvent.target.value)
                              }
                              min={1}
                              max={selectedMaxQuantity}
                              className={fieldClass}
                              disabled={isPending}
                            />
                          </label>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm text-stone-400">
                              Dietary restrictions
                            </label>
                            <div className="mb-2 flex flex-wrap gap-2">
                              {[
                                'Vegetarian',
                                'Vegan',
                                'Gluten-free',
                                'Dairy-free',
                                'Kosher',
                                'Halal',
                              ].map((diet) => (
                                <button
                                  key={diet}
                                  type="button"
                                  onClick={() => {
                                    setDietary((current) =>
                                      current.includes(diet)
                                        ? current.filter((item) => item !== diet)
                                        : [...current, diet]
                                    )
                                  }}
                                  disabled={isPending}
                                  className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                    dietary.includes(diet)
                                      ? 'border-emerald-600 bg-emerald-600/20 text-emerald-400'
                                      : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500'
                                  }`}
                                >
                                  {diet}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Other restrictions..."
                              value={dietaryOther}
                              onChange={(changeEvent) => setDietaryOther(changeEvent.target.value)}
                              className={fieldClass}
                              disabled={isPending}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-stone-400">Allergies</label>
                            <div className="mb-2 flex flex-wrap gap-2">
                              {[
                                'Peanuts',
                                'Tree nuts',
                                'Shellfish',
                                'Fish',
                                'Milk',
                                'Eggs',
                                'Wheat',
                                'Soy',
                                'Sesame',
                              ].map((allergy) => (
                                <button
                                  key={allergy}
                                  type="button"
                                  onClick={() => {
                                    setAllergies((current) =>
                                      current.includes(allergy)
                                        ? current.filter((item) => item !== allergy)
                                        : [...current, allergy]
                                    )
                                  }}
                                  disabled={isPending}
                                  className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                    allergies.includes(allergy)
                                      ? 'border-red-600 bg-red-600/20 text-red-400'
                                      : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500'
                                  }`}
                                >
                                  {allergy}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Other allergies..."
                              value={allergiesOther}
                              onChange={(changeEvent) =>
                                setAllergiesOther(changeEvent.target.value)
                              }
                              className={fieldClass}
                              disabled={isPending}
                            />
                          </div>
                        </div>

                        <label className="block space-y-1.5 text-sm font-medium text-stone-300">
                          <span>Notes</span>
                          <textarea
                            value={notes}
                            onChange={(changeEvent) => setNotes(changeEvent.target.value)}
                            rows={3}
                            className={fieldClass}
                            placeholder="Optional"
                            disabled={isPending}
                          />
                        </label>

                        {event.addons.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-stone-300">Add-ons</p>
                            {event.addons.map((addon) => {
                              const isSelected = selectedAddons.has(addon.id)
                              const addonQty = selectedAddons.get(addon.id) ?? 0
                              const soldOut = addon.remaining !== null && addon.remaining <= 0

                              return (
                                <div
                                  key={addon.id}
                                  className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                                    isSelected
                                      ? 'border-emerald-600/50 bg-emerald-950/20'
                                      : 'border-stone-700 bg-stone-950'
                                  } ${soldOut ? 'opacity-50' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isPending || soldOut}
                                    onChange={() => toggleAddon(addon.id, addon.maxPerTicket)}
                                    aria-label={`Add ${addon.name}`}
                                    className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-emerald-500 focus:ring-emerald-500/30"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-stone-200">
                                      {addon.name}
                                    </p>
                                    {addon.description && (
                                      <p className="text-xs text-stone-500">{addon.description}</p>
                                    )}
                                    {soldOut && (
                                      <p className="text-xs font-medium text-red-400">Sold out</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isSelected &&
                                      (addon.maxPerTicket === null || addon.maxPerTicket > 1) && (
                                        <input
                                          type="number"
                                          value={addonQty}
                                          min={1}
                                          max={addon.maxPerTicket ?? 10}
                                          onChange={(e) =>
                                            setAddonQuantity(
                                              addon.id,
                                              parseInt(e.target.value, 10),
                                              addon.maxPerTicket
                                            )
                                          }
                                          disabled={isPending}
                                          aria-label={`${addon.name} quantity`}
                                          className="w-14 rounded border border-stone-700 bg-stone-900 px-2 py-1 text-center text-xs text-stone-200"
                                        />
                                      )}
                                    <span className="text-sm font-medium text-stone-300">
                                      {formatMoney(addon.priceCents)}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="rounded-lg border border-stone-700 bg-stone-950 p-4 text-sm text-stone-300">
                          <div className="flex justify-between">
                            <span>
                              {orderQuantity}x {selectedTicketType.name}
                            </span>
                            <span>{formatMoney(orderTotalCents)}</span>
                          </div>
                          {Array.from(selectedAddons.entries()).map(([addonId, qty]) => {
                            const addon = event.addons.find((a) => a.id === addonId)
                            if (!addon) return null
                            return (
                              <div key={addonId} className="flex justify-between text-stone-400">
                                <span>
                                  {qty}x {addon.name} (x{orderQuantity} tickets)
                                </span>
                                <span>{formatMoney(addon.priceCents * qty * orderQuantity)}</span>
                              </div>
                            )
                          })}
                          {addonTotalCents > 0 && (
                            <div className="mt-2 flex justify-between border-t border-stone-700 pt-2 font-semibold text-stone-100">
                              <span>Total</span>
                              <span>{formatMoney(grandTotalCents)}</span>
                            </div>
                          )}
                          {addonTotalCents === 0 && (
                            <div className="mt-1 text-right font-semibold text-stone-100">
                              {formatMoney(orderTotalCents)}
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={
                            isPending ||
                            !buyerName.trim() ||
                            !buyerEmail.trim() ||
                            selectedMaxQuantity < 1
                          }
                          className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPending ? 'Sending to checkout...' : 'Get Tickets'}
                        </button>

                        {error && (
                          <div className="rounded-lg border border-red-700 bg-red-950/70 px-4 py-3 text-sm text-red-200">
                            {error}
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {circleUrl && (
          <section className="rounded-lg border border-stone-700 bg-stone-900 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-100">Follow the Dinner Circle</h2>
                <p className="mt-1 text-sm leading-6 text-stone-400">
                  The circle stays active across past and future events. Follow it for photos,
                  updates, and notifications when the host announces what is next.
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  {event.circle.memberCount} members - {event.circle.eventCount || 1} linked events
                </p>
              </div>
              <a
                href={circleUrl}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-emerald-500"
              >
                Open circle
              </a>
            </div>
          </section>
        )}

        <section className="rounded-lg border border-stone-700 bg-stone-900 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-100">
                {isCompleted ? 'Share this recap' : 'Share this dinner'}
              </h2>
              <p className="mt-1 text-sm text-stone-400">
                {defaultLayer.shareSnippets.shortPreview}
              </p>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-700"
            >
              Share
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Text</p>
              <p className="mt-2 text-sm leading-5 text-stone-300">
                {defaultLayer.shareSnippets.text}
              </p>
              <button
                type="button"
                onClick={() => copyShareSnippet('text')}
                className="mt-3 rounded-md bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-200 transition hover:bg-stone-700"
              >
                Copy text
              </button>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Social</p>
              <p className="mt-2 text-sm leading-5 text-stone-300">
                {defaultLayer.shareSnippets.social}
              </p>
              <button
                type="button"
                onClick={() => copyShareSnippet('social')}
                className="mt-3 rounded-md bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-200 transition hover:bg-stone-700"
              >
                Copy social
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-stone-700 bg-stone-900 p-5">
          <h2 className="text-xl font-semibold text-stone-100">Want to be involved?</h2>
          <form onSubmit={handleVendorSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              className={fieldClass}
              value={vendorName}
              onChange={(changeEvent) => setVendorName(changeEvent.target.value)}
              placeholder="Name or business"
              required
            />
            <input
              className={fieldClass}
              value={vendorEmail}
              onChange={(changeEvent) => setVendorEmail(changeEvent.target.value)}
              placeholder="Email"
              type="email"
              required
            />
            <input
              className={fieldClass}
              value={vendorRole}
              onChange={(changeEvent) => setVendorRole(changeEvent.target.value)}
              placeholder="Farm, wine, flowers, host, sponsor"
              required
            />
            <input
              className={fieldClass}
              value={vendorNote}
              onChange={(changeEvent) => setVendorNote(changeEvent.target.value)}
              placeholder="Short note"
            />
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={isVendorPending}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {isVendorPending ? 'Sending...' : 'Send'}
              </button>
              {vendorStatus && <p className="text-sm text-stone-400">{vendorStatus}</p>}
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

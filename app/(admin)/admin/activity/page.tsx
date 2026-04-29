import Link from 'next/link'
import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformActivityFeed, type PlatformActivity } from '@/lib/admin/activity-feed'
import {
  Activity,
  ArrowRight,
  CalendarRange,
  Inbox,
  MapPin,
  ShieldCheck,
  UserCheck,
} from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Activity Evidence - Admin' }

const TYPE_LABELS: Record<PlatformActivity['type'], string> = {
  booking: 'Booking',
  inquiry: 'Inquiry',
  event_transition: 'Event update',
  recipe: 'Recipe',
  menu: 'Menu',
  client: 'Client',
  payment: 'Payment',
  chef_signup: 'Chef signup',
  onboarding: 'Onboarding',
}

const TYPE_ICONS: Record<PlatformActivity['type'], typeof Activity> = {
  booking: Inbox,
  inquiry: Inbox,
  event_transition: CalendarRange,
  recipe: Activity,
  menu: Activity,
  client: UserCheck,
  payment: ShieldCheck,
  chef_signup: UserCheck,
  onboarding: ShieldCheck,
}

function relativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime()
  if (!Number.isFinite(timestamp)) return 'Unknown time'

  const diffMinutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`

  return new Date(isoDate).toLocaleDateString()
}

function valueFromMetadata(item: PlatformActivity, key: string): string | null {
  const value = item.metadata[key]
  if (typeof value === 'string' && value.trim().length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function ActivityEvidenceRow({ item }: { item: PlatformActivity }) {
  const Icon = TYPE_ICONS[item.type] ?? Activity
  const provenance = valueFromMetadata(item, 'provenance_label')
  const guestCount = valueFromMetadata(item, 'guest_count')
  const location = valueFromMetadata(item, 'location')

  return (
    <article className="rounded-lg border border-stone-800 bg-stone-950/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-900 ring-1 ring-stone-800">
            <Icon className="h-4 w-4 text-brand-300" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs font-medium text-stone-300">
                {TYPE_LABELS[item.type]}
              </span>
              {item.is_local ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-950 px-2 py-0.5 text-xs font-medium text-orange-200">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  Local
                </span>
              ) : null}
              <span className="text-xs text-stone-500">{relativeTime(item.timestamp)}</span>
            </div>
            <h2 className="mt-2 text-sm font-semibold text-stone-100">{item.summary}</h2>
            <p className="mt-1 text-xs text-stone-500">Chef: {item.chef_name}</p>
          </div>
        </div>

        {item.link ? (
          <Link
            href={item.link}
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-stone-700 px-3 text-xs font-medium text-stone-200 transition-colors hover:border-brand-700 hover:bg-stone-900 hover:text-brand-200"
          >
            Open source
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 text-xs text-stone-400 sm:grid-cols-3">
        <div className="rounded-lg bg-stone-900 p-3">
          <p className="font-semibold uppercase text-stone-500">Source</p>
          <p className="mt-1 text-stone-200">{provenance ?? item.type}</p>
        </div>
        <div className="rounded-lg bg-stone-900 p-3">
          <p className="font-semibold uppercase text-stone-500">Guests</p>
          <p className="mt-1 text-stone-200">{guestCount ?? 'Not captured'}</p>
        </div>
        <div className="rounded-lg bg-stone-900 p-3">
          <p className="font-semibold uppercase text-stone-500">Location</p>
          <p className="mt-1 text-stone-200">{location ?? 'Not captured'}</p>
        </div>
      </div>
    </article>
  )
}

export default async function AdminActivityEvidencePage() {
  await requireAdmin()

  const [bookingFeed, inquiryFeed] = await Promise.all([
    getPlatformActivityFeed({ limit: 50, types: ['booking'] }),
    getPlatformActivityFeed({ limit: 25, types: ['inquiry'] }),
  ])

  const bookingItems = bookingFeed.items
  const attributedBookingCount = bookingItems.filter((item) => {
    const key = valueFromMetadata(item, 'provenance_key')
    return key !== null && key !== 'unknown'
  }).length
  const localBookingCount = bookingItems.filter((item) => item.is_local).length
  const latestBooking = bookingItems[0] ?? null
  const evidenceItems = [...bookingItems, ...inquiryFeed.items]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 40)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-800 bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-200">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Readiness evidence
          </div>
          <h1 className="text-2xl font-bold text-stone-100">Activity Evidence</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
            Admin drill-down for public booking, source attribution, and inquiry evidence used by
            the launch-readiness acquisition checks.
          </p>
        </div>
        <Link
          href="/admin/pulse"
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-stone-700 px-3 text-sm font-medium text-stone-200 transition-colors hover:border-brand-700 hover:bg-stone-900 hover:text-brand-200"
        >
          Open platform pulse
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Open bookings</p>
          <p className="mt-2 text-3xl font-bold text-stone-100">{bookingItems.length}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Attributed bookings</p>
          <p className="mt-2 text-3xl font-bold text-stone-100">{attributedBookingCount}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Local matches</p>
          <p className="mt-2 text-3xl font-bold text-stone-100">{localBookingCount}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">Latest booking</p>
          <p className="mt-2 text-lg font-bold text-stone-100">
            {latestBooking ? relativeTime(latestBooking.timestamp) : 'None'}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 bg-stone-900/70 p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-100">Acquisition Activity</h2>
            <p className="mt-1 text-sm text-stone-500">
              Recent open-booking and inquiry records, ordered by source timestamp.
            </p>
          </div>
          <p className="text-xs text-stone-500">{evidenceItems.length} records shown</p>
        </div>

        <div className="mt-4 grid gap-3">
          {evidenceItems.map((item) => (
            <ActivityEvidenceRow key={item.id} item={item} />
          ))}
          {evidenceItems.length === 0 ? (
            <div className="rounded-lg border border-stone-800 bg-stone-950 p-8 text-center">
              <p className="text-sm font-medium text-stone-200">No acquisition activity yet</p>
              <p className="mt-2 text-sm text-stone-500">
                Send a pilot visitor through public booking, then return here to verify the source
                trail.
              </p>
              <Link href="/book" className="mt-4 inline-flex text-sm font-medium text-brand-400">
                Open booking page
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

// Admin Platform Pulse - unified activity feed + vitals sidebar
// The "master eye" view: everything happening across all chefs, in real time.

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import {
  getPlatformActivityFeed,
  getPlatformVitals,
  type PlatformActivity,
  type VitalsSummary,
} from '@/lib/admin/activity-feed'
import Link from 'next/link'
import {
  Activity,
  CalendarRange,
  Users,
  DollarSign,
  Inbox,
  Eye,
  BookOpen,
  MapPin,
  Zap,
  UserCheck,
} from '@/components/ui/icons'

// ---------------------------------------------------------------------------
// Activity type config
// ---------------------------------------------------------------------------

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  booking: Inbox,
  inquiry: Inbox,
  event_transition: CalendarRange,
  recipe: BookOpen,
  menu: BookOpen,
  client: UserCheck,
  payment: DollarSign,
  chef_signup: Users,
  onboarding: Zap,
}

const ACTIVITY_COLORS: Record<string, string> = {
  booking: 'text-orange-400',
  inquiry: 'text-blue-400',
  event_transition: 'text-purple-400',
  recipe: 'text-emerald-400',
  menu: 'text-emerald-400',
  client: 'text-sky-400',
  payment: 'text-green-400',
  chef_signup: 'text-yellow-400',
  onboarding: 'text-pink-400',
}

const ACTIVITY_LABELS: Record<string, string> = {
  booking: 'Booking',
  inquiry: 'Inquiry',
  event_transition: 'Event Update',
  recipe: 'Recipe',
  menu: 'Menu',
  client: 'Client',
  payment: 'Payment',
  chef_signup: 'Chef Signup',
  onboarding: 'Onboarding',
}

// ---------------------------------------------------------------------------
// Helper: relative time
// ---------------------------------------------------------------------------

function relativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(isoDate).toLocaleDateString()
}

function formatCents(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActivityCard({ item }: { item: PlatformActivity }) {
  const Icon = ACTIVITY_ICONS[item.type] || Activity
  const colorClass = ACTIVITY_COLORS[item.type] || 'text-stone-400'
  const label = ACTIVITY_LABELS[item.type] || item.type

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border bg-stone-900/60 px-4 py-3 ${
        item.is_local
          ? 'border-l-4 border-l-orange-500 border-t-stone-700 border-r-stone-700 border-b-stone-700'
          : 'border-stone-700'
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-stone-400">{relativeTime(item.timestamp)}</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              item.type === 'booking'
                ? 'bg-orange-900/50 text-orange-300'
                : item.type === 'payment'
                  ? 'bg-green-900/50 text-green-300'
                  : 'bg-stone-800 text-stone-400'
            }`}
          >
            {label}
          </span>
          {item.is_local && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-900/40 px-2 py-0.5 text-[10px] font-medium text-orange-300">
              <MapPin size={10} /> In Your Area
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-stone-200">{item.summary}</p>
        <p className="mt-0.5 text-xs text-stone-500">
          Chef:{' '}
          <Link href="/admin/users" className="hover:text-stone-300">
            {item.chef_name}
          </Link>
        </p>
      </div>
      {item.link && (
        <Link
          href={item.link}
          className="flex-shrink-0 rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700 transition-colors"
        >
          View
        </Link>
      )}
    </div>
  )
}

function VitalCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: typeof Activity
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-900/60 px-4 py-3">
      <div className="text-stone-500">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-lg font-bold text-stone-100">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  )
}

function VitalsSidebar({ vitals }: { vitals: VitalsSummary }) {
  return (
    <div className="space-y-4">
      {/* Today's Activity */}
      <div>
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Today</h3>
        <div className="grid grid-cols-2 gap-2">
          <VitalCard label="Bookings" value={vitals.todayBookings} icon={Inbox} />
          <VitalCard label="Inquiries" value={vitals.todayInquiries} icon={Inbox} />
          <VitalCard label="Events" value={vitals.todayEvents} icon={CalendarRange} />
          <VitalCard label="Unmatched" value={vitals.unmatchedBookings} icon={Eye} />
        </div>
      </div>

      {/* Chef Leaderboard */}
      <div>
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
          Top Chefs (30 days)
        </h3>
        <div className="rounded-xl border border-stone-700 bg-stone-900/60 divide-y divide-stone-800">
          {vitals.topChefs.length === 0 && (
            <p className="px-4 py-3 text-xs text-stone-500">No chef activity yet</p>
          )}
          {vitals.topChefs.map((chef) => (
            <div key={chef.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm text-stone-200">{chef.name}</p>
                <p className="text-xs text-stone-500">
                  {chef.eventCount} event{chef.eventCount !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-sm font-medium text-green-400">
                {formatCents(chef.revenueCents)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Chefs */}
      <div>
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
          Quiet Chefs (14+ days)
        </h3>
        <div className="rounded-xl border border-stone-700 bg-stone-900/60 divide-y divide-stone-800">
          {vitals.quietChefs.length === 0 && (
            <p className="px-4 py-3 text-xs text-stone-500">All chefs are active</p>
          )}
          {vitals.quietChefs.slice(0, 5).map((chef) => (
            <div key={chef.id} className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-stone-300">{chef.name}</p>
              <span className="text-xs text-stone-500">
                {chef.lastActive ? relativeTime(chef.lastActive) : 'Never'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const params = await searchParams
  const typeFilter = typeof params.types === 'string' ? params.types.split(',').filter(Boolean) : []
  const chefId = typeof params.chef === 'string' ? params.chef : undefined
  const localOnly = params.local === 'true'
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)
  const pageSize = 50
  const offset = (page - 1) * pageSize

  // Load feed and vitals in parallel
  let feed = null
  let vitals = null
  let feedError = false
  let vitalsError = false

  try {
    ;[feed, vitals] = await Promise.all([
      getPlatformActivityFeed({
        limit: pageSize,
        offset,
        types: typeFilter.length > 0 ? typeFilter : undefined,
        chefId,
        localOnly,
      }),
      getPlatformVitals(),
    ])
  } catch (err) {
    console.error('[Pulse] Failed to load:', err)
    // Try individually so one failure doesn't kill both
    try {
      feed = await getPlatformActivityFeed({
        limit: pageSize,
        offset,
        types: typeFilter.length > 0 ? typeFilter : undefined,
        chefId,
        localOnly,
      })
    } catch {
      feedError = true
    }
    try {
      vitals = await getPlatformVitals()
    } catch {
      vitalsError = true
    }
  }

  const allTypes = [
    'booking',
    'inquiry',
    'event_transition',
    'recipe',
    'menu',
    'client',
    'payment',
    'chef_signup',
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Platform Pulse</h1>
        <p className="text-sm text-stone-500 mt-1">
          Live activity feed across all chefs. Local bookings are highlighted.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-700 bg-stone-900/60 px-4 py-3">
        <span className="text-xs font-medium text-stone-400">Filters:</span>
        {allTypes.map((t) => {
          const isActive = typeFilter.length === 0 || typeFilter.includes(t)
          const toggleTypes =
            typeFilter.length === 0
              ? allTypes.filter((x) => x !== t)
              : typeFilter.includes(t)
                ? typeFilter.filter((x) => x !== t)
                : [...typeFilter, t]
          const href =
            toggleTypes.length === 0 || toggleTypes.length === allTypes.length
              ? `/admin/pulse?${localOnly ? 'local=true' : ''}`
              : `/admin/pulse?types=${toggleTypes.join(',')}${localOnly ? '&local=true' : ''}`

          return (
            <Link
              key={t}
              href={href}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'bg-stone-700 text-stone-200'
                  : 'bg-stone-800/50 text-stone-500 hover:text-stone-300'
              }`}
            >
              {ACTIVITY_LABELS[t] || t}
            </Link>
          )
        })}
        <span className="mx-1 text-stone-700">|</span>
        <Link
          href={`/admin/pulse?${typeFilter.length > 0 ? `types=${typeFilter.join(',')}&` : ''}local=${!localOnly}`}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            localOnly
              ? 'bg-orange-900/50 text-orange-300'
              : 'bg-stone-800/50 text-stone-500 hover:text-stone-300'
          }`}
        >
          <MapPin size={10} className="inline mr-1" />
          Local Only
        </Link>
      </div>

      {/* Main layout: feed + vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Activity feed */}
        <div className="space-y-2">
          {feedError && (
            <div className="rounded-xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              Could not load platform activity. Check server logs.
            </div>
          )}

          {feed && feed.items.length === 0 && (
            <div className="rounded-xl border border-stone-700 bg-stone-900/60 px-6 py-10 text-center">
              <Activity size={32} className="mx-auto text-stone-600 mb-3" />
              <p className="text-sm text-stone-400">
                No activity yet. Bookings and chef activity will appear here as they happen.
              </p>
            </div>
          )}

          {feed && feed.items.map((item) => <ActivityCard key={item.id} item={item} />)}

          {/* Pagination */}
          {feed && feed.total > pageSize && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-stone-500">
                Showing {offset + 1}-{Math.min(offset + pageSize, feed.total)} of {feed.total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/pulse?page=${page - 1}${typeFilter.length > 0 ? `&types=${typeFilter.join(',')}` : ''}${localOnly ? '&local=true' : ''}`}
                    className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                  >
                    Previous
                  </Link>
                )}
                {offset + pageSize < feed.total && (
                  <Link
                    href={`/admin/pulse?page=${page + 1}${typeFilter.length > 0 ? `&types=${typeFilter.join(',')}` : ''}${localOnly ? '&local=true' : ''}`}
                    className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vitals sidebar */}
        <div>
          {vitalsError && (
            <div className="rounded-xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              Could not load vitals. Check server logs.
            </div>
          )}
          {vitals && <VitalsSidebar vitals={vitals} />}
        </div>
      </div>
    </div>
  )
}

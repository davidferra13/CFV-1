import { requireChef } from '@/lib/auth/get-user'
import Link from 'next/link'
import { Compass, CalendarDays, MapPin, Users } from '@/components/ui/icons'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import { getAccountLocation } from '@/lib/location/account-location'
import { createServerClient } from '@/lib/db/server'

async function fetchPreviews(tenantId: string | null) {
  const [chefsResult, locationResult, eventsResult] = await Promise.all([
    getDiscoverableChefs().catch(() => null),
    getAccountLocation().catch(() => null),
    (async () => {
      try {
        if (!tenantId) return null
        const db = createServerClient({ admin: true })
        const { count, error } = await db
          .from('events')
          .select('id', { count: 'exact', head: true })
          .neq('tenant_id', tenantId)
          .gte('event_date', new Date().toISOString().split('T')[0])
        if (error) return null
        return count ?? 0
      } catch {
        return null
      }
    })(),
  ])

  const chefCount = chefsResult ? chefsResult.length : null
  const location = locationResult
  const upcomingEvents = eventsResult as number | null

  return { chefCount, location, upcomingEvents }
}

export default async function ExplorePage() {
  const user = await requireChef()
  const { chefCount, location, upcomingEvents } = await fetchPreviews(user.tenantId)

  const locationLabel =
    location?.city && location?.state
      ? `Near ${location.city}, ${location.state}`
      : 'Set your location'

  const sections = [
    {
      href: '/explore/discover',
      label: 'Discover',
      description: 'Browse food, chefs, and experiences nearby',
      icon: Compass,
      preview: chefCount != null ? `${chefCount} experiences nearby` : 'Browse the directory',
    },
    {
      href: '/explore/book',
      label: 'Book',
      description: 'Hire another chef for your next event',
      icon: Users,
      preview: chefCount != null ? `${chefCount} chefs available` : 'Browse the directory',
    },
    {
      href: '/explore/events',
      label: 'Events',
      description: 'Find ticketed dinners and pop-ups to attend',
      icon: CalendarDays,
      preview:
        upcomingEvents != null && upcomingEvents > 0
          ? `${upcomingEvents} upcoming event${upcomingEvents === 1 ? '' : 's'}`
          : 'No upcoming events',
    },
    {
      href: '/explore/local',
      label: 'Local',
      description: 'Markets, food trucks, and shops near you',
      icon: MapPin,
      preview: locationLabel,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Explore</h1>
        <p className="text-stone-400 mt-1">Browse food, chefs, and experiences</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-stone-800 bg-stone-900/50 p-6 hover:border-stone-600 hover:bg-stone-900 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <s.icon className="h-5 w-5 text-stone-400 group-hover:text-amber-400 transition-colors" />
              <h2 className="text-lg font-semibold text-stone-100">{s.label}</h2>
            </div>
            <p className="text-sm text-stone-400">{s.description}</p>
            <p className="text-sm text-stone-500 mt-1">{s.preview}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { getConnectedChefsActivity } from '@/lib/network/activity/queries'
import type { ConnectedChefActivity } from '@/lib/network/activity/queries'

// ---------------------------------------------------------------------------
// Network Activity: horizontal scroll of connected chefs with upcoming events.
// Server component. Returns null when no connected chefs have activity.
// ---------------------------------------------------------------------------

function ChefInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)
  return (
    <div className="h-10 w-10 shrink-0 rounded-full bg-amber-500 flex items-center justify-center text-stone-950 text-sm font-semibold uppercase">
      {initials}
    </div>
  )
}

function ChefAvatar({ chef }: { chef: ConnectedChefActivity }) {
  const name = chef.displayName || chef.businessName
  if (chef.profileImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={chef.profileImageUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    )
  }
  return <ChefInitials name={name} />
}

function ActivityCard({ chef }: { chef: ConnectedChefActivity }) {
  const name = chef.displayName || chef.businessName
  const dinnerLabel =
    chef.upcomingEventCount === 1
      ? '1 dinner coming up'
      : `${chef.upcomingEventCount} dinners coming up`

  return (
    <div className="min-w-[200px] max-w-[240px] shrink-0 rounded-lg border border-stone-700/50 bg-stone-900/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ChefAvatar chef={chef} />
        <span className="text-sm font-medium text-stone-100 truncate">{name}</span>
      </div>

      <p className="text-xs text-stone-400">{dinnerLabel}</p>

      {chef.streakWeeks > 2 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          {chef.streakWeeks}-week streak
        </span>
      )}

      {chef.busiestDay && <p className="text-[11px] text-stone-500">Busiest: {chef.busiestDay}</p>}
    </div>
  )
}

export async function NetworkActivitySection({ chefId }: { chefId: string }) {
  let activity: ConnectedChefActivity[]
  try {
    activity = await getConnectedChefsActivity(chefId)
  } catch {
    return null
  }

  if (!activity || activity.length === 0) return null

  return (
    <section>
      <h2 className="text-sm font-medium text-stone-400 mb-3">Network Activity</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-stone-900 scrollbar-thumb-stone-700">
        {activity.map((chef) => (
          <ActivityCard key={chef.chefId} chef={chef} />
        ))}
      </div>
    </section>
  )
}

import { getConnectedChefsActivity, getOwnSnapshot } from '@/lib/network/activity/queries'
import type { ConnectedChefActivity } from '@/lib/network/activity/queries'
import Link from 'next/link'

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

function AgingIndicator({ updatedAt }: { updatedAt: string }) {
  const ageMs = Date.now() - new Date(updatedAt).getTime()
  const ageHours = ageMs / (1000 * 60 * 60)

  if (ageHours < 24) return null

  const ageDays = Math.floor(ageHours / 24)
  return (
    <p className="text-[10px] text-stone-600">
      Updated {ageDays === 1 ? '1 day' : `${ageDays} days`} ago
    </p>
  )
}

interface ActionButtonsProps {
  chef: ConnectedChefActivity
  viewerUpcoming: number
  viewerAvg: number
}

function ActionButtons({ chef, viewerUpcoming, viewerAvg }: ActionButtonsProps) {
  const connAvg = chef.avgWeeklyEvents
  const viewerBusy = viewerAvg > 0 && viewerUpcoming > viewerAvg * 1.5
  const connHasCapacity = connAvg > 0 && chef.upcomingEventCount < connAvg * 0.5

  const showRefer = viewerBusy && connHasCapacity

  return (
    <div className="flex items-center gap-1.5 pt-1">
      <Link
        href={`/network/messages/${chef.chefId}`}
        className="text-[10px] px-2 py-0.5 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-colors"
      >
        Message
      </Link>
      {showRefer && (
        <Link
          href={`/network/messages/${chef.chefId}?template=referral`}
          className="text-[10px] px-2 py-0.5 rounded border border-amber-700/50 text-amber-400 hover:text-amber-300 hover:border-amber-600 transition-colors"
        >
          Refer a client
        </Link>
      )}
    </div>
  )
}

function ActivityCard({
  chef,
  viewerUpcoming,
  viewerAvg,
}: {
  chef: ConnectedChefActivity
  viewerUpcoming: number
  viewerAvg: number
}) {
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

      <AgingIndicator updatedAt={chef.updatedAt} />

      <ActionButtons chef={chef} viewerUpcoming={viewerUpcoming} viewerAvg={viewerAvg} />
    </div>
  )
}

function EmptyState({ connectionCount }: { connectionCount: number }) {
  if (connectionCount === 0) {
    return (
      <p className="text-sm text-stone-500">
        Your network is quiet. When connections share their activity, you&apos;ll see it here.
      </p>
    )
  }
  return (
    <p className="text-sm text-stone-500">
      No connections are sharing activity right now. When they do, you&apos;ll see it here.
    </p>
  )
}

export async function NetworkActivitySection({ chefId }: { chefId: string }) {
  let activity: ConnectedChefActivity[]
  let ownSnap: { upcomingEventCount: number; avgWeeklyEvents: number } | null = null

  try {
    ;[activity, ownSnap] = await Promise.all([
      getConnectedChefsActivity(chefId),
      getOwnSnapshot(chefId),
    ])
  } catch {
    return null
  }

  const viewerUpcoming = ownSnap?.upcomingEventCount ?? 0
  const viewerAvg = ownSnap?.avgWeeklyEvents ?? 0

  if (!activity || activity.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium text-stone-400 mb-3">Network Activity</h2>
        <EmptyState connectionCount={0} />
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-stone-400 mb-3">Network Activity</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-stone-900 scrollbar-thumb-stone-700">
        {activity.map((chef) => (
          <ActivityCard
            key={chef.chefId}
            chef={chef}
            viewerUpcoming={viewerUpcoming}
            viewerAvg={viewerAvg}
          />
        ))}
      </div>
    </section>
  )
}

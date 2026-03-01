'use client'

import { Card } from '@/components/ui/card'

interface HubStats {
  totalProfiles: number
  totalGroups: number
  activeGroups: number
  totalMessages: number
  totalMedia: number
  stubsSeekingChef: number
  recentActivity: {
    id: string
    group_name: string
    message_preview: string
    author_name: string
    created_at: string
  }[]
}

interface EventStubLead {
  id: string
  title: string
  occasion: string | null
  event_date: string | null
  guest_count: number | null
  location_text: string | null
  notes: string | null
  created_at: string
  created_by_name: string
  group_member_count: number
}

interface HubOverviewClientProps {
  stats: HubStats
  stubs: EventStubLead[]
}

export function HubOverviewClient({ stats, stubs }: HubOverviewClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Social Event Hub</h1>
        <p className="mt-1 text-sm text-stone-400">
          Overview of guest activity, groups, and event planning
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Guest Profiles" value={stats.totalProfiles} emoji="👤" />
        <StatCard label="Total Groups" value={stats.totalGroups} emoji="👥" />
        <StatCard label="Active Groups" value={stats.activeGroups} emoji="💬" />
        <StatCard label="Messages" value={stats.totalMessages} emoji="✉️" />
        <StatCard label="Photos" value={stats.totalMedia} emoji="📸" />
        <StatCard
          label="Seeking Chef"
          value={stats.stubsSeekingChef}
          emoji="🔍"
          highlight={stats.stubsSeekingChef > 0}
        />
      </div>

      {/* Event Stubs Seeking Chef — Lead Pipeline */}
      {stubs.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-stone-200">Event Stubs Seeking a Chef</h2>
          <div className="space-y-3">
            {stubs.map((stub) => (
              <Card key={stub.id} className="border-stone-800 bg-stone-900/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-200">{stub.title}</h3>
                    <p className="mt-0.5 text-xs text-stone-500">
                      by {stub.created_by_name} &middot; {stub.group_member_count} member
                      {stub.group_member_count !== 1 ? 's' : ''}
                    </p>
                    {stub.notes && (
                      <p className="mt-1 text-xs text-stone-400 line-clamp-2">{stub.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {stub.event_date && (
                      <div className="text-xs text-stone-400">
                        {new Date(stub.event_date).toLocaleDateString()}
                      </div>
                    )}
                    {stub.occasion && (
                      <span className="mt-1 inline-block rounded-full bg-[#e88f47]/10 px-2 py-0.5 text-xs text-[#e88f47]">
                        {stub.occasion}
                      </span>
                    )}
                    {stub.guest_count && (
                      <div className="mt-1 text-xs text-stone-500">
                        {stub.guest_count} guest{stub.guest_count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                {stub.location_text && (
                  <p className="mt-2 text-xs text-stone-500">📍 {stub.location_text}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-stone-200">Recent Hub Activity</h2>
        {stats.recentActivity.length === 0 ? (
          <Card className="border-stone-800 bg-stone-900/50 p-8 text-center">
            <p className="text-sm text-stone-500">No hub activity yet</p>
          </Card>
        ) : (
          <Card className="divide-y divide-stone-800 border-stone-800 bg-stone-900/50">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 text-xs font-medium text-stone-400">
                  {activity.author_name[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-stone-300">
                    <span className="font-medium text-stone-200">{activity.author_name}</span>
                    {' in '}
                    <span className="text-stone-400">{activity.group_name}</span>
                  </p>
                  <p className="truncate text-xs text-stone-500">{activity.message_preview}</p>
                </div>
                <div className="text-xs text-stone-600">
                  {new Date(activity.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  emoji,
  highlight,
}: {
  label: string
  value: number
  emoji: string
  highlight?: boolean
}) {
  return (
    <Card
      className={`border-stone-800 p-4 text-center ${
        highlight ? 'bg-[#e88f47]/5 border-[#e88f47]/30' : 'bg-stone-900/50'
      }`}
    >
      <div className="text-2xl">{emoji}</div>
      <div className={`mt-1 text-xl font-bold ${highlight ? 'text-[#e88f47]' : 'text-stone-200'}`}>
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-xs text-stone-500">{label}</div>
    </Card>
  )
}

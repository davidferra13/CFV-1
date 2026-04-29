import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { getRecentClientCommunications } from '@/lib/clients/recent-communications'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Client Communication' }

const TOOLS = [
  {
    href: '/clients/communication/notes',
    label: 'Notes',
    description: 'Private notes and context attached to each client',
    icon: '📝',
  },
  {
    href: '/clients/communication/follow-ups',
    label: 'Follow-Ups',
    description: 'Scheduled reminders to reach back out to clients',
    icon: '🔔',
  },
  {
    href: '/clients/communication/upcoming-touchpoints',
    label: 'Upcoming Touchpoints',
    description: 'Calendar view of planned client check-ins and outreach',
    icon: '📅',
  },
  {
    href: '/events/upcoming',
    label: 'Pre-Event Communication',
    description: 'Review upcoming events and prep client outreach before service',
    icon: 'EV',
  },
  {
    href: '/settings/touchpoints',
    label: 'Touchpoint Cadence',
    description: 'Manage reusable outreach timing for client check-ins',
    icon: 'TC',
  },
]

function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
  })
}

export default async function ClientCommunicationPage() {
  await requireChef()
  const [clients, recentCommunications] = await Promise.all([
    getClientsWithStats(),
    getRecentClientCommunications(10),
  ])

  const recentClients = [...clients]
    .sort((a, b) => {
      const aDate = a.lastEventDate ? new Date(a.lastEventDate).getTime() : 0
      const bDate = b.lastEventDate ? new Date(b.lastEventDate).getTime() : 0
      return bDate - aDate
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          ← Clients
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Communication</h1>
        <p className="text-stone-500 mt-1">
          Notes, follow-ups, and touchpoints across your clientele
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="text-2xl mb-2">{tool.icon}</div>
              <h2 className="font-semibold text-stone-100">{tool.label}</h2>
              <p className="text-sm text-stone-500 mt-1">{tool.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-300">Recent Communications</h2>
            <p className="text-xs text-stone-500 mt-1">
              Latest messages, notes, and follow-ups across active client records
            </p>
          </div>
          <Link
            href="/clients/communication/notes"
            className="shrink-0 text-xs font-medium text-brand-500 hover:text-brand-400"
          >
            Notes
          </Link>
        </div>

        {recentCommunications.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">
            No client communications recorded yet
          </p>
        ) : (
          <div className="divide-y divide-stone-800">
            {recentCommunications.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start justify-between gap-4 py-3 hover:bg-stone-900"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-stone-800 px-1.5 py-0.5 text-xxs font-medium text-stone-300">
                      {item.badge}
                    </span>
                    <span className="truncate text-sm font-medium text-stone-100">
                      {item.clientName}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-300">{item.summary}</p>
                  {item.detail ? (
                    <p className="mt-0.5 truncate text-xs text-stone-500">{item.detail}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-stone-400">
                  {formatActivityDate(item.occurredAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {recentClients.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-stone-300 mb-3">Recently Active Clients</h2>
          <div className="space-y-2">
            {recentClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0"
              >
                <div>
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-medium text-stone-100 hover:text-brand-600"
                  >
                    {client.full_name}
                  </Link>
                  {client.lastEventDate && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      Last event: {new Date(client.lastEventDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="text-xs text-stone-400">{client.totalEvents} events</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

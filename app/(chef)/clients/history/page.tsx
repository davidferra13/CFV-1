import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Client History - ChefFlow' }

const VIEWS = [
  {
    href: '/clients/history/event-history',
    label: 'Event History',
    description: 'Complete timeline of all past events across every client',
    icon: '📋',
  },
  {
    href: '/clients/history/past-menus',
    label: 'Past Menus',
    description: 'Menus you have served to clients — searchable by client or dish',
    icon: '🍽️',
  },
  {
    href: '/clients/history/spending-history',
    label: 'Spending History',
    description: 'Lifetime spend per client with trend data',
    icon: '💰',
  },
]

export default async function ClientHistoryPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const totalEvents = clients.reduce((sum: any, c: any) => sum + (c.totalEvents ?? 0), 0)
  const totalRevenue = clients.reduce((sum: any, c: any) => sum + (c.totalSpentCents ?? 0), 0)
  const clientsWithEvents = clients.filter((c: any) => (c.totalEvents ?? 0) > 0).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          ← Clients
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Client History</h1>
        <p className="text-stone-500 mt-1">
          A complete record of events, menus, and spending across your clientele
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{totalEvents}</p>
          <p className="text-sm text-stone-500 mt-1">Total events completed</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-200">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Lifetime client revenue</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-200">{clientsWithEvents}</p>
          <p className="text-sm text-stone-500 mt-1">Clients with past events</p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {VIEWS.map((view) => (
          <Link key={view.href} href={view.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="text-2xl mb-2">{view.icon}</div>
              <h2 className="font-semibold text-stone-100">{view.label}</h2>
              <p className="text-sm text-stone-500 mt-1">{view.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

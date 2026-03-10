// All Communications (U18)
// Shows recent communications across all clients.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Settings,
  Star,
  ShoppingCart,
  CalendarDays,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
} from 'lucide-react'
import {
  getRecentCommunications,
  getCommunicationStats,
} from '@/lib/communications/comm-log-actions'
import { CommStatsCards } from '@/components/communications/comm-stats'

export const metadata: Metadata = { title: 'Communications - ChefFlow' }

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  phone: Phone,
  note: StickyNote,
  system: Settings,
  feedback: Star,
  order: ShoppingCart,
  event: CalendarDays,
}

const CHANNEL_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  email: 'info',
  sms: 'success',
  phone: 'default',
  note: 'default',
  system: 'default',
  feedback: 'warning',
  order: 'warning',
  event: 'info',
}

const DIR_ICON: Record<string, typeof ArrowDownLeft> = {
  inbound: ArrowDownLeft,
  outbound: ArrowUpRight,
  internal: ArrowRightLeft,
}

export default async function AllCommunicationsPage() {
  await requireChef()

  const [recent, stats] = await Promise.all([
    getRecentCommunications(30, 100),
    getCommunicationStats(),
  ])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="container mx-auto max-w-4xl py-6 space-y-6">
      <h1 className="text-2xl font-bold">Communications</h1>
      <p className="text-muted-foreground">
        Recent interactions across all clients (last 30 days).
      </p>

      <CommStatsCards stats={stats} />

      {recent.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No communications in the last 30 days. Log your first interaction from a client page.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recent.map((entry) => {
            const Icon = CHANNEL_ICON[entry.channel] ?? StickyNote
            const DirIcon = DIR_ICON[entry.direction] ?? ArrowRightLeft
            const badgeVariant = CHANNEL_BADGE[entry.channel] ?? 'default'

            return (
              <Card key={entry.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={badgeVariant}>{entry.channel}</Badge>
                          <DirIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">
                            {entry.subject ?? '(no subject)'}
                          </span>
                        </div>
                        {entry.content && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {entry.content.slice(0, 150)}
                          </p>
                        )}
                        {entry.clientId && (
                          <Link
                            href={`/clients/${entry.clientId}/communications`}
                            className="text-xs text-primary hover:underline mt-1 inline-block"
                          >
                            View client timeline
                          </Link>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

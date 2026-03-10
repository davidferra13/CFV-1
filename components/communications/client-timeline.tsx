'use client'

import { useState, useTransition, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
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
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  type CommLogEntry,
  type CommChannel,
  type CommDirection,
  logCommunication,
  getClientTimeline,
  searchCommunications,
} from '@/lib/communications/comm-log-actions'

// ── Channel config ─────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<
  CommChannel,
  {
    icon: typeof Mail
    color: string
    badgeVariant: 'default' | 'success' | 'warning' | 'error' | 'info'
  }
> = {
  email: { icon: Mail, color: 'text-blue-500', badgeVariant: 'info' },
  sms: { icon: MessageSquare, color: 'text-green-500', badgeVariant: 'success' },
  phone: { icon: Phone, color: 'text-purple-500', badgeVariant: 'default' },
  note: { icon: StickyNote, color: 'text-gray-500', badgeVariant: 'default' },
  system: { icon: Settings, color: 'text-gray-400', badgeVariant: 'default' },
  feedback: { icon: Star, color: 'text-yellow-500', badgeVariant: 'warning' },
  order: { icon: ShoppingCart, color: 'text-orange-500', badgeVariant: 'warning' },
  event: { icon: CalendarDays, color: 'text-indigo-500', badgeVariant: 'info' },
}

const DIRECTION_ICONS: Record<CommDirection, typeof ArrowDownLeft> = {
  inbound: ArrowDownLeft,
  outbound: ArrowUpRight,
  internal: ArrowRightLeft,
}

// ── Props ──────────────────────────────────────────────────────────────

interface ClientTimelineProps {
  clientId: string
  initialEntries: CommLogEntry[]
}

// ── Component ──────────────────────────────────────────────────────────

export function ClientTimeline({ clientId, initialEntries }: ClientTimelineProps) {
  const [entries, setEntries] = useState<CommLogEntry[]>(initialEntries)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLogForm, setShowLogForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Log form state
  const [logChannel, setLogChannel] = useState<CommChannel>('phone')
  const [logDirection, setLogDirection] = useState<CommDirection>('outbound')
  const [logSubject, setLogSubject] = useState('')
  const [logContent, setLogContent] = useState('')

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      // Reload full timeline
      startTransition(async () => {
        try {
          const result = await getClientTimeline(clientId)
          setEntries(result)
        } catch {
          toast.error('Failed to load timeline')
        }
      })
      return
    }
    startTransition(async () => {
      try {
        const result = await searchCommunications(searchQuery)
        // Filter to this client
        setEntries(result.filter((e) => e.clientId === clientId))
      } catch {
        toast.error('Search failed')
      }
    })
  }, [searchQuery, clientId])

  const handleLogInteraction = useCallback(() => {
    if (!logSubject.trim()) {
      toast.error('Subject is required')
      return
    }

    const previousEntries = entries
    startTransition(async () => {
      try {
        const result = await logCommunication({
          clientId,
          channel: logChannel,
          direction: logDirection,
          subject: logSubject,
          content: logContent || null,
          loggedBy: 'manual',
        })

        if (!result.success) {
          toast.error(result.error ?? 'Failed to log interaction')
          return
        }

        toast.success('Interaction logged')
        setLogSubject('')
        setLogContent('')
        setShowLogForm(false)

        // Reload timeline
        try {
          const fresh = await getClientTimeline(clientId)
          setEntries(fresh)
        } catch {
          setEntries(previousEntries)
        }
      } catch {
        toast.error('Failed to log interaction')
      }
    })
  }, [clientId, logChannel, logDirection, logSubject, logContent, entries])

  const loadMore = useCallback(() => {
    startTransition(async () => {
      try {
        const more = await getClientTimeline(clientId, 50, entries.length)
        setEntries((prev) => [...prev, ...more])
      } catch {
        toast.error('Failed to load more entries')
      }
    })
  }, [clientId, entries.length])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Top bar: search + log button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search communications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <Button variant="primary" onClick={() => setShowLogForm(!showLogForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Log Interaction
        </Button>
      </div>

      {/* Log interaction form */}
      {showLogForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log an Interaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Channel</label>
                <select
                  value={logChannel}
                  onChange={(e) => setLogChannel(e.target.value as CommChannel)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="phone">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="note">Note</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Direction</label>
                <select
                  value={logDirection}
                  onChange={(e) => setLogDirection(e.target.value as CommDirection)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subject</label>
              <input
                type="text"
                value={logSubject}
                onChange={(e) => setLogSubject(e.target.value)}
                placeholder="Brief summary..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
                placeholder="Details of the interaction..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowLogForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleLogInteraction} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline entries */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No communications found. Log your first interaction above.
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {entries.map((entry) => {
              const config = CHANNEL_CONFIG[entry.channel] ?? CHANNEL_CONFIG.note
              const Icon = config.icon
              const DirIcon = DIRECTION_ICONS[entry.direction] ?? ArrowRightLeft
              const isExpanded = expandedId === entry.id

              return (
                <div key={entry.id} className="relative flex gap-3 pl-1">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content card */}
                  <Card
                    className="flex-1 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={config.badgeVariant}>{entry.channel}</Badge>
                            <DirIcon className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">
                              {entry.subject ?? '(no subject)'}
                            </span>
                          </div>
                          {!isExpanded && entry.content && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {entry.content.slice(0, 120)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(entry.createdAt)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {entry.content && (
                            <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                          )}
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {entry.entityType && <span>Related: {entry.entityType}</span>}
                            {entry.loggedBy && <span>Logged by: {entry.loggedBy}</span>}
                            {entry.metadata &&
                              (entry.metadata as Record<string, unknown>).durationMinutes && (
                                <span>
                                  Duration:{' '}
                                  {(entry.metadata as Record<string, unknown>).durationMinutes} min
                                </span>
                              )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Load more */}
      {entries.length >= 50 && (
        <div className="text-center pt-2">
          <Button variant="ghost" onClick={loadMore} disabled={isPending}>
            {isPending ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  )
}

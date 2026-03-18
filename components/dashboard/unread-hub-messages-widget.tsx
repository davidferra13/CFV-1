// Unread Hub Messages Widget
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { MessageCircle } from '@/components/ui/icons'
import { formatDistanceToNow } from 'date-fns'
import type { UnreadHubGroup } from '@/lib/dashboard/widget-actions'

interface Props {
  groups: UnreadHubGroup[]
}

export function UnreadHubMessagesWidget({ groups }: Props) {
  if (groups.length === 0) return null

  const totalUnread = groups.reduce((sum, g) => sum + g.unreadCount, 0)

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-brand-500 shrink-0" />
        <h3 className="text-sm font-semibold text-stone-100">Hub Messages</h3>
        <span className="ml-auto rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
          {totalUnread}
        </span>
      </div>
      <div className="space-y-2">
        {groups.map((g) => (
          <Link
            key={g.groupId}
            href={`/hub/g/${g.groupId}`}
            className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-1.5 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-stone-100 truncate">{g.groupName}</p>
                <span className="rounded-full bg-brand-900 text-brand-300 px-1.5 py-0.5 text-xxs font-semibold shrink-0">
                  {g.unreadCount}
                </span>
              </div>
              {g.lastMessagePreview && (
                <p className="text-xs text-stone-500 truncate mt-0.5">{g.lastMessagePreview}</p>
              )}
            </div>
            <span className="text-xxs text-stone-500 shrink-0 ml-2">
              {g.lastMessageAt
                ? formatDistanceToNow(new Date(g.lastMessageAt), { addSuffix: true })
                : ''}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-stone-800">
        <Link href="/hub" className="text-xs text-brand-500 hover:text-brand-400 font-medium">
          Open Hub →
        </Link>
      </div>
    </Card>
  )
}

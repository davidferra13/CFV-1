'use client'

// Live Inbox Widget - Real-time message feed on dashboard
// Shows unread messages with inline reply capability

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, MessageSquare, CheckCircle } from '@/components/ui/icons'
import type { UnifiedInboxItem, InboxSource } from '@/lib/inbox/types'

interface Props {
  initialItems: UnifiedInboxItem[]
  tenantId: string
}

const SOURCE_ICONS: Record<InboxSource, typeof Mail> = {
  chat: MessageSquare,
  message: Mail,
  wix: Mail,
  notification: Mail,
}

const SOURCE_LABELS: Record<InboxSource, string> = {
  chat: 'Chat',
  message: 'Message',
  wix: 'Wix Form',
  notification: 'Notification',
}

export function LiveInboxWidget({ initialItems, tenantId }: Props) {
  const [items, setItems] = useState(initialItems)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState<string | null>(null)
  const router = useRouter()

  const unreadCount = items.filter((m) => !m.is_read).length

  // Real-time subscription for new inbox items
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('inbox-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'unified_inbox',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newItem = payload.new as UnifiedInboxItem
          setItems((prev) => [newItem, ...prev.slice(0, 7)])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId])

  async function handleReply(item: UnifiedInboxItem) {
    if (!replyText.trim() || !item.conversation_id) return

    const previous = [...items]
    // Optimistic: mark as read
    setItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, is_read: true } : m)))

    startTransition(async () => {
      try {
        const { sendChatMessage } = await import('@/lib/chat/actions')
        await sendChatMessage({
          conversation_id: item.conversation_id!,
          message_type: 'text',
          body: replyText,
        })
        setReplyText('')
        setExpandedId(null)
        setSent(item.id)
        setTimeout(() => setSent(null), 2000)
        router.refresh()
      } catch (err) {
        setItems(previous)
      }
    })
  }

  if (items.length === 0) {
    return (
      <Card className="border-stone-700">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-stone-400">Inbox clear. All caught up.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-stone-700 ${unreadCount > 0 ? 'border-brand-700' : ''}`}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-stone-200">
            {unreadCount > 0
              ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
              : 'All caught up'}
          </span>
          <Link href="/inbox" className="text-xs text-brand-500 hover:text-brand-400">
            Full inbox
          </Link>
        </div>

        <div className="space-y-1">
          {items.slice(0, 8).map((item) => {
            const Icon = SOURCE_ICONS[item.source]
            const isExpanded = expandedId === item.id

            return (
              <div key={item.id} className={`${item.is_read ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-stone-800 text-left transition-colors"
                >
                  <Icon
                    className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${item.is_read ? 'text-stone-500' : 'text-brand-500'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-medium truncate ${item.is_read ? 'text-stone-400' : 'text-stone-200'}`}
                      >
                        {SOURCE_LABELS[item.source]}
                      </span>
                      {!item.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-stone-400 truncate">
                      {item.preview || 'No preview available'}
                    </p>
                  </div>
                  <span className="text-xxs text-stone-500 shrink-0">
                    {formatDistanceToNow(new Date(item.activity_at), { addSuffix: false })}
                  </span>
                </button>

                {/* Inline reply (only for chat items with a conversation) */}
                {isExpanded && item.conversation_id && (
                  <div
                    className="ml-6 mt-1 mb-2 p-2 bg-stone-800 rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {sent === item.id ? (
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Reply sent
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type a reply..."
                          rows={2}
                          className="flex-1 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 placeholder:text-stone-500 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <Button
                          variant="primary"
                          onClick={() => handleReply(item)}
                          disabled={isPending || !replyText.trim()}
                          className="text-xs self-end"
                        >
                          {isPending ? '...' : 'Send'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Link for non-chat items */}
                {isExpanded && !item.conversation_id && item.inquiry_id && (
                  <div className="ml-6 mt-1 mb-2">
                    <Link
                      href={`/inquiries/${item.inquiry_id}`}
                      className="text-xs text-brand-500 hover:text-brand-400"
                    >
                      Open inquiry
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

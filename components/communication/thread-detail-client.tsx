'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  markCommunicationResolved,
  reopenCommunication,
  snoozeThread,
  toggleThreadStar,
  unsnoozeThread,
  logMessageToThread,
  linkCommunicationEventToInquiry,
  attachCommunicationEventToEvent,
  createInquiryFromCommunicationEvent,
} from '@/lib/communication/actions'
import type { ThreadDetail } from '@/lib/communication/actions'

function sourceLabel(source: string) {
  if (source === 'website_form') return 'Website Form'
  if (source === 'takeachef') return 'TakeAChef'
  if (source === 'manual_log') return 'Manual Log'
  return source.charAt(0).toUpperCase() + source.slice(1)
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ThreadDetailClient({
  detail,
  threadId,
}: {
  detail: ThreadDetail
  threadId: string
}) {
  const { thread, events, linked_inquiry, linked_event, suggestions, primaryEventId } = detail
  const [isPending, startTransition] = useTransition()
  const [replyContent, setReplyContent] = useState('')
  const [replyDirection, setReplyDirection] = useState<'inbound' | 'outbound'>('outbound')
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const displayName = thread.client_name ?? events[0]?.sender_identity ?? 'Unknown'
  const lastEvent = events[events.length - 1]

  const runAction = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  const handleSendReply = () => {
    if (!replyContent.trim()) return
    const content = replyContent
    const direction = replyDirection
    runAction(async () => {
      await logMessageToThread({
        threadId,
        senderIdentity: direction === 'outbound' ? 'Chef' : displayName,
        content,
        direction,
      })
      setReplyContent('')
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/inbox" className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900">{displayName}</h1>
              <button
                type="button"
                onClick={() => runAction(() => toggleThreadStar(threadId, !thread.is_starred))}
                className="text-amber-400 hover:text-amber-300"
                aria-label={thread.is_starred ? 'Unstar' : 'Star'}
              >
                <Star className={`h-4 w-4 ${thread.is_starred ? 'fill-amber-400' : ''}`} />
              </button>
            </div>
            {thread.client_email && (
              <p className="text-sm text-stone-500">{thread.client_email}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {thread.state === 'active' && <Badge className="bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300">Active</Badge>}
          {thread.state === 'snoozed' && <Badge variant="info">Snoozed</Badge>}
          {thread.state === 'closed' && <Badge className="bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-300">Closed</Badge>}

          {linked_inquiry && (
            <Link href={`/inquiries/${linked_inquiry.id}`} className="text-sm text-brand-700 underline">
              {linked_inquiry.title}
            </Link>
          )}
          {linked_event && (
            <Link href={`/events/${linked_event.id}`} className="text-sm text-brand-700 underline">
              {linked_event.title}
            </Link>
          )}

          {thread.state === 'snoozed' ? (
            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => runAction(() => unsnoozeThread(threadId))}>
              Unsnooze
            </Button>
          ) : (
            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => runAction(() => snoozeThread(threadId, 24))}>
              Snooze 24h
            </Button>
          )}

          {lastEvent && (
            lastEvent.status === 'resolved' ? (
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => runAction(() => reopenCommunication(lastEvent.id))}>
                Reopen
              </Button>
            ) : (
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => runAction(() => markCommunicationResolved(lastEvent.id))}>
                Mark Done
              </Button>
            )
          )}
        </div>
      </div>

      {/* Message Timeline */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
            No messages in this thread yet.
          </div>
        ) : events.map((event) => {
          const isOutbound = event.direction === 'outbound'
          return (
            <div key={event.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isOutbound ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-stone-100 text-stone-900 rounded-bl-sm'}`}>
                <div className={`mb-1 flex items-center gap-2 text-xs ${isOutbound ? 'text-indigo-200' : 'text-stone-500'}`}>
                  <span>{event.sender_identity}</span>
                  <span>·</span>
                  <span>{sourceLabel(event.source)}</span>
                  <span>·</span>
                  <span>{formatWhen(event.timestamp)}</span>
                  {event.linked_entity_type && (
                    <>
                      <span>·</span>
                      <span className={isOutbound ? 'text-indigo-300' : 'text-stone-400'}>
                        linked to {event.linked_entity_type}
                      </span>
                    </>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{event.raw_content}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Connections Panel — shown when thread is not linked or has pending suggestions */}
      {(suggestions.length > 0 || (!linked_inquiry && !linked_event && primaryEventId)) && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="text-sm font-medium text-stone-700">Connect this thread</div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-stone-500">Suggested matches</div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => runAction(() =>
                      s.suggested_entity_type === 'inquiry'
                        ? linkCommunicationEventToInquiry(s.communication_event_id, s.suggested_entity_id)
                        : attachCommunicationEventToEvent(s.communication_event_id, s.suggested_entity_id)
                    )}
                  >
                    {s.suggested_entity_type === 'inquiry' ? 'Inquiry' : 'Event'}: {s.entity_title} ({Math.round(s.confidence_score * 100)}%)
                  </Button>
                ))}
              </div>
            </div>
          )}

          {primaryEventId && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => runAction(() => createInquiryFromCommunicationEvent(primaryEventId))}
              >
                + Create Inquiry from this thread
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Reply Bar */}
      <div className="sticky bottom-4 rounded-xl border border-stone-200 bg-white shadow-lg">
        <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-2">
          <span className="text-xs text-stone-500">Log as:</span>
          <button
            type="button"
            onClick={() => setReplyDirection('outbound')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${replyDirection === 'outbound' ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-600'}`}
          >
            Your Reply
          </button>
          <button
            type="button"
            onClick={() => setReplyDirection('inbound')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${replyDirection === 'inbound' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'}`}
          >
            Client Message
          </button>
        </div>
        <div className="flex items-end gap-3 p-3">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={replyDirection === 'outbound' ? 'Log your reply...' : 'Log their message...'}
            rows={3}
            className="flex-1 resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSendReply()
              }
            }}
          />
          <Button
            size="sm"
            variant="primary"
            disabled={isPending || !replyContent.trim()}
            onClick={handleSendReply}
          >
            Log
          </Button>
        </div>
        <p className="pb-2 text-center text-xs text-stone-400">⌘↵ to log · This records the message in ChefFlow only</p>
      </div>
    </div>
  )
}

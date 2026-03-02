'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SourceBadge } from '@/components/communication/source-badge'
import { FormattedCommunicationContent } from '@/components/communication/message-content'
import { Send, ArrowRight } from 'lucide-react'
import {
  markCommunicationResolved,
  reopenCommunication,
  snoozeThread,
  toggleThreadStar,
  unsnoozeThread,
  logMessageToThread,
  sendReplyViaChannel,
  linkCommunicationEventToInquiry,
  attachCommunicationEventToEvent,
  createInquiryFromCommunicationEvent,
} from '@/lib/communication/actions'
import type { ThreadDetail } from '@/lib/communication/actions'

// sourceLabel replaced by SourceBadge component from source-badge.tsx

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
  const {
    thread,
    events,
    systemEvents,
    linked_inquiry,
    linked_event,
    suggestions,
    primaryEventId,
  } = detail
  const [isPending, startTransition] = useTransition()
  const [replyContent, setReplyContent] = useState('')
  const [replyDirection, setReplyDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [replyMode, setReplyMode] = useState<'log' | 'send'>('log')

  // Determine if we can send via a channel
  const primarySource = events[0]?.source ?? 'manual_log'
  const canSendEmail =
    !!thread.client_email &&
    [
      'email',
      'takeachef',
      'yhangry',
      'theknot',
      'thumbtack',
      'bark',
      'cozymeal',
      'google_business',
      'gigsalad',
    ].includes(primarySource)
  // Phone-based sources: check if sender_identity looks like a phone number
  const firstInbound = events.find((e) => e.direction === 'inbound')
  const senderPhone = firstInbound?.sender_identity?.match(/\+?\d[\d\s()-]{8,}/)?.[0] ?? null
  const canSendSms = !!senderPhone && ['sms', 'phone'].includes(primarySource)
  const canSendWhatsApp = !!senderPhone && primarySource === 'whatsapp'
  const canSend = canSendEmail || canSendSms || canSendWhatsApp
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

    if (replyMode === 'send' && direction === 'outbound' && canSend) {
      // Determine channel and recipient
      const channel = canSendEmail ? 'email' : canSendWhatsApp ? 'whatsapp' : 'sms'
      const recipientAddress = canSendEmail ? thread.client_email! : senderPhone!

      runAction(async () => {
        await sendReplyViaChannel({
          threadId,
          content,
          channel,
          recipientAddress,
        })
        setReplyContent('')
      })
    } else {
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
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/inbox" className="text-stone-500 hover:text-stone-300">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-100">{displayName}</h1>
              <button
                type="button"
                onClick={() => runAction(() => toggleThreadStar(threadId, !thread.is_starred))}
                className="text-amber-400 hover:text-amber-300"
                aria-label={thread.is_starred ? 'Unstar' : 'Star'}
              >
                <Star className={`h-4 w-4 ${thread.is_starred ? 'fill-amber-400' : ''}`} />
              </button>
            </div>
            {thread.client_email && <p className="text-sm text-stone-500">{thread.client_email}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {thread.state === 'active' && (
            <Badge className="bg-emerald-900 text-emerald-800 ring-1 ring-inset ring-emerald-300">
              Active
            </Badge>
          )}
          {thread.state === 'snoozed' && <Badge variant="info">Snoozed</Badge>}
          {thread.state === 'closed' && (
            <Badge className="bg-stone-800 text-stone-400 ring-1 ring-inset ring-stone-600">
              Closed
            </Badge>
          )}

          {linked_inquiry && (
            <Link
              href={`/inquiries/${linked_inquiry.id}`}
              className="text-sm text-brand-400 underline"
            >
              {linked_inquiry.title}
            </Link>
          )}
          {linked_event && (
            <Link href={`/events/${linked_event.id}`} className="text-sm text-brand-400 underline">
              {linked_event.title}
            </Link>
          )}

          {thread.state === 'snoozed' ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => runAction(() => unsnoozeThread(threadId))}
            >
              Unsnooze
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => runAction(() => snoozeThread(threadId, 24))}
            >
              Snooze 24h
            </Button>
          )}

          {lastEvent &&
            (lastEvent.status === 'resolved' ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => runAction(() => reopenCommunication(lastEvent.id))}
              >
                Reopen
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => runAction(() => markCommunicationResolved(lastEvent.id))}
              >
                Mark Done
              </Button>
            ))}
        </div>
      </div>

      {/* Unified Timeline — messages + system events interleaved */}
      <div className="space-y-3">
        {events.length === 0 && (systemEvents ?? []).length === 0 ? (
          <div className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-8 text-center text-sm text-stone-500">
            No messages in this thread yet.
          </div>
        ) : (
          (() => {
            // Build a unified timeline of messages and system events
            type TimelineEntry =
              | { kind: 'message'; ts: number; event: (typeof events)[0] }
              | { kind: 'system'; ts: number; sysEvent: NonNullable<typeof systemEvents>[0] }

            const timeline: TimelineEntry[] = []
            for (const event of events) {
              timeline.push({ kind: 'message', ts: new Date(event.timestamp).getTime(), event })
            }
            for (const se of systemEvents ?? []) {
              timeline.push({ kind: 'system', ts: new Date(se.timestamp).getTime(), sysEvent: se })
            }
            timeline.sort((a, b) => a.ts - b.ts)

            return timeline.map((entry) => {
              if (entry.kind === 'system') {
                const se = entry.sysEvent
                const colorClass =
                  se.type === 'inquiry_transition'
                    ? 'border-violet-700/40 text-violet-400'
                    : se.type === 'event_transition'
                      ? 'border-blue-700/40 text-blue-400'
                      : 'border-stone-700/40 text-stone-500'
                return (
                  <div key={se.id} className="flex justify-center">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${colorClass}`}
                    >
                      <span>{se.label}</span>
                      {se.detail && (
                        <>
                          <span className="text-stone-600">·</span>
                          <span className="text-stone-500">{se.detail}</span>
                        </>
                      )}
                      <span className="text-stone-600">·</span>
                      <span className="text-stone-600">{formatWhen(se.timestamp)}</span>
                    </div>
                  </div>
                )
              }

              const event = entry.event
              const isOutbound = event.direction === 'outbound'
              return (
                <div
                  key={event.id}
                  className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isOutbound ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-stone-800 text-stone-100 rounded-bl-sm'}`}
                  >
                    <div
                      className={`mb-1 flex items-center gap-2 text-xs ${isOutbound ? 'text-indigo-200' : 'text-stone-500'}`}
                    >
                      <span>{event.sender_identity}</span>
                      <span>·</span>
                      <SourceBadge source={event.source} size="sm" />
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
                    <FormattedCommunicationContent
                      content={event.raw_content}
                      className={
                        isOutbound
                          ? 'text-sm text-white whitespace-pre-wrap break-words leading-relaxed'
                          : 'text-sm text-stone-100 whitespace-pre-wrap break-words leading-relaxed'
                      }
                      linkClassName={
                        isOutbound
                          ? 'underline underline-offset-2 text-indigo-100 hover:text-white'
                          : 'underline underline-offset-2 text-brand-400 hover:text-brand-300'
                      }
                      quotedContainerClassName={
                        isOutbound
                          ? 'mt-2 rounded-md border border-white/20 bg-indigo-700/50'
                          : 'mt-2 rounded-md border border-stone-700/70 bg-stone-900/70'
                      }
                      quotedSummaryClassName={
                        isOutbound
                          ? 'cursor-pointer select-none px-2 py-1 text-xs text-indigo-100 hover:text-white'
                          : 'cursor-pointer select-none px-2 py-1 text-xs text-stone-400 hover:text-stone-300'
                      }
                      quotedContentClassName={
                        isOutbound
                          ? 'px-2 pb-2 text-xs text-indigo-100 whitespace-pre-wrap break-words leading-relaxed'
                          : 'px-2 pb-2 text-xs text-stone-400 whitespace-pre-wrap break-words leading-relaxed'
                      }
                    />
                  </div>
                </div>
              )
            })
          })()
        )}
        <div ref={bottomRef} />
      </div>

      {/* Connections Panel — shown when thread is not linked or has pending suggestions */}
      {(suggestions.length > 0 || (!linked_inquiry && !linked_event && primaryEventId)) && (
        <div className="rounded-xl border border-stone-700 bg-stone-800 p-4 space-y-3">
          <div className="text-sm font-medium text-stone-300">Connect this thread</div>

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
                    onClick={() =>
                      runAction(() =>
                        s.suggested_entity_type === 'inquiry'
                          ? linkCommunicationEventToInquiry(
                              s.communication_event_id,
                              s.suggested_entity_id
                            )
                          : attachCommunicationEventToEvent(
                              s.communication_event_id,
                              s.suggested_entity_id
                            )
                      )
                    }
                  >
                    {s.suggested_entity_type === 'inquiry' ? 'Inquiry' : 'Event'}: {s.entity_title}{' '}
                    ({Math.round(s.confidence_score * 100)}%)
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
      <div className="sticky bottom-0 sm:bottom-4 rounded-t-xl sm:rounded-xl border border-stone-700 bg-stone-900 shadow-lg">
        <div className="flex items-center gap-2 border-b border-stone-800 px-3 sm:px-4 py-2 overflow-x-auto">
          <span className="text-xs text-stone-500 flex-shrink-0">Log as:</span>
          <button
            type="button"
            onClick={() => setReplyDirection('outbound')}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 sm:py-1 text-xs font-medium ${replyDirection === 'outbound' ? 'bg-indigo-600 text-white' : 'bg-stone-800 text-stone-400'}`}
          >
            Your Reply
          </button>
          <button
            type="button"
            onClick={() => setReplyDirection('inbound')}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 sm:py-1 text-xs font-medium ${replyDirection === 'inbound' ? 'bg-stone-700 text-white' : 'bg-stone-800 text-stone-400'}`}
          >
            Client Message
          </button>
          {canSend && replyDirection === 'outbound' && (
            <>
              <span className="text-stone-700 mx-1">|</span>
              <button
                type="button"
                onClick={() => setReplyMode(replyMode === 'log' ? 'send' : 'log')}
                className={`flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 sm:py-1 text-xs font-medium transition-colors ${
                  replyMode === 'send'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                <Send className="h-3 w-3" />
                {replyMode === 'send' ? 'Send & Log' : 'Log Only'}
              </button>
            </>
          )}
        </div>
        <div className="flex items-end gap-2 sm:gap-3 p-2 sm:p-3">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={
              replyDirection === 'outbound'
                ? replyMode === 'send'
                  ? `Send via ${canSendEmail ? 'email' : canSendWhatsApp ? 'WhatsApp' : 'SMS'}...`
                  : 'Log your reply...'
                : 'Log their message...'
            }
            rows={2}
            className="flex-1 resize-none rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSendReply()
              }
            }}
          />
          <Button
            size="sm"
            variant={
              replyMode === 'send' && replyDirection === 'outbound' ? 'primary' : 'secondary'
            }
            disabled={isPending || !replyContent.trim()}
            onClick={handleSendReply}
          >
            {replyMode === 'send' && replyDirection === 'outbound' ? (
              <span className="flex items-center gap-1">
                <Send className="h-3.5 w-3.5" /> Send
              </span>
            ) : (
              'Log'
            )}
          </Button>
        </div>
        <p className="pb-2 text-center text-xs text-stone-500">
          {replyMode === 'send' && replyDirection === 'outbound' ? (
            <>
              ⌘↵ to send · Delivers via{' '}
              {canSendEmail
                ? `email to ${thread.client_email}`
                : canSendWhatsApp
                  ? 'WhatsApp'
                  : 'SMS'}{' '}
              and logs to ChefFlow
            </>
          ) : (
            <>⌘↵ to log · This records the message in ChefFlow only</>
          )}
        </p>
      </div>
    </div>
  )
}

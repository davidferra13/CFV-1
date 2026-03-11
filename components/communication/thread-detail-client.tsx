'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send, Star } from '@/components/ui/icons'
import { FormattedCommunicationContent } from '@/components/communication/message-content'
import { SourceBadge } from '@/components/communication/source-badge'
import {
  attachCommunicationEventToEvent,
  createInquiryFromCommunicationEvent,
  linkCommunicationEventToInquiry,
  logMessageToThread,
  markCommunicationResolved,
  reopenCommunication,
  sendReplyViaChannel,
  snoozeThread,
  toggleThreadStar,
  unsnoozeThread,
  type ThreadDetail,
} from '@/lib/communication/actions'
import { approveAndSendMessage, createDraftMessage } from '@/lib/gmail/actions'

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
  const [replyMode, setReplyMode] = useState<'log' | 'draft' | 'send'>('log')
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const primarySource = events[0]?.source ?? 'manual_log'
  const firstInbound = events.find((event) => event.direction === 'inbound')
  const senderEmail =
    firstInbound?.sender_identity?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null
  const emailRecipient = thread.client_email || senderEmail
  const canSendEmail =
    !!emailRecipient &&
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
  const senderPhone = firstInbound?.sender_identity?.match(/\+?\d[\d\s()-]{8,}/)?.[0] ?? null
  const canSendSms = !!senderPhone && ['sms', 'phone'].includes(primarySource)
  const canSendWhatsApp = !!senderPhone && primarySource === 'whatsapp'
  const canSend = canSendEmail || canSendSms || canSendWhatsApp
  const displayName = thread.client_name ?? events[0]?.sender_identity ?? 'Unknown'
  const lastEvent = events[events.length - 1]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const runAction = (fn: () => Promise<unknown>, successMessage?: string) => {
    startTransition(async () => {
      try {
        await fn()
        if (successMessage) toast.success(successMessage)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  const handleSendReply = () => {
    const content = replyContent.trim()
    if (!content) return

    if (replyDirection === 'outbound' && canSendEmail && replyMode !== 'log') {
      startTransition(async () => {
        try {
          const draft = await createDraftMessage({
            conversationThreadId: threadId,
            clientId: thread.client_id,
            recipientEmail: emailRecipient,
            body: content,
          })

          if (replyMode === 'send') {
            await approveAndSendMessage(draft.messageId)
            toast.success('Email sent')
          } else {
            toast.success('Email draft saved to approval queue')
          }

          setReplyContent('')
          router.refresh()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Reply failed')
        }
      })
      return
    }

    if (replyDirection === 'outbound' && replyMode === 'send' && (canSendSms || canSendWhatsApp)) {
      const channel = canSendWhatsApp ? 'whatsapp' : 'sms'
      const recipientAddress = senderPhone!

      runAction(async () => {
        await sendReplyViaChannel({
          threadId,
          content,
          channel,
          recipientAddress,
        })
        setReplyContent('')
      }, 'Reply sent')
      return
    }

    runAction(async () => {
      await logMessageToThread({
        threadId,
        senderIdentity: replyDirection === 'outbound' ? 'Chef' : displayName,
        content,
        direction: replyDirection,
      })
      setReplyContent('')
    }, 'Reply logged')
  }

  type TimelineEntry =
    | { kind: 'message'; ts: number; event: (typeof events)[0] }
    | { kind: 'system'; ts: number; sysEvent: NonNullable<typeof systemEvents>[0] }

  const timeline: TimelineEntry[] = [
    ...events.map((event) => ({
      kind: 'message' as const,
      ts: new Date(event.timestamp).getTime(),
      event,
    })),
    ...(systemEvents ?? []).map((sysEvent) => ({
      kind: 'system' as const,
      ts: new Date(sysEvent.timestamp).getTime(),
      sysEvent,
    })),
  ].sort((left, right) => left.ts - right.ts)

  return (
    <div className="space-y-4">
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
            {emailRecipient && <p className="text-sm text-stone-500">{emailRecipient}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {thread.state === 'active' && (
            <Badge className="bg-emerald-900 text-emerald-200 ring-1 ring-inset ring-emerald-300">
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

      <div className="space-y-3">
        {timeline.length === 0 ? (
          <div className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-8 text-center text-sm text-stone-500">
            No messages in this thread yet.
          </div>
        ) : (
          timeline.map((entry) => {
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
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isOutbound ? 'rounded-br-sm bg-indigo-600 text-white' : 'rounded-bl-sm bg-stone-800 text-stone-100'}`}
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
                        ? 'whitespace-pre-wrap break-words text-sm leading-relaxed text-white'
                        : 'whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-100'
                    }
                    linkClassName={
                      isOutbound
                        ? 'text-indigo-100 underline underline-offset-2 hover:text-white'
                        : 'text-brand-400 underline underline-offset-2 hover:text-brand-300'
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
                        ? 'whitespace-pre-wrap break-words px-2 pb-2 text-xs leading-relaxed text-indigo-100'
                        : 'whitespace-pre-wrap break-words px-2 pb-2 text-xs leading-relaxed text-stone-400'
                    }
                  />
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {(suggestions.length > 0 || (!linked_inquiry && !linked_event && primaryEventId)) && (
        <div className="space-y-3 rounded-xl border border-stone-700 bg-stone-800 p-4">
          <div className="text-sm font-medium text-stone-300">Connect this thread</div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-stone-500">Suggested matches</div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      runAction(() =>
                        suggestion.suggested_entity_type === 'inquiry'
                          ? linkCommunicationEventToInquiry(
                              suggestion.communication_event_id,
                              suggestion.suggested_entity_id
                            )
                          : attachCommunicationEventToEvent(
                              suggestion.communication_event_id,
                              suggestion.suggested_entity_id
                            )
                      )
                    }
                  >
                    {suggestion.suggested_entity_type === 'inquiry' ? 'Inquiry' : 'Event'}:{' '}
                    {suggestion.entity_title} ({Math.round(suggestion.confidence_score * 100)}%)
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

      <div className="sticky bottom-0 rounded-t-xl border border-stone-700 bg-stone-900 shadow-lg sm:bottom-4 sm:rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-stone-800 px-3 py-2 sm:px-4">
          <span className="flex-shrink-0 text-xs text-stone-500">Log as:</span>
          <button
            type="button"
            onClick={() => setReplyDirection('outbound')}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium sm:py-1 ${replyDirection === 'outbound' ? 'bg-indigo-600 text-white' : 'bg-stone-800 text-stone-400'}`}
          >
            Your Reply
          </button>
          <button
            type="button"
            onClick={() => setReplyDirection('inbound')}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium sm:py-1 ${replyDirection === 'inbound' ? 'bg-stone-700 text-white' : 'bg-stone-800 text-stone-400'}`}
          >
            Client Message
          </button>
          {canSend && replyDirection === 'outbound' && (
            <>
              <span className="mx-1 text-stone-200">|</span>
              <button
                type="button"
                onClick={() => setReplyMode('log')}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:py-1 ${
                  replyMode === 'log'
                    ? 'bg-stone-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                Log Only
              </button>
              {canSendEmail && (
                <button
                  type="button"
                  onClick={() => setReplyMode('draft')}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:py-1 ${
                    replyMode === 'draft'
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  Save Draft
                </button>
              )}
              <button
                type="button"
                onClick={() => setReplyMode('send')}
                className={`flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:py-1 ${
                  replyMode === 'send'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                <Send className="h-3 w-3" />
                Send Now
              </button>
            </>
          )}
        </div>
        <div className="flex items-end gap-2 p-2 sm:gap-3 sm:p-3">
          <textarea
            value={replyContent}
            onChange={(event) => setReplyContent(event.target.value)}
            placeholder={
              replyDirection === 'outbound'
                ? replyMode === 'send'
                  ? `Send via ${canSendEmail ? 'email' : canSendWhatsApp ? 'WhatsApp' : 'SMS'}...`
                  : replyMode === 'draft'
                    ? 'Save an email draft for approval...'
                    : 'Log your reply...'
                : 'Log their message...'
            }
            rows={2}
            className="flex-1 resize-none rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
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
            ) : replyMode === 'draft' && replyDirection === 'outbound' ? (
              'Save Draft'
            ) : (
              'Log'
            )}
          </Button>
        </div>
        <div className="flex flex-col gap-1 pb-2 text-center text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-center sm:gap-2">
          <span>
            {replyMode === 'send' && replyDirection === 'outbound'
              ? `Ctrl/Cmd+Enter to send via ${canSendEmail ? `email to ${emailRecipient}` : canSendWhatsApp ? 'WhatsApp' : 'SMS'}`
              : replyMode === 'draft' && replyDirection === 'outbound'
                ? 'Ctrl/Cmd+Enter to save to the approval queue'
                : 'Ctrl/Cmd+Enter to log in ChefFlow only'}
          </span>
          {canSendEmail && (
            <Link href="/messages/approval-queue" className="text-brand-400 hover:text-brand-300">
              Open approval queue
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

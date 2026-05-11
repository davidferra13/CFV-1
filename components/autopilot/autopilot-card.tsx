'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  generateAutopilotDraft,
  approveAndSendAutopilot,
  dismissAutopilotEvent,
} from '@/lib/autopilot/actions'
import type { PendingClientUpdate, AutopilotDraft } from '@/lib/autopilot/types'
import {
  Bot,
  Send,
  X,
  RefreshCw,
  Clock,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
} from '@/components/ui/icons'

type CardState = 'generating' | 'ready' | 'error' | 'sent' | 'dismissed'

export function AutopilotCard({ item }: { item: PendingClientUpdate }) {
  const [state, setState] = useState<CardState>('generating')
  const [draft, setDraft] = useState<AutopilotDraft | null>(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [showEmail, setShowEmail] = useState(true)
  const [isPending, startTransition] = useTransition()

  const generate = async () => {
    setState('generating')
    setErrorMsg('')
    try {
      const result = await generateAutopilotDraft(item.eventId, item.clientId)
      setDraft(result)
      setEditedSubject(result.subject)
      setEditedBody(result.body)
      setState('ready')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Draft generation failed'
      setErrorMsg(
        msg.includes('offline') || msg.includes('timeout') || msg.includes('not_configured')
          ? 'Remy is offline. Start Ollama and try again.'
          : 'Could not generate draft. Try again.'
      )
      setState('error')
    }
  }

  useEffect(() => {
    void generate()
  }, [item.eventId])

  const handleApprove = () => {
    if (!item.clientEmail) {
      setErrorMsg('No email on file for this client.')
      return
    }
    startTransition(async () => {
      const result = await approveAndSendAutopilot({
        eventId: item.eventId,
        clientId: item.clientId,
        clientEmail: item.clientEmail!,
        subject: editedSubject,
        body: editedBody,
      })
      if (result.success) {
        setState('sent')
      } else {
        setErrorMsg(result.error ?? 'Send failed. Check email settings.')
      }
    })
  }

  const handleDismiss = () => {
    startTransition(async () => {
      await dismissAutopilotEvent({ eventId: item.eventId, clientId: item.clientId })
      setState('dismissed')
    })
  }

  const eventDate = new Date(item.eventDate)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))

  if (state === 'sent') {
    return (
      <div className="rounded-xl border border-green-800/50 bg-green-950/30 px-5 py-4 flex items-center gap-3">
        <Send className="w-4 h-4 text-green-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-300">Sent to {item.clientName}</p>
          <p className="text-xs text-green-600 mt-0.5">{editedSubject}</p>
        </div>
      </div>
    )
  }

  if (state === 'dismissed') {
    return (
      <div className="rounded-xl border border-stone-800/50 bg-stone-950/30 px-5 py-4 flex items-center gap-3 opacity-50">
        <X className="w-4 h-4 text-stone-500 flex-shrink-0" />
        <p className="text-sm text-stone-500">
          Dismissed for {item.clientName} - won't surface for 7 days
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-700/60 bg-stone-900/80 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-100 truncate">{item.clientName}</h3>
            {!item.clientEmail && (
              <span className="text-xxs bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded font-medium">
                No email
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Calendar className="w-3 h-3" />
              {formattedDate}
              {daysUntil > 0 && <span className="text-stone-500">({daysUntil}d away)</span>}
            </span>
            {item.occasion && (
              <span className="text-xs text-stone-400 capitalize">{item.occasion}</span>
            )}
            {item.guestCount && (
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <Users className="w-3 h-3" />
                {item.guestCount} guests
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <Clock className="w-3 h-3" />
              {item.daysSinceLastContact === null
                ? 'Never contacted'
                : `${item.daysSinceLastContact}d since last contact`}
            </span>
          </div>
        </div>
        <span className="text-xxs bg-stone-800 text-stone-400 px-2 py-0.5 rounded capitalize flex-shrink-0">
          {item.eventStatus}
        </span>
      </div>

      {/* Draft area */}
      <div className="border-t border-stone-800">
        {state === 'generating' && (
          <div className="px-5 py-6 flex items-center gap-3">
            <Bot className="w-4 h-4 text-brand-400 animate-pulse flex-shrink-0" />
            <p className="text-sm text-stone-400">Remy is drafting...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-red-400">{errorMsg}</p>
            <button
              onClick={() => void generate()}
              className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {state === 'ready' && (
          <div className="px-5 py-4 space-y-3">
            {/* Subject */}
            <div>
              <label className="text-xxs font-medium text-stone-500 uppercase tracking-wider block mb-1">
                Subject
              </label>
              <input
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                title="Email subject"
                placeholder="Subject line"
                className="w-full bg-stone-800/60 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>

            {/* Body toggle */}
            <div>
              <button
                onClick={() => setShowEmail((v) => !v)}
                className="flex items-center gap-1.5 text-xxs font-medium text-stone-500 uppercase tracking-wider hover:text-stone-300 transition-colors mb-1"
              >
                Message
                {showEmail ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              {showEmail && (
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={8}
                  title="Email body"
                  placeholder="Message body"
                  className="w-full bg-stone-800/60 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600 resize-none font-mono leading-relaxed"
                />
              )}
            </div>

            {/* Remy label */}
            <div className="flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-brand-500" />
              <span className="text-xxs text-stone-500">
                Drafted by Remy. You can edit before sending.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {(state === 'ready' || state === 'error') && (
        <div className="border-t border-stone-800 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Dismiss
            </button>
            {state === 'ready' && (
              <button
                onClick={() => void generate()}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            )}
          </div>

          <button
            onClick={handleApprove}
            disabled={isPending || state !== 'ready' || !item.clientEmail || !editedBody.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            {isPending ? 'Sending...' : 'Approve and Send'}
          </button>
        </div>
      )}
    </div>
  )
}

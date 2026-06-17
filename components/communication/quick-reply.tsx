'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { sendQuickReplyToClient } from '@/lib/communication/unified-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type QuickReplyChannel = 'email' | 'sms' | 'note'

interface QuickReplyProps {
  clientId: string
  clientEmail?: string | null
  clientPhone?: string | null
  onSent?: () => void
  compact?: boolean
}

const CHANNEL_OPTIONS: { value: QuickReplyChannel; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: 'E' },
  { value: 'sms', label: 'SMS', icon: 'S' },
  { value: 'note', label: 'Note', icon: 'N' },
]

export function QuickReply({
  clientId,
  clientEmail,
  clientPhone,
  onSent,
  compact = false,
}: QuickReplyProps) {
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState<QuickReplyChannel>(
    clientEmail ? 'email' : clientPhone ? 'sms' : 'note'
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-clear feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Draft indicator
  useEffect(() => {
    if (message.trim()) {
      setDraftSaved(false)
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => setDraftSaved(true), 1500)
    } else {
      setDraftSaved(false)
    }
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [message])

  // Filter available channels
  const availableChannels = CHANNEL_OPTIONS.filter((ch) => {
    if (ch.value === 'email' && !clientEmail) return false
    if (ch.value === 'sms' && !clientPhone) return false
    return true
  })

  function handleSend() {
    if (!message.trim() || isPending) return

    startTransition(async () => {
      try {
        const result = await sendQuickReplyToClient(clientId, message, channel)
        if (result.success) {
          setMessage('')
          setFeedback({ type: 'success', text: 'Sent' })
          onSent?.()
        } else {
          setFeedback({ type: 'error', text: result.error || 'Failed to send' })
        }
      } catch (err) {
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to send',
        })
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`${compact ? '' : 'border-t border-stone-700 pt-3'}`}>
      {/* Channel selector */}
      <div className="flex items-center gap-1.5 mb-2">
        {availableChannels.map((ch) => (
          <button
            key={ch.value}
            onClick={() => setChannel(ch.value)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              channel === ch.value
                ? 'bg-brand-600/20 text-brand-400 ring-1 ring-brand-500/40'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700'
            }`}
          >
            {ch.label}
          </button>
        ))}
        {draftSaved && message.trim() && (
          <span className="text-xs text-stone-500 ml-auto">Draft saved</span>
        )}
      </div>

      {/* Input + Send */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            channel === 'note'
              ? 'Add an internal note...'
              : `Send ${channel === 'email' ? 'email' : 'SMS'}...`
          }
          disabled={isPending}
          className="flex-1 bg-stone-800/50 border-stone-700"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isPending}
          size={compact ? 'sm' : 'md'}
        >
          {isPending ? 'Sending...' : 'Send'}
        </Button>
      </div>

      {/* Feedback */}
      {feedback && (
        <p
          className={`text-xs mt-1.5 ${
            feedback.type === 'success' ? 'text-emerald-500' : 'text-red-400'
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  )
}

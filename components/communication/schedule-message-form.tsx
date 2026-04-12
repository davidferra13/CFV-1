'use client'

import { useState } from 'react'
import { scheduleMessage } from '@/lib/communication/scheduled-message-actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

interface ScheduleMessageFormProps {
  recipientId?: string
  recipientName?: string
  contextType?: 'inquiry' | 'event' | 'client'
  contextId?: string
  defaultChannel?: 'email' | 'sms' | 'app'
  onSuccess?: () => void
  onCancel?: () => void
}

export function ScheduleMessageForm({
  recipientId,
  recipientName,
  contextType,
  contextId,
  defaultChannel = 'email',
  onSuccess,
  onCancel,
}: ScheduleMessageFormProps) {
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().substring(0, 16)

  const [channel, setChannel] = useState<'email' | 'sms' | 'app'>(defaultChannel)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await scheduleMessage({
      recipient_id: recipientId,
      channel,
      subject: channel === 'email' ? subject || undefined : undefined,
      body,
      scheduled_for: new Date(scheduledFor).toISOString(),
      context_type: contextType,
      context_id: contextId,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
    onSuccess?.()
  }

  if (success) {
    return (
      <div className="text-center py-4 space-y-3">
        <p className="text-sm text-stone-300">Message scheduled successfully.</p>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Close
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}

      {recipientName && (
        <p className="text-xs text-stone-500">
          To: <span className="text-stone-300">{recipientName}</span>
        </p>
      )}

      {/* Channel */}
      <div>
        <label className="text-xs font-medium text-stone-500 block mb-1">Channel</label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as 'email' | 'sms' | 'app')}
          title="Delivery channel"
          className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="app">In-app notification</option>
        </select>
      </div>

      {/* Subject (email only) */}
      {channel === 'email' && (
        <div>
          <label className="text-xs font-medium text-stone-500 block mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}

      {/* Body */}
      <div>
        <label className="text-xs font-medium text-stone-500 block mb-1">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What do you want to say?"
          rows={4}
          required
          className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
        />
      </div>

      {/* Send at */}
      <div>
        <label className="text-xs font-medium text-stone-500 block mb-1">Send at</label>
        <input
          type="datetime-local"
          value={scheduledFor}
          min={minDateTime}
          onChange={(e) => setScheduledFor(e.target.value)}
          required
          title="When to send this message"
          className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={loading || !body.trim() || !scheduledFor}>
          {loading ? 'Scheduling...' : 'Schedule Message'}
        </Button>
      </div>
    </form>
  )
}

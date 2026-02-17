import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database'

type Message = Database['public']['Tables']['messages']['Row']

interface MessageThreadProps {
  messages: Message[]
  showEntityLinks?: boolean
}

const CHANNEL_LABELS: Record<string, string> = {
  text: 'Text',
  email: 'Email',
  instagram: 'Instagram',
  take_a_chef: 'Take a Chef',
  phone: 'Phone',
  internal_note: 'Note',
}

const CHANNEL_COLORS: Record<string, string> = {
  text: 'bg-green-100 text-green-800',
  email: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-800',
  take_a_chef: 'bg-purple-100 text-purple-800',
  phone: 'bg-amber-100 text-amber-800',
  internal_note: 'bg-stone-100 text-stone-600',
}

export function MessageThread({ messages, showEntityLinks = false }: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400">
        <p className="text-sm">No messages logged yet.</p>
        <p className="text-xs mt-1">Log your first conversation below.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-3 ${
              msg.channel === 'internal_note'
                ? 'bg-stone-50 border border-dashed border-stone-300 max-w-full w-full'
                : msg.direction === 'outbound'
                  ? 'bg-brand-50 border border-brand-200'
                  : 'bg-white border border-stone-200'
            }`}
          >
            {/* Subject line for emails */}
            {msg.subject && (
              <p className="text-xs font-semibold text-stone-700 mb-1">
                {msg.subject}
              </p>
            )}

            {/* Message body */}
            <p className="text-sm text-stone-800 whitespace-pre-wrap">{msg.body}</p>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                  CHANNEL_COLORS[msg.channel] || 'bg-stone-100 text-stone-600'
                }`}
              >
                {CHANNEL_LABELS[msg.channel] || msg.channel}
              </span>
              <span className="text-xs text-stone-400">
                {msg.sent_at
                  ? format(new Date(msg.sent_at), "MMM d, h:mm a")
                  : format(new Date(msg.created_at), "MMM d, h:mm a")}
              </span>
              {msg.direction === 'outbound' && msg.channel !== 'internal_note' && (
                <span className="text-xs text-stone-400">Sent</span>
              )}
              {msg.direction === 'inbound' && (
                <span className="text-xs text-stone-400">Received</span>
              )}
              {showEntityLinks && (msg.inquiry_id || msg.event_id) && (
                <span className="text-xs text-stone-400">
                  {msg.inquiry_id && `Inquiry`}
                  {msg.inquiry_id && msg.event_id && ' · '}
                  {msg.event_id && `Event`}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

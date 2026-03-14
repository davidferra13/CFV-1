import { format } from 'date-fns'
import { FormattedCommunicationContent } from '@/components/communication/message-content'
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
  text: 'bg-green-900 text-green-800',
  email: 'bg-blue-900 text-blue-800',
  instagram: 'bg-pink-900 text-pink-800',
  take_a_chef: 'bg-purple-900 text-purple-800',
  phone: 'bg-amber-900 text-amber-800',
  internal_note: 'bg-stone-800 text-stone-400',
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
                ? 'bg-stone-800 border border-dashed border-stone-600 max-w-full w-full'
                : msg.direction === 'outbound'
                  ? 'bg-brand-950 border border-brand-700'
                  : 'bg-stone-900 border border-stone-700'
            }`}
          >
            {/* Subject line for emails */}
            {msg.subject && (
              <p className="text-xs font-semibold text-stone-300 mb-1">{msg.subject}</p>
            )}

            {/* Message body */}
            <FormattedCommunicationContent
              content={msg.body}
              className="text-sm text-stone-200 whitespace-pre-wrap break-words leading-relaxed"
              linkClassName="underline underline-offset-2 text-brand-400 hover:text-brand-300"
              quotedContainerClassName="mt-2 rounded-md border border-stone-700/70 bg-stone-900/70"
              quotedSummaryClassName="cursor-pointer select-none px-2 py-1 text-xs text-stone-400 hover:text-stone-300"
              quotedContentClassName="px-2 pb-2 text-xs text-stone-400 whitespace-pre-wrap break-words leading-relaxed"
            />

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                  CHANNEL_COLORS[msg.channel] || 'bg-stone-800 text-stone-400'
                }`}
              >
                {CHANNEL_LABELS[msg.channel] || msg.channel}
              </span>
              <span className="text-xs text-stone-400">
                {msg.sent_at
                  ? format(new Date(msg.sent_at), 'MMM d, h:mm a')
                  : format(new Date(msg.created_at), 'MMM d, h:mm a')}
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

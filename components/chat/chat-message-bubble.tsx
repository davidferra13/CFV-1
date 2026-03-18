'use client'

import { useState, useEffect } from 'react'
import NextImage from 'next/image'
import { format } from 'date-fns'
import {
  ExternalLink,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Download,
} from '@/components/ui/icons'
import { ChatEventRefCard } from './chat-event-ref-card'
import { ChatSystemMessage } from './chat-system-message'
import { getChatAttachmentUrl } from '@/lib/chat/actions'
import type { ChatMessage, ParticipantRole } from '@/lib/chat/types'

interface ChatMessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  senderName: string
  senderRole: ParticipantRole
  showTimestamp?: boolean
  isChefViewer?: boolean
  otherParticipantLastReadAt?: string | null
}

export function ChatMessageBubble({
  message,
  isOwn,
  senderName,
  senderRole,
  showTimestamp = true,
  isChefViewer = true,
  otherParticipantLastReadAt,
}: ChatMessageBubbleProps) {
  const isRead =
    isOwn && otherParticipantLastReadAt
      ? new Date(otherParticipantLastReadAt) >= new Date(message.created_at)
      : false
  // System messages render differently
  if (message.message_type === 'system') {
    return <ChatSystemMessage message={message} />
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? 'bg-brand-950 border border-brand-700 rounded-br-md'
            : 'bg-stone-900 border border-stone-700 rounded-bl-md'
        }`}
      >
        {/* Sender name (only shown for messages from others) */}
        {!isOwn && <p className="text-xs font-medium text-stone-500 mb-1">{senderName}</p>}

        {/* Message content by type */}
        <MessageContent message={message} isChefViewer={isChefViewer} />

        {/* Timestamp and read receipt */}
        {showTimestamp && (
          <p className={`text-xxs mt-1 ${isOwn ? 'text-brand-400' : 'text-stone-400'}`}>
            {format(new Date(message.created_at), 'h:mm a')}
            {isOwn && isRead && <span className="ml-1.5 text-brand-500">Read</span>}
          </p>
        )}
      </div>
    </div>
  )
}

function MessageContent({
  message,
  isChefViewer,
}: {
  message: ChatMessage
  isChefViewer: boolean
}) {
  switch (message.message_type) {
    case 'text':
      return <TextContent body={message.body} />
    case 'image':
      return <ImageContent message={message} />
    case 'file':
      return <FileContent message={message} />
    case 'link':
      return <LinkContent message={message} />
    case 'event_ref':
      return <EventRefContent message={message} isChefViewer={isChefViewer} />
    default:
      return <TextContent body={message.body} />
  }
}

function TextContent({ body }: { body: string | null }) {
  if (!body) return null

  // Simple URL detection for inline links
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = body.split(urlRegex)

  return (
    <p className="text-sm text-stone-200 whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline hover:text-brand-400"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  )
}

function ImageContent({ message }: { message: ChatMessage }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getChatAttachmentUrl(message.id).then((url) => {
      if (!cancelled) {
        setImageUrl(url)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [message.id])

  return (
    <div>
      {loading ? (
        <div className="w-48 h-36 bg-stone-800 rounded-lg flex items-center justify-center animate-pulse">
          <ImageIcon className="w-6 h-6 text-stone-300" />
        </div>
      ) : imageUrl ? (
        <>
          <NextImage
            src={imageUrl}
            alt={message.attachment_filename || 'Image'}
            width={400}
            height={256}
            sizes="(max-width: 768px) 80vw, 400px"
            className="max-w-full max-h-64 rounded-lg cursor-pointer object-cover"
            onClick={() => setExpanded(true)}
          />
          {/* Lightbox */}
          {expanded && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setExpanded(false)}
            >
              <NextImage
                src={imageUrl}
                alt={message.attachment_filename || 'Image'}
                width={1200}
                height={800}
                sizes="95vw"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </>
      ) : (
        <div className="w-48 h-36 bg-stone-800 rounded-lg flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-stone-300" />
        </div>
      )}
      {message.body && <p className="text-sm text-stone-200 mt-1">{message.body}</p>}
    </div>
  )
}

function getDocIcon(contentType: string | null) {
  if (contentType === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />
  if (
    contentType?.includes('spreadsheet') ||
    contentType?.includes('excel') ||
    contentType === 'text/csv'
  ) {
    return <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
  }
  if (contentType?.includes('word') || contentType === 'application/msword') {
    return <FileText className="w-8 h-8 text-blue-600" />
  }
  return <FileIcon className="w-8 h-8 text-stone-500" />
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileContent({ message }: { message: ChatMessage }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getChatAttachmentUrl(message.id).then((url) => {
      if (!cancelled) {
        setFileUrl(url)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [message.id])

  return (
    <div>
      <div className="flex items-center gap-3 bg-stone-800 border border-stone-700 rounded-lg p-3 min-w-[200px]">
        {getDocIcon(message.attachment_content_type)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-200 truncate">
            {message.attachment_filename || 'Document'}
          </p>
          <p className="text-xs text-stone-500">{formatBytes(message.attachment_size_bytes)}</p>
        </div>
        {loading ? (
          <div className="w-8 h-8 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-stone-600 border-t-stone-600 rounded-full animate-spin" />
          </div>
        ) : fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={message.attachment_filename || undefined}
            className="flex-shrink-0 p-2 text-brand-500 hover:text-brand-400 hover:bg-brand-950 rounded-lg transition-colors"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </a>
        ) : null}
      </div>
      {message.body && <p className="text-sm text-stone-200 mt-1">{message.body}</p>}
    </div>
  )
}

function LinkContent({ message }: { message: ChatMessage }) {
  return (
    <div>
      {message.body && (
        <p className="text-sm text-stone-200 whitespace-pre-wrap mb-2">{message.body}</p>
      )}
      {message.link_url && (
        <a
          href={message.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border border-stone-700 rounded-lg p-3 hover:bg-stone-800 transition-colors"
        >
          {message.link_title && (
            <p className="text-sm font-medium text-stone-200 mb-0.5">{message.link_title}</p>
          )}
          {message.link_description && (
            <p className="text-xs text-stone-500 line-clamp-2 mb-1">{message.link_description}</p>
          )}
          <span className="flex items-center gap-1 text-xs text-brand-600">
            <ExternalLink className="w-3 h-3" />
            {new URL(message.link_url).hostname}
          </span>
        </a>
      )}
    </div>
  )
}

function EventRefContent({
  message,
  isChefViewer,
}: {
  message: ChatMessage
  isChefViewer: boolean
}) {
  const metadata = message.system_metadata as Record<string, unknown> | null

  return (
    <div>
      {message.body && <p className="text-sm text-stone-200 mb-1">{message.body}</p>}
      {message.referenced_event_id && (
        <ChatEventRefCard
          eventId={message.referenced_event_id}
          eventDate={metadata?.event_date as string | undefined}
          occasion={metadata?.occasion as string | undefined}
          status={metadata?.status as string | undefined}
          guestCount={metadata?.guest_count as number | undefined}
          isChef={isChefViewer}
        />
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getMessages,
  sendMessage,
  markMessageRead,
  type CommunityMessage,
} from '@/lib/community/community-actions'

export function PeerMessaging({
  initialRecipientId,
  initialRecipientName,
}: {
  initialRecipientId?: string
  initialRecipientName?: string
} = {}) {
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox')
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [selectedMessage, setSelectedMessage] = useState<CommunityMessage | null>(null)

  // Compose state
  const [showCompose, setShowCompose] = useState(!!initialRecipientId)
  const [recipientId, setRecipientId] = useState(initialRecipientId ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [composeMessage, setComposeMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder])

  async function loadMessages() {
    setLoading(true)
    try {
      const data = await getMessages(folder)
      setMessages(data)
    } catch (err) {
      console.error('[PeerMessaging] Failed to load messages:', err)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  function handleSelectMessage(msg: CommunityMessage) {
    setSelectedMessage(msg)
    if (folder === 'inbox' && !msg.read_at) {
      startTransition(async () => {
        try {
          await markMessageRead(msg.id)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m
            )
          )
        } catch (err) {
          console.error('[PeerMessaging] Failed to mark read:', err)
        }
      })
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setComposeMessage(null)

    if (!recipientId.trim()) {
      setComposeMessage({ type: 'error', text: 'Recipient ID is required' })
      return
    }

    if (!body.trim()) {
      setComposeMessage({ type: 'error', text: 'Message body is required' })
      return
    }

    startTransition(async () => {
      try {
        const result = await sendMessage(
          recipientId.trim(),
          subject.trim() || null,
          body.trim()
        )
        if (result.success) {
          setComposeMessage({ type: 'success', text: 'Message sent!' })
          setRecipientId('')
          setSubject('')
          setBody('')
          setShowCompose(false)
          // Refresh if on sent tab
          if (folder === 'sent') loadMessages()
        } else {
          setComposeMessage({
            type: 'error',
            text: result.error ?? 'Failed to send message',
          })
        }
      } catch (err) {
        console.error('[PeerMessaging] Send failed:', err)
        setComposeMessage({ type: 'error', text: 'An unexpected error occurred' })
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Tabs + Compose button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => {
              setFolder('inbox')
              setSelectedMessage(null)
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              folder === 'inbox'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inbox
          </button>
          <button
            onClick={() => {
              setFolder('sent')
              setSelectedMessage(null)
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              folder === 'sent'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sent
          </button>
        </div>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
        >
          {showCompose ? 'Cancel' : 'New Message'}
        </button>
      </div>

      {/* Compose Form */}
      {showCompose && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {initialRecipientName
              ? `Message to ${initialRecipientName}`
              : 'New Message'}
          </h3>

          {composeMessage && (
            <div
              className={`rounded-md p-3 text-sm mb-3 ${
                composeMessage.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {composeMessage.text}
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-3">
            {!initialRecipientId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Chef ID
                </label>
                <input
                  type="text"
                  required
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Chef ID (from their profile)"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject (optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                maxLength={5000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Write your message..."
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isPending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      )}

      {/* Message List */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading messages...</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-gray-500">
          {folder === 'inbox' ? 'No messages in your inbox.' : 'No sent messages.'}
        </p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => handleSelectMessage(msg)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                selectedMessage?.id === msg.id ? 'bg-orange-50' : ''
              } ${folder === 'inbox' && !msg.read_at ? 'font-semibold' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 truncate">
                  {msg.subject || '(no subject)'}
                </span>
                <span className="text-xs text-gray-500 ml-2 shrink-0">
                  {new Date(msg.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {folder === 'inbox'
                  ? `From: ${msg.sender_id.slice(0, 8)}...`
                  : `To: ${msg.recipient_id.slice(0, 8)}...`}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Selected Message Detail */}
      {selectedMessage && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {selectedMessage.subject || '(no subject)'}
            </h3>
            <span className="text-xs text-gray-500">
              {new Date(selectedMessage.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {folder === 'inbox'
              ? `From: ${selectedMessage.sender_id}`
              : `To: ${selectedMessage.recipient_id}`}
          </p>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {selectedMessage.body}
          </div>
        </div>
      )}
    </div>
  )
}

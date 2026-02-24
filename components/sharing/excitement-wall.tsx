'use client'

import { useState, useEffect } from 'react'
import { postGuestMessage, getEventMessages } from '@/lib/guest-messages/actions'

type Message = {
  id: string
  guest_name: string
  message: string
  emoji: string | null
  is_pinned: boolean
  created_at: string
}

type Props = {
  shareToken: string
  guestName?: string
  guestToken?: string
}

const QUICK_EMOJIS = ['🎉', '🍽️', '🤩', '❤️', '🔥', '👨‍🍳']

export function ExcitementWall({ shareToken, guestName, guestToken }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState(guestName || '')
  const [text, setText] = useState('')
  const [emoji, setEmoji] = useState<string | undefined>()
  const [error, setError] = useState('')
  const [posted, setPosted] = useState(false)

  useEffect(() => {
    loadMessages()
  }, [shareToken])

  async function loadMessages() {
    try {
      const data = await getEventMessages(shareToken)
      setMessages(data)
    } catch {
      // Silently fail — wall is non-critical
    } finally {
      setLoading(false)
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !text.trim()) return

    setPosting(true)
    setError('')

    try {
      await postGuestMessage({
        shareToken,
        guestToken,
        guestName: name.trim(),
        message: text.trim(),
        emoji,
      })
      setText('')
      setEmoji(undefined)
      setPosted(true)
      setShowForm(false)
      await loadMessages()
    } catch (err: any) {
      setError(err.message || 'Could not post message')
    } finally {
      setPosting(false)
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-100">
          Guest Wall{' '}
          {messages.length > 0 && (
            <span className="text-stone-400 font-normal text-sm ml-1">({messages.length})</span>
          )}
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-brand-600 hover:text-brand-400"
          >
            {posted ? 'Post another' : 'Share your excitement'}
          </button>
        )}
      </div>

      {/* Post form */}
      {showForm && (
        <form
          onSubmit={handlePost}
          className="bg-surface rounded-xl border border-stone-700 p-4 space-y-3"
        >
          {!guestName && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400"
            />
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="Can't wait for this dinner! 🎉"
            rows={2}
            required
            className="w-full px-3 py-2 rounded-lg border border-stone-600 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-stone-100 placeholder:text-stone-400 resize-none"
          />

          {/* Quick emoji selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Add:</span>
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(emoji === e ? undefined : e)}
                className={`text-lg hover:scale-110 transition-transform ${
                  emoji === e ? 'scale-125 ring-2 ring-brand-600 rounded' : ''
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400">{text.length}/500</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={posting || !name.trim() || !text.trim()}
                className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}

      {/* Messages feed */}
      {loading ? (
        <div className="text-center py-6">
          <div className="w-6 h-6 border-2 border-stone-600 border-t-brand-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-6 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <p className="text-stone-500 text-sm">
            No messages yet. Be the first to share your excitement!
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-400"
            >
              Post a message
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`bg-surface rounded-xl border p-4 ${
                msg.is_pinned ? 'border-brand-700 bg-brand-950/30' : 'border-stone-700'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-stone-400">
                    {msg.guest_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-100 text-sm">{msg.guest_name}</span>
                    {msg.is_pinned && (
                      <span className="text-xs text-brand-600 font-medium">pinned</span>
                    )}
                    <span className="text-xs text-stone-400 ml-auto flex-shrink-0">
                      {timeAgo(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-stone-300 text-sm mt-0.5">
                    {msg.emoji && <span className="mr-1">{msg.emoji}</span>}
                    {msg.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

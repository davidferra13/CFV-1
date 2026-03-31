'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Hash,
  Lock,
  MessageSquare,
  Plus,
  Send,
  Users,
  Handshake,
} from '@/components/ui/icons'
import {
  type CollabSpaceDetail,
  type CollabMessage,
  sendCollabThreadMessage,
  createCollabThread,
  markCollabSpaceRead,
} from '@/lib/network/collab-space-actions'

interface Props {
  detail: CollabSpaceDetail
  currentChefId: string
  spaceId: string
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function groupMessagesByDay(
  messages: CollabMessage[]
): Array<{ date: string; messages: CollabMessage[] }> {
  const groups: Array<{ date: string; messages: CollabMessage[] }> = []
  let currentDate = ''

  for (const msg of messages) {
    const date = new Date(msg.created_at).toDateString()
    if (date !== currentDate) {
      currentDate = date
      groups.push({ date: msg.created_at, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
}

export function SpaceViewClient({ detail, currentChefId, spaceId }: Props) {
  const router = useRouter()
  const [activeThreadId, setActiveThreadId] = useState(detail.active_thread || '')
  const [messageText, setMessageText] = useState('')
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [showNewThread, setShowNewThread] = useState(false)
  const [pending, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeThread = detail.threads.find((t) => t.id === activeThreadId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [detail.messages])

  // Mark as read on mount
  useEffect(() => {
    markCollabSpaceRead({ spaceId })
  }, [spaceId])

  const spaceName =
    detail.space.name ||
    detail.members.find((m) => m.chef_id !== currentChefId)?.display_name ||
    'Private Space'

  function handleSendMessage() {
    if (!messageText.trim() || !activeThreadId) return
    const body = messageText.trim()
    setMessageText('')
    startTransition(async () => {
      try {
        const result = await sendCollabThreadMessage({ threadId: activeThreadId, body })
        if (!result.success) {
          toast.error(result.error || 'Failed to send message.')
          setMessageText(body) // restore
        } else {
          router.refresh()
        }
      } catch {
        toast.error('Failed to send message.')
        setMessageText(body)
      }
    })
  }

  function handleCreateThread() {
    if (!newThreadTitle.trim()) return
    const title = newThreadTitle.trim()
    setNewThreadTitle('')
    setShowNewThread(false)
    startTransition(async () => {
      try {
        const result = await createCollabThread({ spaceId, title })
        if (result.success && result.threadId) {
          toast.success('Thread created.')
          setActiveThreadId(result.threadId)
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to create thread.')
        }
      } catch {
        toast.error('Failed to create thread.')
      }
    })
  }

  function handleSwitchThread(threadId: string) {
    setActiveThreadId(threadId)
    router.push(`/network/collabs/${spaceId}?thread=${threadId}`, { scroll: false })
  }

  // Build handoff URL with seeded params
  const otherMemberIds = detail.members
    .filter((m) => m.chef_id !== currentChefId)
    .map((m) => m.chef_id)
  const handoffUrl = `/network?tab=collab&spaceId=${spaceId}&threadId=${activeThreadId}&recipientIds=${otherMemberIds.join(',')}`

  return (
    <div className="mx-auto max-w-6xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/network/collabs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Spaces
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-stone-100">{spaceName}</h1>
          {detail.space.is_locked && (
            <span title="Locked membership">
              <Lock className="h-4 w-4 text-stone-500" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Member chips */}
          <div className="flex items-center gap-1">
            {detail.members.map((m) => (
              <span
                key={m.chef_id}
                className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-300"
                title={m.display_name}
              >
                {m.profile_image_url ? (
                  <img
                    src={m.profile_image_url}
                    alt=""
                    className="h-4 w-4 rounded-full object-cover"
                  />
                ) : (
                  <Users className="h-3 w-3" />
                )}
                {m.display_name.split(' ')[0]}
              </span>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowNewThread(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Thread
          </Button>
          <Link href={handoffUrl}>
            <Button variant="ghost" size="sm">
              <Handshake className="h-4 w-4 mr-1" />
              New Handoff
            </Button>
          </Link>
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div className="mb-4 rounded-lg border border-stone-700 bg-stone-900 p-4">
          <h3 className="text-sm font-medium text-stone-200 mb-2">New Thread</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newThreadTitle}
              onChange={(e) => setNewThreadTitle(e.target.value)}
              placeholder="Thread title"
              maxLength={120}
              className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateThread()}
              autoFocus
            />
            <Button
              onClick={handleCreateThread}
              disabled={pending || !newThreadTitle.trim()}
              variant="primary"
              size="sm"
            >
              Create
            </Button>
            <Button onClick={() => setShowNewThread(false)} variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Split Layout: Threads | Messages */}
      <div className="flex rounded-xl border border-stone-700 bg-stone-900 overflow-hidden h-[calc(100vh-200px)]">
        {/* Left: Thread List */}
        <div className="w-56 flex-shrink-0 border-r border-stone-700 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {detail.threads.map((thread) => {
              const isActive = thread.id === activeThreadId
              const isStarter = thread.thread_type === 'general' || thread.thread_type === 'starter'
              return (
                <button
                  key={thread.id}
                  onClick={() => handleSwitchThread(thread.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-amber-950/50 text-amber-200 border border-amber-800/50'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{thread.title}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Messages */}
        <div className="flex-1 flex flex-col">
          {/* Thread header */}
          {activeThread && (
            <div className="px-4 py-2 border-b border-stone-700 flex items-center gap-2">
              <Hash className="h-4 w-4 text-stone-500" />
              <span className="text-sm font-medium text-stone-200">{activeThread.title}</span>
            </div>
          )}

          {/* Message feed */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {detail.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-stone-500 text-sm">
                No messages yet. Start the conversation.
              </div>
            ) : (
              groupMessagesByDay(detail.messages).map((group, gi) => (
                <div key={gi}>
                  {/* Day separator */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-stone-700" />
                    <span className="text-xs text-stone-500 font-medium">
                      {formatDate(group.date)}
                    </span>
                    <div className="flex-1 h-px bg-stone-700" />
                  </div>

                  {group.messages.map((msg) => {
                    if (msg.message_type === 'system') {
                      return (
                        <div
                          key={msg.id}
                          className="text-center text-xs text-stone-500 my-2 italic"
                        >
                          {msg.body}
                        </div>
                      )
                    }

                    if (msg.message_type === 'handoff_reference') {
                      const meta = msg.metadata as {
                        handoff_id?: string
                        handoff_title?: string
                        handoff_type?: string
                      }
                      return (
                        <div
                          key={msg.id}
                          className="my-2 rounded-lg border border-amber-800/30 bg-amber-950/20 p-3"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <Handshake className="h-4 w-4 text-amber-500" />
                            <span className="font-medium text-amber-200">
                              {meta.handoff_title || 'Handoff'}
                            </span>
                            {meta.handoff_type && (
                              <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">
                                {meta.handoff_type}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-stone-400">
                            Created by {msg.sender_name}
                            {meta.handoff_id && (
                              <>
                                {' '}
                                -{' '}
                                <Link
                                  href={`/network?tab=collab&handoff=${meta.handoff_id}`}
                                  className="text-amber-400 hover:underline"
                                >
                                  View handoff
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    }

                    const isMine = msg.sender_chef_id === currentChefId
                    return (
                      <div key={msg.id} className="mb-3 flex items-start gap-2.5">
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-stone-800 flex items-center justify-center overflow-hidden">
                          {msg.sender_avatar ? (
                            <img src={msg.sender_avatar} alt="" className="h-7 w-7 object-cover" />
                          ) : (
                            <span className="text-xs text-stone-400">
                              {msg.sender_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-xs font-medium ${isMine ? 'text-amber-300' : 'text-stone-300'}`}
                            >
                              {msg.sender_name}
                            </span>
                            <span className="text-xxs text-stone-600">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-stone-200 mt-0.5 whitespace-pre-wrap break-words">
                            {msg.body}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          {activeThreadId && (
            <div className="border-t border-stone-700 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Message #${activeThread?.title || 'thread'}...`}
                  maxLength={5000}
                  className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={pending || !messageText.trim()}
                  variant="primary"
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import type { MealComment } from '@/lib/hub/types'
import { getMealComments, addMealComment } from '@/lib/hub/meal-board-actions'

interface MealCommentsProps {
  mealEntryId: string
  profileToken: string | null
  mealTitle: string
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function MealCommentsThread({
  mealEntryId,
  profileToken,
  mealTitle,
  onClose,
}: MealCommentsProps) {
  const [comments, setComments] = useState<MealComment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMealComments(mealEntryId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mealEntryId])

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments.length])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = () => {
    if (!profileToken || !body.trim()) return

    const optimisticComment: MealComment = {
      id: `temp-${Date.now()}`,
      meal_entry_id: mealEntryId,
      author_profile_id: '',
      body: body.trim(),
      created_at: new Date().toISOString(),
      author: { display_name: 'You' } as any,
    }

    const prevComments = [...comments]
    const prevBody = body
    setComments((prev) => [...prev, optimisticComment])
    setBody('')
    setError(null)

    startTransition(async () => {
      try {
        const result = await addMealComment({
          mealEntryId,
          profileToken,
          body: prevBody.trim(),
        })
        if (!result.success) {
          setComments(prevComments)
          setBody(prevBody)
          setError(result.error ?? 'Failed to send')
        } else if (result.comment) {
          setComments((prev) =>
            prev.map((c) => (c.id === optimisticComment.id ? result.comment! : c))
          )
        }
      } catch {
        setComments(prevComments)
        setBody(prevBody)
        setError('Failed to send comment')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border border-stone-700 bg-stone-900 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 p-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-200 truncate">{mealTitle}</p>
            <p className="text-[10px] text-stone-500">
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
          >
            ✕
          </button>
        </div>

        {/* Comments list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-600 border-t-stone-300" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-lg">💬</p>
              <p className="mt-1 text-xs text-stone-500">
                No comments yet. Start the conversation.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-700 text-[10px] text-stone-300">
                  {(comment.author?.display_name ?? '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-medium text-stone-300">
                      {comment.author?.display_name ?? 'Unknown'}
                    </span>
                    <span className="text-[10px] text-stone-600">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-400 leading-relaxed">{comment.body}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        {profileToken && (
          <div className="border-t border-stone-800 p-3">
            {error && <p className="mb-1.5 text-[10px] text-red-400">{error}</p>}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-lg bg-stone-800 px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                maxLength={500}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && body.trim()) handleSend()
                  if (e.key === 'Escape') onClose()
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!body.trim() || isPending}
                className="rounded-lg bg-[var(--hub-primary,#e88f47)] px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Compact trigger button (shows comment count, opens thread)
interface MealCommentTriggerProps {
  mealEntryId: string
  profileToken: string | null
  mealTitle: string
}

export function MealCommentTrigger({
  mealEntryId,
  profileToken,
  mealTitle,
}: MealCommentTriggerProps) {
  const [commentCount, setCommentCount] = useState<number | null>(null)
  const [showThread, setShowThread] = useState(false)

  useEffect(() => {
    getMealComments(mealEntryId)
      .then((c) => setCommentCount(c.length))
      .catch(() => {})
  }, [mealEntryId])

  return (
    <>
      <button
        type="button"
        onClick={() => setShowThread(true)}
        className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-300"
      >
        💬 {commentCount === null ? '' : commentCount > 0 ? commentCount : ''}
      </button>
      {showThread && (
        <MealCommentsThread
          mealEntryId={mealEntryId}
          profileToken={profileToken}
          mealTitle={mealTitle}
          onClose={() => {
            setShowThread(false)
            // Refresh count
            getMealComments(mealEntryId)
              .then((c) => setCommentCount(c.length))
              .catch(() => {})
          }}
        />
      )}
    </>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, CheckCircle2, Circle, Send } from 'lucide-react'
import {
  addComment,
  resolveComment,
} from '@/lib/operations/document-comment-actions'
import type { AddCommentInput } from '@/lib/operations/document-comment-actions'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string
  authorName: string
  commentText: string
  resolved: boolean
  createdAt: string
}

interface CommentThreadProps {
  comments: Comment[]
  documentType: string
  entityId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommentThread({
  comments: initialComments,
  documentType,
  entityId,
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [isPending, startTransition] = useTransition()
  const [newComment, setNewComment] = useState('')
  const [showResolved, setShowResolved] = useState(false)

  function formatTimestamp(isoString: string): string {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  function handleAddComment() {
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty')
      return
    }

    startTransition(async () => {
      try {
        const result = await addComment({
          documentType: documentType as AddCommentInput['documentType'],
          entityId,
          authorName: 'Chef',
          commentText: newComment.trim(),
        })
        if (result.comment) {
          setComments(prev => [...prev, result.comment])
        }
        setNewComment('')
        toast.success('Comment added')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add comment'
        toast.error(message)
      }
    })
  }

  function handleToggleResolved(commentId: string, currentlyResolved: boolean) {
    if (currentlyResolved) {
      // Unresolving is not supported by the server action
      return
    }
    startTransition(async () => {
      try {
        await resolveComment(commentId)
        setComments(prev =>
          prev.map(c =>
            c.id === commentId ? { ...c, resolved: true } : c
          )
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to resolve comment'
        toast.error(message)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddComment()
    }
  }

  const unresolvedComments = comments.filter(c => !c.resolved)
  const resolvedComments = comments.filter(c => c.resolved)
  const visibleComments = showResolved ? comments : unresolvedComments

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Comments</CardTitle>
          {unresolvedComments.length > 0 && (
            <Badge variant="warning">{unresolvedComments.length} open</Badge>
          )}
        </div>
        {resolvedComments.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Hide' : 'Show'} resolved ({resolvedComments.length})
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment list */}
        {visibleComments.length > 0 ? (
          <div className="space-y-3">
            {visibleComments.map(comment => (
              <div
                key={comment.id}
                className={`flex gap-3 rounded-lg p-3 transition-colors ${
                  comment.resolved
                    ? 'bg-stone-50 opacity-60'
                    : 'bg-white border border-stone-200'
                }`}
              >
                {/* Resolve checkbox */}
                <button
                  onClick={() => handleToggleResolved(comment.id, comment.resolved)}
                  className={`flex-shrink-0 mt-0.5 transition-colors ${
                    comment.resolved
                      ? 'text-emerald-500 hover:text-stone-400'
                      : 'text-stone-300 hover:text-emerald-500'
                  }`}
                  title={comment.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                  disabled={isPending}
                >
                  {comment.resolved ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                {/* Comment content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-stone-900">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-stone-400">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                    {comment.resolved && (
                      <Badge variant="success">Resolved</Badge>
                    )}
                  </div>
                  <p className={`text-sm ${
                    comment.resolved ? 'text-stone-500 line-through' : 'text-stone-700'
                  }`}>
                    {comment.commentText}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-stone-400">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm italic">
              {showResolved ? 'No comments yet.' : 'No open comments.'}
            </p>
          </div>
        )}

        {/* Add comment form */}
        <div className="border-t border-stone-100 pt-4">
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Add a comment..."
              className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              loading={isPending}
              disabled={!newComment.trim()}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Press Ctrl+Enter to submit
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

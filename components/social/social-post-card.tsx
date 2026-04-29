'use client'

import { useState, useTransition, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import {
  MessageCircle,
  Bookmark,
  BookmarkCheck,
  Share2,
  Check,
  MoreHorizontal,
  MapPin,
  ChevronDown,
  ChevronUp,
  Repeat2,
  DollarSign,
  Sparkles,
  X,
} from '@/components/ui/icons'
import type { SocialPost, ReactionType, SocialComment } from '@/lib/social/chef-social-actions'
import {
  togglePostReaction,
  toggleCommentReaction,
  toggleSavePost,
  deleteSocialPost,
  createComment,
  getPostComments,
  createRepost,
} from '@/lib/social/chef-social-actions'
import { getRepostBlockedReason } from '@/lib/social/repost-policy'
import {
  getOpportunityDetail,
  expressInterest,
  closeOpportunity,
  getOpportunityInterests,
  type OpportunityDetail,
  type OpportunityInterest,
} from '@/lib/network/opportunity-actions'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'
import { useDeferredAction } from '@/hooks/use-deferred-action'

// ── Reaction config ──────────────────────────────────────────
export const REACTIONS: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'hungry', emoji: '😋', label: 'Hungry' },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
]

function getReactionEmoji(type: ReactionType | null): string {
  return REACTIONS.find((r) => r.type === type)?.emoji ?? '👍'
}

// ── Author avatar ────────────────────────────────────────────
function ChefAvatar({ author, size = 40 }: { author: SocialPost['author']; size?: number }) {
  const initials = (author.display_name ?? author.business_name)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Avatar style={{ width: size, height: size }}>
      {author.profile_image_url && (
        <AvatarImage
          src={author.profile_image_url}
          alt={author.display_name ?? author.business_name}
        />
      )}
      <AvatarFallback className="bg-amber-900 text-amber-800 text-xs font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

// ── Media grid ───────────────────────────────────────────────
function MediaGrid({ urls, types }: { urls: string[]; types: string[] }) {
  if (!urls.length) return null

  const count = urls.length
  const gridClass =
    count === 1
      ? 'grid-cols-1'
      : count === 2
        ? 'grid-cols-2'
        : count === 3
          ? 'grid-cols-3'
          : 'grid-cols-2'

  return (
    <div className={`grid ${gridClass} gap-1 rounded-xl overflow-hidden`}>
      {urls.map((url, i) => {
        const isVideo = types[i] === 'video'
        return (
          <div
            key={i}
            className={`relative bg-stone-800 ${count === 1 ? 'aspect-video' : 'aspect-square'}`}
          >
            {isVideo ? (
              <video src={url} className="w-full h-full object-cover" controls playsInline muted />
            ) : (
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Reaction bar ─────────────────────────────────────────────
function ReactionBar({
  postId,
  myReaction,
  reactionsCount,
  onReactionChange,
}: {
  postId: string
  myReaction: ReactionType | null
  reactionsCount: number
  onReactionChange: (reaction: ReactionType | null) => void
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleReaction(type: ReactionType) {
    const prevReaction = myReaction
    const next = myReaction === type ? null : type
    onReactionChange(next)
    setShowPicker(false)
    startTransition(async () => {
      try {
        await togglePostReaction({ postId, reaction: type })
      } catch (err) {
        onReactionChange(prevReaction)
        toast.error('Failed to update reaction')
      }
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker((s) => !s)}
        disabled={pending}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          myReaction
            ? 'bg-amber-950 text-amber-700 border border-amber-200'
            : 'text-stone-400 hover:bg-stone-700'
        }`}
      >
        <span>{myReaction ? getReactionEmoji(myReaction) : '👍'}</span>
        <span>{reactionsCount > 0 ? reactionsCount : myReaction ? 'Reacted' : 'React'}</span>
      </button>

      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-stone-900 rounded-2xl shadow-lg border border-stone-700 p-2 flex gap-1 z-20">
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              onClick={() => handleReaction(r.type)}
              title={r.label}
              className={`text-xl p-1.5 rounded-xl hover:bg-stone-700 transition-all hover:scale-125 ${
                myReaction === r.type ? 'bg-amber-950 ring-1 ring-amber-300 scale-125' : ''
              }`}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Comment input ────────────────────────────────────────────
function CommentInput({
  postId,
  parentId,
  onAdded,
}: {
  postId: string
  parentId?: string
  onAdded: () => void
}) {
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!text.trim()) return
    const body = text.trim()
    setText('')
    startTransition(async () => {
      try {
        await createComment({ postId, content: body, parentCommentId: parentId })
        onAdded()
      } catch (err) {
        setText(body)
        toast.error('Failed to post comment')
      }
    })
  }

  return (
    <div className="flex gap-2 items-end">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
        rows={1}
        className="flex-1 resize-none text-sm border border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        placeholder={parentId ? 'Write a reply...' : 'Add a comment...'}
        maxLength={2000}
      />
      <Button
        variant="primary"
        onClick={submit}
        disabled={!text.trim() || pending}
        className="text-sm px-3 py-2 h-auto"
      >
        {pending ? '...' : 'Post'}
      </Button>
    </div>
  )
}

// ── Single comment ───────────────────────────────────────────
function CommentRow({
  comment,
  postId,
  onRefresh,
}: {
  comment: SocialComment
  postId: string
  onRefresh: () => void
}) {
  const [showReplies, setShowReplies] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [reactionCount, setReactionCount] = useState(comment.reactions_count)
  const [reacted, setReacted] = useState(false)
  const [, startCommentTransition] = useTransition()
  const authorName = comment.author.display_name ?? comment.author.business_name

  function handleCommentReaction() {
    const prevReacted = reacted
    const prevCount = reactionCount
    const next = !reacted
    setReacted(next)
    setReactionCount((c) => (next ? c + 1 : Math.max(0, c - 1)))
    startCommentTransition(async () => {
      try {
        await toggleCommentReaction({ commentId: comment.id, reaction: 'like' })
      } catch (err) {
        setReacted(prevReacted)
        setReactionCount(prevCount)
        toast.error('Failed to update reaction')
      }
    })
  }

  return (
    <div className="group">
      <div className="flex gap-2.5">
        <Link href={`/network/${comment.chef_id}`}>
          <Avatar className="w-7 h-7 flex-shrink-0">
            {comment.author.profile_image_url && (
              <AvatarImage src={comment.author.profile_image_url} alt={authorName} />
            )}
            <AvatarFallback className="bg-stone-700 text-stone-400 text-xs">
              {authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="bg-stone-800 rounded-xl px-3 py-2">
            <Link
              href={`/network/${comment.chef_id}`}
              className="text-sm font-semibold text-stone-100 hover:underline"
            >
              {authorName}
            </Link>
            <p className="text-sm text-stone-300 mt-0.5 whitespace-pre-wrap break-words">
              {comment.is_deleted ? (
                <em className="text-stone-400">Comment removed</em>
              ) : (
                comment.content
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-xs text-stone-400">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {!comment.is_deleted && (
              <>
                <button
                  type="button"
                  onClick={() => setShowReplyInput((s) => !s)}
                  className="text-xs font-medium text-stone-500 hover:text-stone-300"
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={handleCommentReaction}
                  className={`text-xs font-medium transition-colors ${
                    reacted ? 'text-amber-600' : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {reacted ? '👍' : 'Like'}
                  {reactionCount > 0 ? ` ${reactionCount}` : ''}
                </button>
              </>
            )}
          </div>

          {showReplyInput && (
            <div className="mt-2">
              <CommentInput
                postId={postId}
                parentId={comment.id}
                onAdded={() => {
                  setShowReplyInput(false)
                  onRefresh()
                }}
              />
            </div>
          )}

          {(comment.replies_count > 0 || (comment.replies?.length ?? 0) > 0) && (
            <button
              onClick={() => setShowReplies((s) => !s)}
              className="mt-1 text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              {showReplies ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {showReplies
                ? 'Hide'
                : `View ${comment.replies_count} ${comment.replies_count === 1 ? 'reply' : 'replies'}`}
            </button>
          )}

          {showReplies && comment.replies?.length && (
            <div className="mt-2 space-y-2 pl-2 border-l-2 border-stone-800">
              {comment.replies.map((reply) => (
                <CommentRow key={reply.id} comment={reply} postId={postId} onRefresh={onRefresh} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Comments section ─────────────────────────────────────────
function CommentsSection({ postId, commentsCount }: { postId: string; commentsCount: number }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<SocialComment[]>([])
  const [loading, setLoading] = useState(false)

  async function loadComments() {
    setLoading(true)
    const data = await getPostComments(postId)
    setComments(data)
    setLoading(false)
  }

  function toggle() {
    if (!open) loadComments()
    setOpen((s) => !s)
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-700 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{commentsCount > 0 ? commentsCount : 'Comment'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-stone-800 pt-3">
          <CommentInput postId={postId} onAdded={loadComments} />
          {loading ? (
            <p className="text-sm text-stone-400 text-center py-2">Loading comments...</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <CommentRow key={c.id} comment={c} postId={postId} onRefresh={loadComments} />
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-stone-400 text-center py-2">No comments yet</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Opportunity banner ───────────────────────────────────────
function formatCompensation(opp: OpportunityDetail): string {
  if (opp.compensation_type === 'negotiable') return 'Negotiable'
  const label =
    opp.compensation_type === 'hourly'
      ? '/hr'
      : opp.compensation_type === 'day_rate'
        ? '/day'
        : '/yr'
  if (opp.compensation_low_cents != null && opp.compensation_high_cents != null) {
    const lo = (opp.compensation_low_cents / 100).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })
    const hi = (opp.compensation_high_cents / 100).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })
    return `$${lo}-$${hi}${label}`
  }
  if (opp.compensation_low_cents != null) {
    const lo = (opp.compensation_low_cents / 100).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })
    return `$${lo}+${label}`
  }
  return 'Negotiable'
}

function formatDuration(d: string): string {
  if (d === 'per_event') return 'Per Event'
  return d.charAt(0).toUpperCase() + d.slice(1)
}

function OpportunityBanner({
  postId,
  isOwner,
  chefId,
}: {
  postId: string
  isOwner: boolean
  chefId: string
}) {
  const [opp, setOpp] = useState<OpportunityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [interestedPending, startInterestTransition] = useTransition()
  const [showInterests, setShowInterests] = useState(false)
  const [interests, setInterests] = useState<OpportunityInterest[]>([])
  const [loadingInterests, setLoadingInterests] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [showMessageInput, setShowMessageInput] = useState(false)
  const [closePending, startCloseTransition] = useTransition()

  useEffect(() => {
    getOpportunityDetail(postId, chefId)
      .then((d) => setOpp(d))
      .catch(() => setOpp(null))
      .finally(() => setLoading(false))
  }, [postId, chefId])

  function handleExpressInterest() {
    if (!opp) return
    startInterestTransition(async () => {
      try {
        const result = await expressInterest({
          opportunityId: opp.id,
          message: messageInput.trim() || null,
        })
        if (!result.success) {
          toast.error(result.error ?? 'Failed to express interest')
          return
        }
        toast.success('Interest sent! The chef will see your message.')
        setOpp((prev) =>
          prev ? { ...prev, my_interest_id: 'sent', my_interest_status: 'expressed' } : prev
        )
        setShowMessageInput(false)
        setMessageInput('')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to express interest')
      }
    })
  }

  function handleLoadInterests() {
    if (!opp) return
    setShowInterests((s) => !s)
    if (!showInterests && interests.length === 0) {
      setLoadingInterests(true)
      getOpportunityInterests(opp.id)
        .then((data) => setInterests(data))
        .catch(() => toast.error('Could not load interests'))
        .finally(() => setLoadingInterests(false))
    }
  }

  function handleClose(status: 'filled' | 'closed') {
    if (!opp) return
    startCloseTransition(async () => {
      try {
        const result = await closeOpportunity({ opportunityId: opp.id, status })
        if (!result.success) {
          toast.error(result.error ?? 'Failed to update opportunity')
          return
        }
        setOpp((prev) => (prev ? { ...prev, status } : prev))
        toast.success(status === 'filled' ? 'Marked as filled' : 'Opportunity closed')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to update opportunity')
      }
    })
  }

  if (loading) return null
  if (!opp) return null

  const isFilled = opp.status === 'filled'
  const isClosed = opp.status === 'closed'
  const isInactive = isFilled || isClosed
  const alreadyInterested = !!opp.my_interest_id

  return (
    <div
      className={`mt-3 border rounded-xl p-3 space-y-2 ${isInactive ? 'border-stone-700 opacity-70' : 'border-amber-700/40 bg-amber-950/10'}`}
    >
      {/* Role + status badges */}
      <div className="flex items-center flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-900/60 text-amber-300 text-xs font-semibold">
          <Sparkles className="h-3 w-3" />
          {opp.role_title}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-stone-600 text-stone-400 text-xs">
          {formatDuration(opp.duration_type)}
        </span>
        {isInactive && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isFilled ? 'bg-green-900/40 text-green-300 border border-green-700/50' : 'bg-stone-800 text-stone-400 border border-stone-600'}`}
          >
            {isFilled ? 'Filled' : 'Closed'}
          </span>
        )}
      </div>

      {/* Location + compensation */}
      <div className="flex flex-wrap gap-3 text-xs text-stone-400">
        {(opp.location_city || opp.location_state) && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-stone-500" />
            {[opp.location_city, opp.location_state].filter(Boolean).join(', ')}
          </span>
        )}
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-stone-500" />
          {formatCompensation(opp)}
        </span>
      </div>

      {/* Actions */}
      {!isOwner && !isInactive && (
        <div className="pt-1">
          {alreadyInterested ? (
            <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
              <Check className="h-3.5 w-3.5" />
              Interest sent
            </span>
          ) : showMessageInput ? (
            <div className="space-y-2">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Optional: introduce yourself..."
                rows={2}
                maxLength={1000}
                className="w-full resize-none text-sm border border-stone-700 rounded-lg px-3 py-2 bg-stone-900 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleExpressInterest}
                  disabled={interestedPending}
                  className="text-xs px-3 py-1.5 h-auto"
                >
                  {interestedPending ? 'Sending...' : "I'm Interested"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowMessageInput(false)}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={() => setShowMessageInput(true)}
              disabled={interestedPending}
              className="text-xs px-3 py-1.5 h-auto"
            >
              {"I'm Interested"}
            </Button>
          )}
        </div>
      )}

      {/* Posting chef: interest count + manage */}
      {isOwner && (
        <div className="pt-1 space-y-2">
          <button
            type="button"
            onClick={handleLoadInterests}
            className="text-xs text-amber-500 hover:text-amber-300 font-medium"
          >
            {opp.interest_count === 0
              ? 'No interest yet'
              : `${opp.interest_count} chef${opp.interest_count !== 1 ? 's' : ''} interested`}
            {opp.interest_count > 0 && (
              <span className="ml-1">{showInterests ? '(hide)' : '(view)'}</span>
            )}
          </button>

          {showInterests && (
            <div className="space-y-2 border-t border-stone-700 pt-2">
              {loadingInterests && <p className="text-xs text-stone-500">Loading...</p>}
              {!loadingInterests && interests.length === 0 && (
                <p className="text-xs text-stone-500">No interests yet.</p>
              )}
              {interests.map((interest) => (
                <div key={interest.id} className="flex items-start gap-2 text-xs">
                  <Link
                    href={`/network/${interest.chef_id}`}
                    className="font-medium text-stone-200 hover:underline flex-shrink-0"
                  >
                    {interest.chef_display_name ?? interest.chef_business_name}
                  </Link>
                  {(interest.chef_city || interest.chef_state) && (
                    <span className="text-stone-500">
                      {[interest.chef_city, interest.chef_state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {interest.message && (
                    <p className="text-stone-400 italic truncate">
                      &ldquo;{interest.message}&rdquo;
                    </p>
                  )}
                  <span
                    className={`ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-full text-xxs ${
                      interest.status === 'connected'
                        ? 'bg-green-900/40 text-green-300'
                        : interest.status === 'declined'
                          ? 'bg-stone-700 text-stone-400'
                          : 'bg-amber-900/40 text-amber-300'
                    }`}
                  >
                    {interest.status === 'expressed'
                      ? 'New'
                      : interest.status.charAt(0).toUpperCase() + interest.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Close / fill controls */}
          {opp.status === 'open' && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleClose('filled')}
                disabled={closePending}
                className="text-xs text-green-500 hover:text-green-300 font-medium disabled:opacity-50"
              >
                Mark as filled
              </button>
              <span className="text-stone-600">·</span>
              <button
                type="button"
                onClick={() => handleClose('closed')}
                disabled={closePending}
                className="text-xs text-stone-500 hover:text-stone-300 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main post card ───────────────────────────────────────────
function OriginalPostPreview({ post }: { post: SocialPost | null }) {
  if (!post) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 px-3 py-2">
        <p className="text-xs text-stone-500">Original post is no longer available.</p>
      </div>
    )
  }

  const authorName = post.author.display_name ?? post.author.business_name

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/50 px-3 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <ChefAvatar author={post.author} size={24} />
        <div className="min-w-0">
          <Link
            href={`/network/${post.chef_id}`}
            className="block truncate text-xs font-semibold text-stone-200 hover:underline"
          >
            {authorName}
          </Link>
          <p className="text-xxs text-stone-500">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm text-stone-300">
        {post.content}
      </p>
      {post.media_urls.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-stone-700">
          <MediaGrid urls={post.media_urls.slice(0, 4)} types={post.media_types.slice(0, 4)} />
        </div>
      )}
    </div>
  )
}

export function SocialPostCard({
  post,
  onDelete,
}: {
  post: SocialPost
  onDelete?: (id: string) => void
}) {
  const [myReaction, setMyReaction] = useState<ReactionType | null>(post.my_reaction)
  const [reactionsCount, setReactionsCount] = useState(post.reactions_count)
  const [isSaved, setIsSaved] = useState(post.is_saved)
  const [savesCount, setSavesCount] = useState(post.saves_count)
  const [sharesCount, setSharesCount] = useState(post.shares_count)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showRepostPanel, setShowRepostPanel] = useState(false)
  const [repostComment, setRepostComment] = useState('')
  const [repostPending, startRepostTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [, startTransition] = useTransition()

  const authorName = post.author.display_name ?? post.author.business_name
  const repostBlockedReason = getRepostBlockedReason(post.visibility)

  function handleReactionChange(r: ReactionType | null) {
    const prev = myReaction
    setMyReaction(r)
    if (prev === null && r !== null) setReactionsCount((c) => c + 1)
    else if (prev !== null && r === null) setReactionsCount((c) => Math.max(0, c - 1))
  }

  function handleSave() {
    const prevSaved = isSaved
    const prevCount = savesCount
    setIsSaved((s) => !s)
    setSavesCount((c) => (isSaved ? Math.max(0, c - 1) : c + 1))
    startTransition(async () => {
      try {
        await toggleSavePost(post.id)
      } catch (err) {
        setIsSaved(prevSaved)
        setSavesCount(prevCount)
        toast.error('Failed to save post')
      }
    })
  }

  function copyPostLink() {
    const url = `${window.location.origin}/network?post=${post.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleShare() {
    if (repostBlockedReason) {
      copyPostLink()
      toast.info(repostBlockedReason)
      return
    }
    setShowRepostPanel((value) => !value)
  }

  function handleRepost() {
    const previousSharesCount = sharesCount
    setSharesCount((count) => count + 1)
    startRepostTransition(async () => {
      try {
        const result = await createRepost({
          originalPostId: post.id,
          shareComment: repostComment.trim() || null,
          visibility: 'public',
        })
        if (!result.success) {
          setSharesCount(previousSharesCount)
          toast.error('Failed to repost')
          return
        }
        setRepostComment('')
        setShowRepostPanel(false)
        toast.success('Reposted to the community')
      } catch (err: any) {
        setSharesCount(previousSharesCount)
        toast.error(err.message ?? 'Failed to repost')
      }
    })
  }

  function handleDelete() {
    setShowMenu(false)
    setShowDeleteConfirm(true)
  }

  const { execute: deferPostDelete } = useDeferredAction({
    delay: 8000,
    toastMessage: 'Post deleted',
    onExecute: async () => {
      await deleteSocialPost(post.id)
      onDelete?.(post.id)
    },
    onUndo: () => {
      setDeleted(false)
    },
    onError: () => {
      setDeleted(false)
      toast.error('Failed to delete post')
    },
  })

  function handleConfirmedDelete() {
    setShowDeleteConfirm(false)
    setDeleted(true)
    deferPostDelete()
  }

  if (deleted) {
    return (
      <article className="bg-stone-900/50 rounded-2xl border border-stone-800 p-6 text-center">
        <p className="text-sm text-stone-500 italic">Post deleted (undo in toast)</p>
      </article>
    )
  }

  return (
    <article className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-0">
        <div className="flex items-center gap-3">
          <Link href={`/network/${post.chef_id}`}>
            <ChefAvatar author={post.author} />
          </Link>
          <div>
            <Link
              href={`/network/${post.chef_id}`}
              className="font-semibold text-stone-100 hover:underline text-sm"
            >
              {authorName}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-stone-400">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              {post.is_edited && <span className="text-xs text-stone-400">· edited</span>}
              {post.location_tag && (
                <span className="flex items-center gap-0.5 text-xs text-stone-400">
                  <MapPin className="h-3 w-3" />
                  {post.location_tag}
                </span>
              )}
              {post.channel && (
                <Link
                  href={`/network/channels/${post.channel.slug}`}
                  className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800"
                >
                  <span>{post.channel.icon}</span>
                  {post.channel.name}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          {post.is_mine && (
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="p-1.5 rounded-lg hover:bg-stone-700 text-stone-400"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-stone-900 border border-stone-700 rounded-xl shadow-lg z-10 min-w-[140px]">
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-950 rounded-xl"
              >
                Delete post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3">
        {/* Repost banner */}
        {post.post_type === 'share' && post.original_post_id && (
          <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-2">
            <Repeat2 className="h-3.5 w-3.5" />
            <span>Reposted</span>
          </div>
        )}

        {/* Main text */}
        <p className="text-sm text-stone-200 whitespace-pre-wrap break-words leading-relaxed">
          {post.content}
        </p>

        {post.post_type === 'share' && (
          <div className="mt-3">
            <OriginalPostPreview post={post.original_post ?? null} />
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.hashtags.map((tag) => (
              <Link
                key={tag}
                href={`/network?tab=feed&mode=global&tag=${encodeURIComponent(tag)}`}
                className="text-xs text-amber-700 font-medium hover:underline"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Media */}
        {post.media_urls.length > 0 && (
          <div className="mt-3">
            <MediaGrid urls={post.media_urls} types={post.media_types} />
          </div>
        )}

        {/* Opportunity detail banner */}
        {post.post_type === 'opportunity' && (
          <OpportunityBanner postId={post.id} isOwner={post.is_mine} chefId={post.chef_id} />
        )}

        {/* Poll */}
        {post.poll_question && post.poll_options && (
          <div className="mt-3 border border-stone-700 rounded-xl p-3 space-y-2">
            <p className="text-sm font-medium text-stone-200">{post.poll_question}</p>
            {post.poll_options.map((opt) => (
              <div key={opt.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-400">{opt.text}</span>
                <span className="text-stone-400 text-xs">{opt.votes} votes</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      {(reactionsCount > 0 || post.comments_count > 0 || savesCount > 0 || sharesCount > 0) && (
        <div className="px-4 pt-2 pb-0">
          <div className="flex items-center justify-between text-xs text-stone-400 pb-2 border-b border-stone-800">
            <div className="flex items-center gap-3">
              {reactionsCount > 0 && (
                <span>
                  {reactionsCount} {reactionsCount === 1 ? 'reaction' : 'reactions'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {post.comments_count > 0 && (
                <span>
                  {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
                </span>
              )}
              {savesCount > 0 && <span>{savesCount} saves</span>}
              {sharesCount > 0 && <span>{sharesCount} shares</span>}
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="px-4 py-2 flex items-center gap-1 flex-wrap">
        <ReactionBar
          postId={post.id}
          myReaction={myReaction}
          reactionsCount={reactionsCount}
          onReactionChange={handleReactionChange}
        />

        <CommentsSection postId={post.id} commentsCount={post.comments_count} />

        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isSaved ? 'text-amber-700 bg-amber-950' : 'text-stone-400 hover:bg-stone-700'
          }`}
        >
          {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        <button
          onClick={handleShare}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            copied ? 'text-green-700 bg-green-950' : 'text-stone-400 hover:bg-stone-700'
          }`}
          title={repostBlockedReason ?? 'Repost this to the chef community'}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : repostBlockedReason ? (
            <Share2 className="h-4 w-4" />
          ) : (
            <Repeat2 className="h-4 w-4" />
          )}
          <span>{copied ? 'Copied!' : repostBlockedReason ? 'Copy' : 'Repost'}</span>
        </button>
      </div>

      {showRepostPanel && !repostBlockedReason && (
        <div className="border-t border-stone-800 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-200">Repost to community</p>
            <button
              type="button"
              onClick={() => setShowRepostPanel(false)}
              className="rounded-lg p-1 text-stone-500 hover:bg-stone-800 hover:text-stone-300"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={repostComment}
            onChange={(event) => setRepostComment(event.target.value)}
            placeholder="Add your take, why this matters, or who should see it..."
            rows={2}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <OriginalPostPreview post={post.original_post ?? post} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={copyPostLink}
              className="text-xs font-medium text-stone-500 hover:text-stone-300"
            >
              Copy link instead
            </button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRepostPanel(false)}
                disabled={repostPending}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleRepost} disabled={repostPending}>
                {repostPending ? 'Reposting...' : 'Repost'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this post?"
        description="You'll have 8 seconds to undo."
        confirmLabel="Delete"
        variant="danger"
        loading={deleted}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </article>
  )
}

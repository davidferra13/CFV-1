'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, ChevronLeft, ChevronRight } from '@/components/ui/icons'
import type { StoryGroup, SocialStory } from '@/lib/social/chef-social-actions'
import {
  markStoryViewed,
  reactToStory,
  createStory,
  uploadPostMedia,
} from '@/lib/social/chef-social-actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

const STORY_REACTIONS = ['😋', '🔥', '👏', '😮', '💡', '❤️', '😂']

// ── Single story avatar ──────────────────────────────────────
function StoryAvatar({ group, onClick }: { group: StoryGroup; onClick: () => void }) {
  const authorName = group.chef.display_name ?? group.chef.business_name
  const initials = authorName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 flex-shrink-0 group">
      <div
        className={`p-0.5 rounded-full ${
          group.has_unseen
            ? 'bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500'
            : 'bg-stone-700'
        }`}
      >
        <div className="bg-stone-900 p-0.5 rounded-full">
          <Avatar className="w-12 h-12">
            {group.chef.profile_image_url && (
              <AvatarImage src={group.chef.profile_image_url} alt={authorName} />
            )}
            <AvatarFallback className="bg-amber-900 text-amber-800 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <span className="text-xs text-stone-400 max-w-[56px] truncate group-hover:text-stone-100">
        {authorName.split(' ')[0]}
      </span>
    </button>
  )
}

// ── Add story button ─────────────────────────────────────────
function AddStoryButton({ onAdded }: { onAdded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadPostMedia(formData)
    await createStory({ media_url: result.url, media_type: result.type })
    onAdded()
  }

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <button
        onClick={() => fileRef.current?.click()}
        className="relative w-12 h-12 rounded-full border-2 border-dashed border-stone-600 hover:border-amber-400 flex items-center justify-center bg-stone-800 hover:bg-amber-950 transition-colors"
      >
        <Plus className="h-5 w-5 text-stone-400" />
      </button>
      <span className="text-xs text-stone-500">Add story</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  )
}

// ── Full-screen story viewer ─────────────────────────────────
function StoryViewer({
  groups,
  startGroupIndex,
  onClose,
}: {
  groups: StoryGroup[]
  startGroupIndex: number
  onClose: () => void
}) {
  const [groupIdx, setGroupIdx] = useState(startGroupIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [showReactions, setShowReactions] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const advanceRef = useRef<() => void>(() => {})

  const group = groups[groupIdx]
  const story: SocialStory | undefined = group?.stories[storyIdx]

  function advance() {
    const nextStory = storyIdx + 1
    if (nextStory < group.stories.length) {
      setStoryIdx(nextStory)
    } else {
      const nextGroup = groupIdx + 1
      if (nextGroup < groups.length) {
        setGroupIdx(nextGroup)
        setStoryIdx(0)
      } else {
        onClose()
      }
    }
  }
  advanceRef.current = advance

  useEffect(() => {
    if (!story) return
    markStoryViewed(story.id).catch(() => {})

    setProgress(0)
    if (intervalRef.current) clearInterval(intervalRef.current)

    const duration = story.media_type === 'video' ? (story.duration_seconds ?? 15) * 1000 : 5000
    const step = 100 / (duration / 100)

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(intervalRef.current!)
          advanceRef.current()
          return 100
        }
        return p + step
      })
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [groupIdx, storyIdx, story])

  function goBack() {
    if (storyIdx > 0) {
      setStoryIdx(storyIdx - 1)
    } else if (groupIdx > 0) {
      setGroupIdx(groupIdx - 1)
      setStoryIdx(groups[groupIdx - 1].stories.length - 1)
    }
  }

  async function handleReaction(emoji: string) {
    if (!story) return
    setShowReactions(false)
    await reactToStory({ storyId: story.id, emoji })
  }

  if (!story || !group) return null

  const authorName = group.chef.display_name ?? group.chef.business_name

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      role="dialog"
      aria-label="Story viewer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
    >
      <div
        className="relative w-full max-w-sm h-full max-h-[90vh] bg-stone-900 rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-stone-900/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-900 rounded-full transition-none"
                style={{ width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 border-2 border-white">
              {group.chef.profile_image_url && (
                <AvatarImage src={group.chef.profile_image_url} alt={authorName} />
              )}
              <AvatarFallback className="bg-amber-200 text-amber-800 text-xs">
                {authorName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{authorName}</p>
              <p className="text-white/70 text-xs">
                {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Media */}
        <div className="flex-1 relative">
          {story.media_type === 'video' ? (
            <video
              ref={videoRef}
              src={story.media_url}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.media_url} alt="" className="w-full h-full object-contain" />
          )}

          {/* Caption */}
          {story.caption && (
            <div className="absolute bottom-12 left-0 right-0 px-4">
              <p className="text-white text-sm text-center drop-shadow-lg bg-black/20 rounded-xl px-3 py-2">
                {story.caption}
              </p>
            </div>
          )}
        </div>

        {/* Nav areas */}
        <button
          onClick={goBack}
          className="absolute left-0 top-0 bottom-0 w-1/4 z-20"
          aria-label="Previous"
        />
        <button
          onClick={advance}
          className="absolute right-0 top-0 bottom-0 w-1/4 z-20"
          aria-label="Next"
        />

        {/* Reaction bar */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center gap-2 z-10">
          {showReactions ? (
            <div className="flex items-center gap-2 bg-stone-900/10 backdrop-blur rounded-2xl px-3 py-2 w-full">
              {STORY_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
              <button onClick={() => setShowReactions(false)} className="ml-auto text-white/60">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowReactions(true)}
              className="flex-1 text-left bg-stone-900/10 backdrop-blur border border-white/20 rounded-2xl px-4 py-2 text-white/70 text-sm"
            >
              React to story...
            </button>
          )}
        </div>
      </div>

      {/* Prev / next group arrows */}
      {groupIdx > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setGroupIdx(groupIdx - 1)
            setStoryIdx(0)
          }}
          className="absolute left-4 text-white/60 hover:text-white"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setGroupIdx(groupIdx + 1)
            setStoryIdx(0)
          }}
          className="absolute right-4 text-white/60 hover:text-white"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}
    </div>
  )
}

// ── Main story bar ───────────────────────────────────────────
export function SocialStoryBar({
  groups,
  onRefresh,
}: {
  groups: StoryGroup[]
  onRefresh: () => void
}) {
  const [viewerGroup, setViewerGroup] = useState<number | null>(null)

  if (groups.length === 0) {
    return (
      <div className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm p-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
        <AddStoryButton onAdded={onRefresh} />
        <p className="text-sm text-stone-400 italic">No stories yet — be the first to post one!</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm p-3 flex items-center gap-4 overflow-x-auto scrollbar-hide">
        <AddStoryButton onAdded={onRefresh} />
        {groups.map((group, i) => (
          <StoryAvatar key={group.chef.id} group={group} onClick={() => setViewerGroup(i)} />
        ))}
      </div>

      {viewerGroup !== null && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerGroup}
          onClose={() => setViewerGroup(null)}
        />
      )}
    </>
  )
}

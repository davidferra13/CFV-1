'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Bookmark, Lightbulb, Plus, X, Clock } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { addChefTip } from '@/lib/chef/knowledge/tip-actions'
import { CHEFTIP_CATEGORIES } from '@/lib/chef/knowledge/tip-types'
import type { ChefTip } from '@/lib/chef/knowledge/tip-types'
import { toast } from 'sonner'

type ChefTipsWidgetProps = {
  todaysTips: ChefTip[]
  totalCount: number
  streak: number
  pastTip: ChefTip | null
  reviewCount?: number
}

const PLACEHOLDERS = [
  'A prep trick, a mistake to avoid, a client insight...',
  'Something you tasted, timed, or tried differently...',
  'A technique that clicked, a shortcut that worked...',
  'What surprised you in the kitchen today?',
  'A flavor pairing, a timing adjustment, a plating idea...',
]

function getPlaceholder() {
  return PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
}

function relativeDate(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

export function ChefTipsWidget({
  todaysTips,
  totalCount,
  streak,
  pastTip,
  reviewCount = 0,
}: ChefTipsWidgetProps) {
  const [tips, setTips] = useState(todaysTips)
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showInput, setShowInput] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [dismissedPastTip, setDismissedPastTip] = useState(false)

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    )
  }

  function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed) return

    startTransition(async () => {
      try {
        const result = await addChefTip(trimmed, selectedTags)
        if (result.success) {
          setTips((prev) => [
            {
              id: result.id!,
              content: trimmed,
              tags: selectedTags,
              shared: false,
              pinned: false,
              review: false,
              promoted_to: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ])
          setContent('')
          setSelectedTags([])
          setShowInput(false)
          toast.success('Tip saved')
        } else {
          toast.error(result.error || 'Failed to save tip')
        }
      } catch {
        toast.error('Failed to save tip')
      }
    })
  }

  return (
    <Card className="border-amber-900/40 bg-stone-900/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-amber-200 flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            What did you learn today?
          </CardTitle>
          <div className="flex items-center gap-2">
            {reviewCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-blue-900/40 px-2 py-0.5 text-[10px] text-blue-400">
                <Bookmark className="h-3 w-3" />
                {reviewCount} to review
              </span>
            )}
            <Link
              href="/culinary/chefnotes"
              className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-400"
              title="ChefNotes"
            >
              <BookOpen className="h-3 w-3" />
            </Link>
            <Link
              href="/culinary/cheftips"
              className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-400"
            >
              {totalCount > 0 && <span>{totalCount} tips</span>}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Random past tip as daily inspiration */}
        {pastTip && !dismissedPastTip && tips.length === 0 && (
          <div className="rounded-md border border-amber-900/20 bg-amber-950/20 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-600/80 flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  You wrote {relativeDate(pastTip.created_at)}
                </p>
                <p className="text-sm text-amber-300/80 italic">&ldquo;{pastTip.content}&rdquo;</p>
              </div>
              <button
                type="button"
                onClick={() => setDismissedPastTip(true)}
                className="shrink-0 text-stone-600 hover:text-stone-500 p-0.5"
                title="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Today's entries */}
        {tips.length > 0 && (
          <div className="space-y-2">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="rounded-md border border-stone-700/50 bg-stone-800/50 px-3 py-2 group"
              >
                <p className="text-sm text-stone-300">{tip.content}</p>
                {tip.tags.length > 0 && (
                  <div className="mt-1 flex gap-1">
                    {tip.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        {showInput ? (
          <div className="space-y-2">
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700 resize-none"
                rows={2}
                maxLength={2000}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit()
                  }
                  if (e.key === 'Escape') {
                    setShowInput(false)
                    setContent('')
                    setSelectedTags([])
                  }
                }}
              />
              {content.length > 0 && (
                <span className="absolute bottom-1.5 right-2 text-[10px] text-stone-600">
                  {content.length}/2000
                </span>
              )}
            </div>
            {/* Quick tag toggles (compact for widget) */}
            <div className="flex flex-wrap gap-1">
              {CHEFTIP_CATEGORIES.slice(0, 6).map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleTag(cat.value)}
                  className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                    selectedTags.includes(cat.value)
                      ? 'bg-amber-700 text-amber-100'
                      : 'bg-stone-800 text-stone-600 hover:text-stone-400'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-stone-700 hidden sm:inline">Ctrl+Enter</span>
              <button
                type="button"
                title="Cancel"
                onClick={() => {
                  setShowInput(false)
                  setContent('')
                  setSelectedTags([])
                }}
                className="rounded-md px-2 py-1 text-xs text-stone-500 hover:text-stone-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !content.trim()}
                className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-amber-100 hover:bg-amber-600 disabled:opacity-40"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex w-full items-center gap-2 rounded-md border border-dashed border-stone-700 px-3 py-2 text-sm text-stone-500 hover:border-amber-800 hover:text-amber-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {tips.length === 0 ? 'Add a lesson' : 'Add another'}
          </button>
        )}

        {/* Subtle streak (not gamified, just informational) */}
        {streak > 1 && (
          <p className="text-xs text-stone-600 text-center">{streak} days of learning captured</p>
        )}
      </CardContent>
    </Card>
  )
}

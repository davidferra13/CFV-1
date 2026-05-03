'use client'

import { useState, useTransition } from 'react'
import { Lightbulb, BookOpen, Users, Search } from '@/components/ui/icons'
import {
  getSharedTips,
  getSharedNotes,
  getMatchingChefsByTags,
} from '@/lib/knowledge/explore-actions'
import type { ChefTip } from '@/lib/chef/knowledge/tip-types'
import type { ChefNote } from '@/lib/chef/knowledge/note-types'

type ExploreMode = 'tips' | 'notes'

type Props = {
  mode: ExploreMode
}

export function ExplorePanel({ mode }: Props) {
  const [sharedTips, setSharedTips] = useState<(ChefTip & { chef_display_name?: string })[]>([])
  const [sharedNotes, setSharedNotes] = useState<(ChefNote & { chef_display_name?: string })[]>([])
  const [matchingChefs, setMatchingChefs] = useState<
    { chefId: string; displayName: string; matchingTags: string[]; tipCount: number }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  function loadData(tag?: string) {
    startTransition(async () => {
      if (mode === 'tips') {
        const [tipsResult, chefsResult] = await Promise.all([
          getSharedTips({ tag: tag || undefined, limit: 20 }),
          !loaded ? getMatchingChefsByTags() : Promise.resolve(matchingChefs),
        ])
        setSharedTips(tipsResult.tips)
        setTotal(tipsResult.total)
        if (!loaded) setMatchingChefs(chefsResult as any)
      } else {
        const result = await getSharedNotes({ tag: tag || undefined, limit: 20 })
        setSharedNotes(result.notes)
        setTotal(result.total)
      }
      setLoaded(true)
    })
  }

  if (!loaded) {
    return (
      <div className="rounded-lg border border-dashed border-stone-700 p-6 text-center">
        <Users className="mx-auto h-6 w-6 text-stone-600" />
        <p className="mt-2 text-sm text-stone-400">
          See what other chefs are learning and documenting.
        </p>
        <button
          type="button"
          onClick={() => loadData()}
          disabled={isPending}
          className="mt-3 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-600 disabled:opacity-40"
        >
          {isPending ? 'Loading...' : 'Explore Community'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Matching chefs (tips mode only) */}
      {mode === 'tips' && matchingChefs.length > 0 && (
        <div className="rounded-lg border border-amber-900/30 bg-amber-950/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600/70 mb-2">
            Like-minded chefs
          </p>
          <div className="space-y-2">
            {matchingChefs.slice(0, 5).map((chef) => (
              <div key={chef.chefId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-stone-700 flex items-center justify-center text-xs text-stone-400">
                    {chef.displayName.charAt(0)}
                  </div>
                  <span className="text-sm text-stone-300">{chef.displayName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {chef.matchingTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-400"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="text-xs text-stone-600">{chef.tipCount} shared</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600" />
          <input
            type="text"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData(tagFilter)}
            placeholder="Filter by tag..."
            className="w-full rounded-md border border-stone-700 bg-stone-800 py-2 pl-9 pr-3 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => loadData(tagFilter)}
          disabled={isPending}
          className="rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-400 hover:bg-stone-700 disabled:opacity-40"
        >
          {isPending ? '...' : 'Search'}
        </button>
      </div>

      {/* Shared tips */}
      {mode === 'tips' && (
        <>
          {sharedTips.length === 0 ? (
            <p className="text-center text-sm text-stone-500 py-4">
              No shared tips found. Be the first to share!
            </p>
          ) : (
            <div className="space-y-2">
              {sharedTips.map((tip) => (
                <div
                  key={tip.id}
                  className="rounded-lg border border-stone-700/50 bg-stone-800/40 px-4 py-3"
                >
                  <p className="text-sm text-stone-300">{tip.content}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      {tip.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-stone-600">
                      {(tip as any).chef_display_name || 'A Chef'}
                    </span>
                  </div>
                </div>
              ))}
              {total > sharedTips.length && (
                <p className="text-center text-xs text-stone-600">
                  {total - sharedTips.length} more shared tips
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Shared notes */}
      {mode === 'notes' && (
        <>
          {sharedNotes.length === 0 ? (
            <p className="text-center text-sm text-stone-500 py-4">
              No shared notes found. Be the first to share!
            </p>
          ) : (
            <div className="space-y-2">
              {sharedNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-stone-700/50 bg-stone-800/40 px-4 py-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                    <h4 className="text-sm font-medium text-stone-200">{note.title}</h4>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        note.note_type === 'reference'
                          ? 'bg-blue-900/40 text-blue-400'
                          : 'bg-stone-700/50 text-stone-400'
                      }`}
                    >
                      {note.note_type === 'reference' ? 'ref' : 'journal'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 line-clamp-2">
                    {note.body.length > 150 ? note.body.slice(0, 150) + '...' : note.body}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-stone-600">
                      {(note as any).chef_display_name || 'A Chef'}
                    </span>
                  </div>
                </div>
              ))}
              {total > sharedNotes.length && (
                <p className="text-center text-xs text-stone-600">
                  {total - sharedNotes.length} more shared notes
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

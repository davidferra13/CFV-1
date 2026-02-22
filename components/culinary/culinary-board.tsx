'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BoardView } from './board-view'
import { ListView } from './list-view'
import { AddWordDialog } from './add-word-dialog'
import { AdminWordList } from './admin-word-list'
import { DEFAULT_CULINARY_WORDS } from '@/lib/culinary-words/constants'
import type { CulinaryWord } from '@/lib/culinary-words/constants'
import type { UserCulinaryWord } from '@/lib/culinary-words/actions'

type CulinaryBoardProps = {
  userWords: UserCulinaryWord[]
  isAdmin: boolean
}

type ViewMode = 'board' | 'list' | 'admin'

export function CulinaryBoard({ userWords, isAdmin }: CulinaryBoardProps) {
  const [view, setView] = useState<ViewMode>('board')
  const router = useRouter()

  const allWords: CulinaryWord[] = useMemo(() => {
    const userAsCulinary: CulinaryWord[] = userWords.map((uw) => ({
      word: uw.word,
      tier: uw.tier,
      category: uw.category,
    }))
    return [...DEFAULT_CULINARY_WORDS, ...userAsCulinary]
  }, [userWords])

  const handleWordAdded = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="space-y-6">
      {/* Header + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-stone-600 mt-1">
            {allWords.length} words across {11} categories — your complete culinary vocabulary
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5">
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'board' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              List
            </button>
            {isAdmin && (
              <button
                onClick={() => setView('admin')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'admin'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Submissions
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Word */}
      {(view === 'board' || view === 'list') && <AddWordDialog onAdded={handleWordAdded} />}

      {/* User words badge */}
      {userWords.length > 0 && (view === 'board' || view === 'list') && (
        <p className="text-xs text-stone-400">
          Includes {userWords.length} word{userWords.length !== 1 ? 's' : ''} you added
        </p>
      )}

      {/* Views */}
      {view === 'board' && <BoardView words={allWords} />}
      {view === 'list' && <ListView words={allWords} />}
      {view === 'admin' && isAdmin && <AdminWordList />}
    </div>
  )
}

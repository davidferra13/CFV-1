'use client'

import { useMemo, useCallback, useRef } from 'react'
import type { CulinaryWord, WordCategory, WordTier } from '@/lib/culinary-words/constants'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  TIER_LABELS,
} from '@/lib/culinary-words/constants'
import { getWordAnimation, getAnimationClass } from '@/lib/culinary-words/animations'

type ListViewProps = {
  words: CulinaryWord[]
}

const TIER_BADGE_COLORS: Record<WordTier, string> = {
  1: 'bg-amber-900 text-amber-200 border-amber-300',
  2: 'bg-blue-900 text-blue-200 border-blue-300',
  3: 'bg-stone-800 text-stone-300 border-stone-600',
  4: 'bg-purple-900 text-purple-200 border-purple-300',
}

export function ListView({ words }: ListViewProps) {
  const animatingSet = useRef(new Set<string>())

  const grouped = useMemo(() => {
    const map = new Map<WordCategory, CulinaryWord[]>()
    for (const cat of CATEGORIES) {
      map.set(cat, [])
    }
    for (const w of words) {
      map.get(w.category)?.push(w)
    }
    // Sort each group: tier ascending, then alphabetical
    for (const [, list] of map) {
      list.sort((a, b) => a.tier - b.tier || a.word.localeCompare(b.word))
    }
    return map
  }, [words])

  const handleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget
    const word = el.dataset.word
    if (!word) return

    if (animatingSet.current.has(word)) return
    animatingSet.current.add(word)

    const anim = getWordAnimation(word)
    const cls = getAnimationClass(anim)

    // List view has no rotation, so set base-rotate to none
    el.style.setProperty('--base-rotate', 'rotate(0deg)')
    el.classList.add(cls)

    const onEnd = () => {
      el.classList.remove(cls)
      animatingSet.current.delete(word)
      el.removeEventListener('animationend', onEnd)
    }
    el.addEventListener('animationend', onEnd)
  }, [])

  return (
    <div className="space-y-8">
      {CATEGORIES.map((cat) => {
        const catWords = grouped.get(cat) || []
        if (catWords.length === 0) return null

        return (
          <section key={cat}>
            <h3 className="text-lg font-semibold text-stone-100 mb-3 flex items-center gap-2">
              <span>{CATEGORY_ICONS[cat]}</span>
              <span>{CATEGORY_LABELS[cat]}</span>
              <span className="text-sm font-normal text-stone-400">({catWords.length})</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {catWords.map((w, i) => (
                <span
                  key={`${w.word}-${i}`}
                  className={`culinary-word-clickable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${TIER_BADGE_COLORS[w.tier]}`}
                  title={`Tier ${w.tier}: ${TIER_LABELS[w.tier]} — click me!`}
                  data-word={w.word}
                  onClick={handleClick}
                >
                  {w.tier <= 2 && <span className="font-bold text-xs">T{w.tier}</span>}
                  <span className={w.tier <= 2 ? 'font-semibold' : ''}>{w.word}</span>
                </span>
              ))}
            </div>
          </section>
        )
      })}

      {/* Legend */}
      <div className="border-t border-stone-700 pt-4 mt-8">
        <p className="text-xs text-stone-500 font-medium mb-2">Tier Legend</p>
        <div className="flex flex-wrap gap-3">
          {([1, 2, 3, 4] as WordTier[]).map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${TIER_BADGE_COLORS[t]}`}
            >
              <span className="font-bold">T{t}</span>
              <span>{TIER_LABELS[t]}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

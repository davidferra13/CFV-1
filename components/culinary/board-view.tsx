'use client'

import { useMemo, useCallback, useRef } from 'react'
import type { CulinaryWord } from '@/lib/culinary-words/constants'
import { BOARD_COLORS, BOARD_FONTS, wordHash } from '@/lib/culinary-words/constants'
import { getWordAnimation, getAnimationClass } from '@/lib/culinary-words/animations'

type BoardViewProps = {
  words: CulinaryWord[]
}

const TIER_SIZES: Record<number, string> = {
  1: 'clamp(2.8rem, 5.5vw, 5rem)',
  2: 'clamp(1.6rem, 3vw, 2.8rem)',
  3: 'clamp(0.95rem, 1.8vw, 1.5rem)',
  4: 'clamp(0.7rem, 1.1vw, 1rem)',
}

const ROTATIONS = [-7, -5, -3, -2, -1, 0, 0, 0, 1, 2, 3, 5, 7]

const DECORATIONS = [
  'none',
  'none',
  'none',
  'none',
  'none',
  'underline',
  'underline wavy',
  'none',
  'none',
  'none',
]

export function BoardView({ words }: BoardViewProps) {
  const animatingSet = useRef(new Set<string>())

  const styledWords = useMemo(() => {
    return words.map((w) => {
      const h = wordHash(w.word)
      const color = BOARD_COLORS[h % BOARD_COLORS.length]
      const font = BOARD_FONTS[(h >> 3) % BOARD_FONTS.length]
      const rotation = ROTATIONS[(h >> 5) % ROTATIONS.length]
      const decoration = DECORATIONS[(h >> 7) % DECORATIONS.length]
      const marginTop = ((h >> 9) % 12) - 4 // -4px to 7px
      const marginLeft = ((h >> 11) % 6) - 2 // -2px to 3px
      const isUppercase = w.tier === 1 || ((h >> 13) % 8 === 0 && w.tier === 2)
      const suffix = (h >> 15) % 12 === 0 ? '!' : (h >> 15) % 15 === 0 ? '?' : ''

      return {
        ...w,
        rotation,
        displayWord: (isUppercase ? w.word.toUpperCase() : w.word) + suffix,
        style: {
          '--base-rotate': `rotate(${rotation}deg)`,
          color,
          fontFamily: font,
          fontSize: TIER_SIZES[w.tier],
          fontWeight: w.tier <= 2 ? 700 : 400,
          transform: `rotate(${rotation}deg)`,
          textDecoration: decoration,
          textDecorationColor: decoration !== 'none' ? color : undefined,
          textUnderlineOffset: '5px',
          marginTop: `${marginTop}px`,
          marginLeft: `${marginLeft}px`,
          textShadow: `0 0 8px ${color}40`,
          letterSpacing: w.tier === 1 ? '2px' : w.tier === 4 ? '1px' : undefined,
          padding: w.tier === 1 ? '6px 14px' : w.tier === 2 ? '4px 10px' : '3px 7px',
        } as React.CSSProperties,
      }
    })
  }, [words])

  const handleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget
    const word = el.dataset.word
    if (!word) return

    // Prevent re-triggering while animating
    if (animatingSet.current.has(word)) return
    animatingSet.current.add(word)

    const anim = getWordAnimation(word)
    const cls = getAnimationClass(anim)

    el.classList.add(cls)

    const onEnd = () => {
      el.classList.remove(cls)
      animatingSet.current.delete(word)
      el.removeEventListener('animationend', onEnd)
    }
    el.addEventListener('animationend', onEnd)
  }, [])

  return (
    <div
      className="relative min-h-[70vh] rounded-xl overflow-hidden"
      style={{
        background: '#1a1a2e',
        backgroundImage: `
        radial-gradient(ellipse at 20% 50%, rgba(30, 30, 60, 0.8) 0%, transparent 70%),
        radial-gradient(ellipse at 80% 20%, rgba(25, 25, 50, 0.6) 0%, transparent 60%),
        linear-gradient(180deg, #16162a 0%, #1a1a2e 30%, #1e1e3a 70%, #141428 100%)
      `,
      }}
    >
      {/* Subtle frame */}
      <div className="absolute inset-3 border border-white/5 rounded pointer-events-none" />

      {/* Title */}
      <div className="text-center pt-8 pb-3 border-b border-white/5 mx-8">
        <h2
          className="text-sm tracking-[6px] uppercase text-white/15"
          style={{ fontFamily: "'Rock Salt', cursive" }}
        >
          Compose Your Dish
        </h2>
      </div>

      {/* Word cloud */}
      <div
        className="flex flex-wrap justify-center items-center gap-0 px-5 py-6 leading-tight"
        style={{ lineHeight: 1.15 }}
      >
        {styledWords.map((w, i) => (
          <span
            key={`${w.word}-${i}`}
            className="culinary-word-clickable inline-block transition-all duration-200 opacity-90 hover:opacity-100 hover:scale-110"
            style={w.style}
            title={`${w.word} — ${w.category} — click me!`}
            data-word={w.word}
            onClick={handleClick}
          >
            {w.displayWord}
          </span>
        ))}
      </div>
    </div>
  )
}

'use client'

// Remy Talking Avatar — Layered lip-sync animation.
//
// Architecture:
//   Base layer:  Resting face (always visible — eyes, hat, body never change)
//   Mouth layer: Current viseme image, CSS clip-path'd to show ONLY the mouth region
//
// This means the eyes stay perfectly consistent across all mouth shapes.
// The AI-generated images had different eye expressions per viseme — this
// approach ignores everything above the mouth and only uses the mouth portion.

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Viseme } from '@/lib/ai/remy-visemes'
import { VISEME_IMAGES } from '@/lib/ai/remy-visemes'

// All visemes except 'rest' (rest is the base layer, not an overlay)
const MOUTH_VISEMES = (Object.keys(VISEME_IMAGES) as Viseme[]).filter((v) => v !== 'rest')

interface RemyTalkingAvatarProps {
  /** Current viseme to display */
  viseme: Viseme
  /** Whether Remy is currently speaking (enables subtle animation) */
  isSpeaking?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Extra CSS classes */
  className?: string
}

const SIZES = {
  sm: { width: 40, height: 40, imgClass: 'w-10 h-10' },
  md: { width: 56, height: 56, imgClass: 'w-14 h-14' },
  lg: { width: 80, height: 80, imgClass: 'w-20 h-20' },
} as const

// Clip-path that reveals ONLY the mouth region (bottom ~35% of the image).
// The polygon covers the lower portion of the face where the mouth sits.
// Coordinates: inset(top from-left from-bottom from-right)
// "inset(62% 15% 0% 15%)" = top 62% hidden, sides 15% hidden, bottom 0% visible
const MOUTH_CLIP_PATH = 'inset(58% 10% 0% 10%)'

export function RemyTalkingAvatar({
  viseme,
  isSpeaking = false,
  size = 'md',
  className = '',
}: RemyTalkingAvatarProps) {
  const preloaded = useRef(false)

  // Preload all viseme images on mount to eliminate flicker
  useEffect(() => {
    if (preloaded.current) return
    preloaded.current = true

    Object.values(VISEME_IMAGES).forEach((src) => {
      const img = new window.Image()
      img.src = src
    })
  }, [])

  const { width, height, imgClass } = SIZES[size]

  return (
    <div
      className={[
        'relative flex-shrink-0 rounded-full overflow-hidden bg-stone-200',
        imgClass,
        isSpeaking ? 'ring-2 ring-brand-400/50 ring-offset-1 ring-offset-stone-900' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Base layer — resting face (always visible, provides consistent eyes) */}
      <Image
        src={VISEME_IMAGES.rest}
        alt="Remy"
        width={width}
        height={height}
        className="absolute inset-0 object-cover"
        priority
      />

      {/* Mouth overlay layer — clip-path'd to show ONLY the mouth region.
           All visemes are stacked; only the active one is visible (opacity).
           The clip-path ensures eyes/hat/body from the base layer show through. */}
      {MOUTH_VISEMES.map((v) => (
        <Image
          key={v}
          src={VISEME_IMAGES[v]}
          alt=""
          width={width}
          height={height}
          className={[
            'absolute inset-0 object-cover transition-opacity duration-[30ms]',
            v === viseme ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          style={{ clipPath: MOUTH_CLIP_PATH }}
          aria-hidden={v !== viseme}
        />
      ))}
    </div>
  )
}

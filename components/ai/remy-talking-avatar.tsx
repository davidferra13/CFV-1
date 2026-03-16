'use client'

// Remy Talking Avatar - Sprite sheet lip-sync animation.
//
// Architecture:
//   Single <div> with background-image pointing to a 4x4 sprite sheet.
//   CSS background-position selects the active frame (viseme or emotion).
//   Each frame is a complete Remy face - no clip-path needed.
//
// Sprite: /images/remy/remy-sprite.png (1040x1024, 16 frames)

import { useEffect, useRef } from 'react'
import type { Viseme, RemyEmotion } from '@/lib/ai/remy-visemes'
import {
  SPRITE_PATH,
  SPRITE_COLS,
  SPRITE_ROWS,
  FRAME_WIDTH,
  FRAME_HEIGHT,
  LABEL_CROP_TOP,
  VISEME_FRAMES,
  EMOTION_FRAMES,
} from '@/lib/ai/remy-visemes'

interface RemyTalkingAvatarProps {
  /** Current viseme to display (used when speaking) */
  viseme: Viseme
  /** Whether Remy is currently speaking (enables lip-sync frames) */
  isSpeaking?: boolean
  /** Current emotion - determines the rest-state face when not speaking */
  emotion?: RemyEmotion
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Extra CSS classes */
  className?: string
}

const SIZES = {
  sm: 40,
  md: 56,
  lg: 80,
  xl: 120,
} as const

/**
 * Calculate CSS background-position and background-size for a sprite frame.
 * Accounts for label text cropping at the top of each cell.
 */
function getSpriteStyles(col: number, row: number, displaySize: number) {
  // Scale factor: map the display size to each frame's width
  const scale = displaySize / FRAME_WIDTH

  // Full sprite dimensions at this scale
  const bgWidth = FRAME_WIDTH * SPRITE_COLS * scale
  const bgHeight = FRAME_HEIGHT * SPRITE_ROWS * scale

  // Position: shift to show the correct cell, offset by label crop
  const posX = -(col * FRAME_WIDTH * scale)
  const posY = -(row * FRAME_HEIGHT * scale + LABEL_CROP_TOP * scale)

  return {
    backgroundImage: `url(${SPRITE_PATH})`,
    backgroundSize: `${bgWidth}px ${bgHeight}px`,
    backgroundPosition: `${posX}px ${posY}px`,
    backgroundRepeat: 'no-repeat' as const,
  }
}

export function RemyTalkingAvatar({
  viseme,
  isSpeaking = false,
  emotion = 'neutral',
  size = 'md',
  className = '',
}: RemyTalkingAvatarProps) {
  const preloaded = useRef(false)

  // Preload the sprite sheet on mount
  useEffect(() => {
    if (preloaded.current) return
    preloaded.current = true
    const img = new window.Image()
    img.src = SPRITE_PATH
  }, [])

  const displaySize = SIZES[size]

  // Pick the frame: viseme when speaking, emotion when resting
  const frame = isSpeaking ? VISEME_FRAMES[viseme] : EMOTION_FRAMES[emotion]

  const spriteStyles = getSpriteStyles(frame.col, frame.row, displaySize)

  return (
    <div
      className={[
        'relative flex-shrink-0 rounded-full overflow-hidden',
        isSpeaking ? 'ring-2 ring-brand-400/50 ring-offset-1 ring-offset-stone-900' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: displaySize,
        height: displaySize,
        ...spriteStyles,
      }}
      role="img"
      aria-label={isSpeaking ? 'Remy speaking' : `Remy ${emotion}`}
    />
  )
}

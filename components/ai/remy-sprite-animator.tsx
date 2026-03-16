'use client'

// RemySpriteAnimator - Generic sprite sheet playback component.
// Plays a sprite sheet using requestAnimationFrame with delta timing.
//
// Features:
//   - rAF-driven frame stepping (drift-free, synced to display refresh)
//   - Per-frame duration multipliers for held poses (anticipation, apex holds)
//   - Looping and one-shot modes
//   - will-change applied only while animating
//   - GPU-composited via background-position
//
// Used by RemyAnimatedMascot for body-layer animations.

import { useEffect, useRef, useState, useCallback } from 'react'
import type { SpriteManifest } from '@/lib/ai/remy-sprite-manifests'

interface RemySpriteAnimatorProps {
  /** Sprite sheet manifest */
  manifest: SpriteManifest
  /** Whether the animation is currently playing */
  playing: boolean
  /** Called when a non-looping animation finishes */
  onComplete?: () => void
  /** Display size in px */
  size: number
  /** Extra CSS classes */
  className?: string
}

export function RemySpriteAnimator({
  manifest,
  playing,
  onComplete,
  size,
  className = '',
}: RemySpriteAnimatorProps) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const frameRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(0)
  const onCompleteRef = useRef(onComplete)

  // Keep onComplete ref fresh to avoid stale closures in rAF loop
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const {
    cols,
    rows,
    cellWidth,
    cellHeight,
    frameCount,
    fps,
    loop,
    labelOffset,
    path,
    frameDurations,
  } = manifest
  const baseFrameDuration = fps > 0 ? 1000 / fps : 80

  // Scale factor: map display size to cell width, preserve aspect ratio
  const scale = size / cellWidth
  const displayHeight = Math.round(cellHeight * scale)

  // Full sprite sheet dimensions at display scale
  const bgWidth = cellWidth * cols * scale
  const bgHeight = cellHeight * rows * scale

  // Calculate background-position for a given frame index
  const getFramePosition = useCallback(
    (frame: number) => {
      const col = frame % cols
      const row = Math.floor(frame / cols)
      const posX = -(col * cellWidth * scale)
      const posY = -(row * cellHeight * scale + labelOffset * scale)
      return `${posX}px ${posY}px`
    },
    [cols, cellWidth, cellHeight, scale, labelOffset]
  )

  // Get duration for a specific frame (supports per-frame timing)
  const getFrameDuration = useCallback(
    (frame: number) => {
      if (!frameDurations || frame >= frameDurations.length) return baseFrameDuration
      return baseFrameDuration * frameDurations[frame]
    },
    [baseFrameDuration, frameDurations]
  )

  // Cancel rAF
  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  // rAF-driven frame stepping with delta timing
  useEffect(() => {
    if (!playing) {
      cancelAnimation()
      setCurrentFrame(0)
      frameRef.current = 0
      return
    }

    frameRef.current = 0
    setCurrentFrame(0)
    lastFrameTimeRef.current = 0

    function tick(timestamp: number) {
      // First frame - just record the time
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const elapsed = timestamp - lastFrameTimeRef.current
      const currentFrameDuration = getFrameDuration(frameRef.current)

      if (elapsed >= currentFrameDuration) {
        lastFrameTimeRef.current = timestamp

        frameRef.current += 1

        if (frameRef.current >= frameCount) {
          if (loop) {
            frameRef.current = 0
            setCurrentFrame(0)
          } else {
            cancelAnimation()
            onCompleteRef.current?.()
            return
          }
        } else {
          setCurrentFrame(frameRef.current)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return cancelAnimation
  }, [playing, loop, frameCount, getFrameDuration, cancelAnimation])

  return (
    <div
      className={['flex-shrink-0 overflow-hidden', className].filter(Boolean).join(' ')}
      style={{
        width: size,
        height: displayHeight,
        backgroundImage: `url(${path})`,
        backgroundSize: `${bgWidth}px ${bgHeight}px`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: getFramePosition(currentFrame),
        willChange: playing ? 'background-position' : 'auto',
      }}
      aria-hidden="true"
    />
  )
}

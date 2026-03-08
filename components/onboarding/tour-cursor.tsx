'use client'

// TourCursor - Animated fake cursor that glides to tour target elements.
// Creates the "hand-holding" effect where a cursor visually shows users
// where to look and what to click during the guided tour.

import { useEffect, useState, useRef } from 'react'

type CursorPosition = { x: number; y: number }

type TourCursorProps = {
  targetRect: { top: number; left: number; width: number; height: number } | null
  isActive: boolean
}

export function TourCursor({ targetRect, isActive }: TourCursorProps) {
  const [pos, setPos] = useState<CursorPosition>({ x: -100, y: -100 })
  const [isVisible, setIsVisible] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)
  const animFrameRef = useRef<number>(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!isActive || !targetRect) {
      setIsVisible(false)
      setIsPulsing(false)
      initializedRef.current = false
      return
    }

    // Target: center-ish of the highlighted element (offset slightly for realism)
    const targetX = targetRect.left + targetRect.width * 0.4
    const targetY = targetRect.top + targetRect.height * 0.4

    if (!initializedRef.current) {
      // First appearance: start from bottom-right of viewport, glide in
      initializedRef.current = true
      setPos({ x: window.innerWidth * 0.7, y: window.innerHeight * 0.7 })
      setIsVisible(true)
      setIsPulsing(false)

      // Animate to target over ~600ms
      const startX = window.innerWidth * 0.7
      const startY = window.innerHeight * 0.7
      const startTime = performance.now()
      const duration = 600

      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)

        setPos({
          x: startX + (targetX - startX) * eased,
          y: startY + (targetY - startY) * eased,
        })

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate)
        } else {
          // Arrived: start pulsing
          setIsPulsing(true)
        }
      }
      animFrameRef.current = requestAnimationFrame(animate)
    } else {
      // Subsequent steps: glide from current position
      setIsPulsing(false)
      const startX = pos.x
      const startY = pos.y
      const startTime = performance.now()
      const duration = 500

      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        setPos({
          x: startX + (targetX - startX) * eased,
          y: startY + (targetY - startY) * eased,
        })

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate)
        } else {
          setIsPulsing(true)
        }
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
    // We intentionally only re-run when targetRect changes (not pos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, targetRect?.top, targetRect?.left, targetRect?.width, targetRect?.height])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  if (!isVisible || !isActive) return null

  return (
    <div
      className="fixed z-[95] pointer-events-none transition-opacity duration-200"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        opacity: isVisible ? 1 : 0,
      }}
    >
      {/* Cursor SVG - pointer hand style */}
      <svg
        width="28"
        height="32"
        viewBox="0 0 28 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={isPulsing ? 'animate-tour-cursor-pulse' : ''}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
      >
        {/* Cursor arrow shape */}
        <path
          d="M2 1L2 22L8 17L13 27L17 25L12 15L20 15L2 1Z"
          fill="white"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Click ripple effect when pulsing */}
      {isPulsing && (
        <div className="absolute top-0 left-0">
          <div className="w-6 h-6 rounded-full border-2 border-brand-400 animate-tour-click-ripple" />
        </div>
      )}
    </div>
  )
}

// Branded loading indicator using Remy's whisk animation.
// Use this for page-level loading states. For inline spinners, use TaskLoader.
// Supports context-aware messages via loading registry contextId.

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getLoadingContext } from '@/lib/loading/loading-registry'

interface RemyLoaderProps {
  /** Static message (takes priority over contextId) */
  message?: string
  /** Loading context ID for rotating messages */
  contextId?: string
  /** Image size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show elapsed time after 5 seconds */
  showElapsed?: boolean
}

const sizes = {
  sm: { width: 48, height: 48 },
  md: { width: 72, height: 72 },
  lg: { width: 96, height: 96 },
}

export function RemyLoader({
  message,
  contextId,
  size = 'md',
  showElapsed = false,
}: RemyLoaderProps) {
  const { width, height } = sizes[size]
  const ctx = contextId ? getLoadingContext(contextId) : undefined
  const messages = ctx?.messages ?? (message ? [message] : [])

  const [msgIndex, setMsgIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Rotate messages every 3 seconds
  useEffect(() => {
    if (messages.length <= 1) return
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [messages.length])

  // Track elapsed time
  useEffect(() => {
    if (!showElapsed && ctx?.expectedDuration !== 'long') return
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [showElapsed, ctx?.expectedDuration])

  const currentMessage = messages[msgIndex]

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4"
      role="status"
      aria-live="polite"
      aria-label={currentMessage ?? 'Loading'}
    >
      <div className="relative">
        <div className="absolute inset-0 -m-4 rounded-full bg-brand-500/5 blur-2xl" />
        <Image
          src="/images/remy/remy-idle.png"
          alt=""
          width={width}
          height={height}
          className="relative animate-mascot-bob opacity-90"
          priority
        />
      </div>
      {currentMessage && (
        <p
          key={currentMessage}
          className="text-sm text-stone-400 font-medium animate-fade-slide-up"
        >
          {currentMessage}
        </p>
      )}
      {(showElapsed || ctx?.expectedDuration === 'long') && elapsed >= 5 && (
        <p className="text-xs text-stone-500 tabular-nums">{elapsed}s elapsed</p>
      )}
    </div>
  )
}

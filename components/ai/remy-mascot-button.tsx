'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { RemyTalkingAvatar } from '@/components/ai/remy-talking-avatar'
import type { Viseme } from '@/lib/ai/remy-visemes'

const SLEEP_TIMEOUT_MS = 60_000
const SPEECH_HOVER_DELAY_MS = 500

const GREETINGS = ['Need help?', 'Ask me anything!', 'Hey there!', "I'm here if you need me!"]

interface RemyMascotButtonProps {
  onClick: () => void
  /** Extra Tailwind classes (e.g. position overrides) */
  className?: string
  /** Show green online ping dot */
  showOnlineDot?: boolean
  /** Mascot animation state */
  state?: 'idle' | 'thinking' | 'success' | 'nudge' | 'sleeping'
  /** Accessible label */
  ariaLabel?: string
  /** Current lip-sync viseme — when provided, shows talking avatar overlay */
  viseme?: Viseme
  /** Whether Remy is currently speaking (lip-sync active) */
  isSpeaking?: boolean
  /** Whether Remy is minimized (only chef hat peeks out) */
  minimized?: boolean
  /** Callback to toggle minimized state */
  onToggleMinimize?: () => void
}

export function RemyMascotButton({
  onClick,
  className,
  showOnlineDot = false,
  state: externalState,
  ariaLabel = 'Chat with Remy',
  viseme,
  isSpeaking: speakingProp = false,
  minimized = false,
  onToggleMinimize,
}: RemyMascotButtonProps) {
  // Internal sleep state — overridden by external state if provided
  const [isSleeping, setIsSleeping] = useState(false)
  const [showSpeechBubble, setShowSpeechBubble] = useState(false)
  const [greeting, setGreeting] = useState(GREETINGS[0])
  const [isHovered, setIsHovered] = useState(false)

  const hasShownBubble = useRef(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastInteraction = useRef(Date.now())
  const sleepCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Determine effective state
  const effectiveState = externalState ?? (isSleeping ? 'sleeping' : 'idle')

  // --- Sleep mode: track page interaction ---
  const resetSleepTimer = useCallback(() => {
    lastInteraction.current = Date.now()
    if (isSleeping) setIsSleeping(false)
  }, [isSleeping])

  useEffect(() => {
    const events = ['mousemove', 'scroll', 'click', 'keydown', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, resetSleepTimer, { passive: true }))

    sleepCheckInterval.current = setInterval(() => {
      if (Date.now() - lastInteraction.current > SLEEP_TIMEOUT_MS) {
        setIsSleeping(true)
      }
    }, 5_000) // Check every 5s

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetSleepTimer))
      if (sleepCheckInterval.current) clearInterval(sleepCheckInterval.current)
    }
  }, [resetSleepTimer])

  // --- Hover speech bubble ---
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)

    // Wake from sleep on hover
    if (isSleeping) {
      setIsSleeping(false)
      lastInteraction.current = Date.now()
      return // Don't show speech bubble on wake-up hover
    }

    // Only show speech bubble once per session
    if (hasShownBubble.current) return

    hoverTimer.current = setTimeout(() => {
      setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
      setShowSpeechBubble(true)
      hasShownBubble.current = true
    }, SPEECH_HOVER_DELAY_MS)
  }, [isSleeping])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
    setShowSpeechBubble(false)
  }, [])

  // Clean up hover timer
  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
    }
  }, [])

  // --- Animation class based on state ---
  const animationClass = (() => {
    if (minimized) return 'translate-y-[80%] transition-transform duration-500 ease-in-out'
    switch (effectiveState) {
      case 'sleeping':
        return 'translate-y-[70%] transition-transform duration-1000 ease-in'
      case 'success':
        return 'animate-mascot-hop'
      case 'nudge':
        return 'animate-mascot-wiggle'
      case 'thinking':
        return '' // No bob during thinking — bubble is the indicator
      case 'idle':
      default:
        return 'animate-mascot-bob'
    }
  })()

  return (
    <div
      className={['fixed bottom-0 left-4 lg:left-6 z-40', className ?? '']
        .filter(Boolean)
        .join(' ')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Minimize/restore toggle — shows on hover */}
      {!minimized && isHovered && onToggleMinimize && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleMinimize()
          }}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-stone-700 hover:bg-stone-600 text-white/70 hover:text-white flex items-center justify-center text-xs transition-all shadow-md animate-fade-slide-up"
          aria-label="Minimize Remy"
          title="Minimize Remy"
        >
          &minus;
        </button>
      )}

      <button
        onClick={minimized ? (onToggleMinimize ?? onClick) : onClick}
        className={[
          'w-[60px] h-[70px] sm:w-[80px] sm:h-[93px] lg:w-[100px] lg:h-[116px]',
          'animate-mascot-peek',
          'group cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900 rounded-t-xl',
        ].join(' ')}
        aria-label={minimized ? 'Restore Remy' : ariaLabel}
        type="button"
      >
        {/* Thinking bubble */}
        {!minimized && effectiveState === 'thinking' && <ThinkingBubble />}

        {/* Speech bubble (hover, once per session) */}
        {!minimized &&
          showSpeechBubble &&
          effectiveState !== 'thinking' &&
          effectiveState !== 'sleeping' && <SpeechBubble text={greeting} />}

        {/* Mascot image with state-driven animation */}
        <div
          className={[
            'relative w-full h-full transition-transform duration-200 ease-out',
            'group-hover:-translate-y-1 group-active:translate-y-0',
            animationClass,
          ].join(' ')}
        >
          {/* Base mascot image — always rendered, fades when speaking */}
          <Image
            src="/images/remy-mascot.png"
            alt="Remy the ChefFlow assistant"
            fill
            sizes="(max-width: 640px) 60px, (max-width: 1024px) 80px, 100px"
            className={[
              'object-contain object-bottom pointer-events-none select-none transition-opacity duration-300',
              speakingProp ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
            priority
          />

          {/* Talking avatar overlay — visible when speaking */}
          {viseme && (
            <div
              className={[
                'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
                speakingProp ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            >
              <RemyTalkingAvatar viseme={viseme} isSpeaking={speakingProp} size="lg" />
            </div>
          )}

          {/* Online dot */}
          {showOnlineDot && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

/** Thinking bubble — animated ••• dots in a small cloud */
function ThinkingBubble() {
  return (
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-lg animate-fade-slide-up">
      {/* Tail */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 rounded-sm" />
      {/* Dots */}
      <span
        className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-thinking-dot"
        style={{ animationDelay: '0s' }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-thinking-dot"
        style={{ animationDelay: '0.15s' }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-thinking-dot"
        style={{ animationDelay: '0.3s' }}
      />
    </div>
  )
}

/** Speech bubble — small tooltip with greeting text */
function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="absolute -top-10 left-0 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-lg animate-fade-slide-up">
      {/* Tail */}
      <div className="absolute -bottom-1 left-4 w-2.5 h-2.5 bg-white rotate-45 rounded-sm" />
      {text}
    </div>
  )
}

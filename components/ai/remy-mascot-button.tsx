'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'

const SPEECH_HOVER_DELAY_MS = 500

const GREETINGS = ['Need help?', 'Ask me anything!', 'Hey there!', "I'm here if you need me!"]

interface RemyMascotButtonProps {
  onClick: () => void
  /** Extra Tailwind classes (e.g. position overrides) */
  className?: string
  /** Show green online ping dot */
  showOnlineDot?: boolean
  /** Body animation state from the state machine */
  bodyState?: BodyState
  /** Eye state from the auto-blink engine */
  eyeState?: EyeState
  /** Accessible label */
  ariaLabel?: string
  /** Current lip-sync viseme */
  viseme?: Viseme
  /** Whether Remy is currently speaking (lip-sync active) */
  isSpeaking?: boolean
  /** Current emotion — passed to talking avatar for rest-state face */
  emotion?: RemyEmotion
  /** Whether Remy is minimized (only chef hat peeks out) */
  minimized?: boolean
  /** Callback to toggle minimized state */
  onToggleMinimize?: () => void
  /** Called when a non-looping body animation completes */
  onAnimComplete?: () => void

  // Legacy compat — mapped internally
  state?: 'idle' | 'thinking' | 'success' | 'nudge' | 'sleeping'
}

/** Map legacy state prop to BodyState */
function legacyToBodyState(s?: string): BodyState {
  switch (s) {
    case 'thinking':
      return 'thinking'
    case 'success':
      return 'celebrating'
    case 'nudge':
      return 'nudge'
    case 'sleeping':
      return 'sleeping'
    default:
      return 'idle'
  }
}

export function RemyMascotButton({
  onClick,
  className,
  showOnlineDot = false,
  bodyState: bodyStateProp,
  eyeState: eyeStateProp = 'open',
  state: legacyState,
  ariaLabel = 'Chat with Remy',
  viseme,
  isSpeaking: speakingProp = false,
  emotion = 'neutral',
  minimized = false,
  onToggleMinimize,
  onAnimComplete,
}: RemyMascotButtonProps) {
  const [showSpeechBubble, setShowSpeechBubble] = useState(false)
  const [greeting, setGreeting] = useState(GREETINGS[0])
  const [isHovered, setIsHovered] = useState(false)

  const hasShownBubble = useRef(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resolve body state: new prop > legacy prop > default
  const effectiveBodyState = bodyStateProp ?? legacyToBodyState(legacyState)

  // Whether Remy should show the hat-only asset (minimized or sleeping)
  const showHat = minimized || effectiveBodyState === 'sleeping'

  // --- Hover speech bubble ---
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)

    // Only show speech bubble once per session
    if (hasShownBubble.current) return

    if (effectiveBodyState === 'sleeping') return

    hoverTimer.current = setTimeout(() => {
      setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
      setShowSpeechBubble(true)
      hasShownBubble.current = true
    }, SPEECH_HOVER_DELAY_MS)
  }, [effectiveBodyState])

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

  // Handle animation complete
  const handleAnimComplete = useCallback(() => {
    onAnimComplete?.()
  }, [onAnimComplete])

  // Minimized / sleeping animation
  const minimizedClass = showHat
    ? 'translate-y-[50%] transition-transform duration-500 ease-in-out'
    : ''

  const hatPeekStyle = {
    transform: 'translateY(-10%)',
    transformOrigin: 'top center',
  } as const

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
          'group cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900 rounded-t-xl',
        ].join(' ')}
        aria-label={minimized ? 'Restore Remy' : ariaLabel}
        type="button"
      >
        {/* Thinking bubble */}
        {!minimized && effectiveBodyState === 'thinking' && <ThinkingBubble />}

        {/* Speech bubble (hover, once per session) */}
        {!minimized &&
          showSpeechBubble &&
          effectiveBodyState !== 'thinking' &&
          effectiveBodyState !== 'sleeping' && <SpeechBubble text={greeting} />}

        {/* Mascot with state-driven animation */}
        <div className={['relative w-full h-full', minimizedClass].join(' ')}>
          {showHat ? (
            // Hat-only peek when minimized or sleeping
            <Image
              src="/images/remy/remy-hat.png"
              alt="Remy's chef hat"
              fill
              sizes="(max-width: 640px) 60px, (max-width: 1024px) 80px, 100px"
              className="object-contain object-bottom pointer-events-none select-none"
              style={hatPeekStyle}
            />
          ) : (
            // Static mascot image
            <Image
              src="/images/remy/remy-aha.png"
              alt="Remy"
              fill
              sizes="(max-width: 640px) 60px, (max-width: 1024px) 80px, 100px"
              className="object-contain object-bottom pointer-events-none select-none"
            />
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

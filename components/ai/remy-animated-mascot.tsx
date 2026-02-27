'use client'

// RemyAnimatedMascot — 3-layer composited character renderer.
//
// Architecture:
//   Layer 1 (BODY):  Static mascot image with CSS breathing, or sprite sheet animation
//   Layer 2 (MOUTH): RemyTalkingAvatar lip-sync overlay (when speaking)
//   Layer 3 (EYES):  Eye state overlay positioned over the face region
//
// Features:
//   - Crossfade transitions between body states (no hard cuts)
//   - CSS-only idle breathing with anticipation/follow-through transforms
//   - Auto-blink via eye state from context
//   - prefers-reduced-motion: all animations stop, static frames shown
//   - aria-live region announces state changes
//   - CSS-only broken image fallback
//   - will-change optimization only when animating

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { RemyTalkingAvatar } from '@/components/ai/remy-talking-avatar'
import { RemySpriteAnimator } from '@/components/ai/remy-sprite-animator'
import { getManifestForState, getManifest } from '@/lib/ai/remy-sprite-manifests'
import { getBodyConfig } from '@/lib/ai/remy-body-state'
import { preloadForState, preloadAdjacentStates } from '@/lib/ai/remy-sprite-loader'
import type { BodyState } from '@/lib/ai/remy-body-state'
import type { EyeState } from '@/lib/ai/remy-eye-blink'
import type { Viseme, RemyEmotion } from '@/lib/ai/remy-visemes'

// ─── Constants ─────────────────────────────────────────────────────────────

const CROSSFADE_DURATION_MS = 180

// ─── Props ──────────────────────────────────────────────────────────────────

interface RemyAnimatedMascotProps {
  /** Current body state from the state machine */
  bodyState: BodyState
  /** Current eye state from the auto-blink engine */
  eyeState: EyeState
  /** Current lip-sync viseme */
  viseme: Viseme
  /** Whether Remy is currently speaking */
  isSpeaking: boolean
  /** Current emotion for rest-state face */
  emotion: RemyEmotion
  /** Called when a non-looping body animation completes */
  onAnimComplete: () => void
  /** Display size in px (optional — fills container if omitted) */
  size?: number
}

// ─── Reduced Motion Detection ───────────────────────────────────────────────

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

// ─── State Announcements ────────────────────────────────────────────────────

function useStateAnnouncement(bodyState: BodyState): string {
  const [announcement, setAnnouncement] = useState('')
  const prevState = useRef(bodyState)

  useEffect(() => {
    if (bodyState === prevState.current) return
    prevState.current = bodyState

    const config = getBodyConfig(bodyState)
    if (config.announcement) {
      setAnnouncement(config.announcement)
    }
  }, [bodyState])

  return announcement
}

// ─── Crossfade Hook ─────────────────────────────────────────────────────────
// Tracks previous body state for crossfade transitions.
// Returns the outgoing state and an opacity flag.

function useCrossfade(bodyState: BodyState) {
  const [outgoingState, setOutgoingState] = useState<BodyState | null>(null)
  const [isFading, setIsFading] = useState(false)
  const prevStateRef = useRef(bodyState)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (bodyState === prevStateRef.current) return

    // Start crossfade: show outgoing state fading out
    setOutgoingState(prevStateRef.current)
    setIsFading(true)
    prevStateRef.current = bodyState

    // Clear any existing fade timer
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)

    // End crossfade after duration
    fadeTimerRef.current = setTimeout(() => {
      setOutgoingState(null)
      setIsFading(false)
    }, CROSSFADE_DURATION_MS)

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [bodyState])

  return { outgoingState, isFading }
}

// ─── Body Layer Renderer ────────────────────────────────────────────────────
// Extracted to render both current and outgoing body states for crossfade.

function BodyLayer({
  bodyState,
  effectiveSize,
  reducedMotion,
  isSpeaking,
  onAnimComplete,
  opacity,
  imageError,
  onImageError,
}: {
  bodyState: BodyState
  effectiveSize: number
  reducedMotion: boolean
  isSpeaking: boolean
  onAnimComplete: () => void
  opacity: number
  imageError: boolean
  onImageError: () => void
}) {
  const manifest = getManifestForState(bodyState)
  const config = getBodyConfig(bodyState)
  const showSpriteAnimation = manifest && !reducedMotion && bodyState !== 'speaking'

  // CSS animation class for non-sprite states
  const bodyAnimation = (() => {
    if (reducedMotion) return ''
    if (showSpriteAnimation) return ''
    if (isSpeaking) return ''
    if (bodyState === 'idle') return 'animate-remy-breathe'
    if (config.cssAnimation) return config.cssAnimation
    return ''
  })()

  // Anticipation/follow-through transform for CSS-animated states
  const transformStyle = useMemo(() => {
    if (reducedMotion || showSpriteAnimation) return { transformOrigin: 'bottom center' as const }

    switch (bodyState) {
      case 'celebrating':
        // Slight squash before hop
        return { transformOrigin: 'bottom center' as const, willChange: 'transform' as const }
      case 'wave':
      case 'nudge':
        // Wiggle from center
        return { transformOrigin: 'center center' as const, willChange: 'transform' as const }
      default:
        return { transformOrigin: 'bottom center' as const }
    }
  }, [bodyState, reducedMotion, showSpriteAnimation])

  // Static pose image
  const staticPoseImage = useMemo(() => {
    switch (bodyState) {
      case 'sleeping':
        return '/images/remy/remy-sleeping.png'
      case 'thinking':
        return '/images/remy/remy-pondering.png'
      case 'error':
        return '/images/remy/remy-reassurance.png'
      default:
        return '/images/remy/remy-idle.png'
    }
  }, [bodyState])

  return (
    <div
      className="absolute inset-0"
      style={{
        opacity,
        transition: `opacity ${CROSSFADE_DURATION_MS}ms ease-in-out`,
      }}
    >
      {showSpriteAnimation ? (
        <RemySpriteAnimator
          manifest={manifest}
          playing={true}
          onComplete={opacity === 1 ? onAnimComplete : undefined}
          size={effectiveSize}
          className="absolute inset-0"
        />
      ) : (
        <div
          className={['absolute inset-0', bodyAnimation].filter(Boolean).join(' ')}
          style={transformStyle}
        >
          {imageError ? (
            <div className="remy-fallback w-full h-full" aria-hidden="true" />
          ) : (
            <Image
              src={staticPoseImage}
              alt="Remy the ChefFlow assistant"
              fill
              sizes={`${effectiveSize}px`}
              className="object-contain object-bottom pointer-events-none select-none"
              priority
              onError={onImageError}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RemyAnimatedMascot({
  bodyState,
  eyeState,
  viseme,
  isSpeaking,
  emotion,
  onAnimComplete,
  size,
}: RemyAnimatedMascotProps) {
  const [imageError, setImageError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [measuredSize, setMeasuredSize] = useState(size ?? 100)
  const reducedMotion = useReducedMotion()
  const announcement = useStateAnnouncement(bodyState)
  const { outgoingState, isFading } = useCrossfade(bodyState)

  // Measure container width when no explicit size is given
  useEffect(() => {
    if (size !== undefined) {
      setMeasuredSize(size)
      return
    }
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setMeasuredSize(Math.round(entry.contentRect.width))
      }
    })
    ro.observe(el)
    setMeasuredSize(Math.round(el.clientWidth))
    return () => ro.disconnect()
  }, [size])

  const effectiveSize = size ?? measuredSize

  // Preload current + adjacent sprite sheets
  useEffect(() => {
    preloadForState(bodyState)
    preloadAdjacentStates(bodyState)
  }, [bodyState])

  // Get config for current body state
  const manifest = getManifestForState(bodyState)
  const config = getBodyConfig(bodyState)
  const showSpriteAnimation = manifest && !reducedMotion && bodyState !== 'speaking'

  // Whether to show the talking avatar overlay
  const showMouth = isSpeaking

  // Fire onAnimComplete for non-looping CSS fallback animations
  useEffect(() => {
    if (showSpriteAnimation) return
    if (reducedMotion) return
    if (config.loop) return
    if (!config.cssAnimation) return
    if (config.cssDurationMs <= 0) return

    const timer = setTimeout(() => {
      onAnimComplete()
    }, config.cssDurationMs + 50)

    return () => clearTimeout(timer)
  }, [bodyState, showSpriteAnimation, reducedMotion, config, onAnimComplete])

  const handleImageError = useCallback(() => setImageError(true), [])

  const containerStyle = useMemo(
    () => (size !== undefined ? { width: size, height: size } : {}),
    [size]
  )

  return (
    <div
      ref={containerRef}
      className={size !== undefined ? 'relative' : 'relative w-full h-full'}
      style={containerStyle}
    >
      {/* === LAYER 1: BODY (with crossfade) === */}

      {/* Outgoing state — fading out */}
      {isFading && outgoingState && (
        <BodyLayer
          bodyState={outgoingState}
          effectiveSize={effectiveSize}
          reducedMotion={reducedMotion}
          isSpeaking={false}
          onAnimComplete={() => {}}
          opacity={0}
          imageError={imageError}
          onImageError={handleImageError}
        />
      )}

      {/* Current state — fading in (or full opacity if no crossfade) */}
      <BodyLayer
        bodyState={bodyState}
        effectiveSize={effectiveSize}
        reducedMotion={reducedMotion}
        isSpeaking={isSpeaking}
        onAnimComplete={onAnimComplete}
        opacity={1}
        imageError={imageError}
        onImageError={handleImageError}
      />

      {/* === LAYER 2: MOUTH (lip-sync overlay) === */}
      <div
        className={[
          'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
          showMouth ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <RemyTalkingAvatar
          viseme={viseme}
          isSpeaking={isSpeaking}
          emotion={emotion}
          size={
            effectiveSize >= 100
              ? 'xl'
              : effectiveSize >= 80
                ? 'lg'
                : effectiveSize >= 56
                  ? 'md'
                  : 'sm'
          }
        />
      </div>

      {/* === LAYER 3: EYES (sprite sheet overlay) === */}
      <EyeOverlay eyeState={eyeState} showMouth={showMouth} reducedMotion={reducedMotion} />

      {/* === ACCESSIBILITY: State announcements === */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  )
}

// ─── Eye Overlay (Layer 3) ─────────────────────────────────────────────────

const EYE_STATE_FRAME: Record<EyeState, number> = {
  open: 0,
  half: 1,
  closed: 2,
  wide: 3,
  star: 4,
}

function EyeOverlay({
  eyeState,
  showMouth,
  reducedMotion,
}: {
  eyeState: EyeState
  showMouth: boolean
  reducedMotion: boolean
}) {
  const eyeManifest = getManifest('remy-eyes')

  // Don't render when mouth is showing (lip-sync has its own eyes),
  // or when open (the base mascot image already shows open eyes),
  // or when reduced motion is enabled
  if (!eyeManifest || eyeState === 'open' || showMouth || reducedMotion) {
    return null
  }

  const frame = EYE_STATE_FRAME[eyeState]
  const { cols, cellWidth, cellHeight } = eyeManifest
  const col = frame % cols
  const row = Math.floor(frame / cols)

  const bgScale = 100 * cols
  const posX = -(col * 100)
  const posY = -(row * (cellHeight / cellWidth) * 100)

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: '2%',
        left: '5%',
        width: '90%',
        height: '55%',
        backgroundImage: `url(${eyeManifest.path})`,
        backgroundSize: `${bgScale}%`,
        backgroundPosition: `${posX}% ${posY}%`,
        backgroundRepeat: 'no-repeat',
        transition: 'background-position 50ms ease',
      }}
      aria-hidden="true"
    />
  )
}

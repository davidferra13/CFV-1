/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { StoryData } from '@/lib/stories/story-data'

// Timeline: 15 seconds total
// Scene 1 (Open):    0-3s
// Scene 2 (Menu):    3-8s
// Scene 3 (Details): 8-12s
// Scene 4 (Close):   12-15s

const TOTAL_DURATION = 15000
const FPS = 60
const FRAME_MS = 1000 / FPS

type Props = {
  data: StoryData
}

export function EventStoryPreview({ data }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)

  const play = useCallback(() => {
    setElapsed(0)
    setIsPlaying(true)
    startTimeRef.current = performance.now()
  }, [])

  const stop = useCallback(() => {
    setIsPlaying(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    if (!isPlaying) return

    const tick = (now: number) => {
      const ms = now - startTimeRef.current
      if (ms >= TOTAL_DURATION) {
        setElapsed(TOTAL_DURATION)
        setIsPlaying(false)
        return
      }
      setElapsed(ms)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying])

  const progress = elapsed / TOTAL_DURATION

  const formattedDate = (() => {
    try {
      const d = new Date(data.eventDate + 'T12:00:00')
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    } catch {
      return data.eventDate
    }
  })()

  const serviceStyleLabel = data.serviceStyle
    ? data.serviceStyle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null

  return (
    <div className="space-y-6">
      {/* Preview Stage (9:16 aspect ratio, scaled down) */}
      <div className="mx-auto" style={{ width: 360, height: 640 }}>
        <div
          className="relative w-full h-full rounded-2xl overflow-hidden bg-stone-950 border border-stone-800"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {/* Linen texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='40' height='40' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Scene 1: The Open (0-3s) */}
          <SceneOpen businessName={data.businessName} logoUrl={data.logoUrl} progress={progress} />

          {/* Scene 2: The Menu (3-8s) */}
          <SceneMenu
            formattedDate={formattedDate}
            occasion={data.occasion}
            guestCount={data.guestCount}
            dishes={data.dishes}
            serviceStyle={serviceStyleLabel}
            progress={progress}
          />

          {/* Scene 3: The Details (8-12s) */}
          <SceneDetails
            courseCount={data.courseCount}
            dietaryAccommodations={data.dietaryAccommodations}
            guestCount={data.guestCount}
            cuisineType={data.cuisineType}
            progress={progress}
          />

          {/* Scene 4: The Close (12-15s) */}
          <SceneClose
            businessName={data.businessName}
            locationCity={data.locationCity}
            locationState={data.locationState}
            progress={progress}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button onClick={play} disabled={isPlaying}>
          {elapsed >= TOTAL_DURATION ? 'Replay' : 'Play Preview'}
        </Button>
        {isPlaying && (
          <Button variant="ghost" onClick={stop}>
            Stop
          </Button>
        )}
        <span className="text-xs text-stone-500 tabular-nums">
          {(elapsed / 1000).toFixed(1)}s / {(TOTAL_DURATION / 1000).toFixed(0)}s
        </span>
      </div>

      {/* Progress bar */}
      <div className="mx-auto max-w-[360px]">
        <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Scene 1: The Open ──────────────────────────────────────────────

function SceneOpen({
  businessName,
  logoUrl,
  progress,
}: {
  businessName: string
  logoUrl: string | null
  progress: number
}) {
  // Active from 0-3s (progress 0 - 0.2)
  // Fade in 0-1.5s, hold 1.5-2.5s, fade out 2.5-3s
  const sceneProgress = progress * 5 // 0-1 over 0-0.2 of total
  const fadeIn = Math.min(1, sceneProgress / 0.5) // 0-0.5 = fade in
  const fadeOut = sceneProgress > 0.83 ? 1 - (sceneProgress - 0.83) / 0.17 : 1 // last 17% = fade out
  const opacity = Math.max(0, Math.min(1, fadeIn * fadeOut))
  const lineWidth = Math.min(1, sceneProgress / 0.6) // gold line draws over 60% of scene

  if (progress > 0.22) return null // fully gone after scene

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      style={{ opacity }}
    >
      {logoUrl && (
        <img src={logoUrl} alt="" className="w-16 h-16 rounded-full object-cover mb-6 opacity-80" />
      )}
      <h1
        className="text-2xl text-center text-stone-100 tracking-wide leading-relaxed"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        {businessName}
      </h1>
      <div className="mt-4 h-px w-48 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-transparent via-amber-500/80 to-transparent"
          style={{
            width: `${lineWidth * 100}%`,
            margin: '0 auto',
            transition: 'none',
          }}
        />
      </div>
    </div>
  )
}

// ─── Scene 2: The Menu ──────────────────────────────────────────────

function SceneMenu({
  formattedDate,
  occasion,
  guestCount,
  dishes,
  serviceStyle,
  progress,
}: {
  formattedDate: string
  occasion: string | null
  guestCount: number
  dishes: { courseName: string; courseNumber: number; description: string | null }[]
  serviceStyle: string | null
  progress: number
}) {
  // Active from 3-8s (progress 0.2 - 0.533)
  const sceneStart = 0.2
  const sceneEnd = 0.533
  const sceneDuration = sceneEnd - sceneStart

  if (progress < sceneStart - 0.02 || progress > sceneEnd + 0.02) return null

  const sceneProgress = Math.max(0, Math.min(1, (progress - sceneStart) / sceneDuration))

  // Title fades in over first 15%
  const titleOpacity = Math.min(1, sceneProgress / 0.15)
  const titleY = (1 - Math.min(1, sceneProgress / 0.15)) * 20

  // Guest count fades in at 15-25%
  const guestOpacity = Math.min(1, Math.max(0, (sceneProgress - 0.15) / 0.1))

  // Dishes cascade in starting at 25%, each delayed by 8%
  const dishStartAt = 0.25

  // Fade out the whole scene in the last 10%
  const sceneFadeOut = sceneProgress > 0.9 ? 1 - (sceneProgress - 0.9) / 0.1 : 1

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-10"
      style={{ opacity: sceneFadeOut }}
    >
      {/* Event title */}
      <div
        className="text-center mb-2"
        style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}
      >
        {occasion && (
          <p className="text-sm text-amber-500/80 uppercase tracking-[0.2em] mb-2">{occasion}</p>
        )}
        <h2 className="text-lg text-stone-200" style={{ fontFamily: "'Georgia', serif" }}>
          {formattedDate}
        </h2>
      </div>

      {/* Guest count */}
      <p className="text-sm text-stone-500 italic mb-8" style={{ opacity: guestOpacity }}>
        {guestCount > 0 ? `An evening for ${guestCount}` : 'A private affair'}
        {serviceStyle ? ` \u00b7 ${serviceStyle}` : ''}
      </p>

      {/* Dishes cascade */}
      <div className="space-y-3 w-full max-w-[280px]">
        {dishes.slice(0, 6).map((dish, i) => {
          const dishProgress = Math.max(
            0,
            Math.min(1, (sceneProgress - dishStartAt - i * 0.08) / 0.12)
          )
          const dishY = (1 - dishProgress) * 30
          return (
            <div
              key={i}
              className="text-center"
              style={{
                opacity: dishProgress,
                transform: `translateY(${dishY}px)`,
              }}
            >
              <p className="text-xs text-stone-600 uppercase tracking-widest mb-0.5">
                {dish.courseName}
              </p>
              {dish.description && (
                <p className="text-sm text-stone-300" style={{ fontFamily: "'Georgia', serif" }}>
                  {dish.description}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Scene 3: The Details ───────────────────────────────────────────

function SceneDetails({
  courseCount,
  dietaryAccommodations,
  guestCount,
  cuisineType,
  progress,
}: {
  courseCount: number
  dietaryAccommodations: number
  guestCount: number
  cuisineType: string | null
  progress: number
}) {
  // Active from 8-12s (progress 0.533 - 0.8)
  const sceneStart = 0.533
  const sceneEnd = 0.8
  const sceneDuration = sceneEnd - sceneStart

  if (progress < sceneStart - 0.02 || progress > sceneEnd + 0.02) return null

  const sceneProgress = Math.max(0, Math.min(1, (progress - sceneStart) / sceneDuration))

  // Build stats array from real data (only show stats that have meaningful values)
  const stats: { value: number; label: string }[] = []
  if (courseCount > 0)
    stats.push({
      value: courseCount,
      label: courseCount === 1 ? 'course served' : 'courses served',
    })
  if (guestCount > 0)
    stats.push({
      value: guestCount,
      label: guestCount === 1 ? 'guest welcomed' : 'guests welcomed',
    })
  if (dietaryAccommodations > 0)
    stats.push({
      value: dietaryAccommodations,
      label: dietaryAccommodations === 1 ? 'dietary accommodation' : 'dietary accommodations',
    })

  // Fade out in last 10%
  const sceneFadeOut = sceneProgress > 0.9 ? 1 - (sceneProgress - 0.9) / 0.1 : 1

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-10"
      style={{ opacity: sceneFadeOut }}
    >
      {cuisineType && (
        <p
          className="text-xs text-amber-500/60 uppercase tracking-[0.2em] mb-8"
          style={{
            opacity: Math.min(1, sceneProgress / 0.2),
          }}
        >
          {cuisineType}
        </p>
      )}

      <div className="space-y-6">
        {stats.map((stat, i) => {
          const statProgress = Math.max(0, Math.min(1, (sceneProgress - i * 0.15) / 0.2))
          // Count-up animation
          const displayValue = Math.round(stat.value * statProgress)
          return (
            <div
              key={i}
              className="text-center"
              style={{
                opacity: statProgress,
                transform: `translateY(${(1 - statProgress) * 20}px)`,
              }}
            >
              <p
                className="text-4xl text-stone-100 tabular-nums"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                {displayValue}
              </p>
              <p className="text-sm text-stone-500 mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Scene 4: The Close ─────────────────────────────────────────────

function SceneClose({
  businessName,
  locationCity,
  locationState,
  progress,
}: {
  businessName: string
  locationCity: string | null
  locationState: string | null
  progress: number
}) {
  // Active from 12-15s (progress 0.8 - 1.0)
  const sceneStart = 0.8

  if (progress < sceneStart - 0.02) return null

  const sceneProgress = Math.max(0, Math.min(1, (progress - sceneStart) / 0.2))

  // Fade in over first 30%
  const fadeIn = Math.min(1, sceneProgress / 0.3)

  const location =
    locationCity && locationState
      ? `${locationCity}, ${locationState}`
      : locationCity || locationState || null

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      style={{ opacity: fadeIn }}
    >
      {/* Warm brand tint behind */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-amber-950/30 pointer-events-none" />

      <div className="relative text-center space-y-3">
        <div className="mx-auto w-12 h-px bg-amber-500/40 mb-6" />

        <h2
          className="text-2xl text-stone-100 tracking-wide"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          {businessName}
        </h2>

        <p className="text-sm text-stone-400">Private Chef Services</p>

        {location && <p className="text-xs text-stone-600 mt-4">{location}</p>}
      </div>
    </div>
  )
}

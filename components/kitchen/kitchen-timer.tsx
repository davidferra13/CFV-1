'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface Timer {
  id: string
  label: string
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
}

/**
 * Generates a short beep using Web Audio API.
 * No external audio files needed.
 */
function playBeep(durationMs = 500, frequency = 880) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'square'
    gain.gain.value = 0.3

    oscillator.start()
    oscillator.stop(ctx.currentTime + durationMs / 1000)

    // Play three beeps
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.value = frequency
        osc2.type = 'square'
        gain2.gain.value = 0.3
        osc2.start()
        osc2.stop(ctx.currentTime + durationMs / 1000)
      } catch { /* ignore */ }
    }, durationMs + 200)

    setTimeout(() => {
      try {
        const osc3 = ctx.createOscillator()
        const gain3 = ctx.createGain()
        osc3.connect(gain3)
        gain3.connect(ctx.destination)
        osc3.frequency.value = frequency * 1.5
        osc3.type = 'square'
        gain3.gain.value = 0.3
        osc3.start()
        osc3.stop(ctx.currentTime + durationMs / 1000)
      } catch { /* ignore */ }
    }, (durationMs + 200) * 2)
  } catch {
    // Web Audio API not available, silent fallback
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Hook for managing multiple timers
export function useKitchenTimers() {
  const [timers, setTimers] = useState<Timer[]>([])
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const addTimer = useCallback((minutes: number, label?: string) => {
    const id = `timer-${Date.now()}`
    const totalSeconds = minutes * 60
    const newTimer: Timer = {
      id,
      label: label || `${minutes} min timer`,
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: true,
    }

    setTimers((prev) => [...prev, newTimer])

    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (t.id !== id || !t.isRunning) return t
          const next = t.remainingSeconds - 1
          if (next <= 0) {
            clearInterval(intervalsRef.current.get(id)!)
            intervalsRef.current.delete(id)
            playBeep()
            return { ...t, remainingSeconds: 0, isRunning: false }
          }
          return { ...t, remainingSeconds: next }
        })
      )
    }, 1000)

    intervalsRef.current.set(id, interval)
    return id
  }, [])

  const removeTimer = useCallback((id: string) => {
    const interval = intervalsRef.current.get(id)
    if (interval) {
      clearInterval(interval)
      intervalsRef.current.delete(id)
    }
    setTimers((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearAllTimers = useCallback(() => {
    intervalsRef.current.forEach((interval) => clearInterval(interval))
    intervalsRef.current.clear()
    setTimers([])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((interval) => clearInterval(interval))
      intervalsRef.current.clear()
    }
  }, [])

  return { timers, addTimer, removeTimer, clearAllTimers }
}

// Visual timer component for kitchen mode
interface KitchenTimerDisplayProps {
  timers: Timer[]
  onRemove: (id: string) => void
}

export function KitchenTimerDisplay({ timers, onRemove }: KitchenTimerDisplayProps) {
  if (timers.length === 0) return null

  return (
    <div className="flex flex-wrap gap-4">
      {timers.map((timer) => {
        const progress = timer.totalSeconds > 0
          ? ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100
          : 100
        const isFinished = timer.remainingSeconds <= 0
        const isUrgent = timer.remainingSeconds > 0 && timer.remainingSeconds <= 30

        return (
          <div
            key={timer.id}
            className={`
              relative rounded-2xl border-2 px-6 py-4 min-w-[200px]
              ${isFinished
                ? 'border-red-500 bg-red-500/20 animate-pulse'
                : isUrgent
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-zinc-600 bg-zinc-800/80'
              }
            `}
          >
            <button
              onClick={() => onRemove(timer.id)}
              className="absolute top-2 right-3 text-zinc-400 hover:text-white text-xl leading-none"
              aria-label="Remove timer"
            >
              x
            </button>
            <div className="text-zinc-400 text-sm mb-1">{timer.label}</div>
            <div
              className={`font-mono font-bold ${
                isFinished
                  ? 'text-red-400 text-6xl'
                  : isUrgent
                    ? 'text-yellow-400 text-6xl'
                    : 'text-white text-5xl'
              }`}
              style={{ fontSize: isFinished || isUrgent ? '72px' : '60px', lineHeight: 1.1 }}
            >
              {isFinished ? "TIME'S UP" : formatTime(timer.remainingSeconds)}
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isFinished
                    ? 'bg-red-500'
                    : isUrgent
                      ? 'bg-yellow-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

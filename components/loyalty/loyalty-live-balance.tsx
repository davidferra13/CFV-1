'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSSE } from '@/lib/realtime/sse-client'

interface LoyaltyLiveBalanceProps {
  initialBalance: number
  tenantId: string
  clientId: string
}

export function LoyaltyLiveBalance({
  initialBalance,
  tenantId,
  clientId,
}: LoyaltyLiveBalanceProps) {
  const [displayBalance, setDisplayBalance] = useState(initialBalance)
  const [flash, setFlash] = useState<'green' | 'amber' | null>(null)
  const targetRef = useRef(initialBalance)
  const animFrameRef = useRef<number | null>(null)
  const prefersReducedRef = useRef(false)

  useEffect(() => {
    prefersReducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const animateTo = useCallback((newBalance: number, direction: 'up' | 'down') => {
    const startBalance = targetRef.current
    targetRef.current = newBalance

    // Flash color
    setFlash(direction === 'up' ? 'green' : 'amber')
    setTimeout(() => setFlash(null), 300)

    if (prefersReducedRef.current || startBalance === newBalance) {
      setDisplayBalance(newBalance)
      return
    }

    const duration = 300
    const startTime = performance.now()
    const diff = newBalance - startBalance

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // easeOut curve
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startBalance + diff * eased)
      setDisplayBalance(current)

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      }
    }

    animFrameRef.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  useSSE(`loyalty:${tenantId}`, {
    onMessage: (msg: any) => {
      const data = msg?.data?.new || msg?.data
      if (!data || data.clientId !== clientId) return
      if (data.type === 'trigger_awarded' && typeof data.newBalance === 'number') {
        animateTo(data.newBalance, 'up')
      }
      if (data.type === 'points_deducted' && typeof data.newBalance === 'number') {
        animateTo(data.newBalance, 'down')
      }
    },
  })

  const flashClass =
    flash === 'green'
      ? 'text-emerald-400 transition-colors duration-150'
      : flash === 'amber'
        ? 'text-amber-400 transition-colors duration-150'
        : 'text-stone-100 transition-colors duration-150'

  return (
    <span className={`text-2xl font-bold ${flashClass}`}>
      {displayBalance.toLocaleString()} points
    </span>
  )
}

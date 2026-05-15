'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  resolveDiscoveryRailMotionContract,
  type DiscoveryRailMotionControl,
  type DiscoveryRailMotionContract,
} from '@/lib/discovery/control-rail-contracts'

export type DiscoveryMotionState = {
  contract: DiscoveryRailMotionContract
  activeControl: DiscoveryRailMotionControl
  isScrolling: boolean
  velocityPxPerMs: number
}

type MotionConfig = {
  defaultControl?: DiscoveryRailMotionControl
  decayFactor?: number
  maxVelocityPxPerFrame?: number
  reducedMotion?: boolean
}

const DEFAULT_DECAY = 0.94
const MAX_VELOCITY = 3.2

export function useDiscoveryMotion(config: MotionConfig = {}) {
  const {
    defaultControl = 'flick',
    decayFactor = DEFAULT_DECAY,
    maxVelocityPxPerFrame = MAX_VELOCITY,
  } = config

  const reducedMotion = useReducedMotion(config.reducedMotion)
  const [activeControl, setActiveControl] = useState<DiscoveryRailMotionControl>(
    reducedMotion ? 'passive' : defaultControl
  )
  const velocityRef = useRef(0)
  const isScrollingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([])

  const contract = resolveDiscoveryRailMotionContract({
    control: reducedMotion ? 'passive' : activeControl,
    reducedMotion,
    pointerVelocityPxPerMs: velocityRef.current,
  })

  const registerRow = useCallback((index: number, el: HTMLDivElement | null) => {
    scrollRefs.current[index] = el
  }, [])

  const startMomentumScroll = useCallback(
    (initialVelocity: number) => {
      if (contract.animation === 'none') return
      velocityRef.current =
        Math.min(Math.abs(initialVelocity), maxVelocityPxPerFrame) * Math.sign(initialVelocity)
      isScrollingRef.current = true

      const animate = () => {
        if (Math.abs(velocityRef.current) < 0.1) {
          isScrollingRef.current = false
          velocityRef.current = 0
          return
        }

        scrollRefs.current.forEach((el) => {
          if (el) el.scrollLeft += velocityRef.current
        })

        velocityRef.current *= decayFactor
        rafRef.current = requestAnimationFrame(animate)
      }

      rafRef.current = requestAnimationFrame(animate)
    },
    [contract.animation, decayFactor, maxVelocityPxPerFrame]
  )

  const stopScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    velocityRef.current = 0
    isScrollingRef.current = false
  }, [])

  const triggerDice = useCallback(() => {
    if (contract.control !== 'dice') return
    const staggerMs = contract.autoStopMs ?? 1400

    scrollRefs.current.forEach((el, index) => {
      if (!el) return
      const offset = Math.floor(Math.random() * el.scrollWidth * 0.3)
      setTimeout(() => {
        el.scrollTo({ left: offset, behavior: reducedMotion ? 'instant' : 'smooth' })
      }, index * staggerMs)
    })
  }, [contract, reducedMotion])

  const triggerLever = useCallback(() => {
    if (contract.control !== 'lever') return
    const cascadeMs = contract.autoStopMs ?? 4500
    const perRowMs = cascadeMs / Math.max(scrollRefs.current.length, 1)

    scrollRefs.current.forEach((el, index) => {
      if (!el) return
      const offset = Math.floor(Math.random() * el.scrollWidth * 0.4)
      setTimeout(() => {
        el.scrollTo({ left: offset, behavior: reducedMotion ? 'instant' : 'smooth' })
      }, index * perRowMs)
    })
  }, [contract, reducedMotion])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return {
    contract,
    activeControl,
    setActiveControl,
    registerRow,
    startMomentumScroll,
    stopScroll,
    triggerDice,
    triggerLever,
    reducedMotion,
    isScrolling: isScrollingRef.current,
  }
}

function useReducedMotion(override?: boolean): boolean {
  const [reduced, setReduced] = useState(override ?? false)

  useEffect(() => {
    if (override !== undefined) return
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [override])

  return reduced
}

'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: string
  className?: string
}

/**
 * Animates a numeric value from 0 to its target.
 * Handles currency ($1,234) and plain numbers (42).
 * Uses IntersectionObserver so animation triggers when visible.
 */
export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated.current) return

    const prefix = value.match(/^[^0-9]*/)?.[0] ?? ''
    const suffix = value.match(/[^0-9]*$/)?.[0] ?? ''
    const numStr = value.replace(/[^0-9.]/g, '')
    const target = parseFloat(numStr)

    if (isNaN(target) || target === 0) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return
        hasAnimated.current = true
        observer.disconnect()

        const duration = 800
        const startTime = performance.now()

        function animate(now: number) {
          const elapsed = now - startTime
          const progress = Math.min(elapsed / duration, 1)
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3)
          const current = Math.round(eased * target)
          const formatted = current.toLocaleString('en-US')
          setDisplay(`${prefix}${formatted}${suffix}`)

          if (progress < 1) {
            requestAnimationFrame(animate)
          } else {
            setDisplay(value)
          }
        }

        setDisplay(`${prefix}0${suffix}`)
        requestAnimationFrame(animate)
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}

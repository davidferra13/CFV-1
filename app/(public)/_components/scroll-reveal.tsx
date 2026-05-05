'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: 0 | 1 | 2 | 3
}

export function ScrollReveal({ children, className = '', delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed')
          observer.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const delayClass = delay > 0 ? ` scroll-reveal-delay-${delay}` : ''

  return (
    <div ref={ref} className={`scroll-reveal${delayClass} ${className}`}>
      {children}
    </div>
  )
}

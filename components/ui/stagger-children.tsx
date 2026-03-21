'use client'

import { useEffect, useRef } from 'react'

interface StaggerChildrenProps {
  children: React.ReactNode
  className?: string
  /** Delay between each child in ms */
  stagger?: number
}

/**
 * Animates direct children with a staggered fade-up entrance.
 * Uses IntersectionObserver so it only fires when scrolled into view.
 * Pure CSS animations, no JS animation library.
 */
export function StaggerChildren({ children, className = '', stagger = 60 }: StaggerChildrenProps) {
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const container = ref.current
    if (!container || hasAnimated.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return
        hasAnimated.current = true
        observer.disconnect()

        const children = container.querySelectorAll(':scope > [data-stagger-child]')
        children.forEach((child, i) => {
          const el = child as HTMLElement
          el.style.animationDelay = `${i * stagger}ms`
          el.classList.add('stagger-enter-active')
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [stagger])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

/**
 * Wrap individual items that should be staggered.
 * Must be a direct child of StaggerChildren.
 */
export function StaggerItem({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div data-stagger-child className={`stagger-enter ${className}`}>
      {children}
    </div>
  )
}

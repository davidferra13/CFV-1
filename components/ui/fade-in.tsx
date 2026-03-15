'use client'

// FadeIn - Smooth skeleton-to-content transition wrapper.
// Wrap your page content in this so it fades/slides in when the skeleton
// is replaced by real data. Without this, skeletons snap to content instantly.
//
// Usage in a page.tsx:
//   import { FadeIn } from '@/components/ui/fade-in'
//   export default function EventsPage() {
//     return <FadeIn>...real content...</FadeIn>
//   }
//
// Usage in a client component with async data:
//   {data ? <FadeIn>{renderContent(data)}</FadeIn> : <Skeleton />}

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FadeInProps {
  children: ReactNode
  /** Animation variant */
  variant?: 'fade' | 'slide-up' | 'scale'
  /** Duration in ms */
  duration?: 150 | 200 | 250 | 300
  /** Delay before animation starts (ms) */
  delay?: number
  /** Additional CSS classes */
  className?: string
  /** HTML element to render as */
  as?: 'div' | 'section' | 'main' | 'article'
}

const variantClasses = {
  fade: 'animate-[fade-in_var(--fade-duration)_ease-out_var(--fade-delay)_both]',
  'slide-up': 'animate-fade-slide-up',
  scale: 'animate-scale-in',
} as const

export function FadeIn({
  children,
  variant = 'slide-up',
  duration = 200,
  delay = 0,
  className,
  as: Tag = 'div',
}: FadeInProps) {
  return (
    <Tag
      className={cn(variantClasses[variant], className)}
      style={
        {
          '--fade-duration': `${duration}ms`,
          '--fade-delay': `${delay}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </Tag>
  )
}

// Staggered fade-in for lists/grids where each item appears sequentially.
// Each child gets an increasing delay.
//
// Usage:
//   <FadeInStagger>
//     {events.map(e => <EventCard key={e.id} event={e} />)}
//   </FadeInStagger>

interface FadeInStaggerProps {
  children: ReactNode[]
  /** Delay between each child (ms) */
  staggerMs?: number
  /** Base delay before the first child starts (ms) */
  baseDelayMs?: number
  /** Animation variant for each child */
  variant?: 'fade' | 'slide-up' | 'scale'
  /** Additional CSS classes on the container */
  className?: string
}

export function FadeInStagger({
  children,
  staggerMs = 50,
  baseDelayMs = 0,
  variant = 'slide-up',
  className,
}: FadeInStaggerProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <FadeIn key={i} variant={variant} delay={baseDelayMs + i * staggerMs}>
          {child}
        </FadeIn>
      ))}
    </div>
  )
}

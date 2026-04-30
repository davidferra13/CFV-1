'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type WatchValue = string | number | boolean | null | undefined

type StateChangePulseProps = {
  watch: WatchValue
  children: ReactNode
  className?: string
  activeClassName?: string
  as?: 'div' | 'span'
  durationMs?: number
}

export function StateChangePulse({
  watch,
  children,
  className,
  activeClassName = 'state-motion-change',
  as = 'div',
  durationMs = 720,
}: StateChangePulseProps) {
  const [active, setActive] = useState(false)
  const previous = useRef(watch)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      previous.current = watch
      return
    }

    if (Object.is(previous.current, watch)) return

    previous.current = watch
    setActive(true)
    const timeout = window.setTimeout(() => setActive(false), durationMs)
    return () => window.clearTimeout(timeout)
  }, [durationMs, watch])

  const Tag = as

  return (
    <Tag
      className={cn(className, active && activeClassName)}
      data-state-motion-active={active ? 'true' : undefined}
    >
      {children}
    </Tag>
  )
}

type StateMotionBadgeProps = BadgeProps & {
  watch: WatchValue
}

export function StateMotionBadge({ watch, className, children, ...props }: StateMotionBadgeProps) {
  return (
    <StateChangePulse watch={watch} as="span" className="inline-flex">
      <Badge className={cn('state-motion-badge', className)} {...props}>
        {children}
      </Badge>
    </StateChangePulse>
  )
}

type MotionProgressFillProps = {
  value: number
  className?: string
}

export function MotionProgressFill({ value, className }: MotionProgressFillProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))

  return (
    <div
      className={cn('state-motion-progress-fill', className)}
      style={{ width: `${clamped}%` }}
      data-progress-value={Math.round(clamped)}
    />
  )
}

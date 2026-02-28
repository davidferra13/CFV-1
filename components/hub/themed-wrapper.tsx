'use client'

import type { EventTheme } from '@/lib/hub/types'
import { themeToCSSVars } from '@/lib/themes/theme-registry'

interface ThemedWrapperProps {
  theme: EventTheme | null | undefined
  children: React.ReactNode
  className?: string
}

/**
 * Wrapper component that injects theme CSS custom properties.
 * Child components can use var(--hub-primary), var(--hub-secondary), etc.
 */
export function ThemedWrapper({ theme, children, className }: ThemedWrapperProps) {
  const style: React.CSSProperties = theme
    ? {
        ...themeToCSSVars(theme),
        background: theme.background_gradient ?? undefined,
      }
    : {}

  return (
    <div className={className} style={style as React.CSSProperties}>
      {children}
    </div>
  )
}

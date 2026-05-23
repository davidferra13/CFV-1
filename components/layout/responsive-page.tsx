'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResponsivePageProps {
  children: ReactNode
  /** Page title shown on mobile as a sticky header */
  title?: string
  /** Additional class names for the outer container */
  className?: string
  /** Use multi-column layout on desktop (default: true) */
  multiColumn?: boolean
  /** Max width constraint (default: 7xl) */
  maxWidth?: 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'
  /** Padding mode: 'standard' for normal pages, 'tight' for data-dense pages */
  padding?: 'standard' | 'tight' | 'none'
}

const maxWidthMap: Record<string, string> = {
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}

const paddingMap: Record<string, string> = {
  standard: 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6',
  tight: 'px-3 sm:px-4 lg:px-6 py-3 sm:py-4',
  none: '',
}

/**
 * Responsive page wrapper for daily-driver pages.
 *
 * Mobile: single column, generous touch spacing, larger text.
 * Desktop: respects maxWidth, normal spacing.
 *
 * Does NOT modify child component internals. Just provides the
 * responsive shell with proper spacing, max-width, and safe areas.
 */
export function ResponsivePage({
  children,
  title,
  className,
  maxWidth = '7xl',
  padding = 'standard',
}: ResponsivePageProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthMap[maxWidth],
        paddingMap[padding],
        // Safe area padding for notched devices
        'pl-[max(var(--page-pl,0px),env(safe-area-inset-left,0px))]',
        'pr-[max(var(--page-pr,0px),env(safe-area-inset-right,0px))]',
        className
      )}
    >
      {title && (
        <h1
          className={cn(
            'text-lg font-bold text-stone-100 sm:text-2xl',
            'mb-4 sm:mb-6',
            // On mobile, give the title breathing room
            'pt-1 sm:pt-0'
          )}
        >
          {title}
        </h1>
      )}
      {children}
    </div>
  )
}

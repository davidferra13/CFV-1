// PageHeader - Consistent page title area with optional actions.
// Replaces ad-hoc h1 + button patterns across pages.
// Includes subtle entry animation via FadeIn.

import { type ReactNode } from 'react'

interface PageHeaderProps {
  /** Page title (rendered as h1) */
  title: string
  /** Optional subtitle below the title */
  subtitle?: string
  /** Optional breadcrumb or back link rendered above the title */
  breadcrumb?: ReactNode
  /** Action buttons rendered on the right side */
  actions?: ReactNode
  /** Additional CSS classes on the wrapper */
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`animate-fade-slide-up ${className}`}>
      {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-stone-400 leading-relaxed">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

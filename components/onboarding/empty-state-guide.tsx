'use client'

// EmptyStateGuide - Replaces blank pages with helpful guidance
// Shows what the feature does, why it matters, and a CTA to get started.
// 84% of users abandon apps with blank screens (research).

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from '@/components/ui/icons'

type EmptyStateGuideProps = {
  icon: LucideIcon
  title: string
  description: string
  ctaLabel: string
  ctaHref?: string
  ctaOnClick?: () => void
  secondaryLabel?: string
  secondaryHref?: string
  // Optional tour step ID to mark complete when CTA is clicked
  tourStepId?: string
}

export function EmptyStateGuide({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  secondaryLabel,
  secondaryHref,
}: EmptyStateGuideProps) {
  const ctaButton = ctaHref ? (
    <Link href={ctaHref}>
      <Button variant="primary">{ctaLabel}</Button>
    </Link>
  ) : (
    <Button variant="primary" onClick={ctaOnClick}>
      {ctaLabel}
    </Button>
  )

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
      <div className="p-4 rounded-2xl bg-stone-800 mb-6">
        <Icon className="h-8 w-8 text-brand-500" />
      </div>
      <h3 className="text-lg font-semibold text-stone-200 mb-2">{title}</h3>
      <p className="text-sm text-stone-400 leading-relaxed mb-6">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {ctaButton}
        {secondaryLabel && secondaryHref && (
          <Link href={secondaryHref}>
            <Button variant="ghost">{secondaryLabel}</Button>
          </Link>
        )}
      </div>
    </div>
  )
}

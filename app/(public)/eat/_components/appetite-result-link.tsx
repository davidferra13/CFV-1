'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { ConsumerResultCard } from '@/lib/public-consumer/discovery-actions'
import { recordAppetiteResultEvidence } from '@/lib/discovery/appetite-evidence-client'

export function AppetiteResultLink({
  card,
  className,
  children,
}: {
  card: ConsumerResultCard
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={card.ctaHref}
      className={className}
      onClick={() => recordAppetiteResultEvidence(card, 'result_open')}
    >
      {children}
    </Link>
  )
}

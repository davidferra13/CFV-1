'use client'

import Link, { type LinkProps } from 'next/link'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

type TrackedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    analyticsName: string
    analyticsProps?: Record<string, string | number | boolean | null>
  }

function toHrefString(href: LinkProps['href']): string {
  if (typeof href === 'string') return href
  if (typeof href === 'object' && 'pathname' in href && typeof href.pathname === 'string') {
    return href.pathname
  }
  return ''
}

export function TrackedLink({
  analyticsName,
  analyticsProps,
  onClick,
  href,
  ...props
}: TrackedLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackEvent(ANALYTICS_EVENTS.CTA_CLICKED, {
      cta_name: analyticsName,
      cta_href: toHrefString(href),
      ...analyticsProps,
    })
    onClick?.(event)
  }

  return <Link href={href} onClick={handleClick} {...props} />
}

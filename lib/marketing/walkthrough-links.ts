import type { LinkProps } from 'next/link'
import { buildMarketingSourceHref } from '@/lib/marketing/source-links'

type WalkthroughCtaSource = {
  sourceCta?: string | null
  sourcePage: string
}

export function buildOperatorWalkthroughHref({
  sourceCta,
  sourcePage,
}: WalkthroughCtaSource): LinkProps['href'] {
  return buildMarketingSourceHref({
    pathname: '/for-operators/walkthrough',
    sourcePage,
    sourceCta,
  })
}

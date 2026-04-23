import type { LinkProps } from 'next/link'
import { PRIMARY_SIGNUP_HREF } from '@/lib/marketing/launch-mode'
import { buildMarketingSourceHref } from '@/lib/marketing/source-links'

type SignupCtaSource = {
  sourceCta?: string | null
  sourcePage: string
}

export function buildMarketingSignupHref({
  sourceCta,
  sourcePage,
}: SignupCtaSource): LinkProps['href'] {
  return buildMarketingSourceHref({
    pathname: PRIMARY_SIGNUP_HREF,
    sourcePage,
    sourceCta,
  })
}

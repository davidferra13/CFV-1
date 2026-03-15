import type { LinkProps } from 'next/link'
import { PRIMARY_SIGNUP_HREF } from '@/lib/marketing/launch-mode'

type SignupCtaSource = {
  sourceCta?: string | null
  sourcePage: string
}

export function buildMarketingSignupHref({
  sourceCta,
  sourcePage,
}: SignupCtaSource): LinkProps['href'] {
  const query: Record<string, string> = {
    source_page: sourcePage,
  }

  if (sourceCta?.trim()) {
    query.source_cta = sourceCta.trim()
  }

  return {
    pathname: PRIMARY_SIGNUP_HREF,
    query,
  }
}

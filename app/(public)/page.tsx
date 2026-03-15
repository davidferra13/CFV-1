import type { Metadata } from 'next'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { HomeDualEntry } from '@/components/marketing/home-dual-entry'
import {
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  WebSiteJsonLd,
} from '@/components/seo/json-ld'
import {
  PLATFORM_KEYWORDS,
  PLATFORM_META_DESCRIPTION,
  PLATFORM_NAME,
  PLATFORM_SHORT_DESCRIPTION,
} from '@/lib/marketing/platform-positioning'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: `${PLATFORM_NAME} | Discover what to eat.`,
  description: PLATFORM_META_DESCRIPTION,
  keywords: PLATFORM_KEYWORDS,
  openGraph: {
    title: `${PLATFORM_NAME} | Discover what to eat.`,
    description: PLATFORM_SHORT_DESCRIPTION,
    url: BASE_URL,
    siteName: PLATFORM_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PLATFORM_NAME} | Discover what to eat.`,
    description: PLATFORM_SHORT_DESCRIPTION,
  },
  alternates: {
    canonical: BASE_URL,
  },
}

export default function Home() {
  return (
    <div className="overflow-x-clip">
      <PublicPageView pageName="home" properties={{ section: 'public_growth' }} />
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />
      <HomeDualEntry />
    </div>
  )
}

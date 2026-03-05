import type { Metadata, Viewport } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import { Suspense } from 'react'
import { CookieConsent } from '@/components/ui/cookie-consent'
import { SwRegister } from '@/components/pwa/sw-register'
import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { PerformanceTelemetry } from '@/components/analytics/performance-telemetry'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#e88f47',
}

export const metadata: Metadata = {
  title: {
    default: 'ChefFlow - Private Chef Business Software',
    template: '%s | ChefFlow',
  },
  description:
    'Ops for Artists - The business operating system built by a chef, for chefs. Manage events, clients, menus, and payments from one calm workspace.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ChefFlow',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: 'ChefFlow - Private Chef Business Software',
    description: 'Ops for Artists - The business operating system built by a chef, for chefs.',
    siteName: 'ChefFlow',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow - Private Chef Business Software',
    description: 'Ops for Artists - The business OS built by a chef, for chefs.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Google Search Console & Bing Webmaster verification
  // Set these env vars when you verify ownership in each console
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
            ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
            : {}),
          ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
            ? { other: { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
            : {}),
        },
      }
    : {}),
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://cheflowhq.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        {/* Skip to main content link - WCAG 2.1 Level AAA requirement */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:bg-stone-950 focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>

        <PostHogProvider>
          <Suspense fallback={null}>
            <PerformanceTelemetry />
          </Suspense>
          {children}
        </PostHogProvider>
        <CookieConsent />
        <SwRegister />
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import { CookieConsent } from '@/components/ui/cookie-consent'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { SwRegister } from '@/components/pwa/sw-register'
import { HolidayOverlay } from '@/components/ui/holiday-overlay'
import { PostHogProvider } from '@/components/analytics/posthog-provider'
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
    default: 'ChefFlow — Private Chef Business Software',
    template: '%s | ChefFlow',
  },
  description:
    'Ops for Artists — The business operating system built by a chef, for chefs. Manage events, clients, menus, and payments from one calm workspace.',
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
  openGraph: {
    title: 'ChefFlow — Private Chef Business Software',
    description: 'Ops for Artists — The business operating system built by a chef, for chefs.',
    siteName: 'ChefFlow',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow — Private Chef Business Software',
    description: 'Ops for Artists — The business OS built by a chef, for chefs.',
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
        <PostHogProvider>{children}</PostHogProvider>
        <CookieConsent />
        <PresenceBeacon />
        <SwRegister />
        <HolidayOverlay />
      </body>
    </html>
  )
}

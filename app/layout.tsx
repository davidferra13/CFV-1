import type { Metadata, Viewport } from 'next'
import nextDynamic from 'next/dynamic'
import { Playfair_Display } from 'next/font/google'
import { IconProvider } from '@/components/ui/icon-provider'
import { ColorPaletteProvider, PaletteScript } from '@/components/ui/color-palette-provider'
import { AppThemeProvider } from '@/components/ui/app-theme-provider'
import { COMPANY_NAME, PUBLIC_SITE_URL, absoluteUrl } from '@/lib/site/public-site'
import './globals.css'

// Force all routes to render dynamically (skip static page generation).
// This app has 962 routes that depend on auth/tenant context; SSG is
// meaningless and crashes the build when PostgreSQL is not running.
export const dynamic = 'force-dynamic'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-playfair',
})

const DeferredRootRuntime = nextDynamic(
  () => import('@/components/runtime/deferred-root-runtime').then((m) => m.DeferredRootRuntime),
  { ssr: false }
)

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#e88f47',
}

export const metadata: Metadata = {
  title: {
    default: 'ChefFlow - Food & Chef Marketplace',
    template: `%s | ${COMPANY_NAME}`,
  },
  description:
    'ChefFlow is a food and chef marketplace for discovering chef-made meals, private dining, catering, and meal prep while chefs manage bookings, menus, and client relationships.',
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
    title: 'ChefFlow - Food & Chef Marketplace',
    description:
      'Discover chef-made meals, private dining, catering, and meal prep while chefs manage bookings, menus, and client relationships.',
    siteName: COMPANY_NAME,
    type: 'website',
    locale: 'en_US',
    images: [{ url: absoluteUrl('/social/chefflow-home.png'), alt: 'ChefFlow homepage preview' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow - Food & Chef Marketplace',
    description:
      'Discover chef-made meals, private dining, catering, and meal prep while chefs manage bookings, menus, and client relationships.',
    images: [absoluteUrl('/social/chefflow-home.png')],
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
  metadataBase: new URL(PUBLIC_SITE_URL),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={playfairDisplay.variable}>
      <head>
        <PaletteScript />
        {/* Resource hints: preconnect to origins used on first paint */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="font-sans">
        <AppThemeProvider>
          {/* Skip to main content link - WCAG 2.1 Level AAA requirement */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-chrome focus:bg-brand-700 focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
          >
            Skip to main content
          </a>

          <IconProvider>
            <ColorPaletteProvider>
              {children}
              <DeferredRootRuntime />
            </ColorPaletteProvider>
          </IconProvider>
        </AppThemeProvider>
      </body>
    </html>
  )
}

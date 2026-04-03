import type { Metadata, Viewport } from 'next'
import dynamic from 'next/dynamic'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { IconProvider } from '@/components/ui/icon-provider'
import { ColorPaletteProvider, PaletteScript } from '@/components/ui/color-palette-provider'
import { AppThemeProvider } from '@/components/ui/app-theme-provider'
import './globals.css'

const DeferredRootRuntime = dynamic(
  () => import('@/components/runtime/deferred-root-runtime').then((m) => m.DeferredRootRuntime),
  { ssr: false }
)

const dmSans = DM_Sans({
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
    default: 'ChefFlow - Discover Chefs, Restaurants, and Food Near You',
    template: '%s | ChefFlow',
  },
  description:
    'Find private chefs, caterers, restaurants, food trucks, and bakeries near you. Browse menus, explore cuisines, and connect directly with food providers.',
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
    title: 'ChefFlow - Discover Chefs, Restaurants, and Food Near You',
    description:
      'Find private chefs, caterers, restaurants, food trucks, and bakeries near you. Browse menus and connect directly.',
    siteName: 'ChefFlow',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow - Discover Chefs, Restaurants, and Food Near You',
    description: 'Find private chefs, caterers, restaurants, food trucks, and bakeries near you.',
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable}`} suppressHydrationWarning>
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
            className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:bg-brand-700 focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
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

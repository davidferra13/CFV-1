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
  title: 'ChefFlow',
  description: 'Ops for Artists - Private chef business operating system',
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
    title: 'ChefFlow',
    description: 'Ops for Artists - Private chef business operating system',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
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

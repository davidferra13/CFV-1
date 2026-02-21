import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { CookieConsent } from '@/components/ui/cookie-consent'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { SwRegister } from '@/components/pwa/sw-register'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        {children}
        <CookieConsent />
        <PresenceBeacon />
        <SwRegister />
      </body>
    </html>
  )
}

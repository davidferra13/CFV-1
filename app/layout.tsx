import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { CookieConsent } from '@/components/ui/cookie-consent'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ChefFlow',
  description: 'Ops for Artists - Private chef business operating system',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/icon-192.svg', sizes: '192x192' },
      { url: '/icon-512.svg', sizes: '512x512' },
    ],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#111827" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans">
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}

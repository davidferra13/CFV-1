// Minimal kiosk layout - no nav, no sidebar, no Remy, no portal links
// Full-screen, touch-optimized, designed for dedicated tablets

import type { Metadata, Viewport } from 'next'
import { WakeLock } from '@/components/kiosk/wake-lock'

export const metadata: Metadata = {
  title: 'ChefFlow Kiosk',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 select-none">
      <WakeLock />
      {children}
    </div>
  )
}

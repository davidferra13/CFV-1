'use client'

import Link from 'next/link'
import { Phone } from '@/components/ui/icons'

export function SourcingPhoneButton({ activeSessions = 0 }: { activeSessions?: number }) {
  return (
    <Link
      href="/culinary/call-sheet"
      className="fixed bottom-20 right-6 z-40 group"
      aria-label="Open sourcing call sheet"
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-pulse" />

      {/* Button */}
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25 hover:scale-110 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200">
        <Phone className="w-6 h-6 text-white" />
      </span>

      {/* Badge */}
      {activeSessions > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
          {activeSessions}
        </span>
      )}
    </Link>
  )
}

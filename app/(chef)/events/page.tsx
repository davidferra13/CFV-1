import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import PulseContent from './pulse-content'

export const metadata: Metadata = { title: 'Event Pulse' }

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20 text-stone-500">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">Loading pulse...</span>
    </div>
  )
}

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-stone-100 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Event Pulse
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Your events, readiness, and network at a glance
          </p>
        </div>
        <Link href="/events/new">
          <Button data-tour="create-event">+ New Event</Button>
        </Link>
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <PulseContent />
      </Suspense>
    </div>
  )
}

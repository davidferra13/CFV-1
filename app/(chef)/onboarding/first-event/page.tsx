// First Event Wizard Page
// Guides new chefs through creating their first client, event, menu, and quote.
// Redirects to dashboard if the chef already has events.

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { hasAnyEvents } from '@/lib/onboarding/first-event-actions'
import { FirstEventWizard } from '@/components/onboarding/first-event-wizard'

export const metadata: Metadata = { title: 'Create Your First Event' }

export default async function FirstEventPage() {
  const hasEvents = await hasAnyEvents()
  if (hasEvents) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight">
          Let&apos;s set up your first event
        </h1>
        <p className="text-stone-400 mt-2 max-w-md mx-auto">
          In just a few steps, you will have a client, an event, and a menu ready to go.
          Takes about 5 minutes.
        </p>
      </div>
      <FirstEventWizard />
    </div>
  )
}

'use client'

// Network Step - Setup Wizard
// Introduces the Chef Network feature. No required actions, just awareness + optional CTA.

import { useRouter } from 'next/navigation'

interface NetworkStepProps {
  onComplete: (data?: Record<string, unknown>) => void
  onSkip: () => void
}

export function NetworkStep({ onComplete, onSkip }: NetworkStepProps) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Connect with other chefs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ChefFlow has a built-in chef network. Connect with chefs you trust to share leads,
          collaborate on events, and grow together.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground">Referral handoffs</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Too busy for a lead? Hand it off to a trusted chef. Track conversions and build your
            referral reputation.
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground">Event collaboration</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Co-host events, hire subcontractors, or bring in specialists for specific courses.
            Shared collab spaces keep everyone in sync.
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground">Community board</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Post opportunities, find subcontract gigs, and join dinner circles in your area.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            onComplete({ acknowledged: true })
          }}
          className="rounded-md bg-orange-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-500"
        >
          Got it, continue
        </button>
        <button
          type="button"
          onClick={() => {
            router.push('/network')
          }}
          className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Explore Network
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

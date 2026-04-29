// Post-Event Close-Out Wizard Page
// Chef is redirected here automatically after marking an event as completed.
// Guides through: tip → receipts → mileage → quick AAR → financial close.

import dynamic from 'next/dynamic'
import { notFound, redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getEventCloseOutData } from '@/lib/events/financial-summary-actions'
import { CostVarianceCard } from '@/components/finance/cost-variance-card'

const CloseOutWizard = dynamic(
  () => import('@/components/events/close-out-wizard').then((m) => m.CloseOutWizard),
  {
    loading: () => (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 rounded-lg bg-stone-800 animate-pulse" />
        <div className="h-48 rounded-lg bg-stone-800 animate-pulse" />
      </div>
    ),
  }
)

export default async function CloseOutPage({ params }: { params: { id: string } }) {
  await requireChef()

  const data = await getEventCloseOutData(params.id)

  if (!data) {
    // Event not found, not owned by chef, or not in 'completed' state
    notFound()
  }

  // If already fully closed, redirect back to the event
  if (data.event.financialClosed) {
    redirect(`/events/${params.id}`)
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <CostVarianceCard eventId={params.id} />
        <CloseOutWizard data={data} />
      </div>
    </div>
  )
}

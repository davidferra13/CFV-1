// Post-Event Close-Out Wizard Page
// Chef is redirected here automatically after marking an event as completed.
// Guides through: tip → receipts → mileage → quick AAR → financial close.

import { notFound, redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getEventCloseOutData } from '@/lib/events/financial-summary-actions'
import { CloseOutWizard } from '@/components/events/close-out-wizard'

export default async function CloseOutPage({
  params,
}: {
  params: { id: string }
}) {
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
      <CloseOutWizard data={data} />
    </div>
  )
}

// Server component: departure checklist + leftover tracking for the event detail page
import { DepartureChecklist } from '@/components/events/departure-checklist'
import { LeftoverTracking } from '@/components/events/leftover-tracking'

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventDepartureSection({ eventId, tenantId, event, activeTab }: Props) {
  // Only show on ops tab (service day operations)
  if (activeTab !== 'ops') return null

  return (
    <>
      <DepartureChecklist eventId={eventId} />
      <LeftoverTracking eventId={eventId} />
    </>
  )
}

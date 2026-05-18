// Server component: fetches beverage discovery data for the event detail page
import { getEventBeverageDiscovery } from '@/lib/events/beverage-discovery-actions'
import { BeverageDiscoverySection } from '@/components/events/beverage-discovery-section'

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventBeverageSection({ eventId, tenantId, event, activeTab }: Props) {
  // Only show on overview tab (discovery happens early in event lifecycle)
  if (activeTab !== 'overview') return null

  const beverageData = await getEventBeverageDiscovery(eventId).catch(() => null)

  return (
    <BeverageDiscoverySection
      eventId={eventId}
      initialData={{
        beverage_expectations: beverageData?.beverage_expectations ?? null,
        beverage_service_type: beverageData?.beverage_service_type ?? null,
        alcohol_being_served: beverageData?.alcohol_being_served ?? false,
      }}
    />
  )
}

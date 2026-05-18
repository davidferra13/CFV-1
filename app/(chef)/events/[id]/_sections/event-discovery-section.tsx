// Server component: discovery fields + vendor coordination for the event detail page
import { getDiscoveryFields, getEventVendors } from '@/lib/events/discovery-actions'
import { DiscoveryFieldsSection } from '@/components/events/discovery-fields-section'
import { VendorCoordinationSection } from '@/components/events/vendor-coordination-section'
import type { DiscoveryFields } from '@/lib/events/discovery-types'

const EMPTY_FIELDS: DiscoveryFields = {
  dress_code: null,
  table_presentation: null,
  surprise_details: null,
  social_media_consent: null,
  vibe_atmosphere: null,
  vendor_coordination_notes: null,
  confidentiality_required: false,
}

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventDiscoverySection({ eventId, tenantId, event, activeTab }: Props) {
  if (activeTab !== 'overview') return null

  const [fields, vendors] = await Promise.all([
    getDiscoveryFields(eventId).catch(() => null),
    getEventVendors(eventId).catch(() => [] as any[]),
  ])

  return (
    <>
      <DiscoveryFieldsSection eventId={eventId} initialFields={fields ?? EMPTY_FIELDS} />
      <VendorCoordinationSection eventId={eventId} initialVendors={vendors} />
    </>
  )
}

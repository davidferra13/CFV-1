'use client'

import { ExitLinkButton } from '@/components/exit-links/ExitLinkButton'
import { getVendorContext } from '@/lib/exit-links/context-helpers'

interface VendorExitLinksProps {
  vendor: {
    name: string
    email?: string | null
    website?: string | null
    portalUrl?: string | null
    trackingNumber?: string | null
  }
  eventDate?: string
  itemList?: string
}

/**
 * Exit links for vendor-specific actions: email, order portal,
 * catalog browsing, and shipment tracking.
 * Each button auto-hides when its required context keys are missing.
 */
export function VendorExitLinks({ vendor, eventDate, itemList }: VendorExitLinksProps) {
  const ctx = getVendorContext({
    name: vendor.name,
    email: vendor.email ?? '',
    website: vendor.website ?? '',
    portalUrl: vendor.portalUrl ?? '',
  })

  const context: Record<string, string> = {
    ...ctx,
    eventDate: eventDate ?? '',
    itemList: itemList ?? '',
    trackingNumber: vendor.trackingNumber ?? '',
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Exit 35: Email vendor */}
      <ExitLinkButton exitId={35} context={context} variant="compact" />
      {/* Exit 39: Order from vendor portal */}
      <ExitLinkButton exitId={39} context={context} variant="compact" />
      {/* Exit 51: Browse vendor catalog/website */}
      <ExitLinkButton exitId={51} context={context} variant="compact" />
      {/* Exit 52: Track shipment */}
      <ExitLinkButton exitId={52} context={context} variant="compact" />
    </div>
  )
}

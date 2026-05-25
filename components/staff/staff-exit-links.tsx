'use client'

import { ExitLinkButton } from '@/components/exit-links/ExitLinkButton'
import { getStaffContext, mergeContext } from '@/lib/exit-links/context-helpers'

/**
 * Exit links for a staff member's contact section.
 * Exit 87: Contact/Text assistant
 * Exit 23: Pay via Venmo (when event context is available)
 */
export function StaffContactExitLinks({
  staff,
  latestEventName,
}: {
  staff: { name?: string; phone?: string; rate?: number }
  latestEventName?: string
}) {
  const ctx = mergeContext(getStaffContext(staff as Record<string, unknown>), {
    eventName: latestEventName ?? '',
    eventDate: '',
  })

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {/* Exit 87: Contact / Text assistant */}
      <ExitLinkButton exitId={87} context={ctx} variant="ghost" size="sm" />
      {/* Exit 23: Pay via Venmo */}
      <ExitLinkButton exitId={23} context={ctx} variant="ghost" size="sm" />
    </div>
  )
}

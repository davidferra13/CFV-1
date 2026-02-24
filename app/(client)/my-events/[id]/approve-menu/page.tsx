// Client Menu Approval Page
// Loaded when client clicks the approval link from the menu email.
// Shows the menu snapshot and lets the client approve or request revisions.

import { requireClient } from '@/lib/auth/get-user'
import { getClientMenuApprovalRequest } from '@/lib/events/menu-approval-actions'
import { notFound, redirect } from 'next/navigation'
import { MenuApprovalClient } from './menu-approval-client'

export default async function MenuApprovalPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { req?: string }
}) {
  await requireClient()

  const requestId = searchParams.req
  if (!requestId) redirect(`/my-events/${params.id}`)

  const request = await getClientMenuApprovalRequest(requestId)
  if (!request) notFound()

  const snapshot: Array<{ menu_name: string; dishes: string[] }> =
    (request as any).menu_snapshot ?? []

  return (
    <div className="min-h-screen bg-stone-800 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Menu Review</h1>
          <p className="mt-1 text-sm text-stone-500">
            Review the menu below and let your chef know if it looks great or if you&apos;d like any
            changes.
          </p>
        </div>

        <MenuApprovalClient
          requestId={requestId}
          menuSnapshot={snapshot}
          status={(request as any).status as 'sent' | 'approved' | 'revision_requested'}
          revisionNotes={(request as any).revision_notes}
          eventId={params.id}
        />
      </div>
    </div>
  )
}

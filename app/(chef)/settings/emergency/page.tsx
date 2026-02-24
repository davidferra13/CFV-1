// Emergency Contacts & Contingency Settings
// Chef stores key backup contacts for event incapacitation scenarios.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listEmergencyContacts } from '@/lib/contingency/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmergencyContactsClient } from './emergency-contacts-client'

export const metadata: Metadata = { title: 'Emergency Contacts — ChefFlow' }

export default async function EmergencyPage() {
  await requireChef()
  const contacts = await listEmergencyContacts()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Emergency Contacts</h1>
        <p className="mt-1 text-sm text-stone-500">
          People to call if you are unable to execute an event — a sous chef you trust, a business
          partner, or a peer chef who can step in.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-950 px-4 py-3">
        <p className="text-sm text-blue-900">
          These contacts are private and only visible to you. They appear as options when you add
          contingency plans to specific events.
        </p>
      </div>

      <EmergencyContactsClient initialContacts={contacts} />
    </div>
  )
}

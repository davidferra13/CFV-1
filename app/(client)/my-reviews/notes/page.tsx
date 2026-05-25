import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyChefNotes } from '@/lib/notes/client-chef-note-actions'
import { ChefNotesPanel } from '@/components/client/chef-notes-panel'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Notes on Chef' }

export default async function ChefNotesPage() {
  const user = await requireClient()
  const chefId = user.tenantId!
  const notes = await getMyChefNotes(chefId)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">My Notes on Chef</h1>
        <p className="text-stone-400 mt-1">
          Private notes about your chef. Only shared if you choose.
        </p>
      </div>
      <ChefNotesPanel chefId={chefId} initialNotes={notes} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}

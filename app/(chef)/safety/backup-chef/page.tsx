// Backup Chef Protocol Page
// Lists backup chef contacts and protocols for when the primary chef cannot execute an event.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { BackupChefList } from '@/components/safety/backup-chef-list'

export const metadata: Metadata = { title: 'Backup Chef Protocol | ChefFlow' }

export default async function BackupChefPage() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: contacts } = await supabase
    .from('chef_backup_contacts')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('priority', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Backup Chef Protocol</h1>
        <p className="mt-1 text-sm text-stone-500">
          Trusted chefs and culinary professionals who can step in if you are suddenly unable to
          execute an event. Keep this list current and have the conversation before an emergency
          happens.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3">
        <p className="text-sm text-amber-900">
          <span className="font-medium">Best practice:</span> Confirm availability with each backup
          chef at least once per quarter. Provide them access to your prep notes and client
          preferences in advance - not in the middle of a crisis.
        </p>
      </div>

      <BackupChefList contacts={contacts ?? []} />
    </div>
  )
}

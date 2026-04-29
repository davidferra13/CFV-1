import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefPreferences } from '@/lib/chef/actions'
import { getCulinaryProfile } from '@/lib/ai/chef-profile-actions'
import { listRemyMemories } from '@/lib/ai/remy-memory-actions'
import { DefaultKnowledgeClient } from '@/components/settings/default-knowledge-client'

export const metadata: Metadata = { title: 'Default Knowledge' }

export default async function DefaultKnowledgePage() {
  await requireChef()

  const [preferences, culinaryProfile, memories] = await Promise.all([
    getChefPreferences(),
    getCulinaryProfile(),
    listRemyMemories({ limit: 100 }),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <Link href="/settings" className="inline-flex text-sm text-stone-500 hover:text-stone-300">
          Back to Settings
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Default Knowledge</h1>
          <p className="mt-1 max-w-3xl text-sm text-stone-400">
            Review what ChefFlow already knows, decide which intelligence controls are active, and
            add durable facts the chef should never have to repeat.
          </p>
        </div>
      </div>

      <DefaultKnowledgeClient
        preferences={preferences}
        culinaryProfile={culinaryProfile}
        memories={memories}
      />
    </div>
  )
}

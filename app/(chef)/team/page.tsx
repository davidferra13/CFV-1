import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listTeamMembers } from '@/lib/team/team-management'
import { TeamMembers } from '@/components/team/team-members'

export const metadata: Metadata = { title: 'Team' }

export default async function TeamPage() {
  await requireChef()
  const members = await listTeamMembers()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Staff tools
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Multi-Chef Team Management</h1>
        <p className="mt-1 text-stone-400">
          Invite collaborators, set permissions, and control active team access by tenant.
        </p>
      </div>

      <TeamMembers members={members} />
    </div>
  )
}

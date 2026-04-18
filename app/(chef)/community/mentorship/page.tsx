import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { MentorshipDashboard } from '@/components/community/mentorship-dashboard'
import { MentorSearch } from '@/components/community/mentor-search'
import { MentorshipProfileForm } from '@/components/community/mentorship-profile-form'
import { getMentorshipProfile } from '@/lib/community/mentorship-actions'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Mentorship | Community' }

export default async function MentorshipPage() {
  const user = await requireChef()
  const mentorProfile = await getMentorshipProfile().catch(() => null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Mentorship</h1>
      </div>

      <MentorshipProfileForm profile={mentorProfile} />
      <MentorshipDashboard chefId={user.entityId} />
      <MentorSearch />
    </div>
  )
}

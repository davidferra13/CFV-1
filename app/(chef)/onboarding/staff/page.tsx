import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { listStaffMembers } from '@/lib/staff/actions'
import { StaffEntryForm } from '@/components/onboarding/staff-entry-form'

export const metadata = { title: 'Staff Setup — ChefFlow Setup' }

export default async function OnboardingStaffPage() {
  const staff = await listStaffMembers().catch(() => [])

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Setup
          </Link>
          <h1 className="text-3xl font-bold text-stone-900">Staff Roster</h1>
          <p className="text-stone-600 mt-2 max-w-xl">
            Add team members you work with regularly. This step is optional — you can add staff
            any time from the Staff section.
          </p>
        </div>

        <StaffEntryForm initialStaff={staff} />

      </div>
    </div>
  )
}

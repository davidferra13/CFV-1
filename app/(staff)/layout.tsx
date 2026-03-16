// Staff Portal Layout - Layer 2 of Defense in Depth
// Simple layout with top navigation for staff members.
// Staff see: Dashboard, Tasks, Station, Recipes, Schedule.

import { requireStaff } from '@/lib/auth/get-user'
import { getMyProfile } from '@/lib/staff/staff-portal-actions'
import { redirect } from 'next/navigation'
import { StaffNav } from '@/components/staff/staff-nav'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { TestAccountBanner } from '@/components/dev/test-account-banner'
import { StaffTourWrapper } from '@/components/onboarding/staff-tour-wrapper'

export const metadata = {
  title: {
    template: '%s - Staff Portal - ChefFlow',
    default: 'Staff Portal - ChefFlow',
  },
}

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requireStaff()
  } catch {
    redirect('/staff-login')
  }

  const profile = await getMyProfile()
  const staffName = profile?.name ?? 'Staff Member'

  return (
    <div className="min-h-screen bg-stone-800" data-cf-portal="staff">
      <TestAccountBanner />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <StaffNav staffName={staffName} staffEmail={user.email} />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <StaffTourWrapper>{children}</StaffTourWrapper>
      </main>
      <PresenceBeacon />
    </div>
  )
}

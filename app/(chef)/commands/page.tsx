import { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { RemyHubDashboard } from '@/components/ai/remy-hub-dashboard'
import { isFounderEmail } from '@/lib/platform/owner-account'

export const metadata: Metadata = {
  title: 'Command Center — ChefFlow',
  description: 'Commands, conversations, saved context, and privacy controls — all in one place.',
}

export default async function CommandsPage() {
  const admin = await requireAdmin()
  if (!isFounderEmail(admin.email)) {
    redirect('/unauthorized')
  }

  return (
    <div className="container max-w-4xl py-8">
      <RemyHubDashboard />
    </div>
  )
}

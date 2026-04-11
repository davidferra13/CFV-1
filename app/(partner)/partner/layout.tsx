// Partner Portal Layout - server-side auth guard + sidebar wrapper.
// requirePartner() throws if the user is not an authenticated partner,
// causing a redirect to the sign-in page.

import { requirePartner } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/db/server'
import { PartnerSidebar, PartnerMobileNav } from '@/components/navigation/partner-nav'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { TestAccountBanner } from '@/components/dev/test-account-banner'

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requirePartner()
  } catch {
    redirect('/auth/signin?portal=partner')
  }

  // Fetch partner name for sidebar display
  const db = createServerClient({ admin: true })
  const { data: partner } = await db
    .from('referral_partners')
    .select('name')
    .eq('id', user.partnerId)
    .single()

  const partnerName = partner?.name ?? 'Partner'

  return (
    <div className="min-h-screen bg-stone-800 flex" data-cf-portal="partner">
      <ToastProvider />
      <TestAccountBanner email={user.email} />
      <PartnerSidebar partnerName={partnerName} />

      <main className="flex-1 pt-14 lg:pt-0">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>

      <PartnerMobileNav />
      <PresenceBeacon userId={user.id} email={user.email} />
    </div>
  )
}

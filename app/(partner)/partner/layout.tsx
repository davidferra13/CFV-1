// Partner Portal Layout - server-side auth guard + sidebar wrapper.
// requirePartner() throws if the user is not an authenticated partner,
// causing a redirect to the sign-in page.

import { requirePartner } from '@/lib/auth/get-user'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/db/server'
import { PartnerSidebar, PartnerMobileNav } from '@/components/navigation/partner-nav'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { TestAccountBanner } from '@/components/dev/test-account-banner'
import { RoleSwitcher } from '@/components/shared/role-switcher'
import { auth } from '@/lib/auth'
import { PATHNAME_HEADER } from '@/lib/auth/request-auth-context'
import { resolvePartnerSurfaceMode } from '@/lib/interface/surface-governance'

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get(PATHNAME_HEADER) ?? '/partner/dashboard'
  const surfaceMode = resolvePartnerSurfaceMode(pathname)

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

  const session = await auth()
  const availableRoleCount =
    ((session?.user as Record<string, unknown>)?.availableRoles as number) ?? 1

  return (
    <div
      className="min-h-screen bg-stone-800 flex"
      data-cf-portal="partner"
      data-cf-surface={surfaceMode}
    >
      <ToastProvider />
      <TestAccountBanner email={user.email} />
      <PartnerSidebar partnerName={partnerName} />

      <div className="flex-1 flex flex-col">
        <header className="flex h-14 items-center justify-end border-b border-stone-700 px-6">
          <RoleSwitcher currentRole="partner" availableRoleCount={availableRoleCount} />
        </header>

        <main className="flex-1 pt-14 lg:pt-0">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      <PartnerMobileNav />
      <PresenceBeacon userId={user.id} email={user.email} />
    </div>
  )
}

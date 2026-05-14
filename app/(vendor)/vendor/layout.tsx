import { requireVendor } from '@/lib/auth/get-user'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { vendors } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { VendorSidebar } from '@/components/vendor/vendor-sidebar'
import { VendorMobileNav } from '@/components/vendor/vendor-mobile-nav'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { TestAccountBanner } from '@/components/dev/test-account-banner'
import { RoleSwitcher } from '@/components/shared/role-switcher'

export const metadata = {
  title: {
    template: '%s - Vendor Portal',
    default: 'Vendor Portal',
  },
}

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requireVendor()
  } catch {
    redirect('/auth/signin?portal=vendor')
  }

  const [vendor] = await db
    .select({ name: vendors.name })
    .from(vendors)
    .where(eq(vendors.id, user.vendorId))
    .limit(1)

  const vendorName = vendor?.name ?? 'Vendor'

  const session = await auth()
  const availableRoleCount =
    ((session?.user as Record<string, unknown>)?.availableRoles as number) ?? 1

  return (
    <div className="min-h-screen bg-stone-800 flex" data-cf-portal="vendor">
      <TestAccountBanner email={user.email} />
      <VendorSidebar vendorName={vendorName} />

      <div className="flex-1 flex flex-col">
        <header className="flex h-14 items-center justify-end border-b border-stone-200 px-6">
          <RoleSwitcher currentRole="vendor" availableRoleCount={availableRoleCount} />
        </header>

        <main className="flex-1 pt-14 lg:pt-0 pb-16 lg:pb-0">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      <VendorMobileNav />
      <PresenceBeacon userId={user.id} email={user.email} />
    </div>
  )
}

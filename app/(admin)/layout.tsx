// Admin Portal Layout
// Requires admin access (email in ADMIN_EMAILS env var)
// Uses chef portal shell so admin pages match the standard chef experience.

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { SidebarProvider, ChefSidebar, ChefMobileNav } from '@/components/navigation/chef-nav'
import { ChefMainContent } from '@/components/navigation/chef-main-content'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { OfflineProvider } from '@/components/offline/offline-provider'
import { PageInfoButton } from '@/components/ui/page-info'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { TestAccountBanner } from '@/components/dev/test-account-banner'
import { isFounderEmail } from '@/lib/platform/owner-account'

export const metadata = {
  title: 'Admin — ChefFlow',
}

const RemyWrapper = dynamic(
  () => import('@/components/ai/remy-wrapper').then((m) => m.RemyWrapper),
  { ssr: false }
)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    redirect('/auth/signin?redirect=/admin')
  }

  return (
    <OfflineProvider>
      <SidebarProvider>
        <NotificationProvider userId={admin.id}>
          <ToastProvider />
          <TestAccountBanner />
          <div className="dark-surface min-h-screen bg-stone-900 text-stone-200">
            <ChefSidebar isAdmin userId={admin.id} tenantId={admin.id} />
            <ChefMobileNav isAdmin userId={admin.id} tenantId={admin.id} />
            <ChefMainContent>{children}</ChefMainContent>
            {isFounderEmail(admin.email) && <RemyWrapper />}
            <PresenceBeacon />
            <PageInfoButton />
          </div>
        </NotificationProvider>
      </SidebarProvider>
    </OfflineProvider>
  )
}

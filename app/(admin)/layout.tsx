// Admin Portal Layout
// Requires persisted platform admin access.
// Uses admin-owned shell components for navigation and content,
// NOT chef shell components. This is an enforced runtime boundary.

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  AdminSidebarProvider,
  AdminSidebar,
  AdminMobileNav,
  AdminMainContent,
} from '@/components/navigation/admin-shell'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { OfflineProvider } from '@/components/offline/offline-provider'
import { PageInfoButton } from '@/components/ui/page-info'
import { PresenceBeacon } from '@/components/admin/presence-beacon'
import { TestAccountBanner } from '@/components/dev/test-account-banner'
import { isFounderEmail } from '@/lib/platform/owner-account'
import { AnalyticsIdentify } from '@/components/analytics/analytics-identify'

export const metadata = {
  title: 'Admin',
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
      <AdminSidebarProvider>
        <NotificationProvider userId={admin.id}>
          <ToastProvider />
          <TestAccountBanner email={admin.email} />
          <div className="min-h-screen bg-stone-900 text-stone-100" data-cf-portal="admin">
            <AdminSidebar userId={admin.id} />
            <AdminMobileNav userId={admin.id} />
            <AdminMainContent>{children}</AdminMainContent>
            {isFounderEmail(admin.email) && <RemyWrapper />}
            <AnalyticsIdentify userId={admin.id} email={admin.email} role="admin" />
            <PresenceBeacon userId={admin.id} email={admin.email} />
            <PageInfoButton />
          </div>
        </NotificationProvider>
      </AdminSidebarProvider>
    </OfflineProvider>
  )
}

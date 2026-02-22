// Client Portal Layout - Layer 2 of Defense in Depth

import { requireClient } from '@/lib/auth/get-user'
import { clientHasCannabisAccess } from '@/lib/clients/cannabis-client-actions'
import { redirect } from 'next/navigation'
import {
  ClientSidebarProvider,
  ClientSidebar,
  ClientMobileNav,
  ClientMainContent,
} from '@/components/navigation/client-nav'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import { ToastProvider } from '@/components/notifications/toast-provider'
import { RemyClientChat } from '@/components/ai/remy-client-chat'
import { PageInfoButton } from '@/components/ui/page-info'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requireClient()
  } catch {
    redirect('/auth/signin?portal=client')
  }

  const hasCannabisTier = await clientHasCannabisAccess(user.id).catch(() => false)

  return (
    <ClientSidebarProvider>
      <NotificationProvider userId={user.id}>
        <ToastProvider />
        <div className="min-h-screen bg-surface-muted">
          <ClientSidebar userEmail={user.email} hasCannabisTier={hasCannabisTier} />
          <ClientMobileNav userEmail={user.email} hasCannabisTier={hasCannabisTier} />
          <ActivityTracker eventType="portal_login" />
          <ClientMainContent>{children}</ClientMainContent>
          <RemyClientChat />
          <PageInfoButton />
        </div>
      </NotificationProvider>
    </ClientSidebarProvider>
  )
}

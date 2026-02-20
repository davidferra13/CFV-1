// Client Portal Layout - Layer 2 of Defense in Depth

import { requireClient } from '@/lib/auth/get-user'
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

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await requireClient()
  } catch {
    redirect('/auth/signin?portal=client')
  }

  return (
    <ClientSidebarProvider>
      <NotificationProvider userId={user.id}>
        <ToastProvider />
        <div className="min-h-screen bg-surface-muted">
          <ClientSidebar userEmail={user.email} />
          <ClientMobileNav userEmail={user.email} />
          <ActivityTracker eventType="portal_login" />
          <ClientMainContent>{children}</ClientMainContent>
        </div>
      </NotificationProvider>
    </ClientSidebarProvider>
  )
}

'use client'

import type { ReactNode } from 'react'
import { AppContextProvider } from '@/lib/context/app-context'
import { FormatProviderWrapper } from '@/components/providers/format-provider-wrapper'
import { PermissionProvider } from '@/lib/context/permission-context'
import { OfflineProvider } from '@/components/offline/offline-provider'
import { SidebarProvider } from '@/components/navigation/chef-nav'
import { NavigationPendingProvider } from '@/components/navigation/navigation-pending-provider'
import { NotificationProvider } from '@/components/notifications/notification-provider'
import type { FormatContext } from '@/lib/hooks/use-format-context'

export interface ChefProvidersProps {
  /** IANA timezone for AppContextProvider */
  timezone: string
  /** Locale, currency, timezone, measurement system for FormatProviderWrapper */
  formatContext: FormatContext
  /** RBAC permission map for PermissionProvider */
  permissions: Record<string, { actions: string[]; scope: string }>
  /** Authenticated user ID for NotificationProvider */
  userId: string
  children: ReactNode
}

/**
 * Composes all 7 chef-portal context providers in the correct nesting order.
 * Pure wrapper, no behavior change from the original nested JSX in layout.tsx.
 */
export function ChefProviders({
  timezone,
  formatContext,
  permissions,
  userId,
  children,
}: ChefProvidersProps) {
  return (
    <AppContextProvider timezone={timezone}>
      <FormatProviderWrapper value={formatContext}>
        <PermissionProvider permissions={permissions}>
          <OfflineProvider>
            <SidebarProvider>
              <NavigationPendingProvider>
                <NotificationProvider userId={userId}>{children}</NotificationProvider>
              </NavigationPendingProvider>
            </SidebarProvider>
          </OfflineProvider>
        </PermissionProvider>
      </FormatProviderWrapper>
    </AppContextProvider>
  )
}

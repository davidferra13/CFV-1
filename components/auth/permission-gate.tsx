'use client'

import { type ReactNode } from 'react'
import { usePermissions, type PermissionAction } from '@/lib/context/permission-context'

/**
 * Client-side permission gate.
 * Renders children only if the current user has the required permission.
 * Falls back to optional fallback content (or nothing).
 *
 * Usage:
 *   <PermissionGate domain="financial" action="view">
 *     <RevenueChart />
 *   </PermissionGate>
 *
 *   <PermissionGate domain="billing" action="manage" fallback={<UpgradeNotice />}>
 *     <BillingSettings />
 *   </PermissionGate>
 */
export function PermissionGate({
  domain,
  action,
  children,
  fallback = null,
}: {
  domain: string
  action: PermissionAction
  children: ReactNode
  fallback?: ReactNode
}) {
  const { has } = usePermissions()

  if (!has(domain, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Inverse gate - renders children only if the user LACKS the permission.
 * Useful for showing "you don't have access" messages or upgrade prompts.
 */
export function PermissionDenied({
  domain,
  action,
  children,
}: {
  domain: string
  action: PermissionAction
  children: ReactNode
}) {
  const { has } = usePermissions()

  if (has(domain, action)) {
    return null
  }

  return <>{children}</>
}

'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

// ─── Types (mirrored from lib/auth/permissions.ts for client use) ───────────────

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage'

type PermissionData = Record<string, { actions: string[]; scope: string }>

type PermissionContextValue = {
  permissions: PermissionData
  has: (domain: string, action: PermissionAction) => boolean
  getScope: (domain: string) => string | null
}

// ─── Context ────────────────────────────────────────────────────────────────────

const PermissionContext = createContext<PermissionContextValue>({
  permissions: {},
  has: () => true, // Default: allow (prevents flash of hidden content before context loads)
  getScope: () => 'tenant',
})

// ─── Provider ───────────────────────────────────────────────────────────────────

export function PermissionProvider({
  permissions,
  children,
}: {
  permissions: PermissionData
  children: ReactNode
}) {
  const value = useMemo<PermissionContextValue>(
    () => ({
      permissions,
      has: (domain: string, action: PermissionAction) => {
        const entry = permissions[domain]
        if (!entry) return false
        if (entry.actions.includes('manage')) return true
        return entry.actions.includes(action)
      },
      getScope: (domain: string) => {
        return permissions[domain]?.scope ?? null
      },
    }),
    [permissions]
  )

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

/** Access the current user's permissions from any client component */
export function usePermissions(): PermissionContextValue {
  return useContext(PermissionContext)
}

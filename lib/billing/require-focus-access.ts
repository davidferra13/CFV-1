// Focus Mode Route Gating
// When Focus Mode is ON and user is NOT admin, extended module pages redirect to dashboard.
// This prevents direct-URL access to hidden features.
// Admin always has full access regardless of Focus Mode.

'use server'

import { redirect } from 'next/navigation'
import { isFocusModeEnabled } from '@/lib/billing/focus-mode-actions'
import { isEffectiveAdmin } from '@/lib/auth/admin-preview'

/**
 * Call at the top of any extended module page (staff, commerce, stations, tasks, travel).
 * If Focus Mode is ON and user is not admin, redirects to /dashboard.
 * Does nothing if Focus Mode is OFF or user is admin.
 * Respects admin preview mode - when previewing as chef, admin gets redirected too.
 */
export async function requireFocusAccess(): Promise<void> {
  const adminCheck = await isEffectiveAdmin()
  if (adminCheck) return // Admin always has access (unless previewing as chef)

  const focusMode = await isFocusModeEnabled().catch(() => false)
  if (focusMode) {
    redirect('/dashboard')
  }
}

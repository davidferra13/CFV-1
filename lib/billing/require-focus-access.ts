// Focus Mode Route Gating
// When Focus Mode is ON and user is NOT admin, extended module pages redirect to dashboard.
// This prevents direct-URL access to hidden features.
// Admin always has full access regardless of Focus Mode.

'use server'

import { redirect } from 'next/navigation'
import { isFocusModeEnabled } from '@/lib/billing/focus-mode-actions'
import { isEffectivePrivileged } from '@/lib/auth/admin-preview'

/**
 * Call at the top of any extended module page (staff, commerce, stations, tasks, travel).
 * If Focus Mode is ON and user is not privileged (VIP/Admin/Owner), redirects to /dashboard.
 * Does nothing if Focus Mode is OFF or user is VIP or above.
 * Respects admin preview mode - when previewing as chef, privileged users get redirected too.
 */
export async function requireFocusAccess(): Promise<void> {
  const privileged = await isEffectivePrivileged()
  if (privileged) return // VIP, Admin, Owner always bypass focus mode (unless previewing)

  const focusMode = await isFocusModeEnabled().catch(() => false)
  if (focusMode) {
    redirect('/dashboard')
  }
}

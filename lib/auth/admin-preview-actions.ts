// Admin Preview Mode - Server Actions
// Toggle the preview cookie. Only real admins can set it.

'use server'

import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/lib/admin/audit'
import { requireChef } from '@/lib/auth/get-user'

const PREVIEW_COOKIE = 'chefflow-admin-preview'

/**
 * Toggle admin preview mode on/off.
 * When ON, the admin experiences the app as a non-admin chef would.
 * Only real admins can toggle this.
 */
export async function toggleAdminPreview(enabled: boolean): Promise<void> {
  const admin = await isAdmin().catch(() => false)
  if (!admin) return // silently ignore non-admin calls

  const store = cookies()
  if (enabled) {
    store.set(PREVIEW_COOKIE, 'chef', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      // No maxAge - session cookie, clears on browser close
    })
  } else {
    store.delete(PREVIEW_COOKIE)
  }

  // Audit log the preview mode toggle (non-blocking)
  try {
    const user = await requireChef()
    await logAdminAction({
      actorEmail: user.email ?? 'unknown',
      actorUserId: user.id,
      actionType: enabled ? 'admin_preview_enabled' : 'admin_preview_disabled',
      details: { mode: enabled ? 'chef' : 'admin' },
    })
  } catch {
    // Non-blocking; admin status already verified above
  }

  revalidatePath('/', 'layout')
}

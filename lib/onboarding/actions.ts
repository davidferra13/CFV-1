'use server'

// Onboarding Server Actions
// Slug utilities for the wizard's "Public URL" step.
// Profile completion (markOnboardingComplete) lives in lib/chef/profile-actions.ts.

import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns true if the given slug is available (not taken by another chef).
 * Uses admin client to bypass RLS.
 */
export async function checkSlugAvailability(slug: string): Promise<boolean> {
  const user = await requireChef()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('chefs')
    .select('id')
    .eq('slug', slug)
    .neq('id', user.entityId)
    .maybeSingle()

  return !data // null = not taken = available
}

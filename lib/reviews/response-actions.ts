'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Save or update the chef's response to a client review.
 * Tenant-scoped: only responds to reviews belonging to this chef.
 */
export async function respondToReview(reviewId: string, responseText: string) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const trimmed = responseText.trim()
  if (!trimmed) throw new Error('Response cannot be empty')

  const { error } = await supabase
    .from('client_reviews')
    .update({
      chef_response: trimmed,
      responded_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .eq('tenant_id', chef.tenantId!)

  if (error) throw new Error(`Failed to save response: ${error.message}`)

  revalidatePath('/reviews')
}

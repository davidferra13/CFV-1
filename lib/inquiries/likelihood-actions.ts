// Lead Likelihood — Server action for setting the chef's manual likelihood tag.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Likelihood = 'hot' | 'warm' | 'cold'

/**
 * Set or clear the chef's manual likelihood tag on an inquiry.
 * Pass null to clear (revert to auto-computed score display).
 */
export async function setInquiryLikelihood(inquiryId: string, likelihood: Likelihood | null) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('inquiries')
    .update({ chef_likelihood: likelihood })
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[setInquiryLikelihood] Error:', error)
    throw new Error('Failed to set likelihood')
  }

  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')

  return { success: true }
}

// Contact Claim Pipeline -- Server Actions
// Lets chefs view unclaimed contact form submissions and claim them
// as tenant-scoped inquiries in their pipeline.
//
// Note: contact_submissions is not yet in generated types (types/database.ts).
// Using `as any` to match the pattern in lib/contact/actions.ts.
// Regenerate types after applying migration 20260221000009 to remove casts.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createInquiry } from '@/lib/inquiries/actions'
import { revalidatePath } from 'next/cache'

type ContactSubmission = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  created_at: string
  claimed_by_chef_id: string | null
  claimed_at: string | null
  inquiry_id: string | null
  read: boolean
}

/**
 * Get all unclaimed contact submissions (chef-only).
 * Not tenant-scoped by design -- this is the shared lead pool.
 */
export async function getUnclaimedSubmissions() {
  await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('contact_submissions')
    .select('id, name, email, subject, message, created_at')
    .is('claimed_by_chef_id', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getUnclaimedSubmissions] Error:', error)
    throw new Error('Failed to fetch submissions')
  }

  return (data ?? []) as Pick<
    ContactSubmission,
    'id' | 'name' | 'email' | 'subject' | 'message' | 'created_at'
  >[]
}

/**
 * Count of unclaimed submissions (for queue provider / badges).
 */
export async function getUnclaimedCount(): Promise<number> {
  await requireChef()
  const db: any = createServerClient()

  const { count, error } = await db
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true })
    .is('claimed_by_chef_id', null)

  if (error) {
    console.error('[getUnclaimedCount] Error:', error)
    return 0
  }

  return count ?? 0
}

/**
 * Claim a contact submission and convert it to an inquiry.
 *
 * 1. Verify submission exists and is unclaimed (optimistic lock)
 * 2. Create inquiry via existing createInquiry() with channel='website'
 * 3. Mark submission as claimed with back-reference to inquiry
 */
export async function claimContactSubmission(submissionId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Fetch and verify unclaimed
  const { data: submission, error: fetchError } = await db
    .from('contact_submissions')
    .select('id, name, email, subject, message, created_at')
    .eq('id', submissionId)
    .is('claimed_by_chef_id', null)
    .single()

  if (fetchError || !submission) {
    throw new Error('Submission not found or already claimed')
  }

  const sub = submission as Pick<
    ContactSubmission,
    'id' | 'name' | 'email' | 'subject' | 'message' | 'created_at'
  >

  // 2. Create inquiry using existing pipeline
  const sourceMessage = [sub.subject ? `Subject: ${sub.subject}` : '', sub.message]
    .filter(Boolean)
    .join('\n\n')

  const result = await createInquiry({
    channel: 'website',
    client_name: sub.name,
    client_email: sub.email || '',
    source_message: sourceMessage,
    notes: `Converted from contact form submission (${new Date(sub.created_at).toLocaleDateString()})`,
  })

  // 3. Mark as claimed with back-reference
  const { error: updateError } = await db
    .from('contact_submissions')
    .update({
      claimed_by_chef_id: user.entityId,
      claimed_at: new Date().toISOString(),
      inquiry_id: result.inquiry.id,
      read: true,
    })
    .eq('id', submissionId)

  if (updateError) {
    console.error('[claimContactSubmission] Update error:', updateError)
    // Inquiry was created but claim-update failed. Not ideal, but no data loss.
    // The submission may appear claimable again, but the inquiry already exists.
  }

  revalidatePath('/leads')
  revalidatePath('/inquiries')
  revalidatePath('/dashboard')

  return { success: true, inquiryId: result.inquiry.id }
}

/**
 * Dismiss a contact submission (spam / irrelevant).
 * Marks as claimed without creating an inquiry.
 */
export async function dismissContactSubmission(submissionId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('contact_submissions')
    .update({
      claimed_by_chef_id: user.entityId,
      claimed_at: new Date().toISOString(),
      read: true,
      // inquiry_id stays null -- dismissed, not converted
    })
    .eq('id', submissionId)
    .is('claimed_by_chef_id', null)

  if (error) {
    console.error('[dismissContactSubmission] Error:', error)
    throw new Error('Failed to dismiss submission')
  }

  revalidatePath('/leads')
  revalidatePath('/dashboard')

  return { success: true }
}

/**
 * Check if an inquiry has a linked contact submission.
 * Used to determine if "Release to Marketplace" should be shown.
 */
export async function getLinkedContactSubmission(
  inquiryId: string
): Promise<{ id: string } | null> {
  await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('contact_submissions')
    .select('id')
    .eq('inquiry_id', inquiryId)
    .single()

  return data ?? null
}

/**
 * Release an auto-assigned inquiry back to the marketplace.
 * Unclaims the contact submission and deletes the inquiry.
 * Only works for inquiries in 'new' status (not yet worked on).
 */
export async function releaseToMarketplace(inquiryId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify inquiry exists, belongs to this chef, and is still 'new'
  const { data: inquiry, error: inquiryError } = await db
    .from('inquiries')
    .select('id, status, tenant_id')
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (inquiryError || !inquiry) {
    throw new Error('Inquiry not found')
  }

  if (inquiry.status !== 'new') {
    throw new Error('Can only release inquiries in "new" status. Decline the inquiry instead.')
  }

  // Find the linked contact submission
  const { data: submission } = await db
    .from('contact_submissions')
    .select('id')
    .eq('inquiry_id', inquiryId)
    .single()

  if (!submission) {
    throw new Error('No linked contact submission found - this inquiry was not auto-assigned')
  }

  // Unclaim the submission so it reappears in the marketplace
  const { error: unclaimError } = await db
    .from('contact_submissions')
    .update({
      claimed_by_chef_id: null,
      claimed_at: null,
      inquiry_id: null,
    })
    .eq('id', submission.id)

  if (unclaimError) {
    console.error('[releaseToMarketplace] Unclaim error:', unclaimError)
    throw new Error('Failed to release submission back to marketplace')
  }

  // Delete the auto-created inquiry (status is 'new', so this is safe)
  const { error: deleteError } = await db
    .from('inquiries')
    .delete()
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)

  if (deleteError) {
    console.error('[releaseToMarketplace] Delete error:', deleteError)
    throw new Error('Failed to delete auto-assigned inquiry')
  }

  revalidatePath('/leads')
  revalidatePath('/inquiries')
  revalidatePath('/dashboard')

  return { success: true }
}

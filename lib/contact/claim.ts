// Contact Claim Pipeline -- Server Actions
// Lets chefs view unclaimed contact form submissions and claim them
// as tenant-scoped inquiries in their pipeline.
//
// Note: contact_submissions is not yet in generated types (types/database.ts).
// Using `as any` to match the pattern in lib/contact/actions.ts.
// Regenerate types after applying migration 20260221000009 to remove casts.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  CONTACT_INTAKE_LANES,
  OPERATOR_EVALUATION_STATUSES,
  type ContactIntakeLane,
  type OperatorEvaluationStatus,
  parseOperatorWalkthroughSubmission,
} from '@/lib/contact/operator-evaluation'
import { createServerClient } from '@/lib/db/server'
import { createInquiry } from '@/lib/inquiries/actions'
import { resolveOwnerIdentity } from '@/lib/platform/owner-account'
import { revalidatePath } from 'next/cache'

type ContactSubmission = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  created_at: string
  intake_lane: ContactIntakeLane
  operator_evaluation_status: OperatorEvaluationStatus | null
  source_cta: string | null
  source_page: string | null
  claimed_by_chef_id: string | null
  claimed_at: string | null
  inquiry_id: string | null
  read: boolean
}

export type OperatorEvaluationSubmission = {
  id: string
  name: string
  email: string
  submittedAt: string
  businessName: string | null
  operatorType: string | null
  workflowStack: string | null
  helpRequest: string | null
  sourcePage: string | null
  sourceCta: string | null
  status: OperatorEvaluationStatus
}

function getOperatorEvaluationStatusRank(status: OperatorEvaluationStatus) {
  return OPERATOR_EVALUATION_STATUSES.indexOf(status)
}

/**
 * Get all unclaimed general contact submissions (chef-only).
 * Not tenant-scoped by design -- this is the shared lead pool.
 */
export async function getUnclaimedSubmissions() {
  await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('contact_submissions')
    .select('id, name, email, subject, message, created_at')
    .eq('intake_lane', CONTACT_INTAKE_LANES.GENERAL_CONTACT)
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
    .eq('intake_lane', CONTACT_INTAKE_LANES.GENERAL_CONTACT)
    .is('claimed_by_chef_id', null)

  if (error) {
    console.error('[getUnclaimedCount] Error:', error)
    return 0
  }

  return count ?? 0
}

export async function getOperatorEvaluationInbox(): Promise<{
  isOwner: boolean
  submissions: OperatorEvaluationSubmission[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const ownerIdentity = await resolveOwnerIdentity(db)
  const isOwner = ownerIdentity.ownerChefId === user.entityId

  if (!isOwner) {
    return { isOwner: false, submissions: [] }
  }

  const { data, error } = await db
    .from('contact_submissions')
    .select(
      'id, name, email, subject, message, created_at, source_page, source_cta, operator_evaluation_status'
    )
    .eq('intake_lane', CONTACT_INTAKE_LANES.OPERATOR_WALKTHROUGH)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getOperatorEvaluationInbox] Error:', error)
    throw new Error('Failed to fetch operator walkthrough requests')
  }

  const submissions = (
    (data ?? []) as Array<
      Pick<
        ContactSubmission,
        | 'id'
        | 'name'
        | 'email'
        | 'subject'
        | 'message'
        | 'created_at'
        | 'source_page'
        | 'source_cta'
        | 'operator_evaluation_status'
      >
    >
  )
    .map((submission) => {
      const parsed = parseOperatorWalkthroughSubmission({
        subject: submission.subject,
        message: submission.message,
        sourcePage: submission.source_page,
        sourceCta: submission.source_cta,
      })

      return {
        id: submission.id,
        name: submission.name,
        email: submission.email,
        submittedAt: submission.created_at,
        businessName: parsed?.businessName ?? null,
        operatorType: parsed?.operatorType ?? null,
        workflowStack: parsed?.workflowStack ?? null,
        helpRequest: parsed?.helpRequest ?? null,
        sourcePage: parsed?.sourcePage ?? submission.source_page ?? null,
        sourceCta: parsed?.sourceCta ?? submission.source_cta ?? null,
        status: submission.operator_evaluation_status ?? 'new',
      } satisfies OperatorEvaluationSubmission
    })
    .sort((left, right) => {
      const rankDifference =
        getOperatorEvaluationStatusRank(left.status) - getOperatorEvaluationStatusRank(right.status)

      if (rankDifference !== 0) return rankDifference
      return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()
    })

  return {
    isOwner: true,
    submissions,
  }
}

export async function updateOperatorEvaluationStatus(
  submissionId: string,
  status: OperatorEvaluationStatus
) {
  const user = await requireChef()
  const db: any = createServerClient()
  const ownerIdentity = await resolveOwnerIdentity(db)

  if (ownerIdentity.ownerChefId !== user.entityId) {
    throw new Error('Only the founder workspace can update operator evaluations')
  }

  if (!OPERATOR_EVALUATION_STATUSES.includes(status)) {
    throw new Error('Invalid operator evaluation status')
  }

  const { data: updatedSubmission, error } = await db
    .from('contact_submissions')
    .update({
      operator_evaluation_status: status,
      claimed_by_chef_id: user.entityId,
      claimed_at: new Date().toISOString(),
      read: true,
    })
    .eq('id', submissionId)
    .eq('intake_lane', CONTACT_INTAKE_LANES.OPERATOR_WALKTHROUGH)
    .select('id')
    .single()

  if (error || !updatedSubmission) {
    console.error('[updateOperatorEvaluationStatus] Error:', error)
    throw new Error('Failed to update walkthrough request status')
  }

  revalidatePath('/leads')
  revalidatePath('/dashboard')

  return { success: true }
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
    .eq('intake_lane', CONTACT_INTAKE_LANES.GENERAL_CONTACT)
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
    .eq('intake_lane', CONTACT_INTAKE_LANES.GENERAL_CONTACT)
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
    .eq('intake_lane', CONTACT_INTAKE_LANES.GENERAL_CONTACT)
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

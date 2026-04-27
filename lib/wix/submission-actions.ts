'use server'

// Wix Submission Server Actions
// Used by the /wix-submissions/[id] detail page to fetch and retry processing.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { processWixSubmission } from '@/lib/wix/process'
import { revalidatePath } from 'next/cache'
import { broadcastTenantMutation } from '@/lib/realtime/broadcast'

export type WixSubmissionDetail = {
  id: string
  tenant_id: string
  wix_submission_id: string | null
  wix_form_id: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate'
  submitter_name: string | null
  submitter_email: string | null
  submitter_phone: string | null
  raw_payload: Record<string, unknown>
  inquiry_id: string | null
  client_id: string | null
  processing_attempts: number
  error: string | null
  created_at: string
  processed_at: string | null
}

// ─── Fetch a single Wix submission ───────────────────────────────────────

export async function getWixSubmission(submissionId: string): Promise<WixSubmissionDetail | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('wix_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) {
    console.error('[getWixSubmission] Fetch failed:', error?.message)
    return null
  }

  return data as unknown as WixSubmissionDetail
}

// ─── Retry processing a pending/failed submission ─────────────────────────

export async function retryWixSubmission(submissionId: string): Promise<{
  success: boolean
  inquiryId?: string
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership before retrying
  const { data: submission } = await db
    .from('wix_submissions')
    .select('id, status, processing_attempts')
    .eq('id', submissionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!submission) {
    return { success: false, error: 'Submission not found' }
  }

  if (submission.processing_attempts >= 3 && submission.status === 'failed') {
    return { success: false, error: 'Maximum retry attempts reached' }
  }

  const result = await processWixSubmission(submissionId)

  revalidatePath(`/wix-submissions/${submissionId}`)
  revalidatePath('/inbox')
  try {
    broadcastTenantMutation(user.tenantId!, {
      entity: 'wix_submissions',
      action: 'update',
      reason: 'Wix submission reprocessed',
    })
  } catch {}

  if (result.status === 'completed') {
    return { success: true, inquiryId: result.inquiryId }
  }

  if (result.status === 'duplicate') {
    return { success: true, inquiryId: result.inquiryId }
  }

  return { success: false, error: result.error ?? 'Processing failed' }
}

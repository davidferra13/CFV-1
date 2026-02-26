// Wix Integration Server Actions
// Chef-facing operations: setup, disconnect, view submissions, retry.
// Follows patterns from lib/gmail/actions.ts and lib/inquiries/actions.ts.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import type { WixConnectionStatus, WixSubmission } from './types'

// ─── Get Connection Status ───────────────────────────────────────────────

export async function getWixConnection(): Promise<WixConnectionStatus> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('wix_connections')
    .select('*')
    .eq('chef_id', user.entityId)
    .single()

  if (!data) {
    return {
      connected: false,
      webhookUrl: null,
      webhookSecret: null,
      lastSubmission: null,
      totalSubmissions: 0,
      errorCount: 0,
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  return {
    connected: true,
    webhookUrl: `${baseUrl}/api/webhooks/wix?secret=${data.webhook_secret}`,
    webhookSecret: data.webhook_secret,
    lastSubmission: data.last_submission_at,
    totalSubmissions: data.total_submissions,
    errorCount: data.error_count,
  }
}

// ─── Setup Wix Connection ────────────────────────────────────────────────

export async function setupWixConnection(): Promise<{ webhookUrl: string; webhookSecret: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Generate a secure webhook secret
  const webhookSecret = crypto.randomBytes(32).toString('hex')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  // Upsert: create or update the connection
  const { error } = await supabase.from('wix_connections').upsert(
    {
      chef_id: user.entityId,
      tenant_id: user.tenantId!,
      webhook_secret: webhookSecret,
    },
    { onConflict: 'chef_id' }
  )

  if (error) {
    console.error('[setupWixConnection] Error:', error)
    throw new Error('Failed to setup Wix connection')
  }

  revalidatePath('/settings')
  return {
    webhookUrl: `${baseUrl}/api/webhooks/wix?secret=${webhookSecret}`,
    webhookSecret,
  }
}

// ─── Disconnect Wix ──────────────────────────────────────────────────────

export async function disconnectWix(): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase.from('wix_connections').delete().eq('chef_id', user.entityId)

  if (error) {
    console.error('[disconnectWix] Error:', error)
    throw new Error('Failed to disconnect Wix')
  }

  revalidatePath('/settings')
}

// ─── Regenerate Webhook Secret ───────────────────────────────────────────

export async function regenerateWixSecret(): Promise<{
  webhookUrl: string
  webhookSecret: string
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const newSecret = crypto.randomBytes(32).toString('hex')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  const { error } = await supabase
    .from('wix_connections')
    .update({ webhook_secret: newSecret, updated_at: new Date().toISOString() })
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[regenerateWixSecret] Error:', error)
    throw new Error('Failed to regenerate secret')
  }

  revalidatePath('/settings')
  return {
    webhookUrl: `${baseUrl}/api/webhooks/wix?secret=${newSecret}`,
    webhookSecret: newSecret,
  }
}

// ─── Get Submissions ─────────────────────────────────────────────────────

export async function getWixSubmissions(options?: {
  status?: string
  limit?: number
}): Promise<WixSubmission[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('wix_submissions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 20)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getWixSubmissions] Error:', error)
    throw new Error('Failed to fetch submissions')
  }

  return (data || []) as WixSubmission[]
}

// ─── Retry Failed Submission ─────────────────────────────────────────────

export async function retryWixSubmission(submissionId: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify the submission belongs to this tenant
  const { data: submission, error: fetchError } = await supabase
    .from('wix_submissions')
    .select('id, status')
    .eq('id', submissionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !submission) {
    throw new Error('Submission not found')
  }

  if (submission.status !== 'failed') {
    throw new Error('Only failed submissions can be retried')
  }

  // Reset to pending for the cron to pick up
  const { error } = await supabase
    .from('wix_submissions')
    .update({ status: 'pending', error: null })
    .eq('id', submissionId)

  if (error) {
    console.error('[retryWixSubmission] Error:', error)
    throw new Error('Failed to retry submission')
  }

  revalidatePath('/settings')
}

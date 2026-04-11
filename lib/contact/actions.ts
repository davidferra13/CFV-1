// Contact Form Server Actions
// Stores public contact form submissions for admin review.
// Auto-assigns to the resolved platform owner account when available.

'use server'

import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@/lib/db/server'
import { getBusinessHoursForChef } from '@/lib/communication/business-hours'
import { isWithinBusinessHours } from '@/lib/communication/business-hours-utils'
import { sendContactMessageReceivedEmail } from '@/lib/email/notifications'
import { sendNotification } from '@/lib/notifications/send'
import { resolveOwnerIdentity } from '@/lib/platform/owner-account'
import { recordPlatformEvent } from '@/lib/platform-observability/events'
import { extractRequestMetadata } from '@/lib/platform-observability/context'

const SUPPORT_EMAIL = 'support@cheflowhq.com'
const DEFAULT_RESPONSE_WINDOW_TEXT = 'within 1 business day'

function getResponseWindowText(isSupportOpen: boolean | null): string {
  return isSupportOpen
    ? 'as soon as possible during current support hours'
    : DEFAULT_RESPONSE_WINDOW_TEXT
}

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
  website?: string
}

export async function submitContactForm(data: ContactFormData) {
  if (data.website?.trim()) {
    // Honeypot filled by bots; return success to avoid retries.
    return {
      success: true,
      acknowledgmentSent: false,
      userMessage: "We'll review your message soon.",
    }
  }

  const name = data.name?.trim()
  const email = data.email?.trim().toLowerCase()
  const subject = data.subject?.trim() || null
  const message = data.message?.trim()

  if (!name || !email || !message) {
    throw new Error('Name, email, and message are required')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address')
  }

  if (message.length < 10) {
    throw new Error('Message must be at least 10 characters')
  }

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`contact:ip:${ip}`, 8, 5 * 60_000)
    await checkRateLimit(`contact:email:${email}`, 4, 60 * 60_000)
  } catch {
    throw new Error('Too many submissions. Please try again later.')
  }

  // Use admin client since this is a public form (no auth required)
  const db = createServerClient({ admin: true })
  const ownerIdentity = await resolveOwnerIdentity(db)
  if (ownerIdentity.warnings.length > 0) {
    console.warn('[submitContactForm] Owner resolution warnings:', ownerIdentity.warnings)
  }

  const businessHours = ownerIdentity.ownerChefId
    ? await getBusinessHoursForChef(ownerIdentity.ownerChefId)
    : null
  const isSupportOpen = businessHours ? isWithinBusinessHours(businessHours) : null
  const responseWindowText = getResponseWindowText(isSupportOpen)

  const { data: submission, error } = await db
    .from('contact_submissions')
    .insert({ name, email, subject, message })
    .select('id')
    .single()

  if (error) {
    console.error('[submitContactForm] Error:', error)
    throw new Error('Failed to submit message. Please try again.')
  }

  let inquiryId: string | null = null

  // Auto-assign to resolved owner account.
  if (ownerIdentity.ownerChefId && submission?.id) {
    try {
      const assignment = await autoAssignToOwner(db, submission.id, ownerIdentity.ownerChefId, {
        name,
        email,
        subject,
        message,
      })
      inquiryId = assignment.inquiryId
    } catch (err) {
      // Non-fatal: submission is saved, just won't be auto-assigned
      console.error('[submitContactForm] Auto-assign failed (submission saved in pool):', err)
    }
  }

  const sideEffects: Array<Promise<unknown>> = []

  if (ownerIdentity.ownerChefId && ownerIdentity.ownerAuthUserId && inquiryId) {
    sideEffects.push(
      sendNotification({
        tenantId: ownerIdentity.ownerChefId,
        recipientId: ownerIdentity.ownerAuthUserId,
        type: 'new_inquiry',
        title: `New contact form submission from ${name}`,
        message: `${name} (${email}) sent a message via the public contact page${subject ? ` about "${subject}"` : ''}.`,
        link: `/inquiries/${inquiryId}`,
        inquiryId,
        metadata: {
          kind: 'contact_form_submission',
          source: 'contact_page',
          submission_id: submission.id,
        },
      })
    )
  }

  sideEffects.push(
    recordPlatformEvent({
      eventKey: 'input.contact_form_submitted',
      source: 'public_contact',
      actorType: 'anonymous',
      tenantId: ownerIdentity.ownerChefId,
      subjectType: 'contact_submission',
      subjectId: submission.id,
      summary: `${name} submitted the public contact form`,
      details: subject ? `Subject: ${subject}` : null,
      metadata: {
        ...extractRequestMetadata(hdrs),
        email,
        subject,
        inquiry_id: inquiryId,
      },
    })
  )

  const acknowledgmentPromise = sendContactMessageReceivedEmail({
    contactEmail: email,
    contactName: name,
    supportEmail: SUPPORT_EMAIL,
    responseWindowText,
  })
  sideEffects.push(acknowledgmentPromise)

  const settled = await Promise.allSettled(sideEffects)
  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('[submitContactForm] Side effect failed:', index, result.reason)
    }
  })

  const acknowledgmentResult = await acknowledgmentPromise.catch((err) => {
    console.error('[submitContactForm] Acknowledgment failed:', err)
    return false
  })

  return {
    success: true,
    acknowledgmentSent: acknowledgmentResult,
    userMessage: acknowledgmentResult
      ? `We received your message and sent a confirmation email. We'll reply ${responseWindowText}.`
      : `We received your message. We'll reply ${responseWindowText}.`,
  }
}

/**
 * Auto-assign a contact submission to the platform owner.
 * Creates an inquiry and marks the submission as claimed.
 * Uses admin client - this is a system-level operation, not user-initiated.
 */
async function autoAssignToOwner(
  db: any,
  submissionId: string,
  ownerChefId: string,
  contact: { name: string; email: string; subject: string | null; message: string }
): Promise<{ inquiryId: string }> {
  // Check if a client with this email already exists for the owner
  let clientId: string | null = null
  if (contact.email) {
    const { data: existingClient } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', ownerChefId)
      .eq('email', contact.email)
      .single()

    if (existingClient) {
      clientId = existingClient.id
    }
  }

  // Build unknown_fields for unlinked leads
  const unknownFields: Record<string, string> = {}
  if (!clientId) {
    unknownFields.client_name = contact.name
    if (contact.email) unknownFields.client_email = contact.email
  }

  const sourceMessage = [contact.subject ? `Subject: ${contact.subject}` : '', contact.message]
    .filter(Boolean)
    .join('\n\n')

  // Create inquiry for the platform owner
  const { data: inquiry, error: inquiryError } = await db
    .from('inquiries')
    .insert({
      tenant_id: ownerChefId,
      channel: 'website',
      client_id: clientId,
      first_contact_at: new Date().toISOString(),
      source_message: sourceMessage,
      unknown_fields: Object.keys(unknownFields).length > 0 ? unknownFields : null,
    })
    .select('id')
    .single()

  if (inquiryError) {
    throw new Error(`Failed to create inquiry: ${inquiryError.message}`)
  }

  // Mark submission as claimed with back-reference
  await db
    .from('contact_submissions')
    .update({
      claimed_by_chef_id: ownerChefId,
      claimed_at: new Date().toISOString(),
      inquiry_id: inquiry.id,
      read: true,
    })
    .eq('id', submissionId)

  return { inquiryId: inquiry.id }
}

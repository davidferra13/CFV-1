// Contact Form Server Actions
// Stores public contact form submissions for admin review.
// If PLATFORM_OWNER_CHEF_ID is set, auto-assigns to the platform owner.

'use server'

import { createServerClient } from '@/lib/supabase/server'

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

export async function submitContactForm(data: ContactFormData) {
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

  // Use admin client since this is a public form (no auth required)
  const supabase = createServerClient({ admin: true })

  const { data: submission, error } = await supabase
    .from('contact_submissions')
    .insert({ name, email, subject, message })
    .select('id')
    .single()

  if (error) {
    console.error('[submitContactForm] Error:', error)
    throw new Error('Failed to submit message. Please try again.')
  }

  // Auto-assign to platform owner if configured
  const ownerChefId = process.env.PLATFORM_OWNER_CHEF_ID
  if (ownerChefId && submission?.id) {
    try {
      await autoAssignToOwner(supabase, submission.id, ownerChefId, {
        name,
        email,
        subject,
        message,
      })
    } catch (err) {
      // Non-fatal: submission is saved, just won't be auto-assigned
      console.error('[submitContactForm] Auto-assign failed (submission saved in pool):', err)
    }
  }

  return { success: true }
}

/**
 * Auto-assign a contact submission to the platform owner.
 * Creates an inquiry and marks the submission as claimed.
 * Uses admin client — this is a system-level operation, not user-initiated.
 */
async function autoAssignToOwner(
  supabase: any,
  submissionId: string,
  ownerChefId: string,
  contact: { name: string; email: string; subject: string | null; message: string }
) {
  // Check if a client with this email already exists for the owner
  let clientId: string | null = null
  if (contact.email) {
    const { data: existingClient } = await supabase
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
  const { data: inquiry, error: inquiryError } = await supabase
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
  await supabase
    .from('contact_submissions')
    .update({
      claimed_by_chef_id: ownerChefId,
      claimed_at: new Date().toISOString(),
      inquiry_id: inquiry.id,
      read: true,
    })
    .eq('id', submissionId)
}

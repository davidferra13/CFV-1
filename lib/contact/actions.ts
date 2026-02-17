// Contact Form Server Actions
// Stores public contact form submissions for admin review.

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

  const { error } = await (supabase as any)
    .from('contact_submissions')
    .insert({ name, email, subject, message })

  if (error) {
    console.error('[submitContactForm] Error:', error)
    throw new Error('Failed to submit message. Please try again.')
  }

  return { success: true }
}

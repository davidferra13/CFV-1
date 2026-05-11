'use server'

/**
 * Inbound Call Classifier
 *
 * Identifies inbound callers by checking vendors, clients, and national vendors.
 * Detects vendor callbacks by finding recent outbound calls.
 * Generates appropriate TwiML greetings based on classification.
 *
 * HARD RULE: Clients NEVER get routed to vendor/availability flows.
 * They always get a message capture flow.
 */

import { createAdminClient } from '@/lib/db/admin'
import { normalizePhone } from '@/lib/calling/phone-utils'
import { DEFAULT_VOICE } from '@/lib/calling/voice-helpers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CallerClassification = {
  type: 'known_vendor' | 'known_client' | 'unknown_vendor' | 'unknown'
  vendorId?: string
  clientId?: string
  vendorName?: string
  clientName?: string
  chefId?: string
  originalCallContext: {
    aiCallId: string
    ingredient: string
    role: string
    calledAt: string
  } | null
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

function normalizeForLookup(phone: string): string {
  // Strip everything except digits
  const digits = phone.replace(/\D/g, '')
  // Handle +1 prefix
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  if (digits.length === 10) {
    return `+1${digits}`
  }
  // Return the normalized version from the shared utility
  return normalizePhone(phone)
}

// ---------------------------------------------------------------------------
// Classify an inbound caller
// ---------------------------------------------------------------------------

export async function classifyInboundCaller(
  phone: string,
  chefId?: string
): Promise<CallerClassification> {
  try {
    const normalized = normalizeForLookup(phone)
    const db: any = createAdminClient()

    // 1. Check vendors table (chef-scoped)
    const vendorQuery = db
      .from('vendors')
      .select('id, name, chef_id')
      .eq('phone', normalized)
      .eq('status', 'active')
      .limit(1)

    if (chefId) {
      vendorQuery.eq('chef_id', chefId)
    }

    const { data: vendor } = await vendorQuery.maybeSingle()

    if (vendor) {
      // Found a known vendor; check for recent callback context
      const callbackCtx = await findCallbackContext(normalized, vendor.chef_id)
      return {
        type: 'known_vendor',
        vendorId: vendor.id,
        vendorName: vendor.name,
        chefId: vendor.chef_id,
        originalCallContext: callbackCtx,
      }
    }

    // 2. Check clients table (HARD RULE: never route to vendor flow)
    const clientQuery = db
      .from('clients')
      .select('id, full_name, tenant_id')
      .eq('phone', normalized)
      .limit(1)

    if (chefId) {
      clientQuery.eq('tenant_id', chefId)
    }

    const { data: client } = await clientQuery.maybeSingle()

    if (client) {
      return {
        type: 'known_client',
        clientId: client.id,
        clientName: client.full_name,
        chefId: client.tenant_id,
        originalCallContext: null,
      }
    }

    // 3. Check national_vendors table (platform-wide, not chef-scoped)
    const { data: nationalVendor } = await db
      .from('national_vendors')
      .select('id, name')
      .eq('phone', normalized)
      .limit(1)
      .maybeSingle()

    if (nationalVendor) {
      // National vendor found; check callback context across all chefs
      const callbackCtx = await findCallbackContext(normalized, chefId || null)
      return {
        type: 'unknown_vendor',
        vendorName: nationalVendor.name,
        chefId: chefId || undefined,
        originalCallContext: callbackCtx,
      }
    }

    // 4. Check if there was a recent outbound call to this number
    // (vendor not saved but we called them recently)
    const callbackCtx = await findCallbackContext(normalized, chefId || null)
    if (callbackCtx) {
      return {
        type: 'unknown_vendor',
        chefId: chefId || undefined,
        originalCallContext: callbackCtx,
      }
    }

    // 5. Truly unknown
    return {
      type: 'unknown',
      chefId: chefId || undefined,
      originalCallContext: null,
    }
  } catch (err) {
    console.error('[inbound-classifier] classifyInboundCaller error:', err)
    // Safe fallback: treat as unknown
    return {
      type: 'unknown',
      chefId: chefId || undefined,
      originalCallContext: null,
    }
  }
}

// ---------------------------------------------------------------------------
// Find callback context from recent outbound calls
// ---------------------------------------------------------------------------

export async function findCallbackContext(
  vendorPhone: string,
  chefId: string | null
): Promise<{
  aiCallId: string
  ingredient: string
  role: string
  calledAt: string
} | null> {
  try {
    const normalized = normalizeForLookup(vendorPhone)
    const db: any = createAdminClient()

    // Look back 7 days for outbound calls to this number
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const query = db
      .from('ai_calls')
      .select('id, subject, role, created_at')
      .eq('contact_phone', normalized)
      .eq('direction', 'outbound')
      .in('status', ['no_answer', 'busy', 'completed'])
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)

    if (chefId) {
      query.eq('chef_id', chefId)
    }

    const { data: recentCall } = await query.maybeSingle()

    if (!recentCall) return null

    return {
      aiCallId: recentCall.id,
      ingredient: recentCall.subject || 'your recent inquiry',
      role: recentCall.role,
      calledAt: recentCall.created_at,
    }
  } catch (err) {
    console.error('[inbound-classifier] findCallbackContext error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// XML escaping
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ---------------------------------------------------------------------------
// Generate TwiML response based on classification
// ---------------------------------------------------------------------------

export async function generateInboundResponse(
  classification: CallerClassification,
  gatherActionUrl: string,
  businessName?: string
): string {
  const biz = businessName || 'this private chef service'

  try {
    switch (classification.type) {
      case 'known_vendor': {
        const escapedUrl = gatherActionUrl.replace(/&/g, '&amp;')

        if (classification.originalCallContext) {
          // Vendor calling back about a specific ingredient
          const ingredient = escapeXml(classification.originalCallContext.ingredient)
          const vendorGreeting = classification.vendorName
            ? `Hi ${escapeXml(classification.vendorName)}! `
            : 'Hi! '

          return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${DEFAULT_VOICE}">${vendorGreeting}Thank you for calling back. We recently called about ${ingredient} availability. Do you have ${ingredient} in stock?</Say>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" numDigits="1" action="${escapedUrl}" method="POST" hints="yes, yeah, we do, absolutely, no, nope, out of stock, in stock, we have it" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">Just say yes or no, or press 1 for yes and 2 for no.</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">No worries, thanks for calling back. Have a great day!</Say>
  <Hangup/>
</Response>`
        }

        // Known vendor, no specific callback context
        const vendorName = classification.vendorName
          ? escapeXml(classification.vendorName)
          : 'there'

        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${DEFAULT_VOICE}">Hi ${vendorName}, thanks for calling ${escapeXml(biz)}. How can I help you today?</Say>
  <Gather input="speech" timeout="15" speechTimeout="auto" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">Go ahead whenever you are ready.</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">Sorry we missed that. We will follow up with you. Thanks!</Say>
  <Hangup/>
</Response>`
      }

      case 'known_client': {
        // HARD RULE: Clients get message capture only, never vendor flow
        const escapedUrl = gatherActionUrl.replace(/&/g, '&amp;')
        const clientName = classification.clientName ? escapeXml(classification.clientName) : ''
        const greeting = clientName
          ? `Hi ${clientName}, thank you for calling.`
          : 'Thank you for calling.'

        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${DEFAULT_VOICE}">${greeting} Please leave a message and we will get back to you shortly.</Say>
  <Gather input="speech" timeout="20" speechTimeout="auto" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">Go ahead whenever you are ready.</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">Sorry we missed that. Please try calling back or send a text. Thanks!</Say>
  <Hangup/>
</Response>`
      }

      case 'unknown_vendor': {
        const escapedUrl = gatherActionUrl.replace(/&/g, '&amp;')

        if (classification.originalCallContext) {
          // We called this number recently (probably a vendor we found in national directory)
          const ingredient = escapeXml(classification.originalCallContext.ingredient)
          const vendorGreeting = classification.vendorName
            ? `Hi ${escapeXml(classification.vendorName)}! `
            : 'Hi! '

          return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${DEFAULT_VOICE}">${vendorGreeting}Thank you for calling back. We recently reached out about ${ingredient}. Do you have ${ingredient} available?</Say>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" numDigits="1" action="${escapedUrl}" method="POST" hints="yes, yeah, we do, no, nope, out of stock" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">Just say yes or no, or press 1 for yes and 2 for no.</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">No worries, thanks for reaching out. Have a great day!</Say>
  <Hangup/>
</Response>`
        }

        // National vendor calling without callback context
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${DEFAULT_VOICE}">Thanks for calling ${escapeXml(biz)}. I am an AI assistant. Can I get your name and the reason for your call?</Say>
  <Gather input="speech" timeout="20" speechTimeout="auto" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">Go ahead whenever you are ready.</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">Sorry we missed that. Please try calling back or send a text. Thanks!</Say>
  <Hangup/>
</Response>`
      }

      case 'unknown':
      default: {
        const escapedUrl = gatherActionUrl.replace(/&/g, '&amp;')

        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${DEFAULT_VOICE}">Thank you for calling ${escapeXml(biz)}. Please leave a message after the tone and we will get back to you shortly.</Say>
  <Gather input="speech" timeout="20" speechTimeout="auto" action="${escapedUrl}" method="POST" enhanced="true">
    <Say voice="${DEFAULT_VOICE}">Go ahead whenever you are ready.</Say>
  </Gather>
  <Say voice="${DEFAULT_VOICE}">Sorry we missed that. Please try calling back or send a text. Thanks!</Say>
  <Hangup/>
</Response>`
      }
    }
  } catch (err) {
    console.error('[inbound-classifier] generateInboundResponse error:', err)
    // Safe fallback
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${DEFAULT_VOICE}">Thank you for calling. Please try again later.</Say>
  <Hangup/>
</Response>`
  }
}

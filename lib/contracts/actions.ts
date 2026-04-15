// Contracts & Legal - Server Actions
// Manages contract templates and event-specific e-sign contracts.
// Chef creates templates; contracts are generated per event and signed by clients.

'use server'

import { requireChef, requireClient, requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/send'
import { ContractSentEmail } from '@/lib/email/templates/contract-sent'
import React from 'react'
import { format } from 'date-fns'
import { createNotification, getChefAuthUserId, getChefProfile } from '@/lib/notifications/actions'
import { sendContractSignedChefEmail } from '@/lib/email/notifications'

// ============================================
// SCHEMAS
// ============================================

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name required'),
  body_markdown: z.string().min(1, 'Contract body required'),
  is_default: z.boolean().optional().default(false),
})

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  body_markdown: z.string().min(1).optional(),
  is_default: z.boolean().optional(),
})

const SignContractSchema = z.object({
  contract_id: z.string().uuid(),
  signature_data_url: z.string().min(1, 'Signature required'),
  signer_ip_address: z.string().optional(),
  signer_user_agent: z.string().optional(),
})

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>
export type SignContractInput = z.infer<typeof SignContractSchema>

// ============================================
// MERGE FIELD HELPERS
// ============================================

const MERGE_FIELDS = [
  '{{client_name}}',
  '{{event_date}}',
  '{{quoted_price}}',
  '{{deposit_amount}}',
  '{{cancellation_policy}}',
  '{{occasion}}',
  '{{guest_count}}',
  '{{event_location}}',
]

function formatCents(cents: number | null): string {
  if (!cents) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function renderMergeFields(
  body: string,
  fields: {
    client_name: string
    event_date: string
    quoted_price: string
    deposit_amount: string
    cancellation_policy: string
    occasion: string
    guest_count: string
    event_location: string
  }
): string {
  return body
    .replace(/\{\{client_name\}\}/g, fields.client_name)
    .replace(/\{\{event_date\}\}/g, fields.event_date)
    .replace(/\{\{quoted_price\}\}/g, fields.quoted_price)
    .replace(/\{\{deposit_amount\}\}/g, fields.deposit_amount)
    .replace(/\{\{cancellation_policy\}\}/g, fields.cancellation_policy)
    .replace(/\{\{occasion\}\}/g, fields.occasion)
    .replace(/\{\{guest_count\}\}/g, fields.guest_count)
    .replace(/\{\{event_location\}\}/g, fields.event_location)
}

// ============================================
// TEMPLATE ACTIONS (chef-only)
// ============================================

export async function createContractTemplate(input: CreateTemplateInput) {
  const user = await requireChef()
  const validated = CreateTemplateSchema.parse(input)
  const db: any = createServerClient()

  // If setting as default, unset existing default first
  if (validated.is_default) {
    await db
      .from('contract_templates')
      .update({ is_default: false })
      .eq('chef_id', user.tenantId!)
      .eq('is_default', true)
  }

  const { data, error } = await db
    .from('contract_templates')
    .insert({
      chef_id: user.tenantId!,
      name: validated.name,
      body_markdown: validated.body_markdown,
      is_default: validated.is_default,
    })
    .select()
    .single()

  if (error) {
    console.error('[createContractTemplate] Error:', error)
    throw new Error('Failed to create contract template')
  }

  revalidatePath('/settings/contracts')
  return data as ContractTemplate
}

export async function updateContractTemplate(id: string, input: UpdateTemplateInput) {
  const user = await requireChef()
  const validated = UpdateTemplateSchema.parse(input)
  const db: any = createServerClient()

  // If setting as default, unset existing default first
  if (validated.is_default) {
    await db
      .from('contract_templates')
      .update({ is_default: false })
      .eq('chef_id', user.tenantId!)
      .eq('is_default', true)
      .neq('id', id)
  }

  // Fetch current version first so we can increment it
  const { data: current } = await db
    .from('contract_templates')
    .select('version')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  const { data, error } = await db
    .from('contract_templates')
    .update({ ...validated, version: (current?.version ?? 1) + 1 })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateContractTemplate] Error:', error)
    throw new Error('Failed to update contract template')
  }

  revalidatePath('/settings/contracts')
  return data as ContractTemplate
}

type ContractTemplate = {
  id: string
  chef_id: string
  name: string
  body_markdown: string
  is_default: boolean
  version: number
  created_at: string
  updated_at: string | null
}

export async function listContractTemplates(): Promise<ContractTemplate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('contract_templates')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[listContractTemplates] Error:', error)
    throw new Error('Failed to load contract templates')
  }

  return (data ?? []) as ContractTemplate[]
}

export async function deleteContractTemplate(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('contract_templates')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteContractTemplate] Error:', error)
    throw new Error('Failed to delete contract template')
  }

  revalidatePath('/settings/contracts')
}

// ============================================
// EVENT CONTRACT ACTIONS
// ============================================

/**
 * Generate a contract for an event.
 * Resolves merge fields from event + client data and snapshots the body.
 * If a previous draft exists, it is voided and replaced.
 */
export async function generateEventContract(eventId: string, templateId?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load event + client
  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      `
      id, status, event_date, quoted_price_cents, deposit_amount_cents,
      occasion, guest_count, location_address, location_city, location_state,
      cancellation_reason,
      clients (id, full_name, email)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // Prevent generating contracts for cancelled or completed events
  const eventStatus = (event as any).status
  if (eventStatus === 'cancelled') {
    throw new Error('Cannot generate a contract for a cancelled event')
  }
  if (eventStatus === 'completed') {
    throw new Error('Cannot generate a contract for a completed event')
  }

  const client = (event as any).clients
  if (!client) throw new Error('Client not found for event')

  // Determine template to use
  let bodyMarkdown: string

  if (templateId) {
    const { data: tmpl, error: tmplErr } = await db
      .from('contract_templates')
      .select('body_markdown')
      .eq('id', templateId)
      .eq('chef_id', user.tenantId!)
      .single()
    if (tmplErr || !tmpl) throw new Error('Template not found')
    bodyMarkdown = tmpl.body_markdown
  } else {
    // Try default template
    const { data: defaultTmpl } = await db
      .from('contract_templates')
      .select('body_markdown')
      .eq('chef_id', user.tenantId!)
      .eq('is_default', true)
      .maybeSingle()

    if (defaultTmpl) {
      bodyMarkdown = defaultTmpl.body_markdown
    } else {
      // Built-in fallback template
      bodyMarkdown = buildFallbackTemplate()
    }
  }

  // Load chef's cancellation policy config for the contract merge field
  const { data: chefPolicyConfig } = await db
    .from('chefs')
    .select('cancellation_cutoff_days, deposit_refundable')
    .eq('id', user.tenantId!)
    .single()
  const { getCancellationPolicySummary } = await import('@/lib/cancellation/policy')
  const cancellationPolicyText = getCancellationPolicySummary({
    cancellationCutoffDays: chefPolicyConfig?.cancellation_cutoff_days ?? 15,
    depositRefundable: chefPolicyConfig?.deposit_refundable ?? false,
  })

  // Render merge fields
  const renderedBody = renderMergeFields(bodyMarkdown, {
    client_name: client.full_name ?? 'Client',
    event_date: event.event_date ? format(new Date(event.event_date), 'MMMM d, yyyy') : 'TBD',
    quoted_price: formatCents(event.quoted_price_cents),
    deposit_amount: formatCents(event.deposit_amount_cents),
    cancellation_policy: cancellationPolicyText,
    occasion: event.occasion ?? 'Private Dining Event',
    guest_count: String(event.guest_count ?? 0),
    event_location: [event.location_address, event.location_city, event.location_state]
      .filter(Boolean)
      .join(', '),
  })

  // Void any existing unsigned draft/sent contract for this event
  await db
    .from('event_contracts')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      void_reason: 'Superseded by new contract',
    })
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .in('status', ['draft', 'sent', 'viewed'])

  // Create new contract
  const { data: contract, error: contractError } = await db
    .from('event_contracts')
    .insert({
      event_id: eventId,
      chef_id: user.tenantId!,
      client_id: client.id,
      template_id: templateId ?? null,
      body_snapshot: renderedBody,
      status: 'draft',
    })
    .select()
    .single()

  if (contractError || !contract) {
    console.error('[generateEventContract] Error:', contractError)
    throw new Error('Failed to generate contract')
  }

  revalidatePath(`/events/${eventId}`)
  return contract
}

/**
 * Send the contract to the client.
 * Sets status = sent and emails client with signing link.
 */
export async function sendContractToClient(contractId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: contract, error } = await db
    .from('event_contracts')
    .select(
      `
      id, event_id, status,
      clients (full_name, email),
      events (occasion, event_date)
    `
    )
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !contract) throw new Error('Contract not found')
  if (contract.status === 'signed') throw new Error('Contract already signed')
  if (contract.status === 'voided') throw new Error('Contract is voided')

  const now = new Date().toISOString()

  const { error: updateError } = await db
    .from('event_contracts')
    .update({ status: 'sent', sent_at: now })
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)

  if (updateError) throw new Error('Failed to send contract')

  // Send email to client
  const client = (contract as any).clients
  const event = (contract as any).events

  try {
    if (client?.email) {
      const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/my-events/${contract.event_id}/contract`
      await sendEmail({
        to: client.email,
        subject: `Your service contract is ready to sign`,
        react: React.createElement(ContractSentEmail, {
          clientName: client.full_name ?? 'there',
          occasion: event?.occasion ?? 'your upcoming event',
          eventDate: event?.event_date ? format(new Date(event.event_date), 'MMMM d, yyyy') : 'TBD',
          signingUrl,
        }),
      })
    }
  } catch (err) {
    console.error('[sendContractToClient] Non-blocking email failed:', err)
  }

  revalidatePath(`/events/${contract.event_id}`)
  revalidatePath(`/my-events/${contract.event_id}`)
  return { success: true }
}

/**
 * Record that a client viewed the contract.
 * Called on the client signing page mount.
 */
export async function recordClientView(contractId: string) {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: contract } = await db
    .from('event_contracts')
    .select('id, status, client_id, event_id')
    .eq('id', contractId)
    .eq('client_id', user.entityId)
    .single()

  if (!contract) throw new Error('Contract not found')
  if (contract.status === 'sent') {
    await db
      .from('event_contracts')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', contractId)
  }

  revalidatePath(`/events/${contract.event_id}`)
  revalidatePath(`/my-events/${contract.event_id}`)
}

/**
 * Sign the contract (client-only).
 */
export async function signContract(input: SignContractInput) {
  const user = await requireClient()
  const validated = SignContractSchema.parse(input)
  const db: any = createServerClient()

  const { data: contract } = await db
    .from('event_contracts')
    .select('id, status, event_id')
    .eq('id', validated.contract_id)
    .eq('client_id', user.entityId)
    .single()

  if (!contract) throw new Error('Contract not found')
  if (contract.status === 'signed') throw new Error('Already signed')
  if (contract.status === 'voided') throw new Error('Contract voided - contact your chef')
  if (!['sent', 'viewed'].includes(contract.status)) {
    throw new Error('Contract is not ready for signing')
  }

  // Optimistic lock: only update if status is still 'sent' or 'viewed'
  const { data: updatedContract, error } = await db
    .from('event_contracts')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signature_data_url: validated.signature_data_url,
      signer_ip_address: validated.signer_ip_address ?? null,
      signer_user_agent: validated.signer_user_agent ?? null,
    })
    .eq('id', validated.contract_id)
    .eq('client_id', user.entityId)
    .in('status', ['sent', 'viewed'])
    .select('id')

  if (error) {
    console.error('[signContract] Error:', error)
    throw new Error('Failed to sign contract')
  }

  if (!updatedContract || updatedContract.length === 0) {
    throw new Error('Contract has already been signed or voided')
  }

  revalidatePath(`/my-events/${contract.event_id}`)
  revalidatePath(`/events/${contract.event_id}`)

  // Non-blocking: notify chef + email
  try {
    // Fetch contract details for notification
    const dbForLookup = createServerClient()
    const { data: fullContract } = await dbForLookup
      .from('event_contracts')
      .select('chef_id, events(occasion, event_date, clients(full_name))')
      .eq('id', validated.contract_id)
      .single()

    if (fullContract) {
      const chefId = (fullContract as any).chef_id
      const chefAuthId = await getChefAuthUserId(chefId)
      if (chefAuthId) {
        await createNotification({
          tenantId: chefId,
          recipientId: chefAuthId,
          category: 'event',
          action: 'contract_signed',
          title: 'Contract signed',
          body: `${(fullContract as any).events?.clients?.full_name ?? 'Your client'} signed the contract`,
          eventId: contract.event_id,
        })
      }

      const chef = await getChefProfile(chefId)
      const eventData = (fullContract as any).events
      if (chef?.email && eventData) {
        await sendContractSignedChefEmail({
          chefEmail: chef.email,
          chefName: chef.name,
          clientName: eventData.clients?.full_name ?? 'Your client',
          occasion: eventData.occasion ?? 'your event',
          eventDate: eventData.event_date ?? 'TBD',
          eventId: contract.event_id,
        })
      }
    }
  } catch (err) {
    console.error('[signContract] Non-blocking chef notification failed:', err)
  }

  return { success: true }
}

/**
 * Void a contract (chef-only).
 */
export async function voidContract(contractId: string, reason?: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: contract } = await db
    .from('event_contracts')
    .select('id, status, event_id')
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!contract) throw new Error('Contract not found')
  if (contract.status === 'signed') throw new Error('Cannot void a signed contract')
  if (contract.status === 'voided') throw new Error('Contract is already voided')

  const { error } = await db
    .from('event_contracts')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      void_reason: reason ?? 'Voided by chef',
    })
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to void contract')

  revalidatePath(`/events/${contract.event_id}`)
  revalidatePath(`/my-events/${contract.event_id}`)

  // Non-blocking: notify client that contract was voided
  try {
    const { createClientNotification } = await import('@/lib/notifications/client-actions')
    const { data: eventData } = await db
      .from('events')
      .select('occasion, client_id')
      .eq('id', contract.event_id)
      .single()

    if (eventData?.client_id) {
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: eventData.client_id,
        category: 'event',
        action: 'contract_voided',
        title: 'Contract voided',
        body: `The contract for ${eventData.occasion || 'your event'} has been voided. Your chef will send an updated contract.`,
        actionUrl: `/my-events/${contract.event_id}`,
        eventId: contract.event_id,
      })
    }
  } catch (err) {
    console.error('[voidContract] Non-blocking client notification failed:', err)
  }

  return { success: true }
}

// ============================================
// CONTRACT LIST / DETAIL (chef view)
// ============================================

export type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'voided'

export type ContractListItem = {
  id: string
  event_id: string
  client_id: string
  status: ContractStatus
  created_at: string
  sent_at: string | null
  signed_at: string | null
  voided_at: string | null
  event_occasion: string | null
  event_date: string | null
  client_name: string | null
}

/**
 * List all contracts for the current chef with optional status filter.
 * Joins event and client names for display.
 */
export async function getContracts(statusFilter?: ContractStatus): Promise<ContractListItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('event_contracts')
    .select(
      `
      id, event_id, client_id, status, created_at, sent_at, signed_at, voided_at,
      events (occasion, event_date),
      clients (full_name)
    `
    )
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getContracts] Error:', error)
    throw new Error('Failed to load contracts')
  }

  return ((data as any[]) ?? []).map((row: any) => ({
    id: row.id,
    event_id: row.event_id,
    client_id: row.client_id,
    status: row.status as ContractStatus,
    created_at: row.created_at,
    sent_at: row.sent_at,
    signed_at: row.signed_at,
    voided_at: row.voided_at,
    event_occasion: row.events?.occasion ?? null,
    event_date: row.events?.event_date ?? null,
    client_name: row.clients?.full_name ?? null,
  }))
}

/**
 * Get a single contract by ID (chef view) with full details.
 */
export async function getContractById(contractId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_contracts')
    .select(
      `
      *,
      events (occasion, event_date),
      clients (full_name, email)
    `
    )
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getContractById] Error:', error)
    return null
  }

  return data
}

/**
 * Mark a draft contract as sent (updates status + sent_at).
 */
export async function markContractSent(contractId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: contract } = await db
    .from('event_contracts')
    .select('id, status, event_id')
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!contract) throw new Error('Contract not found')
  if (contract.status !== 'draft') throw new Error('Only draft contracts can be marked as sent')

  const { error } = await db
    .from('event_contracts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to mark contract as sent')

  revalidatePath('/contracts')
  revalidatePath(`/events/${contract.event_id}`)
  return { success: true }
}

/**
 * Mark a contract as signed (chef-side manual override).
 * Records the current timestamp as signed_at.
 */
export async function markContractSigned(contractId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: contract } = await db
    .from('event_contracts')
    .select('id, status, event_id')
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!contract) throw new Error('Contract not found')
  if (contract.status === 'signed') throw new Error('Contract is already signed')
  if (contract.status === 'voided') throw new Error('Cannot sign a voided contract')
  if (contract.status !== 'sent')
    throw new Error('Contract must be in sent status before it can be marked as signed')

  const { error } = await db
    .from('event_contracts')
    .update({ status: 'signed', signed_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to mark contract as signed')

  revalidatePath('/contracts')
  revalidatePath(`/events/${contract.event_id}`)
  return { success: true }
}

/**
 * Get the active contract for an event (chef view).
 */
export async function getEventContract(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('event_contracts')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

/**
 * Get the active contract for a client event (client view).
 */
export async function getClientEventContract(eventId: string) {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data } = await db
    .from('event_contracts')
    .select('*')
    .eq('event_id', eventId)
    .eq('client_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

// ============================================
// DOCUSIGN SEND
// Generates contract PDF and sends via DocuSign.
// Requires DocuSign to be connected in settings/integrations.
// ============================================

export async function sendContractViaDocuSign(contractId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: contract, error } = await db
    .from('event_contracts')
    .select(
      `
      id, event_id, status,
      clients (full_name, email),
      events (occasion, event_date)
    `
    )
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !contract) throw new Error('Contract not found')
  if (contract.status === 'signed') throw new Error('Contract already signed')
  if (contract.status === 'voided') throw new Error('Contract is voided')

  const client = (contract as any).clients as { full_name: string | null; email: string | null }
  if (!client?.email) throw new Error('Client has no email address on file')

  // Generate contract PDF
  const { generateContract } = await import('@/lib/documents/generate-contract')
  const pdfBuffer = await generateContract(contractId, {
    chefId: user.tenantId!,
    clientEntityId: null,
  })
  const documentBase64 = pdfBuffer.toString('base64')

  const event = (contract as any).events as { occasion: string | null; event_date: string | null }
  const eventLabel = event?.occasion || 'your upcoming event'

  const { sendContractForSignature } = await import('@/lib/integrations/docusign/docusign-client')
  const result = await sendContractForSignature(user.tenantId!, {
    contractId,
    signerName: client.full_name || 'Client',
    signerEmail: client.email,
    documentBase64,
    documentName: `Service Agreement - ${eventLabel}.pdf`,
    emailSubject: `Please sign your service agreement`,
    emailBody: `Your service agreement for ${eventLabel} is ready to review and sign.`,
  })

  // Mark as sent in our system
  await db
    .from('event_contracts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)

  revalidatePath(`/events/${contract.event_id}`)
  return { success: true, envelopeId: result.envelopeId }
}

// ============================================
// FALLBACK TEMPLATE
// Used when no default template exists.
// ============================================

function buildFallbackTemplate(): string {
  return `# Private Chef Service Agreement

This Service Agreement ("Agreement") is entered into between the private chef ("Chef") and **{{client_name}}** ("Client").

## Event Details

- **Date:** {{event_date}}
- **Occasion:** {{occasion}}
- **Guest Count:** {{guest_count}}
- **Location:** {{event_location}}

## Service Fee

The agreed service fee for this event is **{{quoted_price}}**.

A non-refundable deposit of **{{deposit_amount}}** is due upon signing this agreement. The remaining balance is due 24 hours before the event.

## Cancellation Policy

{{cancellation_policy}}

## Scope of Service

Chef agrees to provide private dining services as discussed and confirmed, including menu planning, ingredient sourcing, on-site preparation, service, and kitchen cleanup.

## Client Responsibilities

Client agrees to provide a clean, safe kitchen environment with adequate workspace, access to utilities, and any equipment listed in the event details.

## Agreement

By signing below, Client confirms they have read and agree to all terms of this Agreement.

**Client Signature:** ____________________
**Date:** ____________________
`
}

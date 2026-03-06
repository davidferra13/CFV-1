// Remy Agent - Inquiry Response Actions
// Generates first-response drafts for new inquiries using the deterministic template.
// Formula > AI: no LLM call needed. Template handles everything.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { getServiceConfigForTenant } from '@/lib/chef-services/service-config-actions'
import { generateFirstResponse } from '@/lib/templates/inquiry-first-response'
import { createServerClient } from '@/lib/supabase/server'

// ─── Resolve inquiry from DB ────────────────────────────────────────────────

async function resolveInquiry(
  inquiryId: string,
  tenantId: string
): Promise<{
  clientName: string
  date: string | null
  guestCount: number | null
  dietaryRestrictions: string[]
  occasion: string | null
} | null> {
  const supabase: any = createServerClient()

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('*, clients(full_name)')
    .eq('id', inquiryId)
    .eq('tenant_id', tenantId)
    .single()

  if (!inquiry) return null

  return {
    clientName: inquiry.clients?.full_name || inquiry.client_name || 'there',
    date: inquiry.confirmed_date || inquiry.preferred_date || null,
    guestCount: inquiry.confirmed_guest_count || inquiry.guest_count || null,
    dietaryRestrictions: inquiry.confirmed_dietary_restrictions || [],
    occasion: inquiry.confirmed_occasion || inquiry.occasion || null,
  }
}

// ─── Resolve chef name ──────────────────────────────────────────────────────

async function resolveChefFirstName(tenantId: string): Promise<string> {
  const supabase: any = createServerClient()

  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  if (!chef) return 'Chef'

  const name = chef.display_name || chef.business_name || 'Chef'
  return name.split(' ')[0]
}

// ─── Action Definition ──────────────────────────────────────────────────────

const draftInquiryFirstResponse: AgentActionDefinition = {
  taskType: 'draft.inquiry_first_response',
  name: 'Draft First Response to Inquiry',
  tier: 2,
  safety: 'safe',
  description:
    "Generate the first response to a new inquiry. Uses the chef's pricing, service config, and communication rules. No LLM needed - deterministic template.",
  inputSchema: '{ inquiryId: string }',

  async executor(inputs, ctx) {
    const inquiryId = inputs.inquiryId as string
    if (!inquiryId) {
      throw new Error('inquiryId is required')
    }

    // Load inquiry data, chef config, and chef name in parallel
    const [inquiryData, serviceConfig, chefFirstName] = await Promise.all([
      resolveInquiry(inquiryId, ctx.tenantId),
      getServiceConfigForTenant(ctx.tenantId),
      resolveChefFirstName(ctx.tenantId),
    ])

    if (!inquiryData) {
      throw new Error(`Inquiry ${inquiryId} not found`)
    }

    // Generate the response using the deterministic template
    const response = generateFirstResponse({
      ...inquiryData,
      chefFirstName,
      serviceConfig,
    })

    const preview: AgentActionPreview = {
      actionType: 'draft.inquiry_first_response',
      summary: `First response to ${inquiryData.clientName}'s inquiry`,
      details: [`Subject: ${response.subject}`, '', response.body].join('\n'),
      requiresApproval: true,
    }

    return {
      preview,
      commitPayload: {
        inquiryId,
        subject: response.subject,
        body: response.body,
        clientName: inquiryData.clientName,
      },
    }
  },

  async commitAction(payload, _ctx) {
    // The draft is presented to the chef for review and manual send.
    // No auto-send - chef approves and edits if needed.
    return {
      success: true,
      message: `Draft ready for ${payload.clientName}. Review, edit if needed, then send.`,
    }
  },
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const inquiryResponseAgentActions: AgentActionDefinition[] = [draftInquiryFirstResponse]

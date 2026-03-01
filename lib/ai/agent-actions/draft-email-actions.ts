// Remy Agent — Draft Email Actions
// Generate email drafts: thank-you, referral, testimonial, quote cover letter,
// decline, cancellation, payment reminder, re-engagement, milestone, food safety.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import {
  generateThankYouDraft,
  generateReferralRequestDraft,
  generateTestimonialRequestDraft,
  generateQuoteCoverLetterDraft,
  generateDeclineResponseDraft,
  generateCancellationResponseDraft,
  generatePaymentReminderDraft,
  generateReEngagementDraft,
  generateMilestoneRecognitionDraft,
  generateFoodSafetyIncidentDraft,
} from '@/lib/ai/draft-actions'
import { searchClientsByName } from '@/lib/clients/actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

// ─── NL Parser ───────────────────────────────────────────────────────────────

const ParsedDraftRequestSchema = z.object({
  draftType: z.enum([
    'thank_you',
    'referral_request',
    'testimonial_request',
    'quote_cover_letter',
    'decline',
    'cancellation',
    'payment_reminder',
    're_engagement',
    'milestone',
    'food_safety_incident',
  ]),
  clientName: z.string().optional(),
  eventName: z.string().optional(),
  reason: z.string().optional(),
  milestone: z.string().optional(),
  description: z.string().optional(),
})

async function parseDraftRequestFromNL(description: string) {
  const systemPrompt = `You determine what type of email draft the user wants and extract context.
Draft types: thank_you, referral_request, testimonial_request, quote_cover_letter, decline, cancellation, payment_reminder, re_engagement, milestone, food_safety_incident.
Extract: draftType, clientName (if mentioned), eventName (if mentioned), reason (for decline/cancellation), milestone (for milestone recognition), description (for food safety incident).
Return ONLY valid JSON.`
  return parseWithOllama(systemPrompt, description, ParsedDraftRequestSchema, {
    modelTier: 'standard',
  })
}

// ─── Draft type labels ───────────────────────────────────────────────────────

const DRAFT_LABELS: Record<string, string> = {
  thank_you: 'Thank-You Email',
  referral_request: 'Referral Request',
  testimonial_request: 'Testimonial Request',
  quote_cover_letter: 'Quote Cover Letter',
  decline: 'Decline Response',
  cancellation: 'Cancellation Response',
  payment_reminder: 'Payment Reminder',
  re_engagement: 'Re-Engagement Email',
  milestone: 'Milestone Recognition',
  food_safety_incident: 'Food Safety Incident Report',
}

// ─── Action Definitions ──────────────────────────────────────────────────────

export const draftEmailAgentActions: AgentActionDefinition[] = [
  {
    taskType: 'agent.draft_email',
    name: 'Draft Email',
    tier: 2,
    safety: 'reversible',
    description:
      'Generate an email draft: thank-you, referral request, testimonial request, quote cover letter, decline, cancellation, payment reminder, re-engagement, milestone recognition, or food safety incident report.',
    inputSchema:
      '{ "description": "string — what kind of email and for whom, e.g. Draft a thank-you email for Sarah Johnson" }',
    tierNote:
      'ALWAYS tier 2 — chef reviews the draft. Remy drafts but NEVER sends emails directly.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseDraftRequestFromNL(description)

      const draftLabel = DRAFT_LABELS[parsed.draftType] ?? parsed.draftType

      const fields: AgentActionPreview['fields'] = [{ label: 'Type', value: draftLabel }]
      if (parsed.clientName) fields.push({ label: 'Client', value: parsed.clientName })
      if (parsed.eventName) fields.push({ label: 'Event', value: parsed.eventName })
      if (parsed.reason) fields.push({ label: 'Reason', value: parsed.reason })
      if (parsed.milestone) fields.push({ label: 'Milestone', value: parsed.milestone })

      return {
        preview: {
          actionType: 'agent.draft_email',
          summary: `Draft ${draftLabel}${parsed.clientName ? ` for ${parsed.clientName}` : ''}`,
          fields,
          warnings: ['This creates a DRAFT only — it will NOT be sent automatically.'],
          safety: 'reversible',
        },
        commitPayload: { ...parsed, _rawDescription: description },
      }
    },

    async commitAction(payload) {
      const draftType = String(payload.draftType)
      const clientName = String(payload.clientName ?? 'Client')
      const eventName = String(payload.eventName ?? '')
      const reason = payload.reason as string | undefined
      const milestone = payload.milestone as string | undefined
      const description = payload.description as string | undefined

      try {
        let result: { subject?: string; body?: string; draft?: string; error?: string }

        switch (draftType) {
          case 'thank_you':
            result = await generateThankYouDraft(clientName, eventName || undefined)
            break
          case 'referral_request':
            result = await generateReferralRequestDraft(clientName)
            break
          case 'testimonial_request':
            result = await generateTestimonialRequestDraft(clientName)
            break
          case 'quote_cover_letter':
            result = await generateQuoteCoverLetterDraft(eventName || clientName)
            break
          case 'decline':
            result = await generateDeclineResponseDraft(clientName, reason)
            break
          case 'cancellation':
            result = await generateCancellationResponseDraft(eventName || clientName)
            break
          case 'payment_reminder':
            result = await generatePaymentReminderDraft(clientName)
            break
          case 're_engagement':
            result = await generateReEngagementDraft(clientName)
            break
          case 'milestone':
            result = await generateMilestoneRecognitionDraft(clientName, milestone)
            break
          case 'food_safety_incident':
            result = await generateFoodSafetyIncidentDraft(description ?? 'Incident report')
            break
          default:
            return { success: false, message: `Unknown draft type: ${draftType}` }
        }

        if ('error' in result && result.error) {
          return { success: false, message: `Draft generation failed: ${result.error}` }
        }

        return {
          success: true,
          message: `${DRAFT_LABELS[draftType] ?? draftType} draft generated! Copy it from the chat and send from your email client.`,
        }
      } catch (err) {
        return {
          success: false,
          message: `Draft generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },
]

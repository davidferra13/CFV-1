import { z } from 'zod'

export const TrustedChefSchema = z.object({
  trustedChefId: z.string().uuid(),
  trustLevel: z.enum(['partner', 'preferred', 'inner_circle']).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
})

export const AvailabilitySignalSchema = z.object({
  id: z.string().uuid().optional(),
  dateStart: z.string().date(),
  dateEnd: z.string().date(),
  regionText: z.string().trim().max(200).optional().nullable(),
  cuisines: z.array(z.string().trim().max(40)).max(30).optional(),
  maxGuestCount: z.number().int().min(1).max(5000).optional().nullable(),
  status: z.enum(['available', 'limited', 'unavailable']),
  shareWithTrustedOnly: z.boolean().optional(),
  note: z.string().trim().max(1000).optional().nullable(),
})

export const CreateHandoffSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    handoffType: z.enum(['lead', 'event_backup', 'client_referral']),
    visibilityScope: z
      .enum(['trusted_circle', 'selected_chefs', 'connections'])
      .default('trusted_circle'),
    recipientChefIds: z.array(z.string().uuid()).max(50).optional(),
    sourceEntityType: z.enum(['inquiry', 'event', 'manual']).optional(),
    sourceEntityId: z.string().uuid().optional().nullable(),
    occasion: z.string().trim().max(150).optional().nullable(),
    eventDate: z.string().date().optional().nullable(),
    guestCount: z.number().int().min(1).max(2000).optional().nullable(),
    locationText: z.string().trim().max(200).optional().nullable(),
    budgetCents: z.number().int().min(0).optional().nullable(),
    privateNote: z.string().trim().max(5000).optional().nullable(),
    clientContext: z.record(z.string(), z.any()).optional(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .superRefine((input, ctx) => {
    if (
      input.visibilityScope === 'selected_chefs' &&
      (!input.recipientChefIds || input.recipientChefIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipientChefIds'],
        message: 'Select at least one recipient for selected_chefs visibility.',
      })
    }
    if (input.sourceEntityType !== 'manual' && !input.sourceEntityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceEntityId'],
        message: 'sourceEntityId is required for inquiry/event sourced handoffs.',
      })
    }
  })

export const HandoffIdSchema = z.object({
  handoffId: z.string().uuid(),
})

export const RespondHandoffSchema = z.object({
  handoffId: z.string().uuid(),
  action: z.enum(['accepted', 'rejected']),
  responseNote: z.string().trim().max(1000).optional().nullable(),
})

export const ConvertHandoffSchema = z.object({
  handoffId: z.string().uuid(),
  convertedEventId: z.string().uuid().optional().nullable(),
  convertedInquiryId: z.string().uuid().optional().nullable(),
})

export const SuggestRecipientsSchema = z.object({
  eventDate: z.string().date().optional().nullable(),
  guestCount: z.number().int().min(1).max(2000).optional().nullable(),
  locationText: z.string().trim().max(200).optional().nullable(),
  cuisines: z.array(z.string().trim().max(40)).max(20).optional(),
  maxResults: z.number().int().min(1).max(20).optional(),
})

export const HandoffTimelineSchema = z.object({
  handoffId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional(),
})

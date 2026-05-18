import { z } from 'zod'

export const ProspectFromAI = z.object({
  name: z.string(),
  prospectType: z.enum(['organization', 'individual']).default('organization'),
  category: z.string().default('other'),
  description: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  zip: z.string().optional().default(''),
  region: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  contactTitle: z.string().optional().default(''),
  gatekeeperNotes: z.string().optional().default(''),
  bestTimeToCall: z.string().optional().default(''),
  annualEventsEstimate: z.string().optional().default(''),
  membershipSize: z.string().optional().default(''),
  avgEventBudget: z.string().optional().default(''),
  eventTypesHosted: z.array(z.string()).optional().default([]),
  seasonalNotes: z.string().optional().default(''),
  luxuryIndicators: z.array(z.string()).optional().default([]),
  talkingPoints: z.string().optional().default(''),
  approachStrategy: z.string().optional().default(''),
  competitorsPresent: z.string().optional().default(''),
})

export const ProspectArrayFromAI = z.object({
  prospects: z.array(ProspectFromAI),
})

export const ApproachFromAI = z.object({
  talkingPoints: z.string(),
  approachStrategy: z.string(),
})

export const ColdEmailFromAI = z.object({
  subject: z.string(),
  body: z.string(),
})

export type ProspectFromAIValue = z.infer<typeof ProspectFromAI>
export type ValidatedProspect = ProspectFromAIValue & { verified: boolean }

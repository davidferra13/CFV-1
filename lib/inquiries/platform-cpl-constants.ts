// Shared constants for platform CPL tracking.
// Extracted from platform-cpl.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

import { z } from 'zod'

export const recordPlatformSpendSchema = z.object({
  channel: z.string().min(1),
  amountCents: z.number().int().positive(),
  spendDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  campaignName: z.string().optional(),
  notes: z.string().optional(),
})

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createClaim } from '@/lib/compliance/claim-actions'

const FileClaimSchema = z.object({
  claim_type: z.enum([
    'property_damage',
    'bodily_injury',
    'food_illness',
    'equipment_loss',
    'vehicle',
    'other',
  ]),
  incident_date: z.string().min(1),
  description: z.string().min(1),
  amount_cents: z.number().int().nonnegative().nullable(),
  policy_number: z.string().nullable(),
  adjuster_name: z.string().nullable(),
  adjuster_phone: z.string().nullable(),
  adjuster_email: z.string().email().nullable(),
  evidence_urls: z.array(z.string().url()),
  witness_info: z.string().nullable(),
})

export async function fileClaim(input: z.infer<typeof FileClaimSchema>) {
  await requireChef()

  const validated = FileClaimSchema.parse(input)
  const claim = await createClaim(validated)

  revalidatePath('/safety/claims')
  return claim
}

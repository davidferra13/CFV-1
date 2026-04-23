'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { purchasePassiveProduct } from './store'

const PurchaseSchema = z.object({
  chefSlug: z.string().min(1),
  productId: z.string().uuid(),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.string().trim().email(),
  recipientName: z.string().trim().max(120).optional().nullable(),
  recipientEmail: z.string().trim().email().optional().nullable(),
})

export async function purchasePassiveProductAction(input: {
  chefSlug: string
  productId: string
  buyerName: string
  buyerEmail: string
  recipientName?: string | null
  recipientEmail?: string | null
}) {
  const parsed = PurchaseSchema.parse(input)
  const result = await purchasePassiveProduct(parsed)

  revalidatePath(`/chef/${result.chefSlug}/store`)
  revalidatePath('/commerce/storefront')
  revalidatePath('/my-hub/purchases')

  return result
}

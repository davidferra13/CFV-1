'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const UploadSchema = z.object({
  contractId: z.string().uuid(),
  certUrl: z.string().url(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function uploadInsuranceCert(contractId: string, certUrl: string, expiresAt: string) {
  const user = await requireChef()
  const parsed = UploadSchema.parse({ contractId, certUrl, expiresAt })
  const db: any = createServerClient()

  const { error } = await db
    .from('event_contracts')
    .update({
      insurance_cert_url: parsed.certUrl,
      insurance_expires_at: parsed.expiresAt,
    })
    .eq('id', parsed.contractId)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false as const, error: 'Failed to upload certificate' }

  revalidatePath('/contracts')
  return { success: true as const }
}

export async function getInsuranceCert(contractId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_contracts')
    .select('insurance_cert_url, insurance_expires_at')
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !data) {
    return { success: false as const, error: 'Contract not found' }
  }

  const isExpired = data.insurance_expires_at
    ? new Date(data.insurance_expires_at) < new Date()
    : false

  return {
    success: true as const,
    data: {
      certUrl: data.insurance_cert_url,
      expiresAt: data.insurance_expires_at,
      isExpired,
    },
  }
}

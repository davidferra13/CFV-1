'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { headers } from 'next/headers'

const CountersignSchema = z.object({
  contractId: z.string().uuid(),
  signatureDataUrl: z.string().min(1),
})

export async function countersignContract(contractId: string, signatureDataUrl: string) {
  const user = await requireChef()
  const parsed = CountersignSchema.parse({ contractId, signatureDataUrl })
  const db: any = createServerClient()

  const { data: contract, error: fetchError } = await db
    .from('event_contracts')
    .select('id, status, chef_id, chef_signed_at, event_id')
    .eq('id', parsed.contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !contract) {
    return { success: false as const, error: 'Contract not found' }
  }

  if (contract.chef_signed_at) {
    return { success: false as const, error: 'Contract already countersigned' }
  }

  if (contract.status !== 'signed') {
    return { success: false as const, error: 'Client must sign first before chef countersigns' }
  }

  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const { error: updateError } = await db
    .from('event_contracts')
    .update({
      chef_signed_at: new Date().toISOString(),
      chef_signature_data_url: parsed.signatureDataUrl,
      chef_signer_ip: ip,
    })
    .eq('id', parsed.contractId)

  if (updateError) {
    return { success: false as const, error: 'Failed to save countersignature' }
  }

  revalidatePath('/contracts')
  if (contract.event_id) revalidatePath(`/events/${contract.event_id}`)
  return { success: true as const }
}

export async function getCountersignStatus(contractId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_contracts')
    .select('id, status, signed_at, chef_signed_at')
    .eq('id', contractId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !data) {
    return { success: false as const, error: 'Contract not found' }
  }

  return {
    success: true as const,
    data: {
      clientSigned: !!data.signed_at,
      clientSignedAt: data.signed_at,
      chefSigned: !!data.chef_signed_at,
      chefSignedAt: data.chef_signed_at,
      fullyExecuted: !!data.signed_at && !!data.chef_signed_at,
    },
  }
}

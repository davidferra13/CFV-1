'use server'

import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  CANNABIS_HOST_AGREEMENT_TEXT_SNAPSHOT,
  CANNABIS_HOST_AGREEMENT_VERSION,
} from '@/lib/cannabis/host-agreement'
import {
  getCannabisHostAgreement,
  requireCannabisInviteAccess,
  type CannabisHostAgreementRecord,
} from '@/lib/chef/cannabis-access-guards'

type SignCannabisHostAgreementInput = {
  confirmAge: boolean
  agreeToTerms: boolean
  signatureName: string
}

type SignCannabisHostAgreementResult =
  | { status: 'success' }
  | { status: 'duplicate'; agreement: CannabisHostAgreementRecord }
  | { status: 'error'; message: string }

function getRequestIpAddress(): string | null {
  const headerStore = headers()
  return (
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerStore.get('x-real-ip') ||
    null
  )
}

export async function signCannabisHostAgreement(
  input: SignCannabisHostAgreementInput
): Promise<SignCannabisHostAgreementResult> {
  const user = await requireCannabisInviteAccess()

  const signatureName = input.signatureName.trim().replace(/\s+/g, ' ')
  if (!input.confirmAge || !input.agreeToTerms) {
    return { status: 'error', message: 'Both acknowledgment checkboxes are required.' }
  }
  if (!signatureName) {
    return { status: 'error', message: 'Full name is required.' }
  }
  if (signatureName.length > 200) {
    return { status: 'error', message: 'Full name is too long.' }
  }

  const existingAgreement = await getCannabisHostAgreement(user.id, CANNABIS_HOST_AGREEMENT_VERSION)
  if (existingAgreement) {
    return { status: 'duplicate', agreement: existingAgreement }
  }

  const supabase: any = createServerClient()
  const signedAt = new Date().toISOString()
  const immutableHash = createHash('sha256')
    .update(CANNABIS_HOST_AGREEMENT_TEXT_SNAPSHOT)
    .digest('hex')

  const { data, error } = await (supabase as any)
    .from('cannabis_host_agreements')
    .insert({
      host_user_id: user.id,
      signed_at: signedAt,
      signature_name: signatureName,
      agreement_version: CANNABIS_HOST_AGREEMENT_VERSION,
      agreement_text_snapshot: CANNABIS_HOST_AGREEMENT_TEXT_SNAPSHOT,
      immutable_hash: immutableHash,
      ip_address: getRequestIpAddress(),
    })
    .select(
      'id, host_user_id, signed_at, signature_name, agreement_version, agreement_text_snapshot, immutable_hash, ip_address, created_at'
    )
    .single()

  if (error?.code === '23505') {
    const duplicateAgreement = await getCannabisHostAgreement(
      user.id,
      CANNABIS_HOST_AGREEMENT_VERSION
    )
    if (duplicateAgreement) {
      return { status: 'duplicate', agreement: duplicateAgreement }
    }
  }

  if (error || !data) {
    return {
      status: 'error',
      message: 'Unable to save your agreement right now. Please try again.',
    }
  }

  revalidatePath('/cannabis')
  revalidatePath('/cannabis/hub')
  revalidatePath('/cannabis/unlock')
  revalidatePath('/cannabis/agreement')

  return { status: 'success' }
}

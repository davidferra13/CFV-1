import 'server-only'

import { redirect } from 'next/navigation'
import { requireChef, type AuthUser } from '@/lib/auth/get-user'
import { hasCannabisAccess } from '@/lib/chef/cannabis-actions'
import { createServerClient } from '@/lib/supabase/server'
import { CANNABIS_HOST_AGREEMENT_VERSION } from '@/lib/cannabis/host-agreement'

export type CannabisHostAgreementRecord = {
  id: string
  host_user_id: string
  signed_at: string
  signature_name: string
  agreement_version: string
  agreement_text_snapshot: string
  immutable_hash: string
  ip_address: string | null
  created_at: string
}

export async function requireCannabisInviteAccess(): Promise<AuthUser> {
  const user = await requireChef()
  const hasInviteAccess = await hasCannabisAccess(user.id)
  if (!hasInviteAccess) {
    redirect('/dashboard')
  }
  return user
}

export async function getCannabisHostAgreement(
  hostUserId: string,
  agreementVersion = CANNABIS_HOST_AGREEMENT_VERSION
): Promise<CannabisHostAgreementRecord | null> {
  const supabase = createServerClient()
  const { data, error } = await (supabase as any)
    .from('cannabis_host_agreements')
    .select(
      'id, host_user_id, signed_at, signature_name, agreement_version, agreement_text_snapshot, immutable_hash, ip_address, created_at'
    )
    .eq('host_user_id', hostUserId)
    .eq('agreement_version', agreementVersion)
    .maybeSingle()

  if (error || !data) return null
  return data as CannabisHostAgreementRecord
}

export async function requireCannabisAgreementSigned(
  hostUserId: string,
  agreementVersion = CANNABIS_HOST_AGREEMENT_VERSION
): Promise<CannabisHostAgreementRecord> {
  const agreement = await getCannabisHostAgreement(hostUserId, agreementVersion)
  if (!agreement) {
    redirect('/cannabis/unlock')
  }
  return agreement
}

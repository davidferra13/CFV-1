import { createServerClient } from '@/lib/db/server'
import { getChefHubProfileId } from './circle-lookup'

export async function postAgreementCreatedToCircle(input: {
  groupId: string
  templateLabel: string
  tenantId: string
}): Promise<void> {
  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const db = createServerClient({ admin: true })
  await db.from('hub_messages').insert({
    group_id: input.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: `Collaboration agreement created (${input.templateLabel}). All co-hosts will review and sign before tickets go live.`,
    metadata: {
      system_event_type: 'agreement_created',
    },
  })
}

export async function postAgreementSignedToCircle(input: {
  groupId: string
  signerName: string
  allSigned: boolean
  tenantId: string
}): Promise<void> {
  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const db = createServerClient({ admin: true })
  const body = input.allSigned
    ? `All co-hosts have signed the collaboration agreement. Tickets can now go live!`
    : `${input.signerName} signed the collaboration agreement. Waiting for remaining signatures.`

  await db.from('hub_messages').insert({
    group_id: input.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body,
    metadata: {
      system_event_type: input.allSigned ? 'agreement_active' : 'agreement_signed',
    },
  })
}

export async function postAgreementAmendedToCircle(input: {
  groupId: string
  changeDescription: string
  tenantId: string
}): Promise<void> {
  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const db = createServerClient({ admin: true })
  await db.from('hub_messages').insert({
    group_id: input.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: `Collaboration agreement updated: ${input.changeDescription}. Re-signature required from all co-hosts.`,
    metadata: {
      system_event_type: 'agreement_amended',
    },
  })
}

'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'
import { getTemplate } from './agreement-templates'
import {
  hashAgreementContent,
  classifyItemChange,
  classifyCompensationChange,
  validateSplits,
  buildDefaultCompensation,
} from './agreement-utils'
import type {
  AgreementWithItems,
  CohostAgreement,
  AgreementItem,
  AgreementSignature,
  AgreementHost,
  CompensationDetails,
  TemplateType,
  CompensationModel,
  ItemAssignment,
} from './agreement-types'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import {
  postAgreementCreatedToCircle,
  postAgreementSignedToCircle,
  postAgreementAmendedToCircle,
} from './agreement-lifecycle-hooks'

// ─── Helpers ────────────────────────────────────────────────────────────────

function snakeToCamel(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

async function verifyCircleHost(groupId: string, tenantId: string): Promise<void> {
  const db = createServerClient({ admin: true })
  const { data: group } = await db
    .from('hub_groups')
    .select('id, tenant_id')
    .eq('id', groupId)
    .single()
  if (!group) throw new Error('Circle not found')
  if (group.tenant_id !== tenantId) throw new Error('Not authorized for this circle')
}

// ─── Create Agreement ───────────────────────────────────────────────────────

const CreateAgreementSchema = z.object({
  groupId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  templateType: z.enum([
    'chef_farm',
    'chef_private_host',
    'chef_chef',
    'chef_restaurant',
    'chef_planner',
    'custom',
  ]),
})

export async function createAgreement(
  input: z.infer<typeof CreateAgreementSchema>
): Promise<{ success: boolean; agreementId?: string; error?: string }> {
  const { tenantId } = await requireChef()
  const validated = CreateAgreementSchema.parse(input)
  await verifyCircleHost(validated.groupId, tenantId!)

  const db = createServerClient({ admin: true })
  const template = getTemplate(validated.templateType)

  // Get circle hosts for default compensation
  const { data: coHosts } = await db
    .from('circle_co_hosts')
    .select('user_id, role')
    .eq('circle_id', validated.groupId)
    .not('accepted_at', 'is', null)

  // Get host profiles
  const hostUserIds = (coHosts || []).map((h: any) => h.user_id)
  // Include the circle owner (current chef)
  const { data: chefProfile } = await db
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('auth_user_id', tenantId!)
    .single()

  const hostProfiles: { id: string; name: string }[] = []
  if (chefProfile) {
    hostProfiles.push({ id: chefProfile.id, name: chefProfile.display_name || 'Chef' })
  }

  for (const uid of hostUserIds) {
    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id, display_name')
      .eq('auth_user_id', uid)
      .single()
    if (profile) {
      hostProfiles.push({ id: profile.id, name: profile.display_name || 'Partner' })
    }
  }

  const defaultComp = buildDefaultCompensation(
    hostProfiles.map((h) => h.id),
    hostProfiles.map((h) => h.name),
    template.defaultSplitPercentage
  )

  // Insert agreement
  const { data: agreement, error: agreementError } = await db
    .from('hub_cohost_agreements')
    .insert({
      group_id: validated.groupId,
      event_id: validated.eventId || null,
      template_type: validated.templateType,
      compensation_model: template.defaultCompensationModel,
      compensation_details: defaultComp,
      status: 'draft',
      version: 1,
      created_by: tenantId!,
    })
    .select('id')
    .single()

  if (agreementError || !agreement) {
    return { success: false, error: agreementError?.message || 'Failed to create agreement' }
  }

  // Insert default checklist items
  const items = template.items.map((item, index) => ({
    agreement_id: agreement.id,
    category: item.category,
    title: item.title,
    assignment: 'unassigned',
    status: 'not_started',
    sort_order: index,
    is_default: true,
    signature_critical: item.signatureCritical,
    added_after_signing: false,
    acknowledged_by: [],
  }))

  const { error: itemsError } = await db.from('hub_agreement_items').insert(items)
  if (itemsError) {
    return { success: false, error: itemsError.message }
  }

  try {
    await postAgreementCreatedToCircle({
      groupId: validated.groupId,
      templateLabel: template.label,
      tenantId: tenantId!,
    })
  } catch {}

  revalidatePath(`/circles/${validated.groupId}`)
  return { success: true, agreementId: agreement.id }
}

// ─── Get Agreement ──────────────────────────────────────────────────────────

export async function getAgreement(
  groupId: string,
  eventId?: string
): Promise<AgreementWithItems | null> {
  const { tenantId } = await requireChef()
  await verifyCircleHost(groupId, tenantId!)

  const db = createServerClient({ admin: true })

  // Find the agreement (event-specific first, then circle-level)
  let query = db.from('hub_cohost_agreements').select('*').eq('group_id', groupId)

  if (eventId) {
    query = query.eq('event_id', eventId)
  } else {
    query = query.is('event_id', null)
  }

  const { data: agreements } = await query.order('created_at', { ascending: false }).limit(1)
  if (!agreements || agreements.length === 0) return null

  const agreement = agreements[0]

  // Get items
  const { data: items } = await db
    .from('hub_agreement_items')
    .select('*')
    .eq('agreement_id', agreement.id)
    .order('sort_order', { ascending: true })

  // Get signatures
  const { data: signatures } = await db
    .from('hub_agreement_signatures')
    .select('*')
    .eq('agreement_id', agreement.id)
    .eq('version', agreement.version)

  // Get hosts from circle_co_hosts
  const { data: coHosts } = await db
    .from('circle_co_hosts')
    .select('user_id')
    .eq('circle_id', groupId)
    .not('accepted_at', 'is', null)

  const hostUserIds = [tenantId!, ...(coHosts || []).map((h: any) => h.user_id)]
  const hosts: AgreementHost[] = []

  for (const uid of hostUserIds) {
    const { data: profile } = await db
      .from('hub_guest_profiles')
      .select('id, display_name')
      .eq('auth_user_id', uid)
      .single()
    if (profile) {
      const sig = (signatures || []).find((s: any) => s.signer_profile_id === profile.id)
      hosts.push({
        profileId: profile.id,
        displayName: profile.display_name || 'Unknown',
        label: uid === tenantId ? 'Chef' : 'Partner',
        organization: null,
        hasSigned: !!sig,
        signedAt: sig?.signed_at || null,
      })
    }
  }

  return {
    ...(snakeToCamel(agreement) as unknown as CohostAgreement),
    items: (items || []).map((i: any) => snakeToCamel(i) as unknown as AgreementItem),
    signatures: (signatures || []).map(
      (s: any) => snakeToCamel(s) as unknown as AgreementSignature
    ),
    hosts,
  }
}

// ─── Update Agreement Item ──────────────────────────────────────────────────

const UpdateItemSchema = z.object({
  itemId: z.string().uuid(),
  assignment: z.enum(['chef', 'venue', 'shared', 'na', 'unassigned']).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['not_started', 'in_progress', 'done']).optional(),
})

export async function updateAgreementItem(
  input: z.infer<typeof UpdateItemSchema>
): Promise<{ success: boolean; signaturesVoided?: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const validated = UpdateItemSchema.parse(input)

  const db = createServerClient({ admin: true })

  // Get the item and its agreement
  const { data: item } = await db
    .from('hub_agreement_items')
    .select('*, hub_cohost_agreements!inner(group_id, status, version)')
    .eq('id', validated.itemId)
    .single()

  if (!item) return { success: false, error: 'Item not found' }

  const agreement = (item as Record<string, unknown>).hub_cohost_agreements as Record<
    string,
    unknown
  >
  await verifyCircleHost(agreement.group_id as string, tenantId!)

  // Check amendment severity
  const severity = classifyItemChange(snakeToCamel(item) as unknown as AgreementItem, validated)

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (validated.assignment !== undefined) updates.assignment = validated.assignment
  if (validated.notes !== undefined) updates.notes = validated.notes
  if (validated.status !== undefined) {
    updates.status = validated.status
    if (validated.status === 'done') {
      updates.completed_at = new Date().toISOString()
      updates.completed_by = tenantId
    }
  }

  await db.from('hub_agreement_items').update(updates).eq('id', validated.itemId)

  // If critical change and agreement was signed, void signatures
  let signaturesVoided = false
  if (severity === 'critical' && agreement.status === 'active') {
    await db
      .from('hub_cohost_agreements')
      .update({
        status: 'amended',
        version: (agreement.version as number) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.agreement_id)
    signaturesVoided = true

    try {
      await postAgreementAmendedToCircle({
        groupId: agreement.group_id as string,
        changeDescription: 'Item assignment changed',
        tenantId: tenantId!,
      })
    } catch {}
  }

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true, signaturesVoided }
}

// ─── Add Custom Item ────────────────────────────────────────────────────────

const AddItemSchema = z.object({
  agreementId: z.string().uuid(),
  category: z.enum([
    'tickets_revenue',
    'ingredients',
    'equipment',
    'venue_setup',
    'culinary',
    'beverages',
    'hospitality',
    'marketing',
    'guest_management',
    'wrap_up',
    'cancellation',
  ]),
  title: z.string().min(1).max(200),
})

export async function addCustomItem(
  input: z.infer<typeof AddItemSchema>
): Promise<{ success: boolean; itemId?: string; error?: string }> {
  const { tenantId } = await requireChef()
  const validated = AddItemSchema.parse(input)

  const db = createServerClient({ admin: true })

  const { data: agreement } = await db
    .from('hub_cohost_agreements')
    .select('group_id, status')
    .eq('id', validated.agreementId)
    .single()

  if (!agreement) return { success: false, error: 'Agreement not found' }
  await verifyCircleHost(agreement.group_id, tenantId!)

  const isPostSigning = agreement.status === 'active' || agreement.status === 'amended'

  // Get max sort_order in this category
  const { data: maxRow } = await db
    .from('hub_agreement_items')
    .select('sort_order')
    .eq('agreement_id', validated.agreementId)
    .eq('category', validated.category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxRow?.sort_order || 0) + 1

  const { data: newItem, error } = await db
    .from('hub_agreement_items')
    .insert({
      agreement_id: validated.agreementId,
      category: validated.category,
      title: validated.title,
      assignment: 'unassigned',
      status: 'not_started',
      sort_order: nextOrder,
      is_default: false,
      signature_critical: false,
      added_after_signing: isPostSigning,
      acknowledged_by: [],
    })
    .select('id')
    .single()

  if (error || !newItem) return { success: false, error: error?.message || 'Failed to add item' }

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true, itemId: newItem.id }
}

// ─── Remove Custom Item ─────────────────────────────────────────────────────

export async function removeCustomItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: item } = await db
    .from('hub_agreement_items')
    .select('id, is_default, hub_cohost_agreements!inner(group_id)')
    .eq('id', itemId)
    .single()

  if (!item) return { success: false, error: 'Item not found' }
  if (item.is_default)
    return { success: false, error: 'Cannot remove default items. Set to N/A instead.' }

  const agreement = (item as Record<string, unknown>).hub_cohost_agreements as Record<
    string,
    unknown
  >
  await verifyCircleHost(agreement.group_id as string, tenantId!)

  await db.from('hub_agreement_items').delete().eq('id', itemId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Update Compensation ────────────────────────────────────────────────────

const UpdateCompensationSchema = z.object({
  agreementId: z.string().uuid(),
  compensationModel: z
    .enum(['venue_sells_all', 'both_sell', 'chef_sells_all', 'fixed_fee'])
    .optional(),
  compensationDetails: z.record(z.string(), z.unknown()).optional(),
})

export async function updateCompensation(
  input: z.infer<typeof UpdateCompensationSchema>
): Promise<{ success: boolean; signaturesVoided?: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const validated = UpdateCompensationSchema.parse(input)

  const db = createServerClient({ admin: true })

  const { data: agreement } = await db
    .from('hub_cohost_agreements')
    .select('*')
    .eq('id', validated.agreementId)
    .single()

  if (!agreement) return { success: false, error: 'Agreement not found' }
  await verifyCircleHost(agreement.group_id, tenantId!)

  // Validate splits if provided
  if (validated.compensationDetails?.splits) {
    const splitError = validateSplits(
      validated.compensationDetails.splits as { percentage: number }[]
    )
    if (splitError) return { success: false, error: splitError }
  }

  const severity = classifyCompensationChange(
    snakeToCamel(agreement) as unknown as CohostAgreement,
    {
      compensationModel: validated.compensationModel,
      compensationDetails: validated.compensationDetails as CompensationDetails | undefined,
    }
  )

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (validated.compensationModel) updates.compensation_model = validated.compensationModel
  if (validated.compensationDetails) updates.compensation_details = validated.compensationDetails

  let signaturesVoided = false
  if (severity === 'critical' && agreement.status === 'active') {
    updates.status = 'amended'
    updates.version = agreement.version + 1
    signaturesVoided = true

    try {
      await postAgreementAmendedToCircle({
        groupId: agreement.group_id,
        changeDescription: 'Compensation terms changed',
        tenantId: tenantId!,
      })
    } catch {}
  }

  await db.from('hub_cohost_agreements').update(updates).eq('id', validated.agreementId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true, signaturesVoided }
}

// ─── Sign Agreement ─────────────────────────────────────────────────────────

export async function signAgreement(
  agreementId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: agreement } = await db
    .from('hub_cohost_agreements')
    .select('*')
    .eq('id', agreementId)
    .single()

  if (!agreement) return { success: false, error: 'Agreement not found' }
  await verifyCircleHost(agreement.group_id, tenantId!)

  // Get signer's profile
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('auth_user_id', tenantId!)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  // Check for unassigned items
  const { data: unassigned } = await db
    .from('hub_agreement_items')
    .select('id')
    .eq('agreement_id', agreementId)
    .eq('assignment', 'unassigned')
    .limit(1)

  if (unassigned && unassigned.length > 0) {
    return { success: false, error: 'All items must be assigned before signing' }
  }

  // Get items for content hash
  const { data: items } = await db
    .from('hub_agreement_items')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('sort_order')

  const contentHash = await hashAgreementContent(
    snakeToCamel(agreement) as unknown as CohostAgreement,
    (items || []).map((i: any) => snakeToCamel(i) as unknown as AgreementItem)
  )

  // Get request metadata
  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for') || headerList.get('x-real-ip') || 'unknown'
  const userAgent = headerList.get('user-agent') || 'unknown'

  // Determine signer role
  const isOwner = agreement.created_by === tenantId
  const signerRole = isOwner ? 'chef' : 'partner'

  const { error: sigError } = await db.from('hub_agreement_signatures').upsert(
    {
      agreement_id: agreementId,
      signer_profile_id: profile.id,
      signer_name: profile.display_name || 'Unknown',
      signer_role: signerRole,
      content_hash: contentHash,
      ip_address: ip,
      user_agent: userAgent,
      version: agreement.version,
      signed_at: new Date().toISOString(),
    },
    {
      onConflict: 'agreement_id,signer_profile_id,version',
    }
  )

  if (sigError) return { success: false, error: sigError.message }

  // Check if all hosts have signed
  const { data: coHosts } = await db
    .from('circle_co_hosts')
    .select('user_id')
    .eq('circle_id', agreement.group_id)
    .not('accepted_at', 'is', null)

  const allHostUserIds = [agreement.created_by, ...(coHosts || []).map((h: any) => h.user_id)]

  // Get all host profile IDs
  const hostProfileIds: string[] = []
  for (const uid of allHostUserIds) {
    const { data: p } = await db
      .from('hub_guest_profiles')
      .select('id')
      .eq('auth_user_id', uid)
      .single()
    if (p) hostProfileIds.push(p.id)
  }

  const { data: allSigs } = await db
    .from('hub_agreement_signatures')
    .select('signer_profile_id')
    .eq('agreement_id', agreementId)
    .eq('version', agreement.version)

  const signedIds = new Set((allSigs || []).map((s: any) => s.signer_profile_id))
  const allSigned = hostProfileIds.every((id) => signedIds.has(id))

  if (allSigned) {
    await db
      .from('hub_cohost_agreements')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', agreementId)
  } else if (agreement.status === 'draft' || agreement.status === 'amended') {
    await db
      .from('hub_cohost_agreements')
      .update({ status: 'pending_signatures', updated_at: new Date().toISOString() })
      .eq('id', agreementId)
  }

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Void Agreement ─────────────────────────────────────────────────────────

export async function voidAgreement(
  agreementId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: agreement } = await db
    .from('hub_cohost_agreements')
    .select('group_id, created_by')
    .eq('id', agreementId)
    .single()

  if (!agreement) return { success: false, error: 'Agreement not found' }
  if (agreement.created_by !== tenantId) {
    return { success: false, error: 'Only the agreement creator can void it' }
  }

  await db
    .from('hub_cohost_agreements')
    .update({ status: 'voided', updated_at: new Date().toISOString() })
    .eq('id', agreementId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Complete Agreement Item ────────────────────────────────────────────────

export async function completeAgreementItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: item } = await db
    .from('hub_agreement_items')
    .select('id, hub_cohost_agreements!inner(group_id)')
    .eq('id', itemId)
    .single()

  if (!item) return { success: false, error: 'Item not found' }

  const agreement = (item as Record<string, unknown>).hub_cohost_agreements as Record<
    string,
    unknown
  >
  await verifyCircleHost(agreement.group_id as string, tenantId!)

  await db
    .from('hub_agreement_items')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      completed_by: tenantId!,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Acknowledge Post-Signing Item ──────────────────────────────────────────

export async function acknowledgePostSigningItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: item } = await db
    .from('hub_agreement_items')
    .select('id, acknowledged_by, added_after_signing, hub_cohost_agreements!inner(group_id)')
    .eq('id', itemId)
    .single()

  if (!item) return { success: false, error: 'Item not found' }
  if (!item.added_after_signing)
    return { success: false, error: 'Item was not added after signing' }

  const agreement = (item as Record<string, unknown>).hub_cohost_agreements as Record<
    string,
    unknown
  >
  await verifyCircleHost(agreement.group_id as string, tenantId!)

  // Get profile ID
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('auth_user_id', tenantId!)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  const currentAcks = (item.acknowledged_by || []) as string[]
  if (currentAcks.includes(profile.id)) return { success: true }

  await db
    .from('hub_agreement_items')
    .update({
      acknowledged_by: [...currentAcks, profile.id],
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  revalidatePath(`/circles/${agreement.group_id}`)
  return { success: true }
}

// ─── Carry Forward Agreement ────────────────────────────────────────────────

export async function carryForwardAgreement(
  sourceAgreementId: string,
  newGroupId: string,
  newEventId?: string
): Promise<{ success: boolean; agreementId?: string; error?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  // Get source agreement with items
  const { data: source } = await db
    .from('hub_cohost_agreements')
    .select('*')
    .eq('id', sourceAgreementId)
    .single()

  if (!source) return { success: false, error: 'Source agreement not found' }
  await verifyCircleHost(newGroupId, tenantId!)

  // Create new agreement inheriting from source
  const { data: newAgreement, error: createError } = await db
    .from('hub_cohost_agreements')
    .insert({
      group_id: newGroupId,
      event_id: newEventId || null,
      template_type: source.template_type,
      compensation_model: source.compensation_model,
      compensation_details: source.compensation_details,
      status: 'draft',
      version: 1,
      created_by: tenantId!,
      inherited_from_agreement_id: sourceAgreementId,
    })
    .select('id')
    .single()

  if (createError || !newAgreement) {
    return { success: false, error: createError?.message || 'Failed to create agreement' }
  }

  // Copy items from source (only defaults + custom items, reset status)
  const { data: sourceItems } = await db
    .from('hub_agreement_items')
    .select('*')
    .eq('agreement_id', sourceAgreementId)
    .order('sort_order')

  if (sourceItems && sourceItems.length > 0) {
    const copiedItems = sourceItems.map((item: any) => ({
      agreement_id: newAgreement.id,
      category: item.category,
      title: item.title,
      assignment: item.assignment,
      notes: item.notes,
      status: 'not_started',
      sort_order: item.sort_order,
      is_default: item.is_default,
      signature_critical: item.signature_critical,
      added_after_signing: false,
      acknowledged_by: [],
    }))

    await db.from('hub_agreement_items').insert(copiedItems)
  }

  revalidatePath(`/circles/${newGroupId}`)
  return { success: true, agreementId: newAgreement.id }
}

// ─── Check Agreement Gate (for ticket sales) ────────────────────────────────

export async function checkAgreementGate(
  groupId: string,
  eventId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { tenantId } = await requireChef()
  const db = createServerClient({ admin: true })

  // Check if this circle has co-hosts
  const { data: coHosts } = await db
    .from('circle_co_hosts')
    .select('id')
    .eq('circle_id', groupId)
    .not('accepted_at', 'is', null)
    .limit(1)

  // No co-hosts = no agreement needed
  if (!coHosts || coHosts.length === 0) return { allowed: true }

  // Has co-hosts, check for active agreement
  let query = db.from('hub_cohost_agreements').select('status').eq('group_id', groupId)

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data: agreements } = await query.order('created_at', { ascending: false }).limit(1)

  if (!agreements || agreements.length === 0) {
    return {
      allowed: false,
      reason:
        'A collaboration agreement is required before tickets can go live. All co-hosts must review and sign.',
    }
  }

  if (agreements[0].status !== 'active') {
    return {
      allowed: false,
      reason: 'All co-hosts must sign the collaboration agreement before tickets go live.',
    }
  }

  return { allowed: true }
}

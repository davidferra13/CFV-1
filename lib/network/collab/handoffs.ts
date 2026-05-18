'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { hasCollabHandoffExpired, isCollabHandoffActionable } from '@/lib/network/collab-logic'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  ConvertHandoffSchema,
  CreateHandoffSchema,
  HandoffIdSchema,
  RespondHandoffSchema,
} from './schemas'
import { handoffRecipientsTable, handoffsTable, trustedCircleTable } from './tables'
import {
  createCollabSocialNotifications,
  expireOverdueHandoffsForChef,
  getChefCardsById,
  getConnectedChefIds,
  logHandoffEvent,
  recomputeHandoffStatus,
} from './helpers'
import type {
  CollabChefCard,
  CollabInbox,
  HandoffRecipientStatus,
  HandoffSourceType,
  HandoffStatus,
  HandoffType,
  HandoffVisibility,
  IncomingCollabHandoff,
  OutgoingCollabHandoff,
} from './types'

async function resolveHandoffRecipients(
  db: any,
  chefId: string,
  input: z.infer<typeof CreateHandoffSchema>
): Promise<string[]> {
  const connected = await getConnectedChefIds(db, chefId)

  if (input.visibilityScope === 'selected_chefs') {
    const selected = Array.from(
      new Set((input.recipientChefIds ?? []).filter((id) => id !== chefId))
    )
    if (selected.length === 0) {
      throw new Error('Select at least one chef for this handoff.')
    }
    const invalid = selected.filter((id) => !connected.has(id))
    if (invalid.length > 0) {
      throw new Error('All selected recipients must be accepted connections.')
    }
    return selected
  }

  if (input.visibilityScope === 'trusted_circle') {
    const { data } = await trustedCircleTable(db).select('trusted_chef_id').eq('chef_id', chefId)
    const trusted = Array.from(new Set(((data ?? []) as any[]).map((row) => row.trusted_chef_id)))
    const validTrusted = trusted.filter((id) => connected.has(id))
    if (validTrusted.length === 0) {
      throw new Error('Your trusted circle is empty. Add trusted chefs first.')
    }
    return validTrusted
  }

  const allConnections = Array.from(connected)
  if (allConnections.length === 0) {
    throw new Error('You need at least one accepted connection to create a collaboration handoff.')
  }
  return allConnections
}

export async function createCollabHandoff(input: z.infer<typeof CreateHandoffSchema>) {
  const user = await requireChef()
  const validated = CreateHandoffSchema.parse({
    ...input,
    sourceEntityType: input.sourceEntityType ?? 'manual',
  })
  const db = createServerClient({ admin: true })

  if (validated.expiresAt && hasCollabHandoffExpired(validated.expiresAt)) {
    throw new Error('Handoff expiration must be in the future.')
  }

  const recipientChefIds = await resolveHandoffRecipients(db, user.entityId, validated)

  const { data: handoff, error: handoffError } = await handoffsTable(db)
    .insert({
      from_chef_id: user.entityId,
      title: validated.title,
      handoff_type: validated.handoffType,
      source_entity_type: validated.sourceEntityType ?? 'manual',
      source_entity_id: validated.sourceEntityId ?? null,
      occasion: validated.occasion ?? null,
      event_date: validated.eventDate ?? null,
      guest_count: validated.guestCount ?? null,
      location_text: validated.locationText ?? null,
      budget_cents: validated.budgetCents ?? null,
      private_note: validated.privateNote ?? null,
      client_context: validated.clientContext ?? {},
      visibility_scope: validated.visibilityScope,
      expires_at: validated.expiresAt ?? null,
    })
    .select('id')
    .single()

  if (handoffError || !handoff) {
    console.error('[createCollabHandoff] handoff insert error:', handoffError)
    throw new Error('Failed to create collaboration handoff.')
  }

  const recipientRows = recipientChefIds.map((recipientChefId) => ({
    handoff_id: handoff.id,
    recipient_chef_id: recipientChefId,
    status: 'sent',
  }))

  const { error: recipientsError } = await handoffRecipientsTable(db).insert(recipientRows)
  if (recipientsError) {
    console.error('[createCollabHandoff] recipient insert error:', recipientsError)
    throw new Error('Failed to assign handoff recipients.')
  }

  await logHandoffEvent(db, {
    handoffId: handoff.id,
    actorChefId: user.entityId,
    eventType: 'created',
    metadata: {
      recipients_count: recipientChefIds.length,
      visibility_scope: validated.visibilityScope,
    },
  })
  await createCollabSocialNotifications(db, {
    recipients: recipientChefIds,
    actorChefId: user.entityId,
    notificationType: 'collab_handoff_received',
    handoffId: handoff.id,
  })

  revalidatePath('/network')
  revalidatePath('/dashboard')
  return { success: true, handoffId: handoff.id, recipients: recipientChefIds.length }
}

export async function getCollabInbox(limit = 50): Promise<CollabInbox> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)
  const safeLimit = Math.min(Math.max(limit, 1), 200)

  const { data: incomingRows } = await handoffRecipientsTable(db)
    .select('id, handoff_id, status, response_note, viewed_at, responded_at, created_at')
    .eq('recipient_chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  const incomingHandoffIds = Array.from(
    new Set(((incomingRows ?? []) as any[]).map((row) => row.handoff_id))
  )
  const incomingHandoffsMap = new Map<string, any>()
  if (incomingHandoffIds.length > 0) {
    const { data: incomingHandoffs } = await handoffsTable(db)
      .select(
        'id, from_chef_id, title, handoff_type, source_entity_type, source_entity_id, status, occasion, event_date, guest_count, location_text, budget_cents, private_note, client_context, expires_at, created_at'
      )
      .in('id', incomingHandoffIds)
    for (const handoff of incomingHandoffs ?? [])
      incomingHandoffsMap.set((handoff as any).id, handoff)
  }

  const incomingSenderIds = Array.from(
    new Set(
      ((incomingRows ?? []) as any[])
        .map((row) => incomingHandoffsMap.get(row.handoff_id)?.from_chef_id)
        .filter(Boolean)
    )
  )
  const incomingSenderMap = await getChefCardsById(db, incomingSenderIds)

  const incoming: IncomingCollabHandoff[] = ((incomingRows ?? []) as any[])
    .map((row) => {
      const handoff = incomingHandoffsMap.get(row.handoff_id)
      if (!handoff) return null
      const sender = incomingSenderMap.get(handoff.from_chef_id)
      if (!sender) return null
      return {
        recipient_row_id: row.id,
        handoff_id: handoff.id,
        title: handoff.title,
        handoff_type: handoff.handoff_type as HandoffType,
        source_entity_type: (handoff.source_entity_type as HandoffSourceType | null) ?? null,
        source_entity_id: handoff.source_entity_id ?? null,
        status: handoff.status as HandoffStatus,
        recipient_status: row.status as HandoffRecipientStatus,
        response_note: row.response_note ?? null,
        event_date: handoff.event_date ?? null,
        occasion: handoff.occasion ?? null,
        guest_count: handoff.guest_count ?? null,
        location_text: handoff.location_text ?? null,
        budget_cents: handoff.budget_cents ?? null,
        private_note: handoff.private_note ?? null,
        client_context: handoff.client_context ?? {},
        expires_at: handoff.expires_at ?? null,
        created_at: handoff.created_at,
        viewed_at: row.viewed_at ?? null,
        responded_at: row.responded_at ?? null,
        from_chef: sender,
      }
    })
    .filter((row): row is IncomingCollabHandoff => Boolean(row))

  const { data: outgoingHandoffs } = await handoffsTable(db)
    .select(
      'id, title, handoff_type, source_entity_type, source_entity_id, status, occasion, event_date, guest_count, location_text, budget_cents, private_note, client_context, expires_at, visibility_scope, created_at'
    )
    .eq('from_chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  const outgoingIds = ((outgoingHandoffs ?? []) as any[]).map((row) => row.id)
  const { data: outgoingRecipientRows } =
    outgoingIds.length === 0
      ? { data: [] }
      : await handoffRecipientsTable(db)
          .select(
            'id, handoff_id, recipient_chef_id, status, response_note, viewed_at, responded_at, created_at'
          )
          .in('handoff_id', outgoingIds)
          .order('created_at', { ascending: true })

  const outgoingRecipientIds = Array.from(
    new Set(((outgoingRecipientRows ?? []) as any[]).map((row) => row.recipient_chef_id))
  )
  const outgoingRecipientMap = await getChefCardsById(db, outgoingRecipientIds)

  const recipientsByHandoff = new Map<string, any[]>()
  for (const row of (outgoingRecipientRows ?? []) as any[]) {
    const current = recipientsByHandoff.get(row.handoff_id) ?? []
    current.push(row)
    recipientsByHandoff.set(row.handoff_id, current)
  }

  const outgoing: OutgoingCollabHandoff[] = ((outgoingHandoffs ?? []) as any[]).map((handoff) => {
    const recipientRows = recipientsByHandoff.get(handoff.id) ?? []
    const recipients = recipientRows
      .map((row) => {
        const chef = outgoingRecipientMap.get(row.recipient_chef_id)
        if (!chef) return null
        return {
          recipient_row_id: row.id,
          recipient_status: row.status as HandoffRecipientStatus,
          response_note: row.response_note ?? null,
          viewed_at: row.viewed_at ?? null,
          responded_at: row.responded_at ?? null,
          chef,
        }
      })
      .filter(
        (
          row
        ): row is {
          recipient_row_id: string
          recipient_status: HandoffRecipientStatus
          response_note: string | null
          viewed_at: string | null
          responded_at: string | null
          chef: CollabChefCard
        } => Boolean(row)
      )

    return {
      handoff_id: handoff.id,
      title: handoff.title,
      handoff_type: handoff.handoff_type as HandoffType,
      source_entity_type: (handoff.source_entity_type as HandoffSourceType | null) ?? null,
      source_entity_id: handoff.source_entity_id ?? null,
      status: handoff.status as HandoffStatus,
      event_date: handoff.event_date ?? null,
      occasion: handoff.occasion ?? null,
      guest_count: handoff.guest_count ?? null,
      location_text: handoff.location_text ?? null,
      budget_cents: handoff.budget_cents ?? null,
      private_note: handoff.private_note ?? null,
      client_context: handoff.client_context ?? {},
      expires_at: handoff.expires_at ?? null,
      visibility_scope: handoff.visibility_scope as HandoffVisibility,
      created_at: handoff.created_at,
      recipients,
    }
  })

  return { incoming, outgoing }
}

export async function markCollabHandoffViewed(input: z.infer<typeof HandoffIdSchema>) {
  const user = await requireChef()
  const validated = HandoffIdSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { data: handoff } = await handoffsTable(db)
    .select('id, status')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff) throw new Error('Handoff not found.')
  if (!isCollabHandoffActionable(handoff.status as HandoffStatus)) {
    return { success: true }
  }

  const { data: recipient } = await handoffRecipientsTable(db)
    .select('id, status')
    .eq('handoff_id', validated.handoffId)
    .eq('recipient_chef_id', user.entityId)
    .maybeSingle()

  if (!recipient) throw new Error('Handoff recipient row not found.')
  if (recipient.status !== 'sent') return { success: true }

  const now = new Date().toISOString()
  await handoffRecipientsTable(db)
    .update({ status: 'viewed', viewed_at: now })
    .eq('id', recipient.id)

  await logHandoffEvent(db, {
    handoffId: validated.handoffId,
    actorChefId: user.entityId,
    eventType: 'viewed',
  })

  await recomputeHandoffStatus(db, validated.handoffId, user.entityId)
  revalidatePath('/network')
  return { success: true }
}

export async function respondToCollabHandoff(input: z.infer<typeof RespondHandoffSchema>) {
  const user = await requireChef()
  const validated = RespondHandoffSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { data: handoff } = await handoffsTable(db)
    .select('id, from_chef_id, status')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff) throw new Error('Handoff not found.')
  if (!isCollabHandoffActionable(handoff.status as HandoffStatus)) {
    throw new Error('This handoff is no longer accepting responses.')
  }

  const { data: recipient } = await handoffRecipientsTable(db)
    .select('id, status')
    .eq('handoff_id', validated.handoffId)
    .eq('recipient_chef_id', user.entityId)
    .maybeSingle()

  if (!recipient) throw new Error('Handoff not found.')
  if (!['sent', 'viewed'].includes(recipient.status)) {
    throw new Error('This handoff has already been responded to.')
  }

  const nextStatus = validated.action === 'accepted' ? 'accepted' : 'rejected'
  const now = new Date().toISOString()
  const { error } = await handoffRecipientsTable(db)
    .update({
      status: nextStatus,
      response_note: validated.responseNote ?? null,
      responded_at: now,
      viewed_at: recipient.status === 'sent' ? now : undefined,
    })
    .eq('id', recipient.id)

  if (error) {
    console.error('[respondToCollabHandoff] Error:', error)
    throw new Error('Failed to respond to handoff.')
  }

  await logHandoffEvent(db, {
    handoffId: validated.handoffId,
    actorChefId: user.entityId,
    eventType: validated.action,
    metadata: { response_note: validated.responseNote ?? null },
  })
  if (handoff.from_chef_id && handoff.from_chef_id !== user.entityId) {
    await createCollabSocialNotifications(db, {
      recipients: [handoff.from_chef_id],
      actorChefId: user.entityId,
      notificationType:
        validated.action === 'accepted' ? 'collab_handoff_accepted' : 'collab_handoff_rejected',
      handoffId: validated.handoffId,
    })
  }

  await recomputeHandoffStatus(db, validated.handoffId, user.entityId)
  revalidatePath('/network')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function cancelCollabHandoff(input: z.infer<typeof HandoffIdSchema>) {
  const user = await requireChef()
  const validated = HandoffIdSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { data: handoff } = await handoffsTable(db)
    .select('id, from_chef_id, status')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff || handoff.from_chef_id !== user.entityId) {
    throw new Error('Handoff not found or access denied.')
  }

  if (handoff.status === 'cancelled' || handoff.status === 'expired') return { success: true }

  const { data: recipientsBeforeCancel } = await handoffRecipientsTable(db)
    .select('recipient_chef_id')
    .eq('handoff_id', validated.handoffId)
    .in('status', ['sent', 'viewed', 'accepted'])

  const now = new Date().toISOString()
  await handoffsTable(db).update({ status: 'cancelled' }).eq('id', validated.handoffId)
  await handoffRecipientsTable(db)
    .update({ status: 'withdrawn', responded_at: now })
    .eq('handoff_id', validated.handoffId)
    .in('status', ['sent', 'viewed'])

  await logHandoffEvent(db, {
    handoffId: validated.handoffId,
    actorChefId: user.entityId,
    eventType: 'cancelled',
  })
  await createCollabSocialNotifications(db, {
    recipients: Array.from(
      new Set(((recipientsBeforeCancel ?? []) as any[]).map((row) => row.recipient_chef_id))
    ),
    actorChefId: user.entityId,
    notificationType: 'collab_handoff_cancelled',
    handoffId: validated.handoffId,
  })

  revalidatePath('/network')
  return { success: true }
}

export async function recordCollabHandoffConversion(input: z.infer<typeof ConvertHandoffSchema>) {
  const user = await requireChef()
  const validated = ConvertHandoffSchema.parse(input)
  const db = createServerClient({ admin: true })
  await expireOverdueHandoffsForChef(db, user.entityId)

  const { data: handoff } = await handoffsTable(db)
    .select('id, from_chef_id, status')
    .eq('id', validated.handoffId)
    .maybeSingle()

  if (!handoff) throw new Error('Handoff not found.')
  if (
    (handoff.status as HandoffStatus) === 'cancelled' ||
    (handoff.status as HandoffStatus) === 'expired'
  ) {
    throw new Error('This handoff can no longer be converted.')
  }

  const { data: recipient } = await handoffRecipientsTable(db)
    .select('id, status')
    .eq('handoff_id', validated.handoffId)
    .eq('recipient_chef_id', user.entityId)
    .maybeSingle()

  if (!recipient) throw new Error('Handoff not found.')
  if (!['accepted', 'converted'].includes(recipient.status)) {
    throw new Error('Handoff must be accepted before conversion.')
  }

  const now = new Date().toISOString()
  const { error } = await handoffRecipientsTable(db)
    .update({
      status: 'converted',
      converted_event_id: validated.convertedEventId ?? null,
      converted_inquiry_id: validated.convertedInquiryId ?? null,
      responded_at: recipient.status === 'accepted' ? now : undefined,
    })
    .eq('id', recipient.id)

  if (error) {
    console.error('[recordCollabHandoffConversion] Error:', error)
    throw new Error('Failed to mark handoff conversion.')
  }

  await logHandoffEvent(db, {
    handoffId: validated.handoffId,
    actorChefId: user.entityId,
    eventType: 'converted',
    metadata: {
      converted_event_id: validated.convertedEventId ?? null,
      converted_inquiry_id: validated.convertedInquiryId ?? null,
    },
  })
  if (handoff.from_chef_id && handoff.from_chef_id !== user.entityId) {
    await createCollabSocialNotifications(db, {
      recipients: [handoff.from_chef_id],
      actorChefId: user.entityId,
      notificationType: 'collab_handoff_converted',
      handoffId: validated.handoffId,
    })
  }

  await recomputeHandoffStatus(db, validated.handoffId, user.entityId)
  revalidatePath('/network')
  return { success: true }
}

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

const SOFT_CLOSE_DECLINE_REASON = 'Plans changed / maybe future'
// Stable marker used to find and update (not duplicate) the relationship note.
const NOTE_MARKER_PREFIX = 'Soft close source inquiry:'

export interface CaptureLeverageInput {
  inquiryId: string
  tags: string[]
  mergeDietary: boolean
  mergeDiscussedDishes: boolean
  relationshipNote: string
}

export interface CaptureLeverageResult {
  success: true
  clientId: string
  applied: {
    clientCreated: boolean
    tagsAdded: number
    dietaryMerged: boolean
    dishesMerged: boolean
    noteSaved: boolean
  }
}

export async function captureSoftCloseLeverage(
  input: CaptureLeverageInput
): Promise<CaptureLeverageResult | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Load the inquiry (must be terminal with the specific reason)
  const { data: inquiry } = await db
    .from('inquiries')
    .select(
      'id, status, decline_reason, client_id, contact_name, contact_email, confirmed_dietary_restrictions, discussed_dishes, tenant_id'
    )
    .eq('id', input.inquiryId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (!inquiry) {
    return { success: false, error: 'Inquiry not found.' }
  }

  const isValidEntry =
    inquiry.status === 'declined' && inquiry.decline_reason === SOFT_CLOSE_DECLINE_REASON

  if (!isValidEntry) {
    return {
      success: false,
      error: `Leverage capture is only available for inquiries declined as "${SOFT_CLOSE_DECLINE_REASON}".`,
    }
  }

  // 2. Resolve the client
  let clientId: string = inquiry.client_id ?? null
  let clientCreated = false

  if (!clientId) {
    const contactEmail = (inquiry.contact_email as string | null) ?? null
    const contactName = (inquiry.contact_name as string | null) ?? null

    if (!contactEmail || !contactName) {
      return {
        success: false,
        error:
          'A client record must be linked or the inquiry must have a contact name and email before saving leverage context.',
      }
    }

    // createClientFromLead is not a 'use server' export - call the internal helper
    const { createClientFromLead } = await import('@/lib/clients/actions')
    const result = await createClientFromLead(user.tenantId!, {
      email: contactEmail,
      full_name: contactName,
      source: 'email',
    })
    clientId = result.id
    clientCreated = result.created
  }

  const applied = {
    clientCreated,
    tagsAdded: 0,
    dietaryMerged: false,
    dishesMerged: false,
    noteSaved: false,
  }

  // 3. Add tags (upsert - deduped by uniqueness constraint)
  const validTags = input.tags.map((t) => t.trim().slice(0, 50)).filter(Boolean)
  for (const tag of validTags) {
    const { error: tagErr } = await db
      .from('client_tags' as any)
      .upsert(
        { client_id: clientId, tenant_id: user.tenantId!, tag },
        { onConflict: 'client_id,tag' }
      )
    if (!tagErr) applied.tagsAdded++
  }

  // 4. Load current client to compute merges
  const { data: client } = await db
    .from('clients')
    .select('dietary_restrictions, favorite_dishes')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const clientUpdates: Record<string, unknown> = {}

  // 5. Merge dietary restrictions
  if (input.mergeDietary) {
    const inquiryDietary = (inquiry.confirmed_dietary_restrictions as string[] | null) ?? []
    if (inquiryDietary.length > 0) {
      const existing = (client?.dietary_restrictions as string[] | null) ?? []
      const merged = [...new Set([...existing, ...inquiryDietary])]
      if (merged.length !== existing.length) {
        clientUpdates.dietary_restrictions = merged
        applied.dietaryMerged = true
      }
    }
  }

  // 6. Merge discussed dishes into favorite dishes
  if (input.mergeDiscussedDishes) {
    const inquiryDishes = (inquiry.discussed_dishes as string[] | null) ?? []
    if (inquiryDishes.length > 0) {
      const existing = (client?.favorite_dishes as string[] | null) ?? []
      const merged = [...new Set([...existing, ...inquiryDishes])]
      if (merged.length !== existing.length) {
        clientUpdates.favorite_dishes = merged
        applied.dishesMerged = true
      }
    }
  }

  if (Object.keys(clientUpdates).length > 0) {
    await db
      .from('clients')
      .update(clientUpdates)
      .eq('id', clientId)
      .eq('tenant_id', user.tenantId!)
  }

  // 7. Upsert relationship note (find by stable marker to avoid duplicates)
  const noteText = input.relationshipNote.trim()
  if (noteText) {
    const stableMarker = `${NOTE_MARKER_PREFIX} ${input.inquiryId}`

    const { data: existing } = await db
      .from('client_notes' as any)
      .select('id')
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .eq('category', 'relationship')
      .ilike('note_text', `%${stableMarker}%`)
      .maybeSingle()

    if (existing?.id) {
      await db
        .from('client_notes' as any)
        .update({ note_text: noteText })
        .eq('id', existing.id)
        .eq('tenant_id', user.tenantId!)
    } else {
      await db.from('client_notes' as any).insert({
        tenant_id: user.tenantId!,
        client_id: clientId,
        note_text: noteText,
        category: 'relationship',
        pinned: false,
        source: 'manual',
      })
    }

    applied.noteSaved = true
  }

  revalidatePath(`/inquiries/${input.inquiryId}`)
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients')

  return { success: true, clientId, applied }
}

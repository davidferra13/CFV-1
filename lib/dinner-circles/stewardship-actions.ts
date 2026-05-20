'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireClient } from '@/lib/auth/get-user'
import { clientGetOrCreateConversation, sendChatMessage } from '@/lib/chat/actions'
import { createServerClient } from '@/lib/db/server'
import { createChefNotification } from '@/lib/notifications/chef-actions'

export type DinnerChangeIntakeState = {
  ok: boolean
  message: string
}

const ChangeTypes = [
  'headcount',
  'guest_swap',
  'dietary',
  'menu_request',
  'private_surprise',
  'timing_access',
  'cancellation_reschedule',
  'addon',
  'general',
] as const

const DinnerChangeIntakeSchema = z.object({
  eventId: z.string().uuid(),
  changeType: z.enum(ChangeTypes),
  note: z
    .string()
    .min(4, 'Add a few details so your chef can act on it.')
    .max(1200, 'Keep this under 1,200 characters.')
    .transform((value) => value.trim()),
  privateToHostChef: z.boolean(),
})

const CHANGE_LABELS: Record<(typeof ChangeTypes)[number], string> = {
  headcount: 'Headcount changed',
  guest_swap: 'Guest added or removed',
  dietary: 'Allergy or dietary update',
  menu_request: 'Menu change request',
  private_surprise: 'Private birthday or surprise note',
  timing_access: 'Timing, address, parking, or access',
  cancellation_reschedule: 'Cancellation or reschedule',
  addon: 'Add-on or service expansion',
  general: 'General note',
}

const IMPACT_LABELS: Record<(typeof ChangeTypes)[number], string> = {
  headcount: 'Needs chef review; may affect cost or prep.',
  guest_swap: 'Needs readiness review; dietary updates may be required.',
  dietary: 'Important for safety; chef review required.',
  menu_request: 'Needs chef review; may affect prep, sourcing, or cost.',
  private_surprise: 'Hidden from guests; host/chef visibility only.',
  timing_access: 'Usually easy unless inside the lock window.',
  cancellation_reschedule: 'Requires chef follow-up and policy review.',
  addon: 'Requires chef review; may affect quote or availability.',
  general: 'Chef review.',
}

const PreferenceTopics = [
  'major_updates',
  'dietary_allergy',
  'menu_occasion',
  'logistics',
  'addons_payments',
] as const

const AddOnIds = [
  'wine_beverage_pairing',
  'printed_menus',
  'celebration_moment',
  'staffing_service_extension',
  'future_booking_hold',
] as const

const NotificationPreferenceSchema = z.object({
  eventId: z.string().uuid(),
  topics: z.array(z.enum(PreferenceTopics)),
  muted: z.boolean(),
})

const AddOnRequestSchema = z.object({
  eventId: z.string().uuid(),
  addOnId: z.enum(AddOnIds),
})

const ADD_ON_LABELS: Record<(typeof AddOnIds)[number], string> = {
  wine_beverage_pairing: 'Wine or beverage pairing',
  printed_menus: 'Printed menus',
  celebration_moment: 'Birthday or surprise moment',
  staffing_service_extension: 'Staffing or service extension',
  future_booking_hold: 'Hold a future dinner date',
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export async function submitDinnerChangeIntake(
  _previousState: DinnerChangeIntakeState,
  formData: FormData
): Promise<DinnerChangeIntakeState> {
  const user = await requireClient()
  if (!user.tenantId) {
    return { ok: false, message: 'Your client account is missing tenant context.' }
  }

  const parsed = DinnerChangeIntakeSchema.safeParse({
    eventId: getString(formData, 'eventId'),
    changeType: getString(formData, 'changeType'),
    note: getString(formData, 'note'),
    privateToHostChef: formData.get('privateToHostChef') === 'on',
  })

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid change request.' }
  }

  const db: any = createServerClient()
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, client_id, occasion, event_date, status')
    .eq('id', parsed.data.eventId)
    .eq('client_id', user.entityId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!event) {
    return { ok: false, message: 'Event not found.' }
  }

  if (!['paid', 'confirmed', 'in_progress'].includes(event.status)) {
    return {
      ok: false,
      message: 'This intake opens after the dinner is paid or confirmed.',
    }
  }

  const label = CHANGE_LABELS[parsed.data.changeType]
  const impact = IMPACT_LABELS[parsed.data.changeType]
  const visibility = parsed.data.privateToHostChef ? 'Host/Chef only' : 'Client-safe status'
  const submittedAt = new Date().toISOString()

  try {
    const conversation = await clientGetOrCreateConversation({
      context_type: 'event',
      event_id: event.id,
    })

    await sendChatMessage({
      conversation_id: conversation.conversation.id,
      message_type: 'text',
      body: [
        `Dinner stewardship change intake for "${event.occasion || 'event'}".`,
        `Type: ${label}.`,
        `Impact: ${impact}`,
        `Visibility: ${visibility}.`,
        `Submitted: ${submittedAt}.`,
        `Client note: ${parsed.data.note}`,
      ].join('\n'),
    })
  } catch (error) {
    console.error('[dinner-stewardship] intake chat failed:', error)
    return { ok: false, message: 'Could not send this to your chef. Try again.' }
  }

  void createChefNotification({
    tenantId: event.tenant_id,
    category: 'chat',
    action: 'new_message',
    title: label,
    body: impact,
    actionUrl: `/events/${event.id}`,
    eventId: event.id,
    metadata: {
      source: 'dinner_stewardship_intake',
      change_type: parsed.data.changeType,
      private_to_host_chef: parsed.data.privateToHostChef,
      client_id: user.entityId,
      submitted_at: submittedAt,
    },
  })

  revalidatePath('/my-events')
  revalidatePath(`/my-events/${event.id}`)
  revalidatePath('/my-chat')
  revalidatePath('/dashboard')
  revalidatePath(`/events/${event.id}`)

  return {
    ok: true,
    message: 'Sent to your chef. The Dinner Circle will only show client-safe status.',
  }
}

export async function submitDinnerNotificationPreferences(
  _previousState: DinnerChangeIntakeState,
  formData: FormData
): Promise<DinnerChangeIntakeState> {
  const user = await requireClient()
  if (!user.tenantId) {
    return { ok: false, message: 'Your client account is missing tenant context.' }
  }

  const parsed = NotificationPreferenceSchema.safeParse({
    eventId: getString(formData, 'eventId'),
    topics: PreferenceTopics.filter((topic) => formData.get(topic) === 'on'),
    muted: formData.get('muted') === 'on',
  })

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid preferences.' }
  }

  const db: any = createServerClient()
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, client_id, occasion, event_date, status')
    .eq('id', parsed.data.eventId)
    .eq('client_id', user.entityId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!event) {
    return { ok: false, message: 'Event not found.' }
  }

  const selectedLabels = parsed.data.muted
    ? 'Muted stewardship updates; portal remains available.'
    : parsed.data.topics.length > 0
      ? parsed.data.topics.join(', ')
      : 'No proactive topics selected; portal remains available.'

  try {
    const conversation = await clientGetOrCreateConversation({
      context_type: 'event',
      event_id: event.id,
    })

    await sendChatMessage({
      conversation_id: conversation.conversation.id,
      message_type: 'text',
      body: [
        `Dinner Circle stewardship notification preferences updated for "${event.occasion || 'event'}".`,
        `Topics: ${selectedLabels}.`,
        'Automation guard: payment, private surprise, and chef-only risk updates must remain role-gated.',
      ].join('\n'),
    })
  } catch (error) {
    console.error('[dinner-stewardship] preference update failed:', error)
    return { ok: false, message: 'Could not update preferences. Try again.' }
  }

  revalidatePath('/my-events')
  revalidatePath(`/my-events/${event.id}`)
  revalidatePath('/my-chat')

  return {
    ok: true,
    message: parsed.data.muted
      ? 'Stewardship updates muted. Your dinner home remains available.'
      : 'Preferences sent to your chef and automation guard.',
  }
}

export async function submitStewardshipAddOnRequest(
  _previousState: DinnerChangeIntakeState,
  formData: FormData
): Promise<DinnerChangeIntakeState> {
  const user = await requireClient()
  if (!user.tenantId) {
    return { ok: false, message: 'Your client account is missing tenant context.' }
  }

  const parsed = AddOnRequestSchema.safeParse({
    eventId: getString(formData, 'eventId'),
    addOnId: getString(formData, 'addOnId'),
  })

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid add-on request.' }
  }

  const db: any = createServerClient()
  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, client_id, occasion, event_date, status')
    .eq('id', parsed.data.eventId)
    .eq('client_id', user.entityId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!event) {
    return { ok: false, message: 'Event not found.' }
  }

  if (!['paid', 'confirmed', 'in_progress'].includes(event.status)) {
    return {
      ok: false,
      message: 'Add-ons open after the dinner is paid or confirmed.',
    }
  }

  const label = ADD_ON_LABELS[parsed.data.addOnId]

  try {
    const conversation = await clientGetOrCreateConversation({
      context_type: 'event',
      event_id: event.id,
    })

    await sendChatMessage({
      conversation_id: conversation.conversation.id,
      message_type: 'text',
      body: [
        `Stewardship add-on request for "${event.occasion || 'event'}".`,
        `Requested add-on: ${label}.`,
        'Next step: chef review before quote, invoice, ledger, menu, or staffing changes.',
      ].join('\n'),
    })
  } catch (error) {
    console.error('[dinner-stewardship] add-on request failed:', error)
    return { ok: false, message: 'Could not send this add-on request. Try again.' }
  }

  void createChefNotification({
    tenantId: event.tenant_id,
    category: 'chat',
    action: 'new_message',
    title: label,
    body: 'Client requested a stewardship add-on. Review before changing scope or invoice.',
    actionUrl: `/events/${event.id}`,
    eventId: event.id,
    metadata: {
      source: 'dinner_stewardship_add_on',
      add_on_id: parsed.data.addOnId,
      client_id: user.entityId,
      submitted_at: new Date().toISOString(),
    },
  })

  revalidatePath('/my-events')
  revalidatePath(`/my-events/${event.id}`)
  revalidatePath('/my-chat')
  revalidatePath(`/events/${event.id}`)

  return {
    ok: true,
    message: 'Add-on request sent for chef review.',
  }
}

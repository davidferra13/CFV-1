import type { InteractionEvent } from './types'

export type InteractionSideEffectResult = { name: string; ok: boolean }

export async function runInteractionSideEffects(
  event: InteractionEvent,
  sideEffects: Array<'notification' | 'activity' | 'automation'>
): Promise<InteractionSideEffectResult[]> {
  const results: InteractionSideEffectResult[] = []

  if (sideEffects.includes('notification')) {
    results.push(await maybeCreateNotification(event))
  }

  if (sideEffects.includes('activity')) {
    results.push(await maybeLogActivity(event))
  }

  if (sideEffects.includes('automation')) {
    results.push(await maybeRunAutomation(event))
  }

  return results
}

async function maybeCreateNotification(
  event: InteractionEvent
): Promise<InteractionSideEffectResult> {
  try {
    const tenantId = stringMeta(event, 'tenant_id')
    if (event.metadata.suppress_interaction_notifications === true) {
      return { name: 'notification', ok: true }
    }
    const recipientId = stringMeta(event, 'recipient_id')
    const notificationAction = stringMeta(event, 'notification_action')
    const category = stringMeta(event, 'notification_category')

    if (!tenantId || !recipientId || !notificationAction || !category) {
      return { name: 'notification', ok: true }
    }

    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId,
      recipientId,
      category: category as any,
      action: notificationAction as any,
      title: stringMeta(event, 'notification_title') ?? event.action_type,
      body: stringMeta(event, 'notification_body') ?? undefined,
      actionUrl: stringMeta(event, 'action_url') ?? undefined,
      eventId:
        event.target_type === 'event'
          ? event.target_id
          : event.context_type === 'event'
            ? (event.context_id ?? undefined)
            : undefined,
      inquiryId: stringMeta(event, 'inquiry_id') ?? undefined,
      clientId: stringMeta(event, 'client_id') ?? undefined,
      metadata: {
        interaction_event_id: event.id,
        interaction_action_type: event.action_type,
      },
    })
    return { name: 'notification', ok: true }
  } catch (err) {
    console.error('[interaction] notification side effect failed:', err)
    return { name: 'notification', ok: false }
  }
}

async function maybeLogActivity(event: InteractionEvent): Promise<InteractionSideEffectResult> {
  try {
    const tenantId = stringMeta(event, 'tenant_id')
    if (event.metadata.suppress_interaction_activity === true) {
      return { name: 'activity', ok: true }
    }
    if (!tenantId) return { name: 'activity', ok: true }

    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const domain = inferActivityDomain(event)
    await logChefActivity({
      tenantId,
      actorId: event.actor_id,
      action: inferActivityAction(domain),
      domain,
      entityType: event.target_type,
      entityId: event.target_id,
      summary: `${event.action_type} on ${event.target_type}`,
      context: {
        interaction_event_id: event.id,
        action_type: event.action_type,
        context_type: event.context_type,
        context_id: event.context_id,
      },
      clientId: stringMeta(event, 'client_id') ?? undefined,
    })
    return { name: 'activity', ok: true }
  } catch (err) {
    console.error('[interaction] activity side effect failed:', err)
    return { name: 'activity', ok: false }
  }
}

async function maybeRunAutomation(event: InteractionEvent): Promise<InteractionSideEffectResult> {
  try {
    const tenantId = stringMeta(event, 'tenant_id')
    if (event.metadata.suppress_interaction_automation === true) {
      return { name: 'automation', ok: true }
    }
    if (!tenantId) return { name: 'automation', ok: true }

    if (event.action_type === 'send_inquiry') {
      try {
        const { triggerAutoResponse } = await import('@/lib/communication/auto-response')
        await triggerAutoResponse(event.target_id, tenantId)
      } catch {
        // Optional auto-reply only. Existing inquiry flows already run their own response hook.
      }
    }

    const { evaluateAutomations } = await import('@/lib/automations/engine')
    await evaluateAutomations(tenantId, 'interaction_executed' as any, {
      entityId: event.target_id,
      entityType: event.target_type,
      fields: {
        action_type: event.action_type,
        context_type: event.context_type,
        context_id: event.context_id,
      },
    })
    return { name: 'automation', ok: true }
  } catch (err) {
    console.error('[interaction] automation side effect failed:', err)
    return { name: 'automation', ok: false }
  }
}

function stringMeta(event: InteractionEvent, key: string): string | null {
  const value = event.metadata[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function inferActivityDomain(event: InteractionEvent): any {
  if (event.target_type === 'event') return 'event'
  if (event.target_type === 'menu') return 'menu'
  if (event.action_type.includes('quote')) return 'quote'
  if (event.action_type.includes('inquiry')) return 'inquiry'
  if (event.action_type.includes('message')) return 'communication'
  return 'operational'
}

function inferActivityAction(domain: any): any {
  if (domain === 'event') return 'event_updated'
  if (domain === 'menu') return 'menu_updated'
  if (domain === 'quote') return 'quote_updated'
  if (domain === 'inquiry') return 'inquiry_updated'
  if (domain === 'communication') return 'message_sent'
  return 'automation_rule_updated'
}

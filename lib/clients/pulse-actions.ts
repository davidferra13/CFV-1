'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ============================================
// CLIENT PULSE - "Who is waiting on me?"
// ============================================

export interface PulseItem {
  type: 'inquiry' | 'event' | 'quote' | 'followup' | 'comm' | 'prospect' | 'post_event' | 'draft'
  label: string
  detail: string
  daysWaiting: number
  urgency: 'critical' | 'overdue' | 'due' | 'ok'
  actionLabel: string
  /** Link to the relevant page */
  href: string
  entityId: string
}

export interface ClientPulse {
  clientId: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  preferredContact: string | null
  items: PulseItem[]
  /** Max urgency across all items */
  worstUrgency: 'critical' | 'overdue' | 'due' | 'ok'
  /** Total days the longest-waiting item has been stale */
  longestWaitDays: number
}

function urgencyRank(u: PulseItem['urgency']): number {
  return { critical: 0, overdue: 1, due: 2, ok: 3 }[u]
}

function daysBetween(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

/**
 * Get every client who is waiting on the chef, with what they're waiting for.
 * Groups by client, sorted by urgency (worst first).
 */
export async function getClientPulse(): Promise<ClientPulse[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Parallel fetch all signals
  const [inquiryRes, eventRes, quoteRes, commRes, prospectRes, postEventRes, draftRes] =
    await Promise.all([
      // 1. Inquiries needing chef action
      db
        .from('inquiries')
        .select(
          `
        id, status, confirmed_occasion, confirmed_date, contact_name, contact_email,
        updated_at, follow_up_due_at, next_action_by,
        client:clients(id, full_name, email, phone, preferred_contact_method)
      `
        )
        .eq('tenant_id', tenantId)
        .in('status', ['new', 'awaiting_chef', 'awaiting_client', 'quoted'])
        .is('deleted_at', null),

      // 2. Events in states that need chef action
      db
        .from('events')
        .select(
          `
        id, status, occasion, event_date, updated_at,
        client:client_id(id, full_name, email, phone, preferred_contact_method)
      `
        )
        .eq('tenant_id', tenantId)
        .in('status', ['draft', 'accepted', 'paid'])
        .is('deleted_at', null),

      // 3. Quotes sent but not responded to
      db
        .from('quotes')
        .select(
          `
        id, status, valid_until, total_quoted_cents, updated_at,
        inquiry:inquiry_id(confirmed_occasion),
        client:client_id(id, full_name, email, phone, preferred_contact_method)
      `
        )
        .eq('tenant_id', tenantId)
        .eq('status', 'sent')
        .eq('is_superseded', false),

      // 4. Unlinked inbound communications
      db
        .from('communication_events')
        .select(
          `
        id, source, subject, sender_name, sender_email, created_at, status,
        thread:conversation_threads(client_id, client:clients(id, full_name, email, phone, preferred_contact_method))
      `
        )
        .eq('tenant_id', tenantId)
        .eq('status', 'unlinked')
        .eq('direction', 'inbound')
        .order('created_at', { ascending: true }),

      // 5. Prospects needing follow-up
      db
        .from('prospects')
        .select(
          'id, name, phone, email, status, pipeline_stage, next_follow_up_at, last_called_at, created_at, contact_person'
        )
        .eq('chef_id', tenantId)
        .in('status', ['follow_up', 'new', 'queued', 'called'])
        .not('status', 'in', '("converted","dead","not_interested")'),

      // 6. Post-event follow-ups overdue
      db
        .from('events')
        .select(
          'id, occasion, event_date, updated_at, client:clients(id, full_name, email, phone, preferred_contact_method)'
        )
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .eq('follow_up_sent', false)
        .lt('updated_at', new Date(Date.now() - 24 * 3600000).toISOString())
        .order('updated_at', { ascending: true })
        .limit(20),

      // 7. Draft outbound messages not yet sent
      db
        .from('messages')
        .select(
          'id, subject, created_at, status, channel, inquiry_id, event_id, client:client_id(id, full_name, email, phone, preferred_contact_method)'
        )
        .eq('tenant_id', tenantId)
        .eq('direction', 'outbound')
        .in('status', ['draft', 'approved'])
        .order('created_at', { ascending: true }),
    ])

  const clientMap = new Map<string, ClientPulse>()

  function ensureClient(client: any, fallbackName?: string, fallbackEmail?: string): string {
    if (!client?.id) {
      // For inquiries without linked clients, use contact info
      const fakeId = `unlinked-${fallbackName || 'unknown'}`
      if (!clientMap.has(fakeId)) {
        clientMap.set(fakeId, {
          clientId: fakeId,
          clientName: fallbackName || 'Unknown Contact',
          clientEmail: fallbackEmail || null,
          clientPhone: null,
          preferredContact: null,
          items: [],
          worstUrgency: 'ok',
          longestWaitDays: 0,
        })
      }
      return fakeId
    }
    if (!clientMap.has(client.id)) {
      clientMap.set(client.id, {
        clientId: client.id,
        clientName: client.full_name || 'Unknown',
        clientEmail: client.email || null,
        clientPhone: client.phone || null,
        preferredContact: client.preferred_contact_method || null,
        items: [],
        worstUrgency: 'ok',
        longestWaitDays: 0,
      })
    }
    return client.id
  }

  // Process inquiries
  for (const inq of inquiryRes.data || []) {
    const clientId = ensureClient(inq.client, inq.contact_name, inq.contact_email)
    const days = daysBetween(inq.updated_at)
    const isChefTurn =
      inq.next_action_by === 'chef' || inq.status === 'new' || inq.status === 'awaiting_chef'

    // Only show inquiries where the chef needs to act
    if (!isChefTurn && inq.status !== 'quoted') continue

    let urgency: PulseItem['urgency'] = 'ok'
    let actionLabel = 'Review'

    if (inq.status === 'new') {
      urgency = days > 3 ? 'critical' : days > 1 ? 'overdue' : 'due'
      actionLabel = 'Respond to inquiry'
    } else if (inq.status === 'awaiting_chef') {
      urgency = days > 7 ? 'critical' : days > 3 ? 'overdue' : 'due'
      actionLabel = 'Reply to client'
    } else if (inq.status === 'quoted') {
      urgency = days > 14 ? 'overdue' : days > 7 ? 'due' : 'ok'
      actionLabel = 'Follow up on quote'
    }

    clientMap.get(clientId)!.items.push({
      type: 'inquiry',
      label: inq.confirmed_occasion || 'New inquiry',
      detail: `${inq.status.replace('_', ' ')} for ${days} day${days !== 1 ? 's' : ''}`,
      daysWaiting: days,
      urgency,
      actionLabel,
      href: `/inquiries/${inq.id}`,
      entityId: inq.id,
    })
  }

  // Process events needing chef action
  for (const evt of eventRes.data || []) {
    const clientId = ensureClient(evt.client)
    const days = daysBetween(evt.updated_at)

    let urgency: PulseItem['urgency'] = 'ok'
    let actionLabel = 'Review'
    let detail = ''

    if (evt.status === 'draft') {
      urgency = days > 7 ? 'critical' : days > 3 ? 'overdue' : 'ok'
      actionLabel = 'Send proposal'
      detail = `Draft sitting for ${days} day${days !== 1 ? 's' : ''}`
    } else if (evt.status === 'accepted') {
      urgency = days > 7 ? 'critical' : days > 3 ? 'overdue' : 'due'
      actionLabel = 'Collect payment'
      detail = `Accepted, awaiting payment for ${days} day${days !== 1 ? 's' : ''}`
    } else if (evt.status === 'paid') {
      urgency = days > 7 ? 'overdue' : 'ok'
      actionLabel = 'Confirm event'
      detail = `Paid, needs confirmation`
    }

    clientMap.get(clientId)!.items.push({
      type: 'event',
      label: evt.occasion || 'Event',
      detail,
      daysWaiting: days,
      urgency,
      actionLabel,
      href: `/events/${evt.id}`,
      entityId: evt.id,
    })
  }

  // Process quotes awaiting response
  for (const q of quoteRes.data || []) {
    if (!q.client) continue
    const clientId = ensureClient(q.client)
    const days = daysBetween(q.updated_at)
    const isExpiringSoon =
      q.valid_until && daysBetween(q.valid_until) < 0 && Math.abs(daysBetween(q.valid_until)) <= 3

    let urgency: PulseItem['urgency'] = days > 14 ? 'overdue' : days > 7 ? 'due' : 'ok'
    if (isExpiringSoon) urgency = 'critical'

    clientMap.get(clientId)!.items.push({
      type: 'quote',
      label: q.inquiry?.confirmed_occasion || 'Quote',
      detail: `Sent ${days} day${days !== 1 ? 's' : ''} ago`,
      daysWaiting: days,
      urgency,
      actionLabel: 'Follow up on quote',
      href: `/inquiries/${q.id}`,
      entityId: q.id,
    })
  }

  // Process unlinked inbound communications
  for (const comm of commRes.data || []) {
    const threadClient = comm.thread?.client || null
    const clientId = ensureClient(threadClient, comm.sender_name, comm.sender_email)
    const days = daysBetween(comm.created_at)

    let urgency: PulseItem['urgency'] = 'due'
    if (days > 3) urgency = 'critical'
    else if (days > 1) urgency = 'overdue'

    const sourceLabel = comm.source ? `${comm.source}: ` : ''
    clientMap.get(clientId)!.items.push({
      type: 'comm',
      label: `${sourceLabel}${comm.subject || 'Inbound message'}`,
      detail: `Unlinked message waiting ${days} day${days !== 1 ? 's' : ''}`,
      daysWaiting: days,
      urgency,
      actionLabel: 'Triage message',
      href: '/inbox',
      entityId: comm.id,
    })
  }

  // Process prospects needing follow-up
  for (const prospect of prospectRes.data || []) {
    const prospectKey = `prospect-${prospect.id}`
    if (!clientMap.has(prospectKey)) {
      clientMap.set(prospectKey, {
        clientId: prospectKey,
        clientName: prospect.contact_person || prospect.name || 'Unknown Prospect',
        clientEmail: prospect.email || null,
        clientPhone: prospect.phone || null,
        preferredContact: null,
        items: [],
        worstUrgency: 'ok',
        longestWaitDays: 0,
      })
    }

    let urgency: PulseItem['urgency'] = 'ok'
    let actionLabel = 'Follow up'
    let include = true

    if (prospect.status === 'follow_up' && prospect.next_follow_up_at) {
      const overdueDays = daysBetween(prospect.next_follow_up_at)
      if (overdueDays > 3) urgency = 'critical'
      else if (overdueDays > 1) urgency = 'overdue'
      else if (overdueDays >= 0) urgency = 'due'
      else include = false // follow-up is in the future
    } else if (prospect.status === 'new' || prospect.status === 'queued') {
      const ageDays = daysBetween(prospect.created_at)
      if (ageDays > 7) urgency = 'overdue'
      else if (ageDays > 3) urgency = 'due'
      else urgency = 'ok'
      actionLabel = 'Make first contact'
    } else if (prospect.status === 'called') {
      if (!prospect.last_called_at) {
        include = false
      } else {
        const sinceLast = daysBetween(prospect.last_called_at)
        if (sinceLast > 7) urgency = 'due'
        else include = false
      }
    }

    if (!include) continue

    const days = prospect.next_follow_up_at
      ? daysBetween(prospect.next_follow_up_at)
      : daysBetween(prospect.created_at)

    clientMap.get(prospectKey)!.items.push({
      type: 'prospect',
      label: prospect.contact_person || prospect.name || 'Prospect',
      detail: `${prospect.status.replace('_', ' ')} for ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`,
      daysWaiting: Math.abs(days),
      urgency,
      actionLabel,
      href: '/prospecting',
      entityId: prospect.id,
    })
  }

  // Process post-event follow-ups overdue
  for (const evt of postEventRes.data || []) {
    if (!evt.client) continue
    const clientId = ensureClient(evt.client)
    const days = daysBetween(evt.updated_at)

    let urgency: PulseItem['urgency'] = 'due'
    if (days > 7) urgency = 'critical'
    else if (days > 3) urgency = 'overdue'

    clientMap.get(clientId)!.items.push({
      type: 'post_event',
      label: evt.occasion || 'Completed event',
      detail: `Completed ${days} day${days !== 1 ? 's' : ''} ago, no follow-up sent`,
      daysWaiting: days,
      urgency,
      actionLabel: 'Send follow-up',
      href: `/events/${evt.id}`,
      entityId: evt.id,
    })
  }

  // Process draft outbound messages
  for (const msg of draftRes.data || []) {
    const clientId = ensureClient(msg.client)
    const days = daysBetween(msg.created_at)

    let urgency: PulseItem['urgency'] = 'ok'
    if (days > 3) urgency = 'overdue'
    else if (days > 1) urgency = 'due'

    const href = msg.inquiry_id
      ? `/inquiries/${msg.inquiry_id}`
      : msg.event_id
        ? `/events/${msg.event_id}`
        : '/inbox'

    clientMap.get(clientId)!.items.push({
      type: 'draft',
      label: msg.subject || 'Draft message',
      detail: `Draft sitting for ${days} day${days !== 1 ? 's' : ''}`,
      daysWaiting: days,
      urgency,
      actionLabel: 'Send message',
      href,
      entityId: msg.id,
    })
  }

  // Calculate worst urgency and longest wait per client, filter empty
  const results: ClientPulse[] = []
  for (const pulse of clientMap.values()) {
    if (pulse.items.length === 0) continue

    pulse.items.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency))
    pulse.worstUrgency = pulse.items[0].urgency
    pulse.longestWaitDays = Math.max(...pulse.items.map((i) => i.daysWaiting))
    results.push(pulse)
  }

  // Sort by worst urgency, then longest wait
  results.sort((a, b) => {
    const urgDiff = urgencyRank(a.worstUrgency) - urgencyRank(b.worstUrgency)
    if (urgDiff !== 0) return urgDiff
    return b.longestWaitDays - a.longestWaitDays
  })

  return results
}

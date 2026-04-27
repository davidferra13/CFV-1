'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

interface TouchpointReminder {
  clientId: string
  clientName: string
  type: 'birthday' | 'anniversary'
  date: string
  daysUntil: number
}

/**
 * Returns upcoming client touchpoints (birthdays and first-event anniversaries)
 * within the next 14 days. Tenant-scoped, no AI.
 */
export async function getUpcomingTouchpointReminders(): Promise<TouchpointReminder[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: clients, error } = await db
    .from('clients')
    .select('id, full_name, birthday')
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to load clients: ${error.message}`)
  if (!clients || clients.length === 0) return []

  const now = new Date()
  const reminders: TouchpointReminder[] = []

  for (const client of clients) {
    const name = client.full_name || 'Client'

    // Birthday check
    if (client.birthday) {
      const dob = new Date(client.birthday)
      const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
      if (thisYearBday < now) {
        thisYearBday.setFullYear(thisYearBday.getFullYear() + 1)
      }
      const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil <= 14) {
        const dateStr = `${thisYearBday.getFullYear()}-${String(thisYearBday.getMonth() + 1).padStart(2, '0')}-${String(thisYearBday.getDate()).padStart(2, '0')}`
        reminders.push({
          clientId: client.id,
          clientName: name,
          type: 'birthday',
          date: dateStr,
          daysUntil,
        })
      }
    }
  }

  // Anniversary check: find each client's first event date
  const clientIds = clients.map((c: { id: string }) => c.id)
  if (clientIds.length > 0) {
    const { data: events } = await db
      .from('events')
      .select('client_id, event_date')
      .eq('tenant_id', tenantId)
      .in('client_id', clientIds)
      .order('event_date', { ascending: true })

    if (events && events.length > 0) {
      // Find the first event per client
      const firstEventByClient: Record<string, string> = {}
      for (const ev of events) {
        if (ev.client_id && ev.event_date && !firstEventByClient[ev.client_id]) {
          firstEventByClient[ev.client_id] = ev.event_date
        }
      }

      for (const [clientId, firstDate] of Object.entries(firstEventByClient)) {
        const first = new Date(firstDate)
        const yearsAgo = now.getFullYear() - first.getFullYear()
        if (yearsAgo < 1) continue // no anniversary in the first year

        const anniversaryThisYear = new Date(now.getFullYear(), first.getMonth(), first.getDate())
        if (anniversaryThisYear < now) {
          anniversaryThisYear.setFullYear(anniversaryThisYear.getFullYear() + 1)
        }
        const daysUntil = Math.ceil(
          (anniversaryThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysUntil <= 14) {
          const client = clients.find((c: { id: string }) => c.id === clientId)
          const name = client?.full_name || 'Client'
          reminders.push({
            clientId,
            clientName: name,
            type: 'anniversary',
            date: `${anniversaryThisYear.getFullYear()}-${String(anniversaryThisYear.getMonth() + 1).padStart(2, '0')}-${String(anniversaryThisYear.getDate()).padStart(2, '0')}`,
            daysUntil,
          })
        }
      }
    }
  }

  // Sort by days until (soonest first)
  reminders.sort((a, b) => a.daysUntil - b.daysUntil)

  return reminders
}

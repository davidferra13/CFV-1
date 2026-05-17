import { inngest } from './inngest-client'
import { createAdminClient } from '@/lib/db/admin'
import { createLogger } from '@/lib/logger'

const log = createLogger('cannabis-closeout')

export const postEventCannabisCloseout = inngest.createFunction(
  {
    id: 'post-event-cannabis-closeout-check',
    name: 'Cannabis Event Closeout Check',
    retries: 2,
  },
  { event: 'chefflow/event.completed' },
  async ({ event, step }) => {
    const { eventId, tenantId } = event.data

    const needsCloseout = await step.run('check-cannabis-closeout', async () => {
      const db: any = createAdminClient()

      const { data: ev } = await db
        .from('events')
        .select('id, cannabis_preference, tenant_id')
        .eq('id', eventId)
        .single()

      if (!ev || !ev.cannabis_preference) {
        return { isCannabis: false as const, hasCloseout: false, snapshotExists: false }
      }

      const { data: snapshot } = await db
        .from('cannabis_control_packet_snapshots')
        .select('id, finalization_locked')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: reconciliation } = snapshot?.id
        ? await db
            .from('cannabis_control_packet_reconciliations')
            .select('id')
            .eq('snapshot_id', snapshot.id)
            .maybeSingle()
        : { data: null }

      const hasCloseout = !!snapshot?.finalization_locked || !!reconciliation

      return { isCannabis: true, hasCloseout, snapshotExists: !!snapshot }
    })

    if (!needsCloseout.isCannabis) {
      return { skipped: true, reason: 'not_cannabis_event' }
    }

    if (needsCloseout.hasCloseout) {
      log.info('Cannabis closeout already complete', { context: { eventId } })
      return { skipped: true, reason: 'already_closed_out' }
    }

    await step.sleep('wait-for-manual-closeout', '2d')

    const stillMissing = await step.run('recheck-closeout', async () => {
      const db: any = createAdminClient()

      const { data: snapshot } = await db
        .from('cannabis_control_packet_snapshots')
        .select('id, finalization_locked')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: reconciliation } = snapshot?.id
        ? await db
            .from('cannabis_control_packet_reconciliations')
            .select('id')
            .eq('snapshot_id', snapshot.id)
            .maybeSingle()
        : { data: null }

      return !(snapshot?.finalization_locked || !!reconciliation)
    })

    if (stillMissing) {
      await step.run('notify-closeout-needed', async () => {
        const db: any = createAdminClient()

        const { data: chefRole } = await db
          .from('user_roles')
          .select('auth_user_id')
          .eq('entity_id', tenantId)
          .eq('role', 'chef')
          .limit(1)
          .single()

        if (chefRole?.auth_user_id) {
          const { notifyCannabisCloseoutPending } = await import('@/lib/cannabis/notifications')
          await notifyCannabisCloseoutPending({
            recipientId: chefRole.auth_user_id,
            tenantId,
            eventId,
          })
        }

        log.warn('Cannabis event missing closeout documentation', {
          context: { eventId, tenantId },
        })
      })
    }

    return { notified: stillMissing }
  }
)

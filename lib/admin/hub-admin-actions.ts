'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import {
  ensureEventDinnerCircle,
  getGuestVisibleEventsMissingDinnerCircles,
} from '@/lib/hub/integration-actions'

export async function backfillGuestVisibleDinnerCircles() {
  await requireAdmin()

  const report = await getGuestVisibleEventsMissingDinnerCircles()
  let repaired = 0

  for (const event of report.events) {
    await ensureEventDinnerCircle({
      eventId: event.eventId,
      tenantId: event.tenantId,
      eventTitle: event.occasion || 'Dinner Circle',
    })
    repaired += 1
  }

  revalidatePath('/admin/hub')
  redirect(`/admin/hub?backfilled=${repaired}`)
}

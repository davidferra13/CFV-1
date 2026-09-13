import { z } from 'zod'

export const TodayServeTimeSchema = z.object({
  eventId: z.string().uuid(),
  serveTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid serve time.'),
})

export type TodayServeTimeInput = z.infer<typeof TodayServeTimeSchema>

const EDITABLE_STATUSES = new Set(['draft', 'proposed', 'accepted', 'paid', 'confirmed'])

export function canEditServeTimeFromToday(status: string): boolean {
  return EDITABLE_STATUSES.has(status)
}

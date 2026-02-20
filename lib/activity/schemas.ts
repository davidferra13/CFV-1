import { z } from 'zod'
import { ACTIVITY_EVENT_TYPES } from './types'

export const activityTrackPayloadSchema = z.object({
  event_type: z.enum(ACTIVITY_EVENT_TYPES),
  entity_type: z.string().trim().min(1).max(64).optional(),
  entity_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

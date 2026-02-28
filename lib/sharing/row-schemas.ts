import { z } from 'zod'

export const EventShareSettingsRowSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  token: z.string().optional(),
  is_active: z.boolean(),
  expires_at: z.string().datetime().nullable(),
  visibility_settings: z.record(z.string(), z.boolean()).nullable().optional(),
  require_join_approval: z.boolean().nullable().optional(),
  rsvp_deadline_at: z.string().datetime().nullable().optional(),
  reminders_enabled: z.boolean().nullable().optional(),
  reminder_schedule: z.array(z.string()).nullable().optional(),
  enforce_capacity: z.boolean().nullable().optional(),
  waitlist_enabled: z.boolean().nullable().optional(),
  max_capacity: z.number().int().positive().nullable().optional(),
})

export const EventGuestRowSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  event_share_id: z.string().uuid(),
  guest_token: z.string(),
  full_name: z.string(),
  email: z.string().email().nullable(),
  rsvp_status: z.string(),
  dietary_restrictions: z.array(z.string()).nullable().optional(),
  allergies: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
  plus_one: z.boolean().nullable().optional(),
  plus_one_name: z.string().nullable().optional(),
  plus_one_allergies: z.array(z.string()).nullable().optional(),
  plus_one_dietary: z.array(z.string()).nullable().optional(),
  attendance_queue_status: z.enum(['none', 'waitlisted', 'promoted']).optional().nullable(),
  waitlisted_at: z.string().datetime().nullable().optional(),
  promoted_at: z.string().datetime().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type EventShareSettingsRow = z.infer<typeof EventShareSettingsRowSchema>
export type EventGuestRow = z.infer<typeof EventGuestRowSchema>

import { z } from 'zod'

export const FRONT_OF_HOUSE_EVENT_TYPES = [
  'regular_menu',
  'birthday',
  'bachelorette_party',
  'anniversary',
  'holiday',
  'corporate_event',
] as const

export const FRONT_OF_HOUSE_THEMES = [
  'Christmas',
  'Hanukkah',
  "Valentine's Day",
  'Easter',
  'Halloween',
  'Birthday',
  'Bachelorette Party',
  'Anniversary',
  'Corporate Event',
] as const

export const FrontOfHouseTemplateTypeSchema = z.enum(['default', 'holiday', 'special_event'])
export const FrontOfHouseEventTypeSchema = z.enum(FRONT_OF_HOUSE_EVENT_TYPES)

export const MenuTemplateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  type: FrontOfHouseTemplateTypeSchema,
  layout: z.record(z.string(), z.any()).default({}),
  placeholders: z.array(z.string()).default([]),
  styles: z.record(z.string(), z.any()).default({}),
  default_fields: z.record(z.string(), z.boolean()).default({}),
  event_type: FrontOfHouseEventTypeSchema.optional().nullable(),
  theme: z.string().optional().nullable(),
  is_system: z.boolean().optional(),
})

export const FrontOfHouseContextSchema = z.object({
  hostName: z.string().trim().optional(),
  theme: z.string().trim().optional(),
  specialNote: z.string().trim().optional(),
  customStamp: z.string().trim().optional(),
  eventType: FrontOfHouseEventTypeSchema.optional(),
  chefName: z.string().trim().optional(),
  winePairing: z.string().trim().optional(),
  date: z.string().trim().optional(),
})

export type FrontOfHouseTemplateType = z.infer<typeof FrontOfHouseTemplateTypeSchema>
export type FrontOfHouseEventType = z.infer<typeof FrontOfHouseEventTypeSchema>
export type MenuTemplateDefinition = z.infer<typeof MenuTemplateSchema>
export type FrontOfHouseContext = z.infer<typeof FrontOfHouseContextSchema>

export const MENU_TEMPLATE_PLACEHOLDERS = [
  'chefName',
  'date',
  'hostName',
  'theme',
  'winePairing',
  'specialNote',
  'customStamp',
] as const

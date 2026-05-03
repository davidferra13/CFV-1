// Brain Dump Intent Schema
// Zod schemas for multi-intent extraction from chef brain dumps.
// No 'use server' - pure types/schemas, importable anywhere.

import { z } from 'zod'

// ─── Individual Intent Schemas ──────────────────────────────────────────────

export const EventIntentSchema = z.object({
  type: z.literal('event_info'),
  date: z.string().optional().describe('Event date (any format)'),
  time: z.string().optional().describe('Event time'),
  location: z.string().optional().describe('Event location/venue'),
  guestCount: z.number().optional().describe('Number of guests'),
  eventType: z.string().optional().describe('dinner, brunch, tasting, etc.'),
  clientName: z.string().optional().describe('Client name if mentioned'),
  budget: z.number().optional().describe('Budget per head or total, in dollars'),
  notes: z.string().optional().describe('Additional event context'),
  isNewEvent: z.boolean().describe('True if creating new, false if updating existing'),
})

export const ClientIntentSchema = z.object({
  type: z.literal('client_info'),
  clientName: z.string().describe('Client name'),
  action: z.enum(['create', 'update']).describe('Create new or update existing'),
  dietary: z.array(z.string()).optional().describe('Dietary restrictions'),
  allergies: z.array(z.string()).optional().describe('Allergies (safety-critical)'),
  preferences: z.string().optional().describe('Food preferences, style notes'),
  householdMembers: z.array(z.string()).optional().describe('Family/household names'),
  contactInfo: z.string().optional().describe('Email, phone, address'),
  notes: z.string().optional().describe('Vibe notes, relationship context'),
})

export const MenuIntentSchema = z.object({
  type: z.literal('menu_intent'),
  dishes: z.array(z.string()).describe('Dish names mentioned'),
  courses: z
    .array(
      z.object({
        course: z.string().describe('appetizer, main, dessert, etc.'),
        dishes: z.array(z.string()),
      })
    )
    .optional()
    .describe('Course structure if mentioned'),
  theme: z.string().optional().describe('Mediterranean, French, seasonal, etc.'),
  constraints: z.array(z.string()).optional().describe('GF, dairy-free, pescatarian, etc.'),
  forEvent: z.string().optional().describe('Which event this menu is for'),
  notes: z.string().optional().describe('Menu context, pairing ideas'),
})

export const ShoppingIntentSchema = z.object({
  type: z.literal('shopping_items'),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string().optional(),
      store: z.string().optional().describe('Where to buy'),
      priority: z.enum(['need', 'want', 'check']).optional(),
    })
  ),
  forEvent: z.string().optional(),
  notes: z.string().optional(),
})

export const PrepIntentSchema = z.object({
  type: z.literal('prep_task'),
  tasks: z.array(
    z.object({
      task: z.string().describe('What to prep'),
      when: z.string().optional().describe('When to do it: day before, morning of, etc.'),
      duration: z.string().optional().describe('How long it takes'),
      notes: z.string().optional(),
    })
  ),
  forEvent: z.string().optional(),
})

export const TimelineIntentSchema = z.object({
  type: z.literal('timeline_item'),
  entries: z.array(
    z.object({
      time: z.string().optional().describe('Time or relative timing'),
      activity: z.string().describe('What happens'),
      duration: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
  forEvent: z.string().optional(),
})

export const TaskIntentSchema = z.object({
  type: z.literal('task'),
  description: z.string().describe('What needs to be done'),
  deadline: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  assignee: z.string().optional(),
  forEvent: z.string().optional(),
})

export const CommunicationIntentSchema = z.object({
  type: z.literal('communication'),
  action: z.enum(['follow_up', 'send_proposal', 'confirm', 'thank', 'decline', 'remind']),
  recipientName: z.string().describe('Who to communicate with'),
  content: z.string().optional().describe('Key points to include'),
  urgency: z.enum(['now', 'soon', 'when_ready']).optional(),
})

export const StaffIntentSchema = z.object({
  type: z.literal('staff_action'),
  action: z.enum(['add', 'assign', 'record_hours']).describe('What to do with staff'),
  staffName: z.string().describe('Staff member name'),
  role: z.string().optional().describe('sous_chef, server, bartender, etc.'),
  hourlyRate: z.number().optional().describe('Pay rate in dollars'),
  forEvent: z.string().optional().describe('Which event to assign to'),
  hours: z.number().optional().describe('Hours worked or scheduled'),
  notes: z.string().optional(),
})

export const QuoteIntentSchema = z.object({
  type: z.literal('quote_action'),
  action: z.enum(['create', 'send', 'update']).describe('Quote action'),
  clientName: z.string().describe('Client to quote'),
  totalDollars: z.number().optional().describe('Total quote amount in dollars'),
  perPersonDollars: z.number().optional().describe('Per-person price in dollars'),
  guestCount: z.number().optional(),
  depositPercentage: z.number().optional(),
  pricingModel: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
  notes: z.string().optional(),
})

export const EquipmentIntentSchema = z.object({
  type: z.literal('equipment_action'),
  action: z.enum(['add', 'maintain']).describe('Add equipment or log maintenance'),
  name: z.string().describe('Equipment name'),
  category: z.string().optional().describe('cookware, knives, appliances, etc.'),
  priceDollars: z.number().optional().describe('Purchase price in dollars'),
  notes: z.string().optional(),
})

export const NoteIntentSchema = z.object({
  type: z.literal('note'),
  content: z.string().describe('The note content'),
  category: z.enum([
    'event_idea',
    'business_note',
    'client_note',
    'scheduling',
    'sourcing',
    'general',
  ]),
  attachToEvent: z.string().optional(),
  attachToClient: z.string().optional(),
})

// ─── Combined Schema ────────────────────────────────────────────────────────

export const BrainDumpIntentSchema = z.discriminatedUnion('type', [
  EventIntentSchema,
  ClientIntentSchema,
  MenuIntentSchema,
  ShoppingIntentSchema,
  PrepIntentSchema,
  TimelineIntentSchema,
  TaskIntentSchema,
  CommunicationIntentSchema,
  StaffIntentSchema,
  QuoteIntentSchema,
  EquipmentIntentSchema,
  NoteIntentSchema,
])

export type BrainDumpIntent = z.infer<typeof BrainDumpIntentSchema>

// ─── Full Extraction Result ─────────────────────────────────────────────────

export const BrainDumpExtractionSchema = z.object({
  intents: z.array(BrainDumpIntentSchema),
  unstructured: z.array(z.string()).default([]).describe('Anything that could not be classified'),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([]).describe('Ambiguities, missing info, conflicts'),
})

export type BrainDumpExtraction = z.infer<typeof BrainDumpExtractionSchema>

// ─── Intent to Command Mapping ──────────────────────────────────────────────

export const INTENT_TO_COMMAND_MAP: Record<
  BrainDumpIntent['type'],
  {
    commands: string[]
    defaultTier: 1 | 2 | 3
    description: string
  }
> = {
  event_info: {
    commands: ['event.create_draft', 'event.update'],
    defaultTier: 2,
    description: 'Create or update event',
  },
  client_info: {
    commands: ['client.create', 'client.update'],
    defaultTier: 2,
    description: 'Create or update client',
  },
  menu_intent: {
    commands: ['menu.create', 'menu.add_dishes'],
    defaultTier: 2,
    description: 'Create menu or add dishes',
  },
  shopping_items: {
    commands: ['grocery.quick_add', 'shopping.generate'],
    defaultTier: 1,
    description: 'Add items to shopping list',
  },
  prep_task: {
    commands: ['prep.create_task', 'prep.timeline'],
    defaultTier: 1,
    description: 'Create prep tasks or timeline',
  },
  timeline_item: {
    commands: ['timeline.create', 'timeline.add_entry'],
    defaultTier: 1,
    description: 'Build day-of timeline',
  },
  task: {
    commands: ['todo.create'],
    defaultTier: 1,
    description: 'Create a task/todo',
  },
  communication: {
    commands: ['draft.email', 'email.followup'],
    defaultTier: 3,
    description: 'Draft or send communication',
  },
  note: {
    commands: ['memory.save'],
    defaultTier: 1,
    description: 'Save a note or memory',
  },
  staff_action: {
    commands: ['staff.create', 'staff.assign', 'staff.record_hours'],
    defaultTier: 2,
    description: 'Add, assign, or track staff',
  },
  quote_action: {
    commands: ['quote.create', 'quote.transition'],
    defaultTier: 3,
    description: 'Create or manage quotes',
  },
  equipment_action: {
    commands: ['equipment.create', 'equipment.log_maintenance'],
    defaultTier: 2,
    description: 'Add equipment or log maintenance',
  },
}

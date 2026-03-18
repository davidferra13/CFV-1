/**
 * Shared Zod validation schemas
 * Import from here instead of re-defining per-file.
 * This file has NO 'use server' directive - safe to import in both server and client code.
 */

import { z } from 'zod'

// ─── Primitives ────────────────────────────────────────────────────────────

export const UuidSchema = z.string().uuid('Must be a valid UUID')

export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')

// PostgreSQL INTEGER max is 2,147,483,647. Cap to 10M dollars (1,000,000,000 cents)
// to prevent overflow in arithmetic operations (e.g., subtotal + tax + tip).
const MAX_CENTS = 1_000_000_000 // $10,000,000 - more than any single event will ever cost

export const CentsSchema = z
  .number()
  .int('Amount must be in whole cents (no decimals)')
  .nonnegative('Amount must not be negative')
  .max(MAX_CENTS, 'Amount exceeds maximum allowed value')

export const PositiveCentsSchema = z
  .number()
  .int('Amount must be in whole cents')
  .positive('Amount must be greater than zero')
  .max(MAX_CENTS, 'Amount exceeds maximum allowed value')

export const PhoneSchema = z
  .string()
  .regex(/^[+\d\s\-().]{7,20}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''))

// ─── Event FSM ─────────────────────────────────────────────────────────────

export const EventStatusSchema = z.enum([
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
])
export type EventStatus = z.infer<typeof EventStatusSchema>

export const TransitionActorSchema = z.enum(['chef', 'client', 'system'])
export type TransitionActor = z.infer<typeof TransitionActorSchema>

/** Input schema for transitionEvent() */
export const TransitionEventInputSchema = z.object({
  eventId: UuidSchema,
  toStatus: EventStatusSchema,
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  systemTransition: z.boolean().optional().default(false),
})
export type TransitionEventInput = z.infer<typeof TransitionEventInputSchema>

// ─── Event CRUD ─────────────────────────────────────────────────────────────

export const GuestCountSchema = z.number().int().min(1).max(10_000)

export const ServiceTypeSchema = z.enum([
  'private_chef',
  'catering',
  'meal_prep',
  'cooking_class',
  'personal_chef',
  'other',
])

export const EventBaseSchema = z.object({
  occasion: z.string().min(1).max(200),
  event_date: DateStringSchema,
  serve_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format')
    .optional(),
  guest_count: GuestCountSchema,
  location: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  service_type: ServiceTypeSchema.optional(),
  budget_cents: CentsSchema.optional(),
})

// ─── Client CRUD ─────────────────────────────────────────────────────────────

export const ClientBaseSchema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: PhoneSchema,
  notes: z.string().max(5000).optional(),
})

// ─── Ledger ─────────────────────────────────────────────────────────────────

export const EntryTypeSchema = z.enum([
  'payment',
  'deposit',
  'refund',
  'adjustment',
  'expense',
  'tip',
])

export const LedgerEntrySchema = z.object({
  eventId: UuidSchema,
  tenantId: UuidSchema,
  entryType: EntryTypeSchema,
  amountCents: PositiveCentsSchema,
  transactionReference: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  createdBy: UuidSchema.nullable().optional(),
})

// ─── Inquiry ────────────────────────────────────────────────────────────────

export const InquiryStatusSchema = z.enum([
  'new',
  'reviewing',
  'quoted',
  'negotiating',
  'accepted',
  'rejected',
  'expired',
  'converted',
])

// ─── Automation ─────────────────────────────────────────────────────────────

export const AutomationTriggerSchema = z.enum([
  'event_status_changed',
  'inquiry_received',
  'quote_sent',
  'payment_received',
  'event_date_approaching',
  'event_completed',
  'client_birthday',
])

export const AutomationExecutionInputSchema = z.object({
  tenantId: UuidSchema,
  automationId: UuidSchema,
  trigger: AutomationTriggerSchema,
  entityId: UuidSchema,
  entityType: z.enum(['event', 'inquiry', 'quote', 'client']),
  idempotencyKey: z.string().min(1).max(255),
})

// ─── Utility ────────────────────────────────────────────────────────────────

/**
 * Wraps a Zod parse result in a Result type for non-throwing validation.
 * Use when you want to return an error to the caller rather than throw.
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(input)
  if (result.success) return { success: true, data: result.data }
  const firstError = result.error.issues[0]
  return {
    success: false,
    error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Validation failed',
  }
}

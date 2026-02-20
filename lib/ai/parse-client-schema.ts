// Parsed Client Schema
// Lives in a separate file (no 'use server') so the Zod schema and its inferred
// types can be imported by other server action files and client components alike.

import { z } from 'zod'

const FieldConfidenceSchema = z.enum(['confirmed', 'inferred', 'unknown'])

export const ParsedClientSchema = z.object({
  parsed: z.object({
    full_name: z.string().min(1),
    email: z.string().nullable().default(null),
    phone: z.string().nullable().default(null),
    partner_name: z.string().nullable().default(null),
    address: z.string().nullable().default(null),
    dietary_restrictions: z.array(z.string()).default([]),
    allergies: z.array(z.string()).default([]),
    dislikes: z.array(z.string()).default([]),
    spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).nullable().default(null),
    favorite_cuisines: z.array(z.string()).default([]),
    favorite_dishes: z.array(z.string()).default([]),
    preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).nullable().default(null),
    referral_source: z.enum(['take_a_chef', 'instagram', 'referral', 'website', 'phone', 'email', 'other']).nullable().default(null),
    referral_source_detail: z.string().nullable().default(null),
    regular_guests: z.array(z.object({
      name: z.string(),
      relationship: z.string().default(''),
      notes: z.string().default('')
    })).default([]),
    household_members: z.array(z.object({
      name: z.string(),
      relationship: z.string().default(''),
      notes: z.string().default('')
    })).default([]),
    addresses: z.array(z.object({
      label: z.string().default(''),
      address: z.string(),
      city: z.string().default(''),
      state: z.string().default(''),
      zip: z.string().default(''),
      notes: z.string().default('')
    })).default([]),
    parking_instructions: z.string().nullable().default(null),
    access_instructions: z.string().nullable().default(null),
    kitchen_size: z.string().nullable().default(null),
    kitchen_constraints: z.string().nullable().default(null),
    house_rules: z.string().nullable().default(null),
    equipment_available: z.array(z.string()).default([]),
    equipment_must_bring: z.array(z.string()).default([]),
    vibe_notes: z.string().nullable().default(null),
    what_they_care_about: z.string().nullable().default(null),
    wine_beverage_preferences: z.string().nullable().default(null),
    average_spend_cents: z.number().nullable().default(null),
    payment_behavior: z.string().nullable().default(null),
    tipping_pattern: z.string().nullable().default(null),
    status: z.enum(['active', 'dormant', 'repeat_ready', 'vip']).default('active'),
    children: z.array(z.string()).default([]),
    farewell_style: z.string().nullable().default(null),
    personal_milestones: z.any().nullable().default(null),
    field_confidence: z.record(z.string(), FieldConfidenceSchema).default({}),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([])
})

export type ParsedClient = z.infer<typeof ParsedClientSchema>['parsed']

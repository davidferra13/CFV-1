// Parsed Recipe Schema
// Lives in a separate file (no 'use server') so the Zod schema and its inferred
// types can be imported by other server action files and client components alike.

import { z } from 'zod'

const RECIPE_CATEGORIES = [
  'sauce', 'protein', 'starch', 'vegetable', 'fruit', 'dessert',
  'bread', 'pasta', 'soup', 'salad', 'appetizer', 'condiment',
  'beverage', 'other'
] as const

const ParsedIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().default(1),
  unit: z.string().default('unit'),
  preparation_notes: z.string().nullable().default(null),
  is_optional: z.boolean().default(false),
  estimated: z.boolean().default(false),
  category: z.enum([
    'protein', 'produce', 'dairy', 'pantry', 'spice', 'oil',
    'alcohol', 'baking', 'frozen', 'canned', 'fresh_herb',
    'dry_herb', 'condiment', 'beverage', 'specialty', 'other'
  ]).default('other'),
  allergen_flags: z.array(z.string()).default([])
})

export type ParsedIngredient = z.infer<typeof ParsedIngredientSchema>

export const ParsedRecipeSchema = z.object({
  parsed: z.object({
    name: z.string().min(1),
    category: z.enum(RECIPE_CATEGORIES),
    description: z.string().nullable().default(null),
    method: z.string().min(1),
    method_detailed: z.string().nullable().default(null),
    ingredients: z.array(ParsedIngredientSchema).default([]),
    yield_quantity: z.number().nullable().default(null),
    yield_unit: z.string().nullable().default(null),
    yield_description: z.string().nullable().default(null),
    prep_time_minutes: z.number().nullable().default(null),
    cook_time_minutes: z.number().nullable().default(null),
    total_time_minutes: z.number().nullable().default(null),
    dietary_tags: z.array(z.string()).default([]),
    allergen_flags: z.array(z.string()).default([]),
    adaptations: z.string().nullable().default(null),
    notes: z.string().nullable().default(null),
    field_confidence: z.record(z.string(), z.enum(['confirmed', 'inferred', 'unknown'])).default({})
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([])
})

export type ParsedRecipe = z.infer<typeof ParsedRecipeSchema>['parsed']

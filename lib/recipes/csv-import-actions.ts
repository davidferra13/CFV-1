'use server'

// CSV Bulk Recipe Import
// Parses a CSV file/text and bulk-inserts recipes + ingredients.
// No AI required: pure column mapping + existing ingredient-parser.
//
// Expected columns (case-insensitive, order does not matter):
//   name        (required)
//   category    (optional: protein|vegetable|pasta|sauce|soup|salad|dessert|bread|beverage|condiment|other)
//   description (optional)
//   method      (optional, also accepted: instructions|steps|directions)
//   ingredients (optional, pipe-separated: "2 cups flour|1 tsp salt|3 eggs")
//   prep_time   (optional, minutes - also: prep_time_min|prep_minutes)
//   cook_time   (optional, minutes - also: cook_time_min|cook_minutes)
//   yield       (optional, text description - also: serves|servings|yield_description)
//
// Rows with an empty name are skipped silently.

import { parse as parseCsv } from 'csv-parse/sync'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { parseIngredientString } from './ingredient-parser'
import type { Database } from '@/types/database'

type RecipeCategory = Database['public']['Enums']['recipe_category']
type IngredientCategory = Database['public']['Enums']['ingredient_category']

// ============================================
// TYPES
// ============================================

export type CsvRecipeRow = {
  name: string
  category: RecipeCategory
  description: string | null
  method: string | null
  rawIngredients: string[]
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  yieldDescription: string | null
}

export type CsvImportPreview = {
  rows: CsvRecipeRow[]
  skippedCount: number
  warnings: string[]
}

export type CsvImportResult =
  | {
      success: true
      importedCount: number
      skippedCount: number
      errors: string[]
    }
  | {
      success: false
      error: string
    }

// ============================================
// CATEGORY MAPPING
// ============================================

const VALID_CATEGORIES = new Set<RecipeCategory>([
  'protein',
  'vegetable',
  'pasta',
  'sauce',
  'soup',
  'salad',
  'dessert',
  'bread',
  'beverage',
  'condiment',
  'appetizer',
  'other',
])

const CATEGORY_ALIASES: Record<string, RecipeCategory> = {
  meat: 'protein',
  fish: 'protein',
  seafood: 'protein',
  poultry: 'protein',
  main: 'protein',
  'main course': 'protein',
  entree: 'protein',
  dinner: 'protein',
  lunch: 'protein',
  veg: 'vegetable',
  veggies: 'vegetable',
  noodle: 'pasta',
  noodles: 'pasta',
  stew: 'soup',
  chowder: 'soup',
  dip: 'sauce',
  dressing: 'sauce',
  marinade: 'sauce',
  cake: 'dessert',
  cookies: 'dessert',
  pie: 'dessert',
  pastry: 'dessert',
  baking: 'bread',
  roll: 'bread',
  rolls: 'bread',
  cocktail: 'beverage',
  drink: 'beverage',
  drinks: 'beverage',
  condiments: 'condiment',
  starter: 'appetizer',
  starters: 'appetizer',
  appetizers: 'appetizer',
}

function parseCategory(raw: string | undefined | null): RecipeCategory {
  if (!raw) return 'other'
  const lower = raw.toLowerCase().trim()
  if (VALID_CATEGORIES.has(lower as RecipeCategory)) return lower as RecipeCategory
  return CATEGORY_ALIASES[lower] ?? 'other'
}

// ============================================
// COLUMN NAME NORMALIZATION
// ============================================

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
}

function findColumn(row: Record<string, string>, ...aliases: string[]): string | null {
  for (const alias of aliases) {
    const key = Object.keys(row).find((k) => normalizeHeader(k) === alias)
    if (key !== undefined && row[key]?.trim()) return row[key].trim()
  }
  return null
}

function parseMinutes(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) || n <= 0 ? null : n
}

// ============================================
// STEP 1: PARSE + PREVIEW (no DB writes)
// ============================================

export async function parseCsvForPreview(
  csvText: string
): Promise<{ success: true; preview: CsvImportPreview } | { success: false; error: string }> {
  await requireChef()

  if (!csvText?.trim()) {
    return { success: false, error: 'CSV is empty.' }
  }

  let rawRows: Record<string, string>[]
  try {
    rawRows = parseCsv(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[]
  } catch (err) {
    return {
      success: false,
      error: `Could not parse CSV: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }

  if (rawRows.length === 0) {
    return { success: false, error: 'No data rows found. Check your CSV has a header row.' }
  }

  const rows: CsvRecipeRow[] = []
  const warnings: string[] = []
  let skippedCount = 0

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]
    const rowNum = i + 2 // +2 for 1-based + header

    const name = findColumn(row, 'name', 'recipe_name', 'title', 'recipe')
    if (!name) {
      skippedCount++
      continue
    }

    const categoryRaw = findColumn(row, 'category', 'type', 'course', 'recipe_category')
    const category = parseCategory(categoryRaw)
    if (categoryRaw && category === 'other' && categoryRaw.toLowerCase() !== 'other') {
      warnings.push(`Row ${rowNum}: "${categoryRaw}" mapped to "other"`)
    }

    const description = findColumn(row, 'description', 'notes', 'note', 'summary')

    const method = findColumn(
      row,
      'method',
      'instructions',
      'steps',
      'directions',
      'recipe_instructions',
      'preparation'
    )

    const ingredientsRaw = findColumn(row, 'ingredients', 'ingredient_list', 'ingredient')
    const rawIngredients = ingredientsRaw
      ? ingredientsRaw
          .split(/[|;]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    const prepTimeMinutes = parseMinutes(
      findColumn(row, 'prep_time', 'prep_time_min', 'prep_minutes', 'prep')
    )
    const cookTimeMinutes = parseMinutes(
      findColumn(row, 'cook_time', 'cook_time_min', 'cook_minutes', 'cook')
    )

    const yieldDescription = findColumn(
      row,
      'yield',
      'serves',
      'servings',
      'yield_description',
      'portions'
    )

    rows.push({
      name,
      category,
      description: description || null,
      method: method || null,
      rawIngredients,
      prepTimeMinutes,
      cookTimeMinutes,
      yieldDescription: yieldDescription || null,
    })
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: `No valid rows found (${skippedCount} rows skipped for missing name).`,
    }
  }

  return {
    success: true,
    preview: { rows, skippedCount, warnings },
  }
}

// ============================================
// STEP 2: IMPORT (DB writes)
// ============================================

export async function importCsvRecipes(rows: CsvRecipeRow[]): Promise<CsvImportResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!rows?.length) {
    return { success: false, error: 'No rows to import.' }
  }

  let importedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    try {
      // Create the recipe
      const { data: recipe, error: recipeError } = await db
        .from('recipes')
        .insert({
          tenant_id: user.tenantId!,
          name: row.name,
          category: row.category,
          method: row.method || '',
          description: row.description || null,
          prep_time_minutes: row.prepTimeMinutes || null,
          cook_time_minutes: row.cookTimeMinutes || null,
          total_time_minutes:
            row.prepTimeMinutes && row.cookTimeMinutes
              ? row.prepTimeMinutes + row.cookTimeMinutes
              : row.cookTimeMinutes || row.prepTimeMinutes || null,
          yield_description: row.yieldDescription || null,
          dietary_tags: [],
          created_by: user.id,
          updated_by: user.id,
        })
        .select('id')
        .single()

      if (recipeError || !recipe) {
        errors.push(`"${row.name}": Failed to create recipe`)
        skippedCount++
        continue
      }

      // Add ingredients (non-blocking per row)
      for (let j = 0; j < row.rawIngredients.length; j++) {
        const raw = row.rawIngredients[j]
        const parsed = parseIngredientString(raw)
        if (!parsed.name) continue

        try {
          const ingredientId = await findOrCreateIngredient(
            db,
            user.tenantId!,
            user.id,
            parsed.name
          )

          await db.from('recipe_ingredients').insert({
            recipe_id: recipe.id,
            ingredient_id: ingredientId,
            quantity: parsed.quantity || 1,
            unit: parsed.unit || 'unit',
            preparation_notes: parsed.preparation || null,
            is_optional: false,
            sort_order: j,
          })
        } catch (ingErr) {
          // Non-blocking - continue with other ingredients
        }
      }

      importedCount++
    } catch (err) {
      errors.push(`"${row.name}": ${err instanceof Error ? err.message : 'unexpected error'}`)
      skippedCount++
    }
  }

  revalidatePath('/recipes')
  revalidatePath('/culinary/recipes')

  return {
    success: true,
    importedCount,
    skippedCount,
    errors,
  }
}

// ============================================
// HELPER
// ============================================

async function findOrCreateIngredient(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  userId: string,
  name: string
): Promise<string> {
  const normalized = name.trim()

  const { data: existing } = await db
    .from('ingredients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', normalized)
    .limit(1)
    .single()

  if (existing) return existing.id

  const { data: created, error } = await db
    .from('ingredients')
    .insert({
      tenant_id: tenantId,
      name: normalized,
      category: 'other' as IngredientCategory,
      default_unit: 'unit',
      dietary_tags: [],
      allergen_flags: [],
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error || !created) throw new Error(`Failed to create ingredient "${normalized}"`)
  return created.id
}

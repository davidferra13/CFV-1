'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'

/**
 * Import data from a ChefFlow GDPR/portability export (format v2.0).
 * Re-imports clients and recipes into the current tenant.
 * Skips duplicates based on email (clients) and name (recipes).
 * Does NOT reimport events, financials, or ledger (FK chains too deep).
 */

const ImportOptionsSchema = z.object({
  clients: z.boolean().default(true),
  recipes: z.boolean().default(true),
})

export type ImportOptions = z.infer<typeof ImportOptionsSchema>

export type ImportResult = {
  success: boolean
  clientsImported: number
  clientsSkipped: number
  recipesImported: number
  recipesSkipped: number
  errors: string[]
}

export async function importFromExport(
  exportData: Record<string, unknown>,
  options?: Partial<ImportOptions>
): Promise<ImportResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId ?? user.entityId
  const opts = ImportOptionsSchema.parse(options ?? {})

  const result: ImportResult = {
    success: true,
    clientsImported: 0,
    clientsSkipped: 0,
    recipesImported: 0,
    recipesSkipped: 0,
    errors: [],
  }

  // Validate export format
  const formatVersion = exportData.export_format_version
  if (formatVersion !== '2.0') {
    return {
      ...result,
      success: false,
      errors: [`Unsupported export format: ${formatVersion}. Expected 2.0`],
    }
  }

  const data = exportData.data as Record<string, unknown> | undefined
  if (!data) {
    return { ...result, success: false, errors: ['Export file missing data section'] }
  }

  // ── Import Clients ──────────────────────────────────────────────────────────
  if (opts.clients && Array.isArray(data.clients)) {
    // Get existing client emails for dedup
    const { data: existingClients } = await db
      .from('clients')
      .select('email')
      .eq('tenant_id', tenantId)

    const existingEmails = new Set(
      ((existingClients ?? []) as { email: string }[])
        .map((c) => c.email?.toLowerCase())
        .filter(Boolean)
    )

    for (const client of data.clients as Record<string, unknown>[]) {
      try {
        const email = (client.email as string)?.toLowerCase()
        if (!email || existingEmails.has(email)) {
          result.clientsSkipped++
          continue
        }

        await db.from('clients').insert({
          tenant_id: tenantId,
          full_name: client.full_name || 'Imported Client',
          email,
          phone: client.phone ?? null,
          dietary_restrictions: client.dietary_restrictions ?? [],
          allergies: client.allergies ?? [],
          status: 'active',
          referral_source: client.referral_source ?? 'import',
          vibe_notes: client.vibe_notes ?? null,
          address: client.address ?? null,
          notes: client.notes ?? null,
        })

        existingEmails.add(email)
        result.clientsImported++
      } catch (err) {
        result.errors.push(
          `Client "${(client.full_name as string) ?? 'unknown'}": ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  }

  // ── Import Recipes ──────────────────────────────────────────────────────────
  if (opts.recipes) {
    const recipesSection = data.recipes as Record<string, unknown> | undefined
    const recipes = Array.isArray(recipesSection)
      ? recipesSection
      : Array.isArray((recipesSection as any)?.recipes)
        ? (recipesSection as any).recipes
        : []

    if (recipes.length > 0) {
      // Get existing recipe names for dedup
      const { data: existingRecipes } = await db
        .from('recipes')
        .select('name')
        .eq('tenant_id', tenantId)

      const existingNames = new Set(
        ((existingRecipes ?? []) as { name: string }[])
          .map((r) => r.name?.toLowerCase())
          .filter(Boolean)
      )

      for (const recipe of recipes as Record<string, unknown>[]) {
        try {
          const name = recipe.name as string
          if (!name || existingNames.has(name.toLowerCase())) {
            result.recipesSkipped++
            continue
          }

          await db.from('recipes').insert({
            tenant_id: tenantId,
            name,
            description: recipe.description ?? null,
            category: recipe.category ?? null,
            servings: recipe.servings ?? null,
            prep_time_minutes: recipe.prep_time_minutes ?? null,
            cook_time_minutes: recipe.cook_time_minutes ?? null,
            instructions: recipe.instructions ?? null,
            dietary_tags: recipe.dietary_tags ?? [],
            notes: recipe.notes ?? null,
          })

          existingNames.add(name.toLowerCase())
          result.recipesImported++
        } catch (err) {
          result.errors.push(
            `Recipe "${(recipe.name as string) ?? 'unknown'}": ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }
    }
  }

  return result
}

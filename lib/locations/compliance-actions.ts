// Recipe Compliance Tracking Server Actions
// Track recipe standardization across locations. Record compliance checks,
// flag deviations, and compute compliance scores.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type ComplianceCheck = {
  id: string
  tenantId: string
  locationId: string
  recipeId: string
  checkDate: string
  portionCompliant: boolean
  methodCompliant: boolean
  ingredientCompliant: boolean
  presentationCompliant: boolean
  overallScore: number | null
  deviations: Deviation[]
  checkedBy: string | null
  photoUrl: string | null
  notes: string | null
  createdAt: string
}

export type Deviation = {
  field: 'portion' | 'method' | 'ingredient' | 'presentation'
  expected: string
  actual: string
  severity: 'minor' | 'major' | 'critical'
}

export type RecipeComplianceSummary = {
  recipeId: string
  recipeName: string
  locationId: string
  locationName: string
  totalChecks: number
  avgScore: number
  portionRate: number
  methodRate: number
  ingredientRate: number
  presentationRate: number
  lastCheckDate: string | null
  trend: 'improving' | 'stable' | 'declining'
}

// ─── Schemas ─────────────────────────────────────────────────────

const DeviationSchema = z.object({
  field: z.enum(['portion', 'method', 'ingredient', 'presentation']),
  expected: z.string(),
  actual: z.string(),
  severity: z.enum(['minor', 'major', 'critical']),
})

const RecordComplianceSchema = z.object({
  locationId: z.string().uuid(),
  recipeId: z.string().uuid(),
  checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  portionCompliant: z.boolean(),
  methodCompliant: z.boolean(),
  ingredientCompliant: z.boolean(),
  presentationCompliant: z.boolean(),
  deviations: z.array(DeviationSchema).optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────

function mapCheck(row: any): ComplianceCheck {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    recipeId: row.recipe_id,
    checkDate: row.check_date,
    portionCompliant: row.portion_compliant,
    methodCompliant: row.method_compliant,
    ingredientCompliant: row.ingredient_compliant,
    presentationCompliant: row.presentation_compliant,
    overallScore: row.overall_score ? Number(row.overall_score) : null,
    deviations: (row.deviations ?? []) as Deviation[],
    checkedBy: row.checked_by,
    photoUrl: row.photo_url,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

function computeScore(check: {
  portionCompliant: boolean
  methodCompliant: boolean
  ingredientCompliant: boolean
  presentationCompliant: boolean
}): number {
  const weights = { portion: 30, method: 30, ingredient: 25, presentation: 15 }
  let score = 0
  if (check.portionCompliant) score += weights.portion
  if (check.methodCompliant) score += weights.method
  if (check.ingredientCompliant) score += weights.ingredient
  if (check.presentationCompliant) score += weights.presentation
  return score
}

// ─── Actions ─────────────────────────────────────────────────────

export async function recordComplianceCheck(
  input: z.infer<typeof RecordComplianceSchema>
): Promise<{ success: boolean; data?: ComplianceCheck; error?: string }> {
  const user = await requireChef()
  const parsed = RecordComplianceSchema.parse(input)
  const db: any = createServerClient()

  const overallScore = computeScore({
    portionCompliant: parsed.portionCompliant,
    methodCompliant: parsed.methodCompliant,
    ingredientCompliant: parsed.ingredientCompliant,
    presentationCompliant: parsed.presentationCompliant,
  })

  const { data, error } = await db
    .from('location_recipe_compliance')
    .insert({
      tenant_id: user.tenantId!,
      location_id: parsed.locationId,
      recipe_id: parsed.recipeId,
      check_date: parsed.checkDate,
      portion_compliant: parsed.portionCompliant,
      method_compliant: parsed.methodCompliant,
      ingredient_compliant: parsed.ingredientCompliant,
      presentation_compliant: parsed.presentationCompliant,
      overall_score: overallScore,
      deviations: parsed.deviations ?? [],
      checked_by: user.id,
      photo_url: parsed.photoUrl ?? null,
      notes: parsed.notes ?? null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/locations')
  return { success: true, data: mapCheck(data) }
}

export async function getComplianceChecks(
  locationId: string,
  recipeId?: string,
  limit: number = 50
): Promise<ComplianceCheck[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('location_recipe_compliance')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('location_id', locationId)
    .order('check_date', { ascending: false })
    .limit(limit)

  if (recipeId) {
    query = query.eq('recipe_id', recipeId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to get compliance checks: ${error.message}`)
  return (data ?? []).map(mapCheck)
}

export async function getComplianceSummary(): Promise<RecipeComplianceSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all compliance checks from last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: checks } = await db
    .from('location_recipe_compliance')
    .select('*, recipes!inner(name), business_locations!inner(name)')
    .eq('tenant_id', user.tenantId!)
    .gte('check_date', thirtyDaysAgo.toISOString().split('T')[0])

  if (!checks?.length) return []

  // Group by recipe+location
  const grouped = new Map<string, any[]>()
  for (const check of checks) {
    const key = `${check.recipe_id}:${check.location_id}`
    const existing = grouped.get(key) ?? []
    existing.push(check)
    grouped.set(key, existing)
  }

  const summaries: RecipeComplianceSummary[] = []

  for (const [, group] of grouped) {
    const first = group[0]
    const totalChecks = group.length

    const avgScore =
      group.reduce(
        (sum: number, c: any) => sum + (c.overall_score ? Number(c.overall_score) : 0),
        0
      ) / totalChecks

    const portionRate = (group.filter((c: any) => c.portion_compliant).length / totalChecks) * 100
    const methodRate = (group.filter((c: any) => c.method_compliant).length / totalChecks) * 100
    const ingredientRate =
      (group.filter((c: any) => c.ingredient_compliant).length / totalChecks) * 100
    const presentationRate =
      (group.filter((c: any) => c.presentation_compliant).length / totalChecks) * 100

    // Trend: compare first half vs second half scores
    const sorted = [...group].sort((a: any, b: any) => a.check_date.localeCompare(b.check_date))
    const mid = Math.floor(sorted.length / 2)
    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (sorted.length >= 4) {
      const firstHalf = sorted.slice(0, mid)
      const secondHalf = sorted.slice(mid)
      const firstAvg =
        firstHalf.reduce((s: number, c: any) => s + Number(c.overall_score ?? 0), 0) /
        firstHalf.length
      const secondAvg =
        secondHalf.reduce((s: number, c: any) => s + Number(c.overall_score ?? 0), 0) /
        secondHalf.length
      if (secondAvg > firstAvg + 5) trend = 'improving'
      else if (secondAvg < firstAvg - 5) trend = 'declining'
    }

    summaries.push({
      recipeId: first.recipe_id,
      recipeName: first.recipes?.name ?? 'Unknown',
      locationId: first.location_id,
      locationName: first.business_locations?.name ?? 'Unknown',
      totalChecks,
      avgScore,
      portionRate,
      methodRate,
      ingredientRate,
      presentationRate,
      lastCheckDate: sorted[sorted.length - 1]?.check_date ?? null,
      trend,
    })
  }

  return summaries.sort((a, b) => a.avgScore - b.avgScore)
}

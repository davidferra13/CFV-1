// Health Inspection Readiness Export
// Generates a comprehensive compliance packet for health department inspections.
// Includes: HACCP plan, temperature logs, corrective actions, allergen info, certifications.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ────────────────────────────────────────────────────────

export type ComplianceExportSection = {
  title: string
  recordCount: number
  data: Record<string, unknown>[]
}

export type HealthInspectionExport = {
  exportedAt: string
  businessName: string
  tenantId: string
  periodStart: string
  periodEnd: string
  sections: {
    haccpPlan: {
      exists: boolean
      archetype: string | null
      lastReviewedAt: string | null
      plan: Record<string, unknown> | null
    }
    temperatureLogs: ComplianceExportSection
    correctiveActions: ComplianceExportSection
    allergenProcedures: {
      recipesWithAllergens: number
      allergenFlags: string[]
      recipes: Array<{
        name: string
        allergenFlags: string[]
        dietaryTags: string[]
      }>
    }
    certifications: ComplianceExportSection
    wasteLog: ComplianceExportSection
    equipmentCalibration: ComplianceExportSection
  }
  summary: {
    totalTempLogs: number
    outOfRangeLogs: number
    complianceRate: number
    haccpPlanCurrent: boolean
    correctiveActionsOpen: number
    certificationsExpiring: number
  }
}

// ─── Export Function ──────────────────────────────────────────────

/**
 * Generate a health department inspection readiness packet.
 * Default: last 90 days of data (configurable).
 * Designed to be pulled up on demand when an inspector arrives.
 */
export async function generateHealthInspectionExport(options?: {
  days?: number
}): Promise<HealthInspectionExport> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const days = options?.days ?? 90

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const periodStart = startDate.toISOString().split('T')[0]
  const periodEnd = endDate.toISOString().split('T')[0]

  // Get business info
  const { data: chef } = await (db
    .from('chefs')
    .select('business_name, display_name')
    .eq('id', tenantId)
    .single() as any)

  const businessName = (chef as any)?.business_name || (chef as any)?.display_name || 'Unknown'

  // Parallel fetch all compliance data
  const [
    haccpResult,
    tempLogsResult,
    correctiveResult,
    recipesResult,
    certsResult,
    wasteResult,
    equipResult,
  ] = await Promise.all([
    // HACCP plan
    (db as any).from('haccp_plans').select('*').eq('chef_id', tenantId).maybeSingle(),

    // Temperature logs for period
    (db as any)
      .from('temperature_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('recorded_at', `${periodStart}T00:00:00Z`)
      .lte('recorded_at', `${periodEnd}T23:59:59Z`)
      .order('recorded_at', { ascending: false })
      .limit(5000),

    // Corrective actions (from HACCP corrective actions or temp log notes)
    (db as any)
      .from('temperature_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_safe', false)
      .gte('recorded_at', `${periodStart}T00:00:00Z`)
      .lte('recorded_at', `${periodEnd}T23:59:59Z`)
      .order('recorded_at', { ascending: false }),

    // Recipes with allergen info
    (db as any)
      .from('recipes')
      .select('name, allergen_flags, dietary_tags')
      .eq('chef_id', tenantId)
      .eq('archived', false)
      .not('allergen_flags', 'eq', '{}'),

    // Staff certifications (food handler, ServSafe, etc.)
    (db as any)
      .from('staff_certifications' as any)
      .select('*')
      .eq('chef_id', tenantId)
      .order('expires_at', { ascending: true })
      .limit(500)
      .then((r: any) => r)
      .catch(() => ({ data: [], error: null })),

    // Waste log entries
    (db as any)
      .from('waste_entries' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', `${periodStart}T00:00:00Z`)
      .lte('created_at', `${periodEnd}T23:59:59Z`)
      .order('created_at', { ascending: false })
      .limit(2000)
      .then((r: any) => r)
      .catch(() => ({ data: [], error: null })),

    // Equipment calibration records
    (db as any)
      .from('equipment_inventory')
      .select('name, type, serial_number, last_service_date, next_service_date, status')
      .eq('chef_id', tenantId)
      .order('name'),
  ])

  // Process HACCP plan
  const haccpPlan = haccpResult.data
  const haccpSection = {
    exists: !!haccpPlan,
    archetype: haccpPlan?.archetype ?? null,
    lastReviewedAt: haccpPlan?.reviewed_at ?? null,
    plan: haccpPlan?.plan_data ?? null,
  }

  // Process temperature logs
  const tempLogs = tempLogsResult.data ?? []
  const outOfRange = tempLogs.filter((l: any) => !l.is_safe)

  // Process allergen data
  const allergenRecipes = recipesResult.data ?? []
  const allAllergens = new Set<string>()
  for (const r of allergenRecipes) {
    for (const flag of (r as any).allergen_flags ?? []) {
      allAllergens.add(flag)
    }
  }

  // Process certifications
  const certs = certsResult.data ?? []
  const now = new Date()
  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
  const expiringCerts = certs.filter(
    (c: any) =>
      c.expires_at && new Date(c.expires_at) <= thirtyDaysOut && new Date(c.expires_at) > now
  )

  // Process waste
  const wasteEntries = wasteResult.data ?? []

  // Process equipment
  const equipment = equipResult.data ?? []

  // Corrective actions (out-of-range temp logs that need/have corrective action)
  const correctiveActions = correctiveResult.data ?? []

  // Compute compliance rate
  const complianceRate =
    tempLogs.length > 0
      ? Math.round(((tempLogs.length - outOfRange.length) / tempLogs.length) * 10000) / 100
      : 100

  return {
    exportedAt: new Date().toISOString(),
    businessName,
    tenantId,
    periodStart,
    periodEnd,
    sections: {
      haccpPlan: haccpSection,
      temperatureLogs: {
        title: 'Temperature Monitoring Log',
        recordCount: tempLogs.length,
        data: tempLogs.map((l: any) => ({
          date: l.recorded_at,
          location: l.location_label ?? l.location,
          temperature: l.temperature_f,
          unit: 'F',
          isSafe: l.is_safe,
          recordedBy: l.recorded_by_name ?? l.recorded_by,
          notes: l.notes,
          correctiveAction: l.corrective_action ?? null,
        })),
      },
      correctiveActions: {
        title: 'Corrective Actions (Out-of-Range Events)',
        recordCount: correctiveActions.length,
        data: correctiveActions.map((a: any) => ({
          date: a.recorded_at,
          location: a.location_label ?? a.location,
          temperature: a.temperature_f,
          notes: a.notes,
          correctiveAction: a.corrective_action ?? 'Pending review',
        })),
      },
      allergenProcedures: {
        recipesWithAllergens: allergenRecipes.length,
        allergenFlags: [...allAllergens].sort(),
        recipes: allergenRecipes.map((r: any) => ({
          name: r.name,
          allergenFlags: r.allergen_flags ?? [],
          dietaryTags: r.dietary_tags ?? [],
        })),
      },
      certifications: {
        title: 'Staff Food Safety Certifications',
        recordCount: certs.length,
        data: certs,
      },
      wasteLog: {
        title: 'Waste Tracking Log',
        recordCount: wasteEntries.length,
        data: wasteEntries,
      },
      equipmentCalibration: {
        title: 'Equipment Maintenance and Calibration',
        recordCount: equipment.length,
        data: equipment,
      },
    },
    summary: {
      totalTempLogs: tempLogs.length,
      outOfRangeLogs: outOfRange.length,
      complianceRate,
      haccpPlanCurrent: !!haccpPlan?.reviewed_at,
      correctiveActionsOpen: correctiveActions.filter((a: any) => !a.corrective_action).length,
      certificationsExpiring: expiringCerts.length,
    },
  }
}

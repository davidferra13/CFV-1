'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ConfidenceLevel,
  EvidenceSource,
  ConfidenceLabel,
  ConfidencePolicy,
  ConfidenceSummary,
} from './confidence-types'

// ---------------------------------------------------------------------------
// 1. setConfidenceLabel - upsert confidence label for an entity field
// ---------------------------------------------------------------------------
export async function setConfidenceLabel(
  entityType: string,
  entityId: string,
  field: string,
  confidence: ConfidenceLevel,
  source: EvidenceSource
): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  await db.from('confidence_labels').upsert(
    {
      tenant_id: chef.id,
      entity_type: entityType,
      entity_id: entityId,
      field,
      confidence,
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,entity_type,entity_id,field' }
  )

  return { success: true }
}

// ---------------------------------------------------------------------------
// 2. getConfidenceLabels - all labels for an entity
// ---------------------------------------------------------------------------
export async function getConfidenceLabels(
  entityType: string,
  entityId: string
): Promise<ConfidenceLabel[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('confidence_labels')
    .select('*')
    .eq('tenant_id', chef.id)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  if (!data) return []

  return data.map((row: any) => ({
    entityType: row.entity_type,
    entityId: row.entity_id,
    field: row.field,
    confidence: row.confidence as ConfidenceLevel,
    source: row.source as EvidenceSource,
    lastVerified: row.last_verified,
    verifiedBy: row.verified_by,
    staleDays: row.stale_days,
  }))
}

// ---------------------------------------------------------------------------
// 3. getConfidenceSummary - computed summary with overall score
// ---------------------------------------------------------------------------
const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  verified: 5,
  high: 4,
  medium: 3,
  low: 2,
  unverified: 1,
  stale: 0,
}

function lowestConfidence(levels: ConfidenceLevel[]): ConfidenceLevel {
  if (levels.length === 0) return 'unverified'
  let min: ConfidenceLevel = 'verified'
  for (const l of levels) {
    if (CONFIDENCE_RANK[l] < CONFIDENCE_RANK[min]) min = l
  }
  return min
}

export async function getConfidenceSummary(
  entityType: string,
  entityId: string
): Promise<ConfidenceSummary> {
  const labels = await getConfidenceLabels(entityType, entityId)

  const fieldScores = labels.map((l) => ({
    field: l.field,
    confidence: l.confidence,
    source: l.source,
  }))

  const now = Date.now()
  const staleFields = labels
    .filter((l) => {
      if (!l.lastVerified) return true
      const age = (now - new Date(l.lastVerified).getTime()) / (1000 * 60 * 60 * 24)
      return age > l.staleDays
    })
    .map((l) => l.field)

  const unverifiedCount = labels.filter(
    (l) => l.confidence === 'unverified' || l.confidence === 'stale'
  ).length

  return {
    entityType,
    entityId,
    overallConfidence: lowestConfidence(labels.map((l) => l.confidence)),
    fieldScores,
    staleFields,
    unverifiedCount,
  }
}

// ---------------------------------------------------------------------------
// 4. getConfidencePolicies - default policies per entity type
// ---------------------------------------------------------------------------
export async function getConfidencePolicies(): Promise<ConfidencePolicy[]> {
  await requireChef()

  return [
    // Events: 5 fields
    {
      entityType: 'event',
      field: 'date',
      minConfidence: 'high',
      staleAfterDays: 30,
      requiresVerification: true,
      allowAiGenerated: false,
    },
    {
      entityType: 'event',
      field: 'guest_count',
      minConfidence: 'medium',
      staleAfterDays: 14,
      requiresVerification: false,
      allowAiGenerated: false,
    },
    {
      entityType: 'event',
      field: 'location',
      minConfidence: 'high',
      staleAfterDays: 30,
      requiresVerification: true,
      allowAiGenerated: false,
    },
    {
      entityType: 'event',
      field: 'price',
      minConfidence: 'verified',
      staleAfterDays: 7,
      requiresVerification: true,
      allowAiGenerated: false,
    },
    {
      entityType: 'event',
      field: 'menu',
      minConfidence: 'medium',
      staleAfterDays: 14,
      requiresVerification: false,
      allowAiGenerated: true,
    },

    // Clients: 4 fields
    {
      entityType: 'client',
      field: 'name',
      minConfidence: 'high',
      staleAfterDays: 365,
      requiresVerification: false,
      allowAiGenerated: false,
    },
    {
      entityType: 'client',
      field: 'email',
      minConfidence: 'verified',
      staleAfterDays: 180,
      requiresVerification: true,
      allowAiGenerated: false,
    },
    {
      entityType: 'client',
      field: 'phone',
      minConfidence: 'verified',
      staleAfterDays: 180,
      requiresVerification: true,
      allowAiGenerated: false,
    },
    {
      entityType: 'client',
      field: 'address',
      minConfidence: 'medium',
      staleAfterDays: 90,
      requiresVerification: false,
      allowAiGenerated: false,
    },

    // Menus: 3 fields
    {
      entityType: 'menu',
      field: 'dishes',
      minConfidence: 'medium',
      staleAfterDays: 30,
      requiresVerification: false,
      allowAiGenerated: true,
    },
    {
      entityType: 'menu',
      field: 'dietary_notes',
      minConfidence: 'high',
      staleAfterDays: 14,
      requiresVerification: true,
      allowAiGenerated: false,
    },
    {
      entityType: 'menu',
      field: 'pricing',
      minConfidence: 'verified',
      staleAfterDays: 7,
      requiresVerification: true,
      allowAiGenerated: false,
    },

    // Recipes: 3 fields
    {
      entityType: 'recipe',
      field: 'ingredients',
      minConfidence: 'high',
      staleAfterDays: 90,
      requiresVerification: false,
      allowAiGenerated: true,
    },
    {
      entityType: 'recipe',
      field: 'instructions',
      minConfidence: 'medium',
      staleAfterDays: 180,
      requiresVerification: false,
      allowAiGenerated: true,
    },
    {
      entityType: 'recipe',
      field: 'yield',
      minConfidence: 'high',
      staleAfterDays: 60,
      requiresVerification: true,
      allowAiGenerated: false,
    },
  ]
}

// ---------------------------------------------------------------------------
// 5. getStaleData - find data past its stale threshold
// ---------------------------------------------------------------------------
export async function getStaleData(entityType?: string): Promise<ConfidenceLabel[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  let query = db.from('confidence_labels').select('*').eq('tenant_id', chef.id)

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  const { data } = await query

  if (!data) return []

  const now = Date.now()
  return data
    .filter((row: any) => {
      if (row.confidence === 'stale' || row.confidence === 'unverified') return true
      if (!row.last_verified) return true
      const ageDays = (now - new Date(row.last_verified).getTime()) / (1000 * 60 * 60 * 24)
      return ageDays > (row.stale_days || 90)
    })
    .map((row: any) => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      field: row.field,
      confidence: row.confidence as ConfidenceLevel,
      source: row.source as EvidenceSource,
      lastVerified: row.last_verified,
      verifiedBy: row.verified_by,
      staleDays: row.stale_days,
    }))
}

// ---------------------------------------------------------------------------
// 6. verifyField - mark field as freshly verified
// ---------------------------------------------------------------------------
export async function verifyField(
  entityType: string,
  entityId: string,
  field: string
): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  await db
    .from('confidence_labels')
    .update({
      confidence: 'verified',
      last_verified: new Date().toISOString(),
      verified_by: chef.email,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', chef.id)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('field', field)

  return { success: true }
}

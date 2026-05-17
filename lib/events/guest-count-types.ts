// Guest Count Flex: types for living guest counts, impact assessment, and cutoff policies

export type GuestCountStage = 'quoted' | 'confirmed' | 'final' | 'actual'

export type CutoffPolicyMode = 'hard' | 'soft' | 'flexible'

export type PricingModel = 'exact_per_head' | 'minimum_guarantee' | 'flat_rate'

export type ChangeSeverity = 'minor' | 'moderate' | 'major'

export type GuestCountRecord = {
  id: string
  event_id: string
  tenant_id: string
  stage: GuestCountStage
  count: number
  updated_at: string
}

export type GuestCountChange = {
  id: string
  event_id: string
  tenant_id: string
  from_count: number
  to_count: number
  stage: GuestCountStage
  changed_by: string
  reason: string | null
  impact_json: ImpactAssessment | null
  changed_at: string
}

export type ImpactAssessment = {
  severity: ChangeSeverity
  delta: number
  message: string
  portions: {
    affected: boolean
    note: string
  }
  variants: {
    affected: boolean
    note: string
  }
  shopping: {
    affected: boolean
    note: string
  }
  pricing: {
    affected: boolean
    note: string
    quoted_total_cents: number | null
    projected_total_cents: number | null
    difference_cents: number | null
  }
}

export type CutoffPolicy = {
  id: string
  event_id: string
  tenant_id: string
  cutoff_date: string
  mode: CutoffPolicyMode
  message: string | null
  created_at: string
  updated_at: string
}

export type GuestCountSummary = {
  event_id: string
  quoted: number | null
  confirmed: number | null
  final: number | null
  actual: number | null
  cutoff: CutoffPolicy | null
  latest_change: GuestCountChange | null
}

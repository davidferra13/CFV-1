// Remy Skill Proposals - Type definitions
// Maps to remy_skill_proposals table.
// No 'use server'; safe to import from any context.

export type SkillProposalStatus = 'pending' | 'approved' | 'rejected'

export interface SkillTemplate {
  name: string
  description: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  condition_group: {
    mode: 'all' | 'any'
    conditions: Array<{
      field: string
      operator: string
      value: unknown
    }>
  }
  actions: Array<{
    kind: string
    label: string
    payload: Record<string, unknown>
  }>
  source_routine_id: string
  extracted_at: string
}

export interface SkillProposal {
  id: string
  routine_id: string
  skill_template: SkillTemplate
  usage_count: number
  status: SkillProposalStatus
  reviewed_at: string | null
  reviewed_by: string | null
  tenant_id: string
  created_at: string
}

export interface SkillProposalCandidate {
  routine_id: string
  routine_name: string
  successful_executions: number
  last_executed_at: string | null
}

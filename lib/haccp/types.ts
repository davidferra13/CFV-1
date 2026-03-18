// HACCP Plan Types - shared by templates, actions, and UI components.
// NOT a server action file - no 'use server'.
// Structure maps to the plan_data JSONB column in haccp_plans table.

import type { ArchetypeId } from '@/lib/archetypes/presets'

// ── Hazard Analysis (Principle 1) ────────────────────────────────────────

/** A hazard identified at a process step */
export type HazardEntry = {
  id: string
  type: 'biological' | 'chemical' | 'physical'
  description: string
  severity: 'high' | 'medium' | 'low'
  likelihood: 'high' | 'medium' | 'low'
  isCCP: boolean
  preventiveMeasure: string
}

/** A single process step in the hazard analysis */
export type ProcessStep = {
  id: string
  name: string
  description: string
  hazards: HazardEntry[]
}

// ── Critical Control Points (Principles 2–7) ────────────────────────────

/** A Critical Control Point with monitoring, corrective actions, verification */
export type CriticalControlPoint = {
  id: string
  ccpNumber: number
  processStep: string
  hazard: string
  criticalLimits: string
  monitoring: {
    what: string
    how: string
    frequency: string
    who: string
  }
  correctiveActions: string[]
  verificationProcedures: string[]
  recordKeeping: string[]
}

// ── Prerequisite Programs ────────────────────────────────────────────────

/** Foundational food safety programs (before HACCP) */
export type PrerequisiteProgram = {
  id: string
  name: string
  description: string
  procedures: string[]
}

// ── Chef Customizations ─────────────────────────────────────────────────

/** Chef's override for a section - toggle on/off, add notes */
export type SectionOverride = {
  enabled: boolean
  customNotes?: string
}

// ── Complete Plan Document ──────────────────────────────────────────────

/** The full HACCP plan stored as JSONB in the database */
export type HACCPPlanData = {
  version: 1
  archetypeId: ArchetypeId
  generatedAt: string

  // Header
  planTitle: string
  businessDescription: string

  // The 7 HACCP Principles
  processSteps: ProcessStep[]
  criticalControlPoints: CriticalControlPoint[]

  // Supporting sections
  prerequisitePrograms: PrerequisiteProgram[]
  recordKeepingSummary: string[]
  reviewSchedule: string

  // Chef customizations (keyed by section id, e.g. "ccp-1", "prereq-hygiene")
  overrides: Record<string, SectionOverride>
}

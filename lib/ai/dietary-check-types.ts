// Dietary Check — Shared Types
// Extracted from server action file to avoid 'use server' export restrictions.

export interface DietaryFlag {
  severity: 'danger' | 'warning' | 'info'
  item: string
  restriction: string
  message: string
}

export interface DietaryCheckResult {
  clientName: string
  restrictions: string[]
  flags: DietaryFlag[]
  safeItems: string[]
  summary: string
}

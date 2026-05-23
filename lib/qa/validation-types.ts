// lib/qa/validation-types.ts
// Types for Comprehensive QA Validation Framework (DEV #1)

export interface RouteValidationResult {
  route: string
  status: number
  ok: boolean
  durationMs: number
  error?: string
}

export interface RouteValidationReport {
  totalRoutes: number
  passed: number
  failed: number
  results: RouteValidationResult[]
  runAt: string
}

export interface ActionValidationResult {
  module: string
  exportCount: number
  typeCheckPassed: boolean
  error?: string
}

export interface ActionValidationReport {
  totalModules: number
  passed: number
  failed: number
  results: ActionValidationResult[]
  runAt: string
}

export interface SchemaValidationResult {
  migrationFile: string
  applied: boolean
  error?: string
}

export interface SchemaValidationReport {
  totalMigrations: number
  applied: number
  pending: number
  results: SchemaValidationResult[]
  runAt: string
}

export interface FullValidationReport {
  routes: RouteValidationReport
  actions: ActionValidationReport
  schema: SchemaValidationReport
  overallPassed: boolean
  runAt: string
}

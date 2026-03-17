// System Nerve Center — Shared Types
// Used by health-sweep, heal-actions, API routes, and the dashboard UI.

/** Dependency tiers — checked in order. If a lower tier fails, higher tiers skip. */
export type ServiceTier = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Every monitorable service in ChefFlow */
export type ServiceId =
  | 'network'
  | 'database'
  | 'auth'
  | 'dev_server'
  | 'ollama_pc'
  | 'stripe'
  | 'resend'
  | 'gmail'
  | 'google_maps'
  | 'spoonacular'
  | 'kroger'
  | 'mealme'
  | 'beta_server'
  | 'cloudflare_tunnel'

export type ServiceStatus = 'healthy' | 'degraded' | 'error' | 'unknown' | 'unchecked'

export type FixCapability = 'auto_fixable' | 'manual_only' | 'none'

export interface FixAction {
  id: string
  label: string
  description: string
  serviceId: ServiceId
  dangerous: boolean
}

export interface ServiceHealthResult {
  id: ServiceId
  name: string
  tier: ServiceTier
  status: ServiceStatus
  latencyMs: number | null
  detail: string
  error: string | null
  fixCapability: FixCapability
  fixActions: FixAction[]
  checkedAt: string
  circuitBreakerState?: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  circuitBreakerFailures?: number
}

export interface FixResult {
  actionId: string
  serviceId: ServiceId
  success: boolean
  message: string
  durationMs: number
}

export interface SweepResult {
  overallStatus: ServiceStatus
  services: ServiceHealthResult[]
  fixes: FixResult[]
  healthyCount: number
  degradedCount: number
  errorCount: number
  uncheckedCount: number
  sweepDurationMs: number
  timestamp: string
}

export interface ServiceDefinition {
  id: ServiceId
  name: string
  tier: ServiceTier
  description: string
  dependsOn: ServiceId[]
  envVars: string[]
  fixActions: FixAction[]
  docsUrl?: string
}

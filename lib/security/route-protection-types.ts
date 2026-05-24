/**
 * Route Protection Matrix Types
 *
 * High-level protection classification for route groups.
 * Complements the granular per-route routePolicy in route-policy.ts.
 */

export type ProtectionLevel =
  | 'public'
  | 'authenticated'
  | 'chef'
  | 'client'
  | 'staff'
  | 'admin'
  | 'partner'
  | 'vendor'
  | 'demo'
  | 'mobile'
  | 'kiosk'

export type RouteProtectionEntry = {
  /** Glob-style pattern, e.g. "/admin/*" or "/dashboard" */
  pattern: string
  /** Required protection level */
  level: ProtectionLevel
  /** Human-readable description of what this pattern covers */
  description: string
}

export type ProtectionMatrixSummary = {
  totalEntries: number
  countByLevel: Record<ProtectionLevel, number>
  patterns: string[]
}

export type RouteProtectionResult = {
  pathname: string
  matchedPattern: string | null
  level: ProtectionLevel | null
  description: string | null
}

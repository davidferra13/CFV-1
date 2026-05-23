// lib/qa/wiring-types.ts
// Types for Contextual Wiring Mise en Place (DEV #10)

export interface ConnectedDomain {
  domain: string
  importCount: number
  serverActions: string[]
}

export interface ConnectedComponent {
  name: string
  path: string
}

export interface RouteWiringStatus {
  route: string
  connectedDomains: ConnectedDomain[]
  connectedComponents: ConnectedComponent[]
  serverActionCount: number
  domainCount: number
  isOverwired: boolean
  isUnwired: boolean
}

export interface UnwiredRoute {
  route: string
  reason: string
}

export interface OverwiredRoute {
  route: string
  domainCount: number
  domains: string[]
}

export interface WiringReport {
  route: RouteWiringStatus | null
  unwiredRoutes?: UnwiredRoute[]
  overwiredRoutes?: OverwiredRoute[]
  runAt: string
}

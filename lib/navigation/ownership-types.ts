// Surface ownership types for route-to-domain mapping

export type SurfaceOwner =
  | 'lifecycle'
  | 'clients'
  | 'menus'
  | 'recipes'
  | 'ingredients'
  | 'settings'
  | 'admin'
  | 'portal'
  | 'public'
  | 'operations'
  | 'intelligence'
  | 'finance'

export type SurfaceEntry = {
  route: string
  owner: SurfaceOwner
  filePath: string
  hasLayout: boolean
}

export type OwnershipSummary = {
  totalRoutes: number
  ownedRoutes: number
  orphanRoutes: number
  byOwner: Record<SurfaceOwner, number>
}

export type OwnershipHealth = {
  summary: OwnershipSummary
  orphans: string[]
  coverage: number
  generatedAt: string
}

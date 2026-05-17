// Navigation configuration and page header types for NAV #1
// Chef Navigation And Page Header Unification

export type NavSection =
  | 'operations'
  | 'clients'
  | 'menus'
  | 'finance'
  | 'settings'
  | 'admin'

export type NavItem = {
  id: string
  label: string
  href: string
  icon: string
  section: NavSection
  order: number
  badge?: string
  isNew?: boolean
  requiredRole?: 'chef' | 'admin'
}

export type NavGroup = {
  section: NavSection
  label: string
  items: NavItem[]
  collapsed?: boolean
}

export type Breadcrumb = {
  label: string
  href?: string
}

export type HeaderAction = {
  label: string
  href?: string
  onClick?: string
  variant: 'primary' | 'secondary' | 'ghost' | 'destructive'
  icon?: string
}

export type PageHeader = {
  title: string
  subtitle?: string
  breadcrumbs: Breadcrumb[]
  actions?: HeaderAction[]
}

export type RecentPage = {
  route: string
  title: string
  visitedAt: string
}

export type NavPreference = {
  id: string
  tenantId: string
  chefId: string
  pinnedItems: string[]
  collapsedSections: NavSection[]
  recentPages: RecentPage[]
  updatedAt: string
}

export type NavAuditEntry = {
  route: string
  hasHeader: boolean
  headerComplete: boolean
  missingFields: string[]
  checkedAt: string
}

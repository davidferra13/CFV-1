// Portal Experience Types - Client Portal Event Experience UI Polish (UI SYSTEM #8)

export type PortalSection =
  | 'overview'
  | 'menu'
  | 'timeline'
  | 'documents'
  | 'communication'
  | 'payment'

export interface PortalExperienceConfig {
  id: string
  tenantId: string
  eventId: string
  visibleSections: PortalSection[]
  customBranding?: Record<string, unknown> | null
  welcomeMessage?: string | null
  createdAt: string
}

export interface PortalInteraction {
  id: string
  tenantId: string
  eventId: string
  clientId: string
  section: PortalSection
  action: string
  timestamp: string
}

export interface PortalFeedback {
  id: string
  tenantId: string
  eventId: string
  clientId: string
  rating: number | null
  comment: string | null
  section: PortalSection | null
  createdAt: string
}

export interface PortalAccessLog {
  id: string
  tenantId: string
  eventId: string
  clientId: string
  accessedAt: string
  device: string | null
  duration: number | null
}

export interface PortalExperienceSummary {
  eventId: string
  totalVisits: number
  avgDuration: number
  sectionViews: Record<PortalSection, number>
  feedbackScore: number | null
  lastAccessed: string | null
}

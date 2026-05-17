export type MobileView = 'today' | 'week' | 'prep' | 'shopping' | 'clients' | 'inbox'

export interface MobileDashboard {
  todayEvents: MobileEventCard[]
  urgentActions: MobileAction[]
  quickStats: { label: string; value: string | number; trend?: 'up' | 'down' | 'flat' }[]
  notifications: number
}

export interface MobileEventCard {
  eventId: string
  title: string
  clientName: string
  guestCount: number
  startTime: string
  location: string | null
  status: string
  menuName: string | null
}

export interface MobileAction {
  id: string
  type: 'respond' | 'confirm' | 'review' | 'prep' | 'payment'
  label: string
  entityType: string
  entityId: string
  urgency: 'immediate' | 'today' | 'this_week'
  createdAt: string
}

export interface MobilePreferences {
  id: string
  tenantId: string
  defaultView: MobileView
  quickActions: string[]
  showRevenue: boolean
  compactMode: boolean
}

export interface MobileQuickAccessItem {
  id: string
  type: 'event' | 'client' | 'menu'
  label: string
  subtitle: string | null
  updatedAt: string
}

export interface MobileQuickAccess {
  recentEvents: MobileQuickAccessItem[]
  recentClients: MobileQuickAccessItem[]
  recentMenus: MobileQuickAccessItem[]
}

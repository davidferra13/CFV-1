import type { TenantDataPresence } from './types'

export const STARTER_NAV_GROUPS = new Set(['pipeline', 'events', 'clients', 'culinary'])
export const STARTER_NAV_GROUP_ORDER = ['pipeline', 'events', 'clients', 'culinary'] as const

export function isBrandNewChef(presence: TenantDataPresence): boolean {
  return presence.populatedCount < 3
}

export function isActionBarItemVisible(
  href: string,
  presence: TenantDataPresence | null | undefined,
  showAll: boolean,
  bypassProgressiveDisclosure: boolean
): boolean {
  if (!presence || showAll || bypassProgressiveDisclosure) return true

  switch (href) {
    case '/dashboard':
    case '/inquiries':
    case '/events':
    case '/culinary':
    case '/clients':
    case '/finance':
      return true
    case '/inbox':
      return presence.hasConversations || presence.hasInquiries
    case '/inquiries':
      return presence.hasInquiries || presence.hasQuotes
    default:
      return true
  }
}

export function isNavGroupVisible(
  groupId: string,
  presence: TenantDataPresence,
  showAll: boolean
): boolean {
  if (STARTER_NAV_GROUPS.has(groupId)) return true
  if (showAll) return true

  switch (groupId) {
    case 'finance':
      return presence.hasInvoices || presence.hasExpenses || presence.hasEvents
    case 'operations':
      return presence.hasStaff || presence.hasTasks || presence.hasEvents
    case 'commerce':
      return presence.hasInvoices || presence.hasEvents
    case 'analytics':
      return presence.hasEvents && presence.hasClients
    case 'marketing':
      return presence.hasClients && presence.hasEvents
    case 'network':
      return presence.hasNetwork || presence.hasCircles
    case 'protection':
      return presence.hasContracts || presence.hasEvents
    case 'supply-chain':
      return presence.hasInventory || presence.hasRecipes
    case 'tools':
      return presence.populatedCount >= 3
    default:
      return true
  }
}

export type ChefActivityRouteEntity =
  | 'event'
  | 'inquiry'
  | 'quote'
  | 'menu'
  | 'recipe'
  | 'client'
  | 'task'
  | 'station'

export function getChefActivityEntityHref(
  entityType: ChefActivityRouteEntity,
  entityId: string
): string
export function getChefActivityEntityHref(
  entityType: string | null | undefined,
  entityId: string | null | undefined
): string | null
export function getChefActivityEntityHref(
  entityType: string | null | undefined,
  entityId: string | null | undefined
): string | null {
  if (!entityType || !entityId) return null

  switch (entityType) {
    case 'event':
      return `/events/${entityId}`
    case 'inquiry':
      return `/inquiries/${entityId}`
    case 'quote':
      return `/quotes/${entityId}`
    case 'menu':
      return `/culinary/menus/${entityId}`
    case 'recipe':
      return `/recipes/${entityId}`
    case 'client':
      return `/clients/${entityId}`
    case 'task':
      return '/tasks'
    case 'station':
      return `/stations/${entityId}`
    default:
      return null
  }
}

import type { RemyTaskResult } from '@/lib/ai/remy-types'

const ROUTE_ALIASES: Record<string, string> = {
  analytics: '/analytics',
  availability: '/availability',
  calendar: '/calendar',
  clients: '/clients',
  client: '/clients',
  'client list': '/clients',
  dashboard: '/dashboard',
  home: '/dashboard',
  documents: '/documents',
  docs: '/documents',
  events: '/events',
  event: '/events',
  expenses: '/expenses',
  finance: '/finance',
  financials: '/financials',
  inquiries: '/inquiries',
  inquiry: '/inquiries',
  leads: '/leads',
  menus: '/menus',
  menu: '/menus',
  prices: '/prices',
  pricing: '/prices',
  quotes: '/quotes',
  radar: '/radar',
  'culinary radar': '/radar',
  recipes: '/recipes',
  recipe: '/recipes',
  'recipe book': '/recipes',
  remy: '/remy',
  reports: '/reports',
  schedule: '/calendar',
  settings: '/settings',
  tasks: '/tasks',
  todos: '/tasks',
  vendors: '/vendors',
  waitlist: '/waitlist',
}

function cleanAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:my|the|chef|chefflow)\s+/, '')
    .replace(/\s+(?:page|screen|section)$/, '')
}

function isSafeInternalRoute(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
}

export function normalizeRemyNavigationRoute(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim().replace(/^['"]|['"]$/g, '')
  if (!trimmed) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null

  if (isSafeInternalRoute(trimmed)) return trimmed

  return ROUTE_ALIASES[cleanAlias(trimmed)] ?? null
}

export function getRemyNavigationRouteFromTasks(tasks?: RemyTaskResult[]): string | null {
  const navTask = tasks?.find((task) => task.taskType === 'nav.go' && task.status === 'done')
  if (!navTask?.data) return null

  return normalizeRemyNavigationRoute((navTask.data as { route?: unknown }).route)
}

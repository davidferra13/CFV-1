export interface SnapBackEntry {
  path: string
  label: string
  domain: string
}

const STORAGE_KEY = 'cf-snap-back-stack'
const MAX_DEPTH = 3

const DOMAIN_LABELS: Record<string, string> = {
  events: 'Events',
  clients: 'Clients',
  recipes: 'Recipes',
  menus: 'Menus',
  'price-catalog': 'Food Catalog',
  finance: 'Finance',
  calendar: 'Calendar',
  settings: 'Settings',
  staff: 'Staff',
  inquiries: 'Inquiries',
  quotes: 'Quotes',
}

export function extractDomain(path: string): string | null {
  const segments = path.replace(/^\//, '').split('/').filter(Boolean)
  const first = segments[0]
  if (!first || !DOMAIN_LABELS[first]) return null
  return first
}

export function getStack(): SnapBackEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function pushSnapBack(entry: SnapBackEntry): void {
  try {
    const stack = getStack().filter((e) => e.domain !== entry.domain)
    stack.push(entry)
    if (stack.length > MAX_DEPTH) stack.shift()
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack))
  } catch {}
}

export function popSnapBack(): SnapBackEntry | undefined {
  try {
    const stack = getStack()
    const entry = stack.pop()
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack))
    return entry
  } catch {
    return undefined
  }
}

export function clearDomainFromStack(domain: string): void {
  try {
    const stack = getStack().filter((e) => e.domain !== domain)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack))
  } catch {}
}

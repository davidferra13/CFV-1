// Pure helper functions for chef navigation active-state detection and filtering.
// Extracted from chef-nav.tsx for maintainability.
import type { NavGroup, NavCollapsibleItem, NavSubItem } from './nav-config'

export type SearchParamsLike = Pick<URLSearchParams, 'entries' | 'get'>

export function splitHref(href: string) {
  const [path, query = ''] = href.split('?')
  return { path, query }
}

export function queryMatches(searchParams: SearchParamsLike | null | undefined, query: string) {
  if (!query) return true
  if (!searchParams) return false

  const target = new URLSearchParams(query)
  for (const [key, value] of target.entries()) {
    if (searchParams.get(key) !== value) return false
  }
  return true
}

// Check if current route matches a nav item (path + query-aware)
export function isItemActive(
  pathname: string,
  href: string,
  searchParams?: SearchParamsLike | null
) {
  const { path, query } = splitHref(href)
  if (query) {
    return pathname === path && queryMatches(searchParams, query)
  }
  if (path === '/dashboard') return pathname === '/dashboard'
  return pathname === path || pathname.startsWith(path + '/')
}

export function isGroupActive(
  pathname: string,
  group: NavGroup,
  searchParams?: SearchParamsLike | null
) {
  return group.items.some((item) => {
    if (isItemActive(pathname, item.href, searchParams)) return true
    return item.children?.some((child) => isItemActive(pathname, child.href, searchParams)) ?? false
  })
}

export function isCollapsibleItemActive(
  pathname: string,
  item: NavCollapsibleItem,
  searchParams?: SearchParamsLike | null
) {
  if (isItemActive(pathname, item.href, searchParams)) return true
  return item.children?.some((child) => isItemActive(pathname, child.href, searchParams)) ?? false
}

export function partitionChildren(children: NavSubItem[] = []) {
  const secondary: NavSubItem[] = []
  const advanced: NavSubItem[] = []

  for (const child of children) {
    if (child.visibility === 'advanced') advanced.push(child)
    else secondary.push(child)
  }

  return { secondary, advanced }
}

export function isSectionActive(
  pathname: string,
  items: Array<{ href: string }>,
  searchParams?: SearchParamsLike | null
) {
  return items.some((item) => isItemActive(pathname, item.href, searchParams))
}

export function filterNavGroup(group: NavGroup, filter: string): NavGroup | null {
  const q = filter.trim().toLowerCase()
  if (!q) return group

  const groupMatch = group.label.toLowerCase().includes(q)
  const items = group.items
    .map((item) => {
      const itemMatch = item.label.toLowerCase().includes(q)
      const children = (item.children ?? []).filter((child) =>
        child.label.toLowerCase().includes(q)
      )

      if (groupMatch || itemMatch || children.length > 0) {
        return {
          ...item,
          children: item.children ? children : undefined,
        }
      }
      return null
    })
    .filter((item) => Boolean(item)) as NavCollapsibleItem[]

  if (!groupMatch && items.length === 0) return null
  return { ...group, items }
}

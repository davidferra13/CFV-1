export const PORTAL_RAIL_STANDARD = {
  collapsedWidth: 'lg:w-20',
  expandedWidth: 'lg:w-72',
  mdCollapsedWidth: 'md:w-20',
  collapsedOffset: 'lg:pl-20',
  expandedOffset: 'lg:pl-72',
  mdCollapsedOffset: 'md:pl-20',
  desktopRailBase:
    'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-subnav border-r border-stone-800 bg-stone-900 transition-all duration-200',
  desktopRailProminence: 'shadow-[8px_0_24px_rgba(0,0,0,0.18)]',
  collapsedIconButton: 'flex h-11 w-11 items-center justify-center rounded-lg transition-colors',
  expandedLink:
    'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
  primaryAction:
    'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
} as const

export function getPortalRailWidthClass(collapsed: boolean): string {
  return collapsed ? PORTAL_RAIL_STANDARD.collapsedWidth : PORTAL_RAIL_STANDARD.expandedWidth
}

export function getPortalRailOffsetClass(collapsed: boolean): string {
  return collapsed ? PORTAL_RAIL_STANDARD.collapsedOffset : PORTAL_RAIL_STANDARD.expandedOffset
}

export function isPortalRouteActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

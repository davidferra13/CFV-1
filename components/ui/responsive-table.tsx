'use client'

import { useMediaQuery } from '@/lib/hooks/use-media-query'

interface ResponsiveTableProps<T> {
  /** The data array (needed for mobile card rendering) */
  data: T[]
  /** Render the desktop table layout */
  renderDesktop: () => React.ReactNode
  /** Render a single mobile card for an item */
  renderMobileCard: (item: T, index: number) => React.ReactNode
  /** Breakpoint for switching to desktop (default: 768px) */
  breakpoint?: string
}

/**
 * Responsive table wrapper - renders a table on desktop, stacked cards on mobile.
 *
 * Usage:
 *   <ResponsiveTable
 *     data={events}
 *     renderDesktop={() => (
 *       <Table>...</Table>
 *     )}
 *     renderMobileCard={(event) => (
 *       <Card>
 *         <div className="font-semibold">{event.occasion}</div>
 *         <Badge>{event.status}</Badge>
 *       </Card>
 *     )}
 *   />
 */
export function ResponsiveTable<T>({
  data,
  renderDesktop,
  renderMobileCard,
  breakpoint = '(min-width: 768px)',
}: ResponsiveTableProps<T>) {
  const isDesktop = useMediaQuery(breakpoint)

  if (isDesktop) {
    return <>{renderDesktop()}</>
  }

  return <div className="space-y-3">{data.map((item, index) => renderMobileCard(item, index))}</div>
}

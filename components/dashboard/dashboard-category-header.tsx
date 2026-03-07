/**
 * Category section divider for the dashboard grid.
 * Renders as a full-width label separating widget groups.
 */
export function DashboardCategoryHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="col-span-1 md:col-span-2 flex items-center gap-3 pt-4 first:pt-0">
      <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">
        {label}
      </h2>
      {count != null && count > 0 && <span className="text-xs text-stone-600">{count}</span>}
      <div className="flex-1 h-px bg-stone-800" />
    </div>
  )
}

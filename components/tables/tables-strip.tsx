import Link from 'next/link'

type TableBubble = {
  id: string
  name: string
  emoji: string | null
  token: string
  gradient: string
  hasUnread: boolean
}

export function TablesStrip({ tables }: { tables: TableBubble[] }) {
  return (
    <div className="flex gap-3 pb-4 overflow-x-auto scrollbar-hide">
      {tables.map((table) => (
        <Link
          key={table.id}
          href={`/hub/g/${table.token}`}
          className="flex-shrink-0 flex flex-col items-center gap-1 group"
        >
          <div
            className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl relative border-2 transition-transform duration-200 group-hover:-translate-y-0.5 ${
              table.hasUnread ? 'border-brand-500' : 'border-transparent'
            }`}
            style={{ background: table.gradient }}
          >
            {table.emoji || table.name.charAt(0)}
            {table.hasUnread && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-500 border-2 border-surface-0" />
            )}
          </div>
          <span className="text-[11px] text-stone-400 max-w-[64px] text-center truncate">
            {table.name}
          </span>
        </Link>
      ))}
      <Link href="/circles/admin" className="flex-shrink-0 flex flex-col items-center gap-1 group">
        <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl border-2 border-dashed border-stone-600 text-stone-500 transition-colors group-hover:border-brand-500 group-hover:text-brand-500">
          +
        </div>
        <span className="text-[11px] text-stone-500">New Table</span>
      </Link>
    </div>
  )
}

export type { TableBubble }

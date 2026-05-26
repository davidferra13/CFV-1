import Link from 'next/link'

type StatCard = {
  icon: string
  label: string
  value: string
  count: number
  color: 'amber' | 'emerald' | 'blue' | 'purple'
  href: string
}

const colorMap = {
  amber: 'from-amber-800/60 to-amber-600/0 hover:border-amber-700/40',
  emerald: 'from-emerald-800/60 to-emerald-600/0 hover:border-emerald-700/40',
  blue: 'from-blue-800/60 to-blue-600/0 hover:border-blue-700/40',
  purple: 'from-purple-800/60 to-purple-600/0 hover:border-purple-700/40',
} as const

export function TablesStatsRow({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="group relative overflow-hidden rounded-xl border border-stone-700/40 bg-surface-accent p-4 transition-all duration-200 hover:border-stone-600 hover:-translate-y-px hover:shadow-lg card-transition"
          style={{
            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)',
          }}
        >
          <div
            className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${colorMap[stat.color]} opacity-0 group-hover:opacity-100 transition-opacity`}
          />
          <div className="text-2xl mb-2">{stat.icon}</div>
          <div className="text-sm font-semibold text-stone-100">{stat.label}</div>
          <div className="text-xs text-stone-500">{stat.value}</div>
          <div className="absolute top-4 right-4 text-2xl font-bold text-stone-100 opacity-[0.15]">
            {stat.count}
          </div>
        </Link>
      ))}
    </div>
  )
}

export type { StatCard }

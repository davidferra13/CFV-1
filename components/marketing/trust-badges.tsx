import { ChefHat, Database, Download, Lock, ShieldCheck } from '@/components/ui/icons'

const BADGES = [
  {
    icon: Database,
    label: 'Your Data, Your Control',
  },
  {
    icon: Lock,
    label: 'Self-Hosted',
  },
  {
    icon: Download,
    label: 'Export Anytime',
  },
  {
    icon: ShieldCheck,
    label: 'No Vendor Lock-in',
  },
  {
    icon: ChefHat,
    label: 'Built by a Chef',
  },
] as const

export function TrustBadges() {
  return (
    <section className="border-y border-stone-800/40 bg-stone-950/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:flex md:items-center md:justify-between md:gap-6">
          {BADGES.map((badge) => {
            const Icon = badge.icon
            return (
              <div
                key={badge.label}
                className="flex items-center gap-2.5 text-stone-400"
              >
                <Icon className="h-4 w-4 shrink-0 text-brand-400" />
                <span className="text-xs font-medium tracking-wide sm:text-sm">
                  {badge.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

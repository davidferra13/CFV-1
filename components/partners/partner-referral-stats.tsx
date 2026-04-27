import { getPartnerReferralStats } from '@/lib/partners/portal-actions'
import { Send, CalendarDays, Users, TrendingUp, ArrowUp, ArrowDown } from '@/components/ui/icons'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function TrendBadge({
  current,
  previous,
  label,
}: {
  current: number
  previous: number
  label: string
}) {
  if (current === 0 && previous === 0) return null

  const diff = current - previous
  if (diff === 0) {
    return (
      <span className="text-xs text-stone-500">
        Same as last month
      </span>
    )
  }

  const isUp = diff > 0
  const Icon = isUp ? ArrowUp : ArrowDown

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs ${
        isUp ? 'text-emerald-400' : 'text-amber-400'
      }`}
    >
      <Icon size={12} />
      {Math.abs(diff)} {label} vs last month
    </span>
  )
}

function ReferralStatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string
  value: string | number
  icon: typeof Send
  trend?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={15} className="text-stone-400" />
        <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold text-stone-100">{value}</p>
      {trend && <div className="mt-2">{trend}</div>}
    </div>
  )
}

export async function PartnerReferralStats() {
  const stats = await getPartnerReferralStats()

  // If the partner has no referral data at all, don't render the section
  if (
    stats.totalInquiries === 0 &&
    stats.totalEvents === 0 &&
    stats.totalGuestsServed === 0 &&
    stats.revenueCents === 0
  ) {
    return null
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-stone-400" />
        <h2 className="text-lg font-semibold text-stone-100">Your Referral Impact</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReferralStatCard
          label="Inquiries Referred"
          value={stats.totalInquiries}
          icon={Send}
          trend={
            <TrendBadge
              current={stats.thisMonthInquiries}
              previous={stats.lastMonthInquiries}
              label="inquiries"
            />
          }
        />
        <ReferralStatCard
          label="Events Generated"
          value={stats.totalEvents}
          icon={CalendarDays}
          trend={
            <TrendBadge
              current={stats.thisMonthEvents}
              previous={stats.lastMonthEvents}
              label="events"
            />
          }
        />
        <ReferralStatCard
          label="Guests Served"
          value={stats.totalGuestsServed.toLocaleString()}
          icon={Users}
        />
        {stats.revenueCents > 0 && (
          <ReferralStatCard
            label="Revenue Impact"
            value={formatCurrency(stats.revenueCents)}
            icon={TrendingUp}
          />
        )}
      </div>
    </div>
  )
}

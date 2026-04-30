import Link from 'next/link'
import type { PricingReadinessSummary } from '@/lib/pricing/pricing-readiness-actions'

interface Props {
  summary: PricingReadinessSummary
  variant: 'market' | 'full'
}

function formatExact(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function statusBadge(status: string) {
  switch (status) {
    case 'ready':
    case 'nationwide_ready':
      return 'bg-emerald-950 text-emerald-400 border-emerald-800'
    case 'usable_with_caveats':
    case 'regional_in_progress':
      return 'bg-amber-950 text-amber-400 border-amber-800'
    case 'not_ready':
    case 'no_live_data':
      return 'bg-red-950 text-red-400 border-red-800'
    default:
      return 'bg-stone-900 text-stone-400 border-stone-800'
  }
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-stone-100">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-stone-500">{sub}</p> : null}
    </div>
  )
}

function SectionHeader({ title, label, status }: { title: string; label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
      </div>
      <span
        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${statusBadge(status)}`}
      >
        {label}
      </span>
    </div>
  )
}

function NextAction({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-stone-800 bg-stone-950/40 px-3 py-2 transition-colors hover:border-brand-700/60 hover:bg-stone-900"
    >
      <p className="text-xs font-medium text-brand-400">{label}</p>
      <p className="mt-0.5 text-xs text-stone-500">{detail}</p>
    </Link>
  )
}

function MarketSection({ summary }: { summary: PricingReadinessSummary['market'] }) {
  const lastHealthy = summary.lastHealthySyncAt
    ? `${formatExact(summary.lastHealthySyncAt)} (${timeAgo(summary.lastHealthySyncAt)})`
    : 'No healthy sync yet'
  const claimGateOpen = summary.status === 'nationwide_ready'

  return (
    <div className="space-y-3">
      <SectionHeader title="Market Foundation" label={summary.label} status={summary.status} />
      <p className="text-xs text-stone-400">{summary.guidance}</p>
      <div
        className={`rounded-lg border px-3 py-2 text-xs ${
          claimGateOpen
            ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300'
            : 'border-amber-800 bg-amber-950/30 text-amber-300'
        }`}
      >
        <p className="font-medium">
          {claimGateOpen ? 'Nationwide price claim allowed' : 'Nationwide price claim blocked'}
        </p>
        {!claimGateOpen && (
          <p className="mt-0.5 opacity-80">
            ChefFlow can show best-available prices, but must not imply local buyability everywhere
            until all readiness thresholds pass.
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Last healthy sync" value={lastHealthy} />
        <Metric label="Green days" value={`${summary.greenDaysLast7}/7`} />
        <Metric label="States covered" value={summary.statesCovered.toLocaleString()} />
        <Metric label="Store ZIPs" value={summary.storeZipCount.toLocaleString()} />
        <Metric label="Food products" value={summary.foodProducts.toLocaleString()} />
        <Metric
          label="Fresh price share"
          value={summary.freshPricePct !== null ? `${summary.freshPricePct}%` : 'Unknown'}
          sub={`${summary.priceRecords.toLocaleString()} total price records`}
        />
      </div>
    </div>
  )
}

function ChefSection({ summary }: { summary: PricingReadinessSummary['chef'] }) {
  const nextActions: Array<{ href: string; label: string; detail: string }> = []

  if ((summary.ingredientCoveragePct ?? 0) < 90) {
    nextActions.push({
      href: '/culinary/ingredients',
      label: 'Price missing ingredients',
      detail: 'Open your ingredient list and fill the gaps that block reliable recipe costs.',
    })
  }

  if ((summary.recipeCoveragePct ?? 0) < 90) {
    nextActions.push({
      href: '/culinary/costing/recipe',
      label: 'Review recipe costs',
      detail: 'Find recipes with partial pricing before they flow into menus and quotes.',
    })
  }

  if (summary.freshIngredients < summary.totalIngredients && summary.totalIngredients > 0) {
    nextActions.push({
      href: '/culinary/costing',
      label: 'Refresh current prices',
      detail: 'Use the refresh control after updating ingredient prices or market matches.',
    })
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Your Pricing Coverage" label={summary.label} status={summary.status} />
      <p className="text-xs text-stone-400">{summary.guidance}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Metric
          label="Ingredients priced"
          value={`${summary.pricedIngredients.toLocaleString()} / ${summary.totalIngredients.toLocaleString()}`}
          sub={
            summary.ingredientCoveragePct !== null
              ? `${summary.ingredientCoveragePct}% ingredient coverage`
              : 'No ingredients yet'
          }
        />
        <Metric
          label="Fresh ingredients"
          value={`${summary.freshIngredients.toLocaleString()} / ${summary.totalIngredients.toLocaleString()}`}
          sub="Updated within 7 days"
        />
        <Metric
          label="Recipes priced"
          value={`${summary.pricedRecipes.toLocaleString()} / ${summary.totalRecipes.toLocaleString()}`}
          sub={
            summary.recipeCoveragePct !== null
              ? `${summary.recipeCoveragePct}% recipe coverage`
              : 'No recipes yet'
          }
        />
        <Metric
          label="Fresh recipes"
          value={`${summary.freshRecipes.toLocaleString()} / ${summary.totalRecipes.toLocaleString()}`}
          sub="Recipes with fresh ingredient pricing"
        />
      </div>
      {nextActions.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {nextActions.slice(0, 3).map((action) => (
            <NextAction key={action.href + action.label} {...action} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function PricingReadinessCard({ summary, variant }: Props) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-100">Pricing readiness</h2>
          <p className="text-xs text-stone-500">
            Checked {formatExact(summary.checkedAt)} ({timeAgo(summary.checkedAt)})
          </p>
        </div>
      </div>

      {variant === 'market' ? (
        <MarketSection summary={summary.market} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChefSection summary={summary.chef} />
          <MarketSection summary={summary.market} />
        </div>
      )}
    </div>
  )
}

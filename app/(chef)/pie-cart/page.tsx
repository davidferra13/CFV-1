import type { Metadata } from 'next'
import { buildPieCartPlan } from '@/lib/chef-ops/pie-cart'

function dollars(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export const metadata: Metadata = { title: 'PIE Cart | ChefFlow' }

export default function PieCartPage() {
  const plan = buildPieCartPlan(
    [
      {
        ingredientName: 'Prime rib',
        requiredQuantity: 12,
        unit: 'lb',
        unitPriceCents: 1899,
        lastSavedUnitPriceCents: 1749,
        confidence: 0.82,
        resolutionTier: 'regional',
        freshness: 'recent',
        category: 'protein',
        storeName: 'Regional butcher median',
      },
      {
        ingredientName: 'Fresh herbs',
        requiredQuantity: 3,
        unit: 'bunch',
        lastSavedUnitPriceCents: 299,
        confidence: 0.3,
        resolutionTier: 'synthetic',
        freshness: 'unknown',
        category: 'produce',
        availability: 'limited',
        vendorContact: { name: 'Local market' },
      },
      {
        ingredientName: 'Fingerling potatoes',
        requiredQuantity: 8,
        unit: 'lb',
        unitPriceCents: 249,
        lastSavedUnitPriceCents: 229,
        confidence: 0.88,
        resolutionTier: 'zip_local',
        freshness: 'current',
        category: 'produce',
        storeName: 'Local grocery scrape',
      },
    ],
    'snapshot_plan',
    { quoteTotalCents: 185000, targetMarginPercent: 55, budgetCeilingCents: 32500 }
  )

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
      <aside className="rounded-md border p-4">
        <h1 className="text-xl font-semibold">PIE Cart</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Procurement planning, estimates, snapshots, margin guardrails, and receipt learning.
        </p>
        <div className="mt-6 space-y-3 text-sm">
          {plan.procurement.commandCenter.map((item) => (
            <div key={item.metric} className="border-t pt-3">
              <p className="text-muted-foreground">{item.metric}</p>
              <p className="font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </aside>

      <section className="space-y-3">
        <div className="rounded-md border p-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Active snapshot</p>
          <h2 className="text-2xl font-semibold">Upcoming event buy plan</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Confidence SLA</p>
              <p className="font-medium">{plan.intelligence.confidenceSla}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Drift since save</p>
              <p className="font-medium">{plan.intelligence.driftPct}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mode</p>
              <p className="font-medium">
                {plan.intelligence.optimizationMode.replaceAll('_', ' ')}
              </p>
            </div>
          </div>
        </div>
        {plan.lines.map((line) => (
          <article key={line.ingredientName} className="rounded-md border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{line.ingredientName}</h3>
                <p className="text-sm text-muted-foreground">
                  {line.requiredQuantity} {line.unit} - {line.confidenceLabel.replaceAll('_', ' ')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{line.sourceLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Buy {line.purchasePlan.packLabel}
                  {line.purchasePlan.leftoverQuantity > 0
                    ? ` - ${line.purchasePlan.leftoverQuantity} ${line.unit} expected leftover`
                    : ''}
                </p>
              </div>
              <p className="font-semibold">{dollars(line.extendedPriceCents)}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded border px-2 py-1">{line.provenanceLabel}</span>
              <span className="rounded border px-2 py-1">drift {line.priceDriftPct}%</span>
              <span className="rounded border px-2 py-1">
                {line.recommendedAction.replaceAll('_', ' ')}
              </span>
              {line.riskFlags.map((flag) => (
                <span key={flag} className="rounded border px-2 py-1">
                  {flag.replaceAll('_', ' ')}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <aside className="h-fit rounded-md border p-4">
        <h2 className="font-semibold">Readiness</h2>
        <p className="mt-2 text-2xl font-semibold">{plan.readiness.replaceAll('_', ' ')}</p>
        <p className="mt-4 text-sm text-muted-foreground">Total</p>
        <p className="text-2xl font-semibold">{dollars(plan.totalCents)}</p>
        <p className="mt-4 text-sm text-muted-foreground">Projected margin</p>
        <p className="text-2xl font-semibold">
          {plan.economics.projectedMarginPercent === null
            ? 'Not quoted'
            : `${plan.economics.projectedMarginPercent}%`}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Review queue</p>
        <p className="text-2xl font-semibold">{plan.procurement.reviewCount}</p>
        <ul className="mt-4 space-y-2 text-sm">
          {plan.nextActions.map((action) => (
            <li key={action}>{action.replaceAll('_', ' ')}</li>
          ))}
        </ul>
        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold">Task board</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {plan.procurement.taskBoard.slice(0, 5).map((task) => (
              <li key={`${task.kind}-${task.ingredientName ?? task.label}`}>{task.label}</li>
            ))}
          </ul>
        </div>
        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold">Sources</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {plan.intelligence.sourceTransparency.map((source) => (
              <li key={source.label} className="flex justify-between gap-3">
                <span>{source.label}</span>
                <span>{source.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  )
}

import type { BuyablePriceContract } from '@/lib/pricing/buyable-price-contract'
import { shoppingActionForContract } from '@/lib/pricing/buyable-price-contract'

type Density = 'compact' | 'full'

const TRUST_STYLES: Record<string, string> = {
  confirmed_local_buyable: 'border-emerald-800 bg-emerald-950/40 text-emerald-300',
  recent_local_observed: 'border-amber-800 bg-amber-950/40 text-amber-300',
  regional_market_estimate: 'border-sky-800 bg-sky-950/40 text-sky-300',
  national_median: 'border-stone-700 bg-stone-900 text-stone-300',
  modeled_estimate: 'border-violet-800 bg-violet-950/40 text-violet-300',
  no_trusted_price: 'border-red-800 bg-red-950/40 text-red-300',
}

export function PriceTrustPill({ contract }: { contract: BuyablePriceContract }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
        TRUST_STYLES[contract.trustLevel] ?? TRUST_STYLES.no_trusted_price
      }`}
      title={shoppingActionForContract(contract)}
    >
      {contract.displayLabel}
    </span>
  )
}

export function PriceTrustContract({
  contract,
  density = 'full',
}: {
  contract: BuyablePriceContract
  density?: Density
}) {
  if (density === 'compact') {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <PriceTrustPill contract={contract} />
        <span className="text-xs text-stone-500">
          {contract.safeForShopping ? 'shopping-safe' : 'verify first'}
        </span>
      </div>
    )
  }

  const proof = contract.proof

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PriceTrustPill contract={contract} />
        <span className="text-stone-500">{shoppingActionForContract(contract)}</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <TrustMetric label="Store" value={proof.storeName ?? 'Not proven'} />
        <TrustMetric label="Product" value={proof.productName ?? 'Not proven'} />
        <TrustMetric
          label="Freshness"
          value={proof.observedAt ? new Date(proof.observedAt).toLocaleDateString() : 'Unknown'}
        />
        <TrustMetric label="Data points" value={String(proof.dataPoints)} />
      </div>

      {contract.requiredProof.length > 0 && (
        <p className="mt-3 text-stone-500">
          Missing proof: {contract.requiredProof.slice(0, 3).join(', ')}
          {contract.requiredProof.length > 3 ? ` +${contract.requiredProof.length - 3} more` : ''}
        </p>
      )}
    </div>
  )
}

function TrustMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="uppercase tracking-wide text-stone-600">{label}</p>
      <p className="mt-0.5 truncate text-stone-300">{value}</p>
    </div>
  )
}

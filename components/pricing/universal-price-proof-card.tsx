import React from 'react'
import type { BuyablePriceContract } from '@/lib/pricing/buyable-price-contract'

type UniversalPriceProofCardProps = {
  contract: BuyablePriceContract
  className?: string
}

const trustTone: Record<BuyablePriceContract['trustLevel'], string> = {
  confirmed_local_buyable: 'border-emerald-700 bg-emerald-950/30 text-emerald-100',
  recent_local_observed: 'border-lime-700 bg-lime-950/30 text-lime-100',
  regional_market_estimate: 'border-amber-700 bg-amber-950/30 text-amber-100',
  national_median: 'border-sky-700 bg-sky-950/30 text-sky-100',
  modeled_estimate: 'border-stone-700 bg-stone-900 text-stone-100',
  no_trusted_price: 'border-red-800 bg-red-950/30 text-red-100',
}

const healthTone: Record<BuyablePriceContract['sourceHealth'], string> = {
  fresh: 'text-emerald-300',
  stale: 'text-amber-300',
  degraded: 'text-red-300',
  unknown: 'text-stone-400',
}

export function UniversalPriceProofCard({
  contract,
  className = '',
}: UniversalPriceProofCardProps) {
  const proofRows = [
    ['Fallback tier', contract.fallbackTier],
    ['Price state', contract.priceState.replace(/_/g, ' ')],
    ['Store', contract.proof.storeName],
    ['Product', contract.proof.productName],
    ['ZIP', contract.proof.zipRequested],
    ['Distance', formatDistance(contract.proof.distanceMiles)],
    ['Observed', formatFreshness(contract)],
    ['Unit', contract.proof.unit],
    ['Package', contract.proof.packageSize],
    ['Data points', String(contract.proof.dataPoints)],
  ].filter(([, value]) => value && String(value).trim().length > 0)

  return (
    <section
      className={`rounded-lg border p-3 ${trustTone[contract.trustLevel]} ${className}`}
      aria-label="Price proof"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{contract.displayLabel}</p>
          <p className={`text-xs ${healthTone[contract.sourceHealth]}`}>
            {contract.confidenceLabel} confidence - {contract.sourceHealth} source
          </p>
        </div>
        <span className="rounded border border-current px-2 py-0.5 text-xs">
          {contract.safeForShopping ? 'Shopping-safe' : 'Costing only'}
        </span>
      </div>

      <p className="mt-2 text-xs">{contract.recommendedAction}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-current/60">Local proof</p>
          <p className="font-medium">{contract.localProof.present ? 'Complete' : 'Incomplete'}</p>
        </div>
        <div>
          <p className="text-current/60">Freshness</p>
          <p className="font-medium">{contract.freshness.label}</p>
        </div>
      </div>

      {contract.reasons.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs">
          {contract.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      {proofRows.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {proofRows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-current/60">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {contract.missingProof.length > 0 ? (
        <div className="mt-3 border-t border-current/20 pt-2 text-xs">
          <p className="font-medium">Missing proof</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {contract.missingProof.map((proof) => (
              <li key={proof}>{proof}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function formatDistance(distanceMiles: number | null) {
  if (distanceMiles === null) return null
  return `${Math.round(distanceMiles * 10) / 10} mi`
}

function formatFreshness(contract: BuyablePriceContract) {
  if (contract.freshness.observedAt) return contract.freshness.observedAt
  if (contract.freshness.days === null) return contract.freshness.label
  return `${contract.freshness.label} (${contract.freshness.days}d)`
}

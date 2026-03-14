import { getReferralChainMapping } from '@/lib/intelligence/referral-chain-mapping'
import { getNetworkIntelligence } from '@/lib/intelligence/network-referrals'

export async function NetworkReferralBar() {
  const [chains, network] = await Promise.all([
    getReferralChainMapping().catch(() => null),
    getNetworkIntelligence().catch(() => null),
  ])

  if (!chains && !network) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Network Effect Score */}
      {chains && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Network Effect</p>
          <p
            className={`text-lg font-bold ${
              chains.networkEffectScore >= 50
                ? 'text-emerald-400'
                : chains.networkEffectScore >= 25
                  ? 'text-amber-400'
                  : 'text-stone-100'
            }`}
          >
            {chains.networkEffectScore}/100
          </p>
          <p className="text-xs text-stone-500">
            {chains.percentFromReferrals}% clients from referrals
          </p>
        </div>
      )}

      {/* Top Referral Source */}
      {network && network.referralSourcePerformance.length > 0 && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Top Referral Source</p>
          <p className="text-lg font-bold text-stone-100 truncate">
            {network.bestReferralSource || network.referralSourcePerformance[0].source}
          </p>
          <p className="text-xs text-stone-500">
            {network.networkStats.referralConversionRate}% conversion
          </p>
        </div>
      )}

      {/* Referral Candidates */}
      {network && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Likely Referrers</p>
          <p className="text-lg font-bold text-stone-100">{network.topReferringClients.length}</p>
          <p className="text-xs text-stone-500">
            {network.networkStats.referralRevenuePercent}% revenue from referrals
          </p>
        </div>
      )}

      {/* Chain Depth */}
      {chains && chains.chains.length > 0 && (
        <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 px-3 py-2">
          <p className="text-xs text-stone-500">Referral Chains</p>
          <p className="text-lg font-bold text-stone-100">{chains.chains.length}</p>
          <p className="text-xs text-stone-500">
            avg depth: {chains.avgReferralChainDepth.toFixed(1)}
          </p>
        </div>
      )}
    </div>
  )
}

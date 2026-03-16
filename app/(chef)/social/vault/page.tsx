import { requireChef } from '@/lib/auth/get-user'
import { getSocialMediaAssets, getSocialPostAssetLinks } from '@/lib/social/actions'
import { SocialVaultBrowser } from '@/components/social/social-vault-browser'

export default async function SocialVaultPage() {
  await requireChef()

  const [assets, links] = await Promise.all([getSocialMediaAssets(), getSocialPostAssetLinks()])

  // Build usage counts: how many posts each asset is attached to
  const usageCounts: Record<string, number> = {}
  for (const link of links) {
    usageCounts[link.asset_id] = (usageCounts[link.asset_id] ?? 0) + 1
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-stone-100">Media Vault</h2>
        <p className="text-sm text-stone-500 mt-0.5">
          All your photos and videos - upload once, use across any post on any platform.
        </p>
      </div>
      <SocialVaultBrowser assets={assets} usageCounts={usageCounts} />
    </div>
  )
}

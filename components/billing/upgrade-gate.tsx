import Link from 'next/link'
import { checkGate } from '@/lib/feature-gates/gate-check'
import { BILLING_SLUG_GATES, type BillingFeatureSlug } from '@/lib/feature-gates/billing-slug-map'

type Props = {
  chefId: string
  featureSlug: string
  children: React.ReactNode
  mode?: 'block' | 'blur' | 'hide'
}

export async function UpgradeGate({ chefId, featureSlug, children, mode = 'block' }: Props) {
  const gateKey = BILLING_SLUG_GATES[featureSlug as BillingFeatureSlug]

  // Unknown slugs render children so a typo never blanks a working page.
  // Map completeness is enforced by tests/unit/feature-gates.billing-slug-map.test.ts.
  if (!gateKey) return <>{children}</>

  const result = await checkGate(chefId, gateKey)
  if (result.allowed) return <>{children}</>

  if (mode === 'hide') return null

  // 'block' and 'blur' both render the locked panel. Blurred real data
  // would still ship the data to the client, so blur is not honored.
  return (
    <div className="rounded-md border p-6">
      <h2 className="font-semibold">This feature is part of the Pro plan</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your current plan does not include it. You can manage your plan in Settings.
      </p>
      <Link href="/settings/billing" className="mt-4 inline-block text-sm font-medium underline">
        Go to plan settings
      </Link>
    </div>
  )
}

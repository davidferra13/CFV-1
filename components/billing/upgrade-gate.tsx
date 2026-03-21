// Upgrade Gate - Server Component (NEUTRALIZED)
// Previously gated Pro-only content behind upgrade prompts.
// Now a pass-through: all features are accessible to everyone.
// Retained so 16+ call sites continue to compile without changes.
//
// Monetization has moved to voluntary patronage. See docs/monetization-shift.md.

type Props = {
  chefId: string
  featureSlug: string
  children: React.ReactNode
  mode?: 'block' | 'blur' | 'hide'
}

export async function UpgradeGate({ children }: Props) {
  return <>{children}</>
}

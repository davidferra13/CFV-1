import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'Cookie Policy' }

export default function CookiePolicyPage() {
  return (
    <LegalPolicyPlaceholder
      title="Cookie Policy"
      policyType="cookie_policy"
      audience="All visitors"
      summary="This draft page reserves a separately versioned cookie policy for analytics consent, essential cookies, optional analytics, and future consent-ledger integration."
    />
  )
}

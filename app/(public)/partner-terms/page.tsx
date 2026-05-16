import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'Partner Terms' }

export default function PartnerTermsPage() {
  return (
    <LegalPolicyPlaceholder
      title="Partner Terms"
      policyType="partner_terms"
      audience="Referral partners and venue partners"
      summary="This draft page reserves partner terms for referral activity, reporting, attribution, fees, communications, privacy, and partner-specific data boundaries."
    />
  )
}

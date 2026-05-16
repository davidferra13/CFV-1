import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'Acceptable Use Policy' }

export default function AcceptableUsePage() {
  return (
    <LegalPolicyPlaceholder
      title="Acceptable Use Policy"
      policyType="acceptable_use_policy"
      audience="Chefs, clients, guests, staff, vendors, and partners"
      summary="This draft page reserves separately versioned acceptable-use rules for uploads, messages, marketplace activity, public profiles, reviews, and misuse reporting."
    />
  )
}

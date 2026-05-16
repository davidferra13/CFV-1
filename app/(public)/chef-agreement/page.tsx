import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'Chef Agreement' }

export default function ChefAgreementPage() {
  return (
    <LegalPolicyPlaceholder
      title="Chef Agreement"
      policyType="chef_agreement"
      audience="Chef workspace owners"
      summary="This draft page reserves role-specific terms for chef business use, client relationships, content ownership, payments, insurance, licensing, food safety, and platform responsibilities."
    />
  )
}

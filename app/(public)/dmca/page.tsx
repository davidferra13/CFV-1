import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'DMCA Policy' }

export default function DmcaPage() {
  return (
    <LegalPolicyPlaceholder
      title="DMCA Policy"
      policyType="dmca_policy"
      audience="Copyright owners and ChefFlow users"
      summary="This draft page reserves takedown intake, counter-notice, content ownership acknowledgment, designated-agent, and repeat-infringer workflow language."
    />
  )
}

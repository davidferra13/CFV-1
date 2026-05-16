import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'Client Terms' }

export default function ClientTermsPage() {
  return (
    <LegalPolicyPlaceholder
      title="Client Terms"
      policyType="client_terms"
      audience="Client portal users"
      summary="This draft page reserves client-specific terms for booking, quotes, payment, cancellation, dietary information, communications, data rights, and chef-client responsibility boundaries."
    />
  )
}

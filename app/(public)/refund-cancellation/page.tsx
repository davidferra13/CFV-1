import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'Refund and Cancellation Policy' }

export default function RefundCancellationPage() {
  return (
    <LegalPolicyPlaceholder
      title="Refund and Cancellation Policy"
      policyType="refund_cancellation_policy"
      audience="Chefs, clients, and marketplace participants"
      summary="This draft page reserves refund, cancellation, chargeback, deposit, fee, and disclosure language. Tax, accounting, payment-provider, and legal review are required before reliance."
    />
  )
}

import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'Vendor Agreement' }

export default function VendorAgreementPage() {
  return (
    <LegalPolicyPlaceholder
      title="Vendor Agreement"
      policyType="vendor_agreement"
      audience="Vendor portal users and suppliers"
      summary="This draft page reserves vendor terms for purchase orders, catalog pricing, invoices, payout readiness, tax forms, communications, content ownership, and data use."
    />
  )
}

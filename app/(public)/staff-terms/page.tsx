import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'Staff Terms' }

export default function StaffTermsPage() {
  return (
    <LegalPolicyPlaceholder
      title="Staff Terms"
      policyType="staff_terms"
      audience="Staff and contractor portal users"
      summary="This draft page reserves staff and contractor terms for scheduling, station work, time records, food-safety responsibilities, privacy, and worker-classification review."
    />
  )
}

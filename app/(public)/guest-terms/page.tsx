import { LegalPolicyPlaceholder } from '../_components/legal-policy-placeholder'

export const metadata = { title: 'Guest Terms' }

export default function GuestTermsPage() {
  return (
    <LegalPolicyPlaceholder
      title="Guest Terms"
      policyType="guest_terms"
      audience="Event guests and low-friction RSVP flows"
      summary="This draft page reserves guest consent notices for dietary information, allergy disclosures, RSVP data, event communications, photos, testimonials, and privacy requests."
    />
  )
}

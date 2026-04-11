import { redirect } from 'next/navigation'

// In-app claim filing is not yet active.
// Redirect to the claims archive where existing claims are tracked.
export default function NewInsuranceClaimPage() {
  redirect('/safety/claims')
}

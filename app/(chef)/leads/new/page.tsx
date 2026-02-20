import { redirect } from 'next/navigation'

// New / unclaimed leads are shown on the main leads page
export default function LeadsNewPage() {
  redirect('/leads')
}

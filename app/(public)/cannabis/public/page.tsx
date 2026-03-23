import { redirect } from 'next/navigation'

// Cannabis feature is disabled.
export default function CannabisPublicPage() {
  redirect('/')
}

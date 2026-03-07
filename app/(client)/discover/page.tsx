// Open Tables Discovery Page - Browse discoverable dinner circles
import { requireClient } from '@/lib/auth/get-user'
import { DiscoverClient } from './discover-client'

export const metadata = {
  title: 'Discover | ChefFlow',
  description: 'Find and join open dinner tables from foodies in your network',
}

export default async function DiscoverPage() {
  await requireClient()
  return <DiscoverClient />
}

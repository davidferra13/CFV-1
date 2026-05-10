import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { FeatureDiscoveryClient } from './feature-discovery-client'

export const metadata: Metadata = {
  title: 'Discover Features',
}

export default async function FeatureDiscoveryPage() {
  await requireChef()
  return <FeatureDiscoveryClient />
}

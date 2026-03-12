import { Metadata } from 'next'
import PublicKDSClient from './kds-client'

export const metadata: Metadata = {
  title: 'Kitchen Display | ChefFlow',
  robots: 'noindex, nofollow',
}

interface Props {
  params: Promise<{ tenantId: string }>
}

export default async function PublicKDSPage({ params }: Props) {
  const { tenantId } = await params
  return <PublicKDSClient tenantId={tenantId} />
}

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getEmergencyTriageData } from '@/lib/network/emergency-triage-actions'
import { EmergencyTriageClient } from './emergency-triage-client'

export const metadata: Metadata = { title: 'Emergency Triage | ChefFlow' }

export default async function EmergencyTriagePage() {
  await requireChef()
  const data = await getEmergencyTriageData()
  return <EmergencyTriageClient data={data} />
}

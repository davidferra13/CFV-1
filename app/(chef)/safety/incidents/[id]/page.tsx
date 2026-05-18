import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  return { title: 'Incident Details | ChefFlow' }
}

export default function SafetyIncidentDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/settings/compliance/incidents/${params.id}`)
}

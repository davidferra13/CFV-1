import { redirect } from 'next/navigation'

export default function SafetyIncidentDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/settings/compliance/incidents/${params.id}`)
}

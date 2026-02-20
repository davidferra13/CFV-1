import { redirect } from 'next/navigation'

export default async function JourneyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/settings/journal/${params.id}`)
}

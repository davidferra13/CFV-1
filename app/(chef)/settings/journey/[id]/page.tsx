import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  return { title: 'Journey Entry | ChefFlow' }
}

export default async function JourneyDetailPage({ params }: { params: { id: string } }) {
  redirect(`/settings/journal/${params.id}`)
}

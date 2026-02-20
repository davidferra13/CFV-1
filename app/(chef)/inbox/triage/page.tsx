import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Communication Triage - ChefFlow' }

export default async function InboxTriagePage() {
  await requireChef()
  redirect('/inbox')
}

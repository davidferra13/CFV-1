// Content Calendar
// Monthly view of scheduled and published social media posts.

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'

export const metadata: Metadata = { title: 'Content Calendar | ChefFlow' }

export default async function SocialCalendarPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  await requireChef()

  const now = new Date()
  const month =
    searchParams.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  redirect(`/social/planner/${month}`)
}

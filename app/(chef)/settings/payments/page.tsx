import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'

export default async function PaymentsSettingsAliasPage() {
  await requireChef()
  redirect('/settings/stripe-connect')
}

export const dynamic = 'force-dynamic'

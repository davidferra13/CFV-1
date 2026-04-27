import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { CatchupClient } from './catchup-client'

export const metadata: Metadata = { title: 'Quick Catchup' }

export default async function CatchupPage() {
  await requireChef()
  return <CatchupClient />
}

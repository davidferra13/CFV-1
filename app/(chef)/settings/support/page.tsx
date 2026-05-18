import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Support | ChefFlow' }

export default function SupportSettingsPage() {
  redirect('/settings/billing')
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Cannabis Hub | ChefFlow' }

export default function CannabisHubAliasPage() {
  redirect('/cannabis')
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Cannabis Handbook | ChefFlow' }

export default function ChefCannabisHandbookAliasPage() {
  redirect('/cannabis/handbook')
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Social Vault | ChefFlow' }

export default function SocialVaultRedirect() {
  redirect('/content/vault')
}

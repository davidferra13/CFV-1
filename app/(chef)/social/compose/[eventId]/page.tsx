import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  return { title: 'Compose Post | ChefFlow' }
}

export default function SocialComposeRedirect() {
  redirect('/marketing/social')
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  return { title: 'Social Post | ChefFlow' }
}

export default function SocialPostRedirect() {
  redirect('/marketing/social')
}

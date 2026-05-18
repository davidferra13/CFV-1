import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  return { title: 'Social Planner | ChefFlow' }
}

export default function SocialMonthRedirect() {
  redirect('/marketing/social')
}

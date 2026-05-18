import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Social Planner | ChefFlow' }

export default function SocialPlannerRedirect() {
  redirect('/marketing/social')
}

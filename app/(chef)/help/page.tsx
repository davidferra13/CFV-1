import { redirect } from 'next/navigation'

export const metadata = { title: 'Help Center' }

export default function HelpPage() {
  redirect('/onboarding/help')
}

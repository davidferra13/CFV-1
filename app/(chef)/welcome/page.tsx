import { redirect } from 'next/navigation'

export const metadata = { title: 'Welcome' }

export default function WelcomePage() {
  redirect('/onboarding/welcome')
}

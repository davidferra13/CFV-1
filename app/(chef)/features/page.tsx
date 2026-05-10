import { redirect } from 'next/navigation'

export const metadata = { title: 'All Features' }

export default function FeaturesPage() {
  redirect('/onboarding/features')
}

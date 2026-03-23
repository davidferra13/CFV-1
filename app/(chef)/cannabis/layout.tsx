import { redirect } from 'next/navigation'

// Cannabis feature is disabled. Redirect everyone.
export default async function CannabisLayout({ children }: { children: React.ReactNode }) {
  redirect('/dashboard')
}

import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { ReleasePortalShell } from '../_components/release-portal-shell'

export default async function WebBetaChefLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireChef()
  } catch {
    redirect('/auth/signin?portal=chef')
  }

  return (
    <ReleasePortalShell portalLabel="Chef Portal" primaryHref="/onboarding" primaryLabel="Setup">
      {children}
    </ReleasePortalShell>
  )
}
